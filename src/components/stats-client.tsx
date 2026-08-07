"use client";

import { CalendarDays, Camera, ChartNoAxesColumn, Compass, Map, MapPinned, PieChart, Route } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AtlasMap } from "@/components/atlas-map";
import { ThemeToggle } from "@/components/theme-toggle";
import { UploadDialog } from "@/components/upload-dialog";
import type { AtlasData } from "@/lib/types";

export function StatsClient({ data }: { data: AtlasData }) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [cityId, setCityId] = useState<number | null>(null);
  const coverage = data.totals.cities ? data.totals.visited / data.totals.cities * 100 : 0;
  const ranked = [...data.provinces].sort((a, b) => b.visitedCount - a.visitedCount || b.cityCount - a.cityCount);

  function openUpload(id?: number) {
    setCityId(id ?? null);
    setUploadOpen(true);
  }

  return (
    <main className="site-shell detail-shell stats-page">
      <header className="detail-header">
        <Link href="/" className="brand">
          <span className="brand-mark"><Compass size={20} /></span>
          <span><strong>Personal Travel Atlas</strong><small>私人旅行档案馆</small></span>
        </Link>
        <nav className="section-nav">
          <Link className="nav-link" href="/"><Map size={16} /> 足迹地图</Link>
          <Link className="nav-link" href="/timeline"><CalendarDays size={16} /> 时间轴</Link>
          <Link className="nav-link active" href="/stats"><ChartNoAxesColumn size={16} /> 统计</Link>
          <ThemeToggle />
        </nav>
      </header>

      <section className="stats-hero">
        <div><p className="eyebrow">TRAVEL STATISTICS</p><h1>旅行的广度，<em>被数字轻轻记录。</em></h1></div>
        <p>统计只来自本地数据库，会随着照片归档自动更新。</p>
      </section>

      <section className="stat-cards">
        <article className="stat-card paper-card"><MapPinned /><span>已探索</span><strong>{data.totals.visited}<small> / {data.totals.cities}</small></strong><p>城市</p></article>
        <article className="stat-card paper-card accent"><PieChart /><span>全国覆盖</span><strong>{coverage.toFixed(1)}<small>%</small></strong><p>地级区域</p></article>
        <article className="stat-card paper-card"><Route /><span>等待抵达</span><strong>{data.totals.cities - data.totals.visited}</strong><p>城市</p></article>
        <article className="stat-card paper-card"><Camera /><span>照片档案</span><strong>{data.totals.photos}</strong><p>张记忆</p></article>
      </section>

      <AtlasMap data={data} wallPhotos={false} onUpload={openUpload} />

      <section className="province-ranking">
        <div className="section-heading"><div><p className="eyebrow">PROVINCE COVERAGE</p><h2>省份探索进度</h2></div><span>按已探索城市排序</span></div>
        <div className="ranking-list paper-card">
          {ranked.map((province, index) => {
            const percent = province.cityCount ? province.visitedCount / province.cityCount * 100 : 0;
            return <Link href={`/province/${province.id}`} className="ranking-row" key={province.id}>
              <span>{String(index + 1).padStart(2, "0")}</span><strong>{province.name}</strong>
              <div className="ranking-track"><i style={{ width: `${percent}%` }} /></div>
              <small>{province.visitedCount} / {province.cityCount}</small>
            </Link>;
          })}
        </div>
      </section>

      <UploadDialog key={cityId ?? "stats-new"} data={data} open={uploadOpen} initialCityId={cityId} onClose={() => setUploadOpen(false)} onUploaded={() => router.refresh()} />
    </main>
  );
}
