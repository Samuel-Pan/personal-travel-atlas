"use client";

import { ArrowLeft, Camera, Images, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AtlasMap } from "@/components/atlas-map";
import { UploadDialog } from "@/components/upload-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AtlasData, AtlasProvince } from "@/lib/types";

export function ProvinceClient({ data, province }: { data: AtlasData; province: AtlasProvince }) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [cityId, setCityId] = useState<number | null>(null);
  const [showWall, setShowWall] = useState(false);

  function openUpload(id?: number) {
    setCityId(id ?? province.cities[0]?.id ?? null);
    setUploadOpen(true);
  }

  const provinceCityIds = new Set(province.cities.map((city) => city.id));
  const scoped: AtlasData = {
    provinces: [province],
    cities: province.cities,
    recentPhotos: data.recentPhotos.filter((photo) => provinceCityIds.has(photo.cityId)),
    totals: {
      cities: province.cityCount,
      visited: province.visitedCount,
      photos: province.cities.reduce((sum, city) => sum + city.photoCount, 0),
    },
  };

  return (
    <main className="site-shell detail-shell">
      <header className="detail-header">
        <Link href="/" className="back-link"><ArrowLeft size={17} /> 返回全国地图</Link>
        <div className="header-actions">
          <button className={`archive-wall-toggle ${showWall ? "active" : ""}`} onClick={() => setShowWall((value) => !value)}>
            <Images size={16} /> {showWall ? "隐藏照片墙" : "展示照片墙"}
          </button>
          <ThemeToggle />
          <button className="primary-button journey-button" onClick={() => openUpload()}><Plus size={17} /> 添加旅程</button>
        </div>
      </header>
      <section className="province-title">
        <div><p className="eyebrow">PROVINCE ARCHIVE · {province.id}</p><h1>{province.name}</h1></div>
        <div className="province-summary paper-card">
          <span><b>{province.visitedCount}</b> 已探索</span><i />
          <span><b>{province.cityCount - province.visitedCount}</b> 待抵达</span><i />
          <span><b>{scoped.totals.photos}</b> 张照片</span>
        </div>
      </section>

      <AtlasMap data={scoped} mapUrl={`/maps/provinces/${province.id}.json`} provinceOverlay={false} wallPhotos={showWall} onUpload={openUpload} />

      <section className="city-ledger">
        <div className="section-heading"><div><p className="eyebrow">CITY LEDGER</p><h2>城市目录</h2></div><span>点击进入照片档案</span></div>
        <div className="city-grid">
          {province.cities.map((city) => (
            <article key={city.id} className={`city-card paper-card ${city.visited ? "visited" : ""}`}>
              <span className="city-pin"><MapPin size={17} /></span>
              <div><p>{city.provinceName}</p><h3>{city.name}</h3></div>
              <div className="city-card-meta"><span>{city.visited ? `${city.tripCount} 次 · ${city.photoCount} 张` : "未点亮"}</span></div>
              <div className="city-card-actions">
                <Link href={`/city/${city.id}?from=province&provinceId=${province.id}`}>查看档案</Link>
                <button onClick={() => openUpload(city.id)}><Camera size={15} /> 添加照片</button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <UploadDialog key={cityId ?? "new"} data={data} open={uploadOpen} initialCityId={cityId} onClose={() => setUploadOpen(false)} onUploaded={() => router.refresh()} />
    </main>
  );
}
