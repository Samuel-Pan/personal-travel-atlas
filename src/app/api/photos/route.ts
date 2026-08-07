import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import * as exifr from "exifr";
import { resolveCityFromCoordinates } from "@/lib/geolocation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PHOTO_ROOT = path.resolve(process.cwd(), "travel-data", "photos");
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

type PreparedPhoto = {
  file: File;
  buffer: Buffer;
  cityId: number;
  date: Date;
  latitude: number | null;
  longitude: number | null;
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeExifDate(value: unknown, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = new Date(value.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3"));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "请求必须使用 multipart/form-data。" }, { status: 400 });
  }

  const mode = formData.get("mode") === "manual" ? "manual" : "auto";
  const manualCityId = Number(formData.get("cityId"));
  const rawDate = String(formData.get("date") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;
  const files = formData.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);

  if (!rawDate || files.length === 0 || (mode === "manual" && !Number.isInteger(manualCityId))) {
    return Response.json({ error: "请选择旅行日期和至少一张照片；手动模式还需要选择城市。" }, { status: 400 });
  }
  if (files.length > 30) {
    return Response.json({ error: "单次最多上传 30 张照片。" }, { status: 400 });
  }
  if (files.some((file) => !ALLOWED_TYPES.has(file.type) || file.size > 20 * 1024 * 1024)) {
    return Response.json({ error: "仅支持 JPG、PNG、WebP、HEIC，且每张不超过 20MB。" }, { status: 400 });
  }

  const fallbackDate = new Date(`${rawDate}T12:00:00+08:00`);
  if (Number.isNaN(fallbackDate.getTime())) return Response.json({ error: "旅行日期无效。" }, { status: 400 });

  if (mode === "manual") {
    const city = await prisma.city.findUnique({ where: { id: manualCityId }, select: { id: true } });
    if (!city) return Response.json({ error: "城市不存在。" }, { status: 404 });
  }

  const prepared: PreparedPhoto[] = [];
  const unresolved: string[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    let metadata: Record<string, unknown> | undefined;
    try {
      metadata = await exifr.parse(buffer, { gps: true, tiff: true, exif: true });
    } catch {
      metadata = undefined;
    }

    const latitude = typeof metadata?.latitude === "number" ? metadata.latitude : null;
    const longitude = typeof metadata?.longitude === "number" ? metadata.longitude : null;
    const cityId = mode === "manual"
      ? manualCityId
      : latitude !== null && longitude !== null
        ? resolveCityFromCoordinates(latitude, longitude)
        : null;

    if (!cityId) {
      unresolved.push(file.name);
      continue;
    }

    prepared.push({
      file,
      buffer,
      cityId,
      date: normalizeExifDate(metadata?.DateTimeOriginal ?? metadata?.CreateDate ?? metadata?.ModifyDate, fallbackDate),
      latitude,
      longitude,
    });
  }

  if (unresolved.length > 0) {
    return Response.json({
      error: `有 ${unresolved.length} 张照片没有可用的 GPS 城市信息，请切换为手动归档。`,
      unresolved,
    }, { status: 422 });
  }

  const cityIds = [...new Set(prepared.map((photo) => photo.cityId))];
  const cities = await prisma.city.findMany({
    where: { id: { in: cityIds } },
    select: { id: true, name: true, _count: { select: { travelRecords: true } } },
  });
  if (cities.length !== cityIds.length) return Response.json({ error: "部分照片无法匹配到城市。" }, { status: 422 });

  const saved: Array<PreparedPhoto & { relativePath: string; absolutePath: string }> = [];
  try {
    for (const photo of prepared) {
      const folder = path.join(String(photo.date.getFullYear()), String(photo.date.getMonth() + 1).padStart(2, "0"));
      const absoluteFolder = path.join(PHOTO_ROOT, folder);
      await mkdir(absoluteFolder, { recursive: true });
      const extension = EXTENSIONS[photo.file.type] ?? (path.extname(photo.file.name).toLowerCase() || ".jpg");
      const relativePath = path.join(folder, `${randomUUID()}${extension}`);
      const absolutePath = path.join(PHOTO_ROOT, relativePath);
      await writeFile(absolutePath, photo.buffer);
      saved.push({ ...photo, relativePath, absolutePath });
    }

    const groups = new Map<string, typeof saved>();
    for (const photo of saved) {
      const key = `${photo.cityId}:${dateKey(photo.date)}`;
      groups.set(key, [...(groups.get(key) ?? []), photo]);
    }

    const featureSlots = new Map(cities.map((city) => [city.id, city._count.travelRecords === 0 ? 3 : 0]));
    const records = await prisma.$transaction(
      [...groups.values()].map((photos) => prisma.travelRecord.create({
        data: {
          cityId: photos[0].cityId,
          date: photos[0].date,
          description,
          photos: {
            create: photos.map((photo) => {
              const slots = featureSlots.get(photo.cityId) ?? 0;
              featureSlots.set(photo.cityId, Math.max(0, slots - 1));
              return {
                path: photo.relativePath,
                filename: photo.file.name,
                mimeType: photo.file.type,
                latitude: photo.latitude,
                longitude: photo.longitude,
                takenTime: photo.date,
                featured: slots > 0,
              };
            }),
          },
        },
      })),
    );

    return Response.json({
      recordCount: records.length,
      photoCount: saved.length,
      autoClassified: mode === "auto" ? saved.length : 0,
      cities: cities.map((city) => city.name),
    }, { status: 201 });
  } catch (error) {
    await Promise.all(saved.map(({ absolutePath }) => unlink(absolutePath).catch(() => undefined)));
    console.error(error);
    return Response.json({ error: "照片保存失败，请重试。" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  let body: { ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容无效。" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids)
    ? [...new Set(body.ids.filter((value): value is string => typeof value === "string" && value.length > 0))]
    : [];
  if (ids.length === 0) return Response.json({ error: "请选择至少一张照片。" }, { status: 400 });
  if (ids.length > 100) return Response.json({ error: "单次最多删除 100 张照片。" }, { status: 400 });

  const photos = await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      path: true,
      travelRecordId: true,
      travelRecord: { select: { cityId: true } },
    },
  });
  if (photos.length !== ids.length) return Response.json({ error: "部分照片不存在，请刷新后重试。" }, { status: 404 });

  const recordIds = [...new Set(photos.map((photo) => photo.travelRecordId))];
  const cityIds = [...new Set(photos.map((photo) => photo.travelRecord.cityId))];
  await prisma.$transaction(async (transaction) => {
    await transaction.photo.deleteMany({ where: { id: { in: ids } } });

    const records = await transaction.travelRecord.findMany({
      where: { id: { in: recordIds } },
      select: { id: true, _count: { select: { photos: true } } },
    });
    const emptyRecordIds = records.filter((record) => record._count.photos === 0).map((record) => record.id);
    if (emptyRecordIds.length > 0) {
      await transaction.travelRecord.deleteMany({ where: { id: { in: emptyRecordIds } } });
    }

    for (const cityId of cityIds) {
      const featuredCount = await transaction.photo.count({ where: { featured: true, travelRecord: { cityId } } });
      if (featuredCount === 0) {
        await transaction.city.update({ where: { id: cityId }, data: { showOnWall: false } });
      }
    }
  });

  await Promise.all(photos.map(async (photo) => {
    const absolutePath = path.resolve(PHOTO_ROOT, photo.path);
    const relativePath = path.relative(PHOTO_ROOT, absolutePath);
    if (!relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
      await unlink(absolutePath).catch(() => undefined);
    }
  }));

  return Response.json({ deleted: ids.length, ids });
}
