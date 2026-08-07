import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const cityId = Number(id);
  if (!Number.isInteger(cityId)) return Response.json({ error: "城市参数无效。" }, { status: 400 });

  let body: { showOnWall?: unknown; featuredPhotoIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容无效。" }, { status: 400 });
  }

  const showOnWall = body.showOnWall === true;
  const featuredPhotoIds = Array.isArray(body.featuredPhotoIds)
    ? [...new Set(body.featuredPhotoIds.filter((value): value is string => typeof value === "string"))]
    : [];

  if (featuredPhotoIds.length > 3) {
    return Response.json({ error: "每座城市最多选择 3 张首页展示照片。" }, { status: 400 });
  }

  const city = await prisma.city.findUnique({ where: { id: cityId }, select: { id: true } });
  if (!city) return Response.json({ error: "城市不存在。" }, { status: 404 });

  if (featuredPhotoIds.length > 0) {
    const ownedPhotos = await prisma.photo.count({
      where: { id: { in: featuredPhotoIds }, travelRecord: { cityId } },
    });
    if (ownedPhotos !== featuredPhotoIds.length) {
      return Response.json({ error: "部分照片不属于当前城市。" }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.city.update({ where: { id: cityId }, data: { showOnWall } }),
    prisma.photo.updateMany({ where: { travelRecord: { cityId } }, data: { featured: false } }),
    ...(featuredPhotoIds.length > 0
      ? [prisma.photo.updateMany({ where: { id: { in: featuredPhotoIds } }, data: { featured: true } })]
      : []),
  ]);

  return Response.json({ showOnWall, featuredPhotoIds });
}

