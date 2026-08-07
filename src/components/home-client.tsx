"use client";

import { CalendarDays, Camera, ChartNoAxesColumn, ChevronDown, Compass, Map, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AtlasMap } from "@/components/atlas-map";
import { ArchiveDangerZone } from "@/components/archive-danger-zone";
import { UploadDialog } from "@/components/upload-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AtlasData, AtlasGeoCollection } from "@/lib/types";

export function HomeClient({ data, mapGeo, provinceGeo }: { data: AtlasData; mapGeo: AtlasGeoCollection; provinceGeo: AtlasGeoCollection }) {
  const router = useRouter();
  const scrollRef = useRef<HTMLElement>(null);
  const wheelIntentRef = useRef(0);
  const wheelResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnFrameRef = useRef<number | null>(null);
  const turnReleaseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turningRef = useRef(false);
  const [pageTurnDirection, setPageTurnDirection] = useState<"forward" | "back" | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCity, setUploadCity] = useState<number | null>(null);

  function openUpload(cityId?: number) {
    setUploadCity(cityId ?? null);
    setUploadOpen(true);
  }

  const runPageTurn = useCallback((target: number, direction: "forward" | "back") => {
    const scroller = scrollRef.current;
    if (!scroller || turningRef.current) return;

    if (turnFrameRef.current !== null) window.cancelAnimationFrame(turnFrameRef.current);
    if (turnReleaseRef.current) clearTimeout(turnReleaseRef.current);

    const start = scroller.scrollTop;
    const distance = target - start;
    const duration = 1050;
    const startedAt = performance.now();
    turningRef.current = true;
    setPageTurnDirection(direction);
    scroller.style.scrollSnapType = "none";

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      scroller.scrollTop = start + distance * eased;

      if (progress < 1) {
        turnFrameRef.current = window.requestAnimationFrame(step);
        return;
      }

      scroller.scrollTop = target;
      turnReleaseRef.current = setTimeout(() => {
        scroller.style.scrollSnapType = "";
        setPageTurnDirection(null);
        turningRef.current = false;
      }, 120);
    };

    turnFrameRef.current = window.requestAnimationFrame(step);
  }, []);

  function scrollToArchive() {
    const scroller = scrollRef.current;
    if (!scroller) return;
    runPageTurn(scroller.clientHeight, "forward");
  }

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const handleWheel = (event: WheelEvent) => {
      if (turningRef.current) {
        event.preventDefault();
        return;
      }
      const viewport = scroller.clientHeight;
      const current = scroller.scrollTop;
      const direction = Math.sign(event.deltaY);
      const atMap = current < viewport * 0.38;
      const atArchiveTop = current >= viewport * 0.62 && current < viewport * 1.22;
      const turningForward = direction > 0 && atMap;
      const turningBack = direction < 0 && atArchiveTop;

      if (!turningForward && !turningBack) {
        wheelIntentRef.current = 0;
        return;
      }

      event.preventDefault();
      if (turningRef.current) return;

      wheelIntentRef.current += event.deltaY;
      if (wheelResetRef.current) clearTimeout(wheelResetRef.current);
      wheelResetRef.current = setTimeout(() => { wheelIntentRef.current = 0; }, 180);
      if (Math.abs(wheelIntentRef.current) < 24) return;

      wheelIntentRef.current = 0;
      runPageTurn(turningForward ? viewport : 0, turningForward ? "forward" : "back");
    };

    scroller.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      scroller.removeEventListener("wheel", handleWheel);
      if (wheelResetRef.current) clearTimeout(wheelResetRef.current);
      if (turnFrameRef.current !== null) window.cancelAnimationFrame(turnFrameRef.current);
      if (turnReleaseRef.current) clearTimeout(turnReleaseRef.current);
    };
  }, [runPageTurn]);

  return (
    <main ref={scrollRef} className={`site-shell home-shell home-scroll ${pageTurnDirection ? `page-turn-${pageTurnDirection}` : ""}`}>
      <section className="home-page home-map-page">
        <header className="site-header home-header">
          <Link href="/" className="brand">
            <span className="brand-mark"><Compass size={20} /></span>
            <span><strong>Personal Travel Atlas</strong><small>私人旅行档案馆</small></span>
          </Link>
          <nav>
            <Link className="nav-link active" href="/"><Map size={16} /> 足迹地图</Link>
            <Link className="nav-link" href="/timeline"><CalendarDays size={16} /> 时间轴</Link>
            <Link className="nav-link" href="/stats"><ChartNoAxesColumn size={16} /> 统计</Link>
            <a className="nav-link archive-nav" href="#provinces" onClick={(event) => { event.preventDefault(); scrollToArchive(); }}><Camera size={16} /> 省份档案</a>
            <ThemeToggle />
            <button className="primary-button journey-button" onClick={() => openUpload()}><Plus size={17} /> 添加旅程</button>
          </nav>
        </header>

        <section className="home-map-copy hero-copy">
          <div>
            <p className="eyebrow">A LIVING MAP OF MEMORIES</p>
            <h1>走过的地方，<em>会在地图上发光。</em></h1>
          </div>
          {/* <p>不是相册，也不是打卡清单。这里收藏城市、时间，以及照片留住的那一瞬间。</p> */}
        </section>

        <section className="atlas-wrap fullscreen-atlas">
          <AtlasMap data={data} geoData={mapGeo} provinceGeoData={provinceGeo} onUpload={openUpload} />
        </section>

        <a className="page-turn-cue" href="#provinces" onClick={(event) => { event.preventDefault(); scrollToArchive(); }}><span>向下翻阅旅行档案</span><ChevronDown size={17} /></a>
      </section>

      <section className="home-page home-archive-page" id="provinces">
        <div className="province-archive">
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
        </div>

        <ArchiveDangerZone photoCount={data.totals.photos} />
        <footer><span>PERSONAL TRAVEL ATLAS · LOCAL ARCHIVE</span><span>每一次出发，都值得被记住。</span></footer>
      </section>

      <UploadDialog key={uploadCity ?? "new"} data={data} open={uploadOpen} initialCityId={uploadCity} onClose={() => setUploadOpen(false)} onUploaded={() => router.refresh()} />
    </main>
  );
}

function ArrowStamp({ active }: { active: boolean }) {
  return <span className={`passport-stamp ${active ? "active" : ""}`}>{active ? "VISITED" : "UNSEEN"}</span>;
}
