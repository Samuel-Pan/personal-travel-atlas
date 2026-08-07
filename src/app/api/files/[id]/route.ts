import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PHOTO_ROOT = path.resolve(process.cwd(), "travel-data", "photos");

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return new Response("Not found", { status: 404 });

  const absolutePath = path.resolve(PHOTO_ROOT, photo.path);
  if (!absolutePath.startsWith(`${PHOTO_ROOT}${path.sep}`)) {
    return new Response("Invalid path", { status: 400 });
  }

  try {
    const file = await readFile(absolutePath);
    return new Response(file, {
      headers: {
        "Content-Type": photo.mimeType,
        "Cache-Control": "private, max-age=86400",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(photo.filename)}`,
      },
    });
  } catch {
    return new Response("File missing", { status: 404 });
  }
}

