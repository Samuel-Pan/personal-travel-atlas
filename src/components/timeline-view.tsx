"use client";

import { motion } from "framer-motion";
import { CalendarDays, ChartNoAxesColumn, Compass, Map, MapPin } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export type TimelineItem = {
  id: string;
  cityId: number;
  year: number;
  month: number;
  cityName: string;
  provinceName: string;
  photoId: string | null;
  photoCount: number;
  recordCount: number;
};

const ITEMS_PER_ROW = 7;

function rowsOf<T>(items: T[], size = ITEMS_PER_ROW) {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) rows.push(items.slice(index, index + size));
  return rows;
}

export function TimelineView({ items }: { items: TimelineItem[] }) {
  return (
    <main className="site-shell detail-shell timeline-page">
      <header className="detail-header">
        <Link href="/" className="brand">
          <span className="brand-mark"><Compass size={20} /></span>
          <span><strong>Personal Travel Atlas</strong><small>私人旅行档案馆</small></span>
        </Link>
        <nav className="section-nav">
          <Link className="nav-link" href="/"><Map size={16} /> 足迹地图</Link>
          <Link className="nav-link active" href="/timeline"><CalendarDays size={16} /> 时间轴</Link>
          <Link className="nav-link" href="/stats"><ChartNoAxesColumn size={16} /> 统计</Link>
          <ThemeToggle />
        </nav>
      </header>

      <section className="timeline-hero">
        <div><p className="eyebrow">MEMORIES BY YEAR AND MONTH</p><h1>沿着时间，<em>重新走一遍。</em></h1></div>
        <p>时间轴只保留年份和月份。同一城市在同一个月内的多次上传会自动合并成一个节点。</p>
      </section>

      {items.length === 0 ? (
        <div className="timeline-empty paper-card"><CalendarDays size={28} /><h2>时间轴还没有开始</h2><p>上传第一段旅程后，时间会从这里向下延伸。</p></div>
      ) : (
        <div className="serpentine-timeline">
          <div className="serpentine-stream">
            {rowsOf(items).map((row, rowIndex) => (
              <div className={`serpentine-row ${rowIndex % 2 ? "reverse" : "forward"}`} key={`timeline-row-${rowIndex}`}>
                <span className="serpentine-horizontal" />
                {rowIndex < Math.ceil(items.length / ITEMS_PER_ROW) - 1 && <span className="serpentine-turn" />}
                {row.map((item, itemIndex) => {
                  const itemOffset = rowIndex * ITEMS_PER_ROW + itemIndex;
                  const yearBoundary = itemOffset === 0 || items[itemOffset - 1]?.year !== item.year;
                  return (
                    <motion.div
                      className="serpentine-stop"
                      key={item.id}
                      initial={{ opacity: 0, y: 24, scale: .96 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true, amount: .3 }}
                      transition={{ duration: .5, delay: itemIndex * .08, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {yearBoundary && <div className="serpentine-year-chip"><span>{item.year}</span><small>YEAR ARCHIVE</small></div>}
                      <span className="serpentine-node"><MapPin size={11} /></span>
                      <Link href={`/city/${item.cityId}`} className="serpentine-card paper-card">
                        {item.photoId && <img src={`/api/files/${item.photoId}`} alt={`${item.cityName}代表照片`} />}
                        <div>
                          <time>{item.year} 年 {item.month} 月</time>
                          <h2>{item.cityName}</h2>
                          <p>{item.provinceName} · {item.photoCount} 张照片</p>
                          {item.recordCount > 1 && <small>{item.recordCount} 次上传已合并</small>}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
