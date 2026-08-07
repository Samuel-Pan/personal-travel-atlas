import { ArrowLeft, CalendarDays, Camera, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CityPhotoWall } from "@/components/city-photo-wall";
import { ThemeToggle } from "@/components/theme-toggle";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; provinceId?: string }>;
}) {
  const { id } = await params;
  const source = await searchParams;
  const city = await prisma.city.findUnique({
    where: { id: Number(id) },
    include: {
      province: true,
      travelRecords: {
        orderBy: { date: "desc" },
        include: { photos: { orderBy: { takenTime: "desc" } } },
      },
    },
  });
  if (!city) notFound();

  const photos = city.travelRecords.flatMap((record) => record.photos).map((photo) => ({
    id: photo.id,
    filename: photo.filename,
    takenTime: photo.takenTime?.toISOString() ?? null,
    featured: photo.featured,
  }));
  const fromProvince = source.from === "province";
  const backHref = fromProvince ? `/province/${source.provinceId ?? city.provinceId}` : "/";
  const backLabel = fromProvince ? `返回${city.province.name}` : "返回全国地图";

  return (
    <main className="site-shell detail-shell city-page">
      <header className="detail-header">
        <Link href={backHref} className="back-link"><ArrowLeft size={17} /> {backLabel}</Link>
        <div className="header-actions"><Link href="/" className="text-link">全国地图</Link><ThemeToggle /></div>
      </header>
      <section className="city-hero">
        <div className="city-title-stamp"><MapPin size={24} /></div>
        <p className="eyebrow">CITY MEMORY FILE · {city.id}</p>
        <h1>{city.name}</h1>
        <p>{city.province.name} · 一座城市，一册只属于你的旅行档案</p>
        <div className="city-facts">
          <span><CalendarDays size={17} /><b>{city.travelRecords.length}</b> 次旅行</span>
          <span><Camera size={17} /><b>{photos.length}</b> 张照片</span>
        </div>
      </section>
      <CityPhotoWall photos={photos} cityId={city.id} cityName={city.name} initialShowOnWall={city.showOnWall} />
    </main>
  );
}
