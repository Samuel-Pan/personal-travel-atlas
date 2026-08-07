import { mkdir, readdir, rename } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PHOTO_ROOT = path.resolve(process.cwd(), "travel-data", "photos");
const TRASH_ROOT = path.resolve(process.cwd(), "travel-data", "trash");
const CONFIRMATION = "清空所有档案";

export async function DELETE(request: Request) {
  let confirmation = "";
  try {
    confirmation = String((await request.json()).confirmation ?? "");
  } catch {
    return Response.json({ error: "缺少确认信息。" }, { status: 400 });
  }

  if (confirmation !== CONFIRMATION) {
    return Response.json({ error: `请输入“${CONFIRMATION}”进行确认。` }, { status: 400 });
  }

  const [photoCount, recordCount] = await Promise.all([
    prisma.photo.count(),
    prisma.travelRecord.count(),
  ]);
  if (photoCount === 0 && recordCount === 0) {
    return Response.json({ photoCount: 0, recordCount: 0, recoverablePath: null });
  }

  await mkdir(PHOTO_ROOT, { recursive: true });
  await mkdir(TRASH_ROOT, { recursive: true });
  const trashFolderName = `archive-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const trashFolder = path.join(TRASH_ROOT, trashFolderName);
  await mkdir(trashFolder, { recursive: true });

  const entries = (await readdir(PHOTO_ROOT, { withFileTypes: true })).filter((entry) => entry.name !== ".gitkeep");
  const moved: Array<{ from: string; to: string }> = [];

  try {
    for (const entry of entries) {
      const from = path.join(PHOTO_ROOT, entry.name);
      const to = path.join(trashFolder, entry.name);
      await rename(from, to);
      moved.push({ from, to });
    }

    await prisma.$transaction([
      prisma.photo.deleteMany(),
      prisma.travelRecord.deleteMany(),
    ]);

    return Response.json({
      photoCount,
      recordCount,
      recoverablePath: path.relative(process.cwd(), trashFolder),
    });
  } catch (error) {
    for (const item of moved.reverse()) {
      await rename(item.to, item.from).catch(() => undefined);
    }
    console.error(error);
    return Response.json({ error: "清空失败，原照片已尽量恢复到照片目录。" }, { status: 500 });
  }
}

