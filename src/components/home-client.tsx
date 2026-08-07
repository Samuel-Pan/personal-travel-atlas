"use client";

import { CalendarDays, Camera, ChartNoAxesColumn, Compass, Map, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AtlasMap } from "@/components/atlas-map";
import { ArchiveDangerZone } from "@/components/archive-danger-zone";
import { UploadDialog } from "@/components/upload-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AtlasData } from "@/lib/types";

export function HomeClient({ data }: { data: AtlasData }) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCity, setUploadCity] = useState<number | null>(null);

  function openUpload(cityId?: number) {
    setUploadCity(cityId ?? null);
    setUploadOpen(true);
  }

  return (
    <main className="site-shell">
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-mark"><Compass size={20} /></span>
          <span><strong>Personal Travel Atlas</strong><small>私人旅行档案馆</small></span>
        </Link>
        <nav>
          <Link className="nav-link active" href="/"><Map size={16} /> 足迹地图</Link>
          <Link className="nav-link" href="/timeline"><CalendarDays size={16} /> 时间轴</Link>
          <Link className="nav-link" href="/stats"><ChartNoAxesColumn size={16} /> 统计</Link>
          <a className="nav-link archive-nav" href="#provinces"><Camera size={16} /> 省份档案</a>
          <ThemeToggle />
          <button className="primary-button journey-button" onClick={() => openUpload()}><Plus size={17} /> 添加旅程</button>
        </nav>
      </header>

      <section className="hero-copy">
        <div>
          <p className="eyebrow">A LIVING MAP OF MEMORIES</p>
          <h1>走过的地方，<em>会在地图上发光。</em></h1>
        </div>
        <p>不是相册，也不是打卡清单。这里收藏城市、时间，以及照片留住的那一瞬间。</p>
      </section>

      <section className="atlas-wrap">
        <div className="atlas-stats paper-card">
          <span className="tape" />
          <p>已探索</p>
          <strong>{data.totals.visited}<small> / {data.totals.cities} 城市</small></strong>
          <div className="progress-track"><span style={{ width: `${data.totals.cities ? data.totals.visited / data.totals.cities * 100 : 0}%` }} /></div>
          <small>{data.totals.photos} 张记忆已归档</small>
        </div>
        <AtlasMap data={data} onUpload={openUpload} />
      </section>

      <section className="province-archive" id="provinces">
        <div className="section-heading">
          <div><p className="eyebrow">PROVINCE ARCHIVE</p><h2>按省份翻阅旅行档案</h2></div>
          <span>{data.provinces.length} 个省级区域</span>
        </div>
        <div className="province-grid">
          {data.provinces.map((province, index) => (
            <Link href={`/province/${province.id}`} className={`province-ticket ${province.visitedCount ? "explored" : ""}`} key={province.id} style={{ rotate: `${(index % 5 - 2) * 0.22}deg` }}>
              <span className="ticket-index">{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{province.name}</strong><small>{province.visitedCount} / {province.cityCount} 城市</small></div>
              <ArrowStamp active={province.visitedCount > 0} />
            </Link>
          ))}
        </div>
      </section>

      <ArchiveDangerZone photoCount={data.totals.photos} />
      <footer><span>PERSONAL TRAVEL ATLAS · LOCAL ARCHIVE</span><span>每一次出发，都值得被记住。</span></footer>

      <UploadDialog key={uploadCity ?? "new"} data={data} open={uploadOpen} initialCityId={uploadCity} onClose={() => setUploadOpen(false)} onUploaded={() => router.refresh()} />
    </main>
  );
}

function ArrowStamp({ active }: { active: boolean }) {
  return <span className={`passport-stamp ${active ? "active" : ""}`}>{active ? "VISITED" : "UNSEEN"}</span>;
}
