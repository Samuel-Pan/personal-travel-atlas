import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PHOTO_ROOT = path.resolve(process.cwd(), "travel-data", "photos");

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) return Response.json({ error: "照片参数无效。" }, { status: 400 });

  const photo = await prisma.photo.findUnique({
    where: { id },
    select: {
      id: true,
      path: true,
      travelRecord: {
        select: {
          id: true,
          cityId: true,
          _count: { select: { photos: true } },
        },
      },
    },
  });
  if (!photo) return Response.json({ error: "照片不存在。" }, { status: 404 });

  await prisma.$transaction(async (transaction) => {
    await transaction.photo.delete({ where: { id: photo.id } });
    if (photo.travelRecord._count.photos === 1) {
      await transaction.travelRecord.delete({ where: { id: photo.travelRecord.id } });
    }
    const remainingFeatured = await transaction.photo.count({
      where: { travelRecord: { cityId: photo.travelRecord.cityId }, featured: true },
    });
    if (remainingFeatured === 0) {
      await transaction.city.update({ where: { id: photo.travelRecord.cityId }, data: { showOnWall: false } });
    }
  });

  const absolutePath = path.resolve(PHOTO_ROOT, photo.path);
  const relativePath = path.relative(PHOTO_ROOT, absolutePath);
  if (!relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
    await unlink(absolutePath).catch(() => undefined);
  }

  return Response.json({ deleted: true, id: photo.id });
}
