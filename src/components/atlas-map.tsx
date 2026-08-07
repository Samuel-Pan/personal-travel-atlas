"use client";

import { geoIdentity, geoPath } from "d3-geo";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowUpRight, Camera, MapPin, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { AtlasCity, AtlasData, AtlasProvince, PhotoSummary } from "@/lib/types";
import { PhotoLightbox } from "@/components/photo-lightbox";

type GeoFeature = {
  type: "Feature";
  properties: { id?: number; adcode?: number; name?: string; center?: [number, number]; provinceId?: number };
  geometry: GeoJSON.Geometry;
};

type GeoCollection = { type: "FeatureCollection"; features: GeoFeature[] };

type GroupPosition = { left: number; top: number; side: "left" | "right" };
type SavedGroupPosition = { version: 2; left: number; top: number };

const GROUP_POSITIONS: GroupPosition[] = [
  { left: 73, top: 7, side: "right" },
  { left: 74, top: 39, side: "right" },
  { left: 3, top: 43, side: "left" },
  { left: 7, top: 71, side: "left" },
  { left: 72, top: 70, side: "right" },
  { left: 5, top: 26, side: "left" },
  { left: 71, top: 23, side: "right" },
  { left: 4, top: 57, side: "left" },
];

const EXTRA_TOPS = [12, 34, 56, 78, 23, 45, 67];

function getGroupPosition(index: number): GroupPosition {
  if (index < GROUP_POSITIONS.length) return GROUP_POSITIONS[index];
  const extra = index - GROUP_POSITIONS.length;
  const side = extra % 2 === 0 ? "right" : "left";
  const sequence = Math.floor(extra / 2);
  const layer = Math.floor(sequence / EXTRA_TOPS.length);
  return {
    left: side === "right" ? Math.max(46, 68 - layer * 16) : Math.min(42, 7 + layer * 16),
    top: EXTRA_TOPS[sequence % EXTRA_TOPS.length],
    side,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function DraggableMemoryGroup({
  city,
  photos,
  point,
  position,
  groupIndex,
  boardRef,
  boardSize,
  storageScope,
  cityArchiveHref,
  onOpen,
}: {
  city: AtlasCity;
  photos: PhotoSummary[];
  point: [number, number] | null;
  position: GroupPosition;
  groupIndex: number;
  boardRef: RefObject<HTMLDivElement | null>;
  boardSize: { width: number; height: number };
  storageScope: string;
  cityArchiveHref: string;
  onOpen: (photo: PhotoSummary) => void;
}) {
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const mapScale = Math.min(boardSize.width / 1000, boardSize.height / 720);
  const mapOffsetX = (boardSize.width - 1000 * mapScale) / 2;
  const mapOffsetY = (boardSize.height - 720 * mapScale) / 2;
  const clipLeft = 41;
  const clipTop = 0;
  const groupWidth = (photos.length - 1) * 88 + 82;
  const groupHeight = 118;
  const pinBoardX = position.left * boardSize.width / 100 + clipLeft;
  const pinBoardY = position.top * boardSize.height / 100 + clipTop;
  const baseLineX = (pinBoardX - mapOffsetX) / mapScale;
  const baseLineY = (pinBoardY - mapOffsetY) / mapScale;
  const lineX = useTransform(dragX, (value) => baseLineX + value / mapScale);
  const lineY = useTransform(dragY, (value) => baseLineY + value / mapScale);
  const flowProgress = useMotionValue(0);
  const pointX = point?.[0] ?? 0;
  const pointY = point?.[1] ?? 0;
  const flowOrbX = useTransform(() => pointX + (lineX.get() - pointX) * flowProgress.get());
  const flowOrbY = useTransform(() => pointY + (lineY.get() - pointY) * flowProgress.get());
  const storageKey = `travel-atlas-wall-position-${storageScope}-${city.id}`;
  const savedPosition = useRef<{ left: number; top: number } | null>(null);

  const boardDimensions = useCallback(() => {
    const board = boardRef.current;
    return {
      width: board?.clientWidth || boardSize.width || 1000,
      height: board?.clientHeight || boardSize.height || 720,
    };
  }, [boardRef, boardSize.height, boardSize.width]);

  const syncSavedPosition = useCallback(() => {
    const saved = savedPosition.current;
    if (!saved) {
      dragX.set(0);
      dragY.set(0);
      return;
    }
    const { width, height } = boardDimensions();
    const baseLeft = position.left * width / 100;
    const baseTop = position.top * height / 100;
    const maxX = Math.max(0, width - groupWidth - baseLeft);
    const maxY = Math.max(0, height - groupHeight - baseTop);
    const x = clamp(saved.left * width - baseLeft, -baseLeft, maxX);
    const y = clamp(saved.top * height - baseTop, -baseTop, maxY);
    dragX.set(Math.abs(x) < 4 ? 0 : x);
    dragY.set(Math.abs(y) < 4 ? 0 : y);
  }, [boardDimensions, dragX, dragY, groupHeight, groupWidth, position.left, position.top]);

  useEffect(() => {
    savedPosition.current = null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) {
        syncSavedPosition();
        return;
      }
      const offset = JSON.parse(saved) as { x?: unknown; y?: unknown };
      if (
        offset &&
        (offset as { version?: unknown }).version === 2 &&
        typeof (offset as { left?: unknown }).left === "number" &&
        typeof (offset as { top?: unknown }).top === "number"
      ) {
        savedPosition.current = {
          left: clamp((offset as { left: number }).left, 0, 1),
          top: clamp((offset as { top: number }).top, 0, 1),
        };
      } else if (typeof offset.x === "number" || typeof offset.y === "number") {
        // Migrate the previous pixel-offset format to a board-relative anchor.
        const { width, height } = boardDimensions();
        const baseLeft = position.left * width / 100;
        const baseTop = position.top * height / 100;
        const anchor = {
          left: clamp((baseLeft + (typeof offset.x === "number" ? offset.x : 0)) / width, 0, 1),
          top: clamp((baseTop + (typeof offset.y === "number" ? offset.y : 0)) / height, 0, 1),
        };
        savedPosition.current = anchor;
        localStorage.setItem(storageKey, JSON.stringify({ version: 2, ...anchor } satisfies SavedGroupPosition));
      }
      syncSavedPosition();
    } catch {
      localStorage.removeItem(storageKey);
      syncSavedPosition();
    }
  }, [boardDimensions, position.left, position.top, storageKey, syncSavedPosition]);

  useEffect(() => {
    const controls = animate(flowProgress, 1, {
      duration: 1.65,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop",
    });
    return () => controls.stop();
  }, [flowProgress]);

  function persistPosition() {
    const { width, height } = boardDimensions();
    const baseLeft = position.left * width / 100;
    const baseTop = position.top * height / 100;
    const actualLeft = baseLeft + dragX.get();
    const actualTop = baseTop + dragY.get();
    const anchor = {
      left: clamp(actualLeft / width, 0, 1),
      top: clamp(actualTop / height, 0, 1),
    };
    savedPosition.current = anchor;
    const x = Math.abs(dragX.get()) < 4 ? 0 : dragX.get();
    const y = Math.abs(dragY.get()) < 4 ? 0 : dragY.get();
    dragX.set(x);
    dragY.set(y);
    localStorage.setItem(storageKey, JSON.stringify({ version: 2, ...anchor } satisfies SavedGroupPosition));
  }

  return (
    <div className={`wall-memory-group ${position.side}`}>
      {point && <svg className="memory-line" viewBox="0 0 1000 720">
        <motion.line className="memory-line-base" x1={point[0]} y1={point[1]} x2={lineX} y2={lineY} />
        <motion.circle className="memory-flow-orb" cx={flowOrbX} cy={flowOrbY} r="3.6" />
      </svg>}
      <motion.div
        className="memory-group-dragger"
        style={{ left: `${position.left}%`, top: `${position.top}%`, width: groupWidth, height: groupHeight, x: dragX, y: dragY }}
        initial={{ opacity: 0, scale: .94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.38 + groupIndex * 0.1, type: "spring", stiffness: 130, damping: 16 }}
        drag
        dragConstraints={boardRef}
        dragElastic={0.04}
        dragMomentum={false}
        onDragEnd={persistPosition}
        title="拖动整组照片"
      >
        <div className="memory-cluster">
          {photos.map((photo, photoIndex) => (
            <div
              key={photo.id}
              className="polaroid map-polaroid"
              style={{ left: `${photoIndex * 88}px`, top: `${photoIndex === 1 ? 12 : photoIndex === 2 ? 3 : 0}px`, rotate: `${(photoIndex - 1) * 3}deg`, zIndex: photoIndex + 1 }}
            >
              <button className="map-photo-image" onClick={() => onOpen(photo)} aria-label={`查看${photo.cityName}大图`}>
                <img src={`/api/files/${photo.id}`} alt={`${photo.cityName}旅行照片`} />
              </button>
              <Link className="map-photo-frame" href={cityArchiveHref} aria-label={`打开${city.name}城市档案`}>
                {photoIndex === 0 && <span className="map-photo-city-label">{shortName(city.name)}</span>}
              </Link>
            </div>
          ))}
          <span className="memory-drag-hint">拖动整组</span>
        </div>
        <span className="memory-paperclip" style={{ left: clipLeft, top: clipTop }} aria-hidden="true" />
      </motion.div>
    </div>
  );
}

function shortName(name: string) {
  return name.replace(/特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|省|市$/g, "");
}

export function AtlasMap({
  data,
  mapUrl = "/maps/china-cities.json",
  provinceOverlay = true,
  wallPhotos = true,
  onUpload,
}: {
  data: AtlasData;
  mapUrl?: string;
  provinceOverlay?: boolean;
  wallPhotos?: boolean;
  onUpload: (cityId?: number) => void;
}) {
  const router = useRouter();
  const boardRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<GeoCollection | null>(null);
  const [provinceGeo, setProvinceGeo] = useState<GeoCollection | null>(null);
  const [boardSize, setBoardSize] = useState({ width: 1000, height: 720 });
  const [hovered, setHovered] = useState<AtlasCity | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<AtlasProvince | null>(null);
  const [selected, setSelected] = useState<AtlasCity | null>(null);
  const [lightbox, setLightbox] = useState<PhotoSummary | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(mapUrl).then((response) => response.json()).then((payload) => alive && setGeo(payload));
    if (provinceOverlay) {
      fetch("/maps/china-provinces.json").then((response) => response.json()).then((payload) => alive && setProvinceGeo(payload));
    }
    return () => { alive = false; };
  }, [mapUrl, provinceOverlay]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const updateSize = () => setBoardSize({ width: board.clientWidth || 1000, height: board.clientHeight || 720 });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  const cityById = useMemo(() => new Map(data.cities.map((city) => [city.id, city])), [data.cities]);
  const provinceById = useMemo(() => new Map(data.provinces.map((province) => [province.id, province])), [data.provinces]);
  const projection = useMemo(() => {
    if (!geo) return null;
    // DataV administrative polygons use planar ring winding. A planar identity
    // projection avoids spherical winding rules turning polygons inside-out.
    return geoIdentity().reflectY(true).fitExtent([[62, 44], [938, 674]], geo as never);
  }, [geo]);
  const path = useMemo(() => projection ? geoPath(projection) : null, [projection]);
  const photoGroups = useMemo(() => {
    if (!wallPhotos) return [];
    const grouped = new Map<number, PhotoSummary[]>();
    for (const photo of data.recentPhotos) {
      grouped.set(photo.cityId, [...(grouped.get(photo.cityId) ?? []), photo]);
    }
    return [...grouped.entries()]
      .sort(([cityA], [cityB]) => {
        const firstA = cityById.get(cityA)?.firstArchivedAt ?? "";
        const firstB = cityById.get(cityB)?.firstArchivedAt ?? "";
        return firstA.localeCompare(firstB) || cityA - cityB;
      })
      .map(([cityId, photos]) => ({
      cityId,
      photos: photos.slice(0, 3),
      }));
  }, [cityById, data.recentPhotos, wallPhotos]);

  return (
    <div className="atlas-stage">
      <div className="map-board" ref={boardRef}>
        <div className="board-pin pin-one" />
        <div className="board-pin pin-two" />
        <div className="map-caption">
          <span>CHINA · PERSONAL ARCHIVE</span>
          <strong>我的旅行足迹</strong>
        </div>

        {!geo || !projection || !path ? (
          <div className="map-loading">正在展开地图…</div>
        ) : (
          <>
            <svg className="china-map" viewBox="0 0 1000 720" role="img" aria-label="中国地级市旅行地图">
              <defs>
                <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="5" stdDeviation="6" floodOpacity="0.14" />
                </filter>
                <pattern id="mapGrain" width="18" height="18" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="4" r="0.7" fill="#786f61" opacity=".12" />
                  <circle cx="14" cy="12" r="0.5" fill="#786f61" opacity=".09" />
                </pattern>
              </defs>
              <g filter="url(#softShadow)">
                {geo.features.map((feature, index) => {
                  const id = Number(feature.properties.id ?? feature.properties.adcode);
                  const city = cityById.get(id);
                  if (!city) {
                    return <path key={`filler-${id}-${index}`} d={path(feature as never) ?? undefined} className="city-shape filler" />;
                  }
                  return (
                    <motion.path
                      key={`${id}-${index}`}
                      d={path(feature as never) ?? undefined}
                      className={`city-shape ${city.visited ? "visited" : ""} ${selected?.id === id ? "selected" : ""}`}
                      initial={{ opacity: 0, pathLength: 0.8 }}
                      animate={{ opacity: 1, pathLength: 1 }}
                      transition={{ duration: 0.5, delay: Math.min(index * 0.002, 0.35) }}
                      onMouseEnter={() => !provinceOverlay && setHovered(city)}
                      onMouseLeave={() => !provinceOverlay && setHovered(null)}
                      onClick={() => !provinceOverlay && setSelected(city)}
                      style={{ pointerEvents: provinceOverlay ? "none" : "auto" }}
                    />
                  );
                })}
              </g>
              {provinceOverlay && provinceGeo && (
                <g className="province-lines">
                  {provinceGeo.features.map((feature, index) => {
                    const provinceId = Number(feature.properties.id ?? feature.properties.adcode);
                    const province = provinceById.get(provinceId);
                    return (
                      <path
                        key={provinceId || index}
                        d={path(feature as never) ?? undefined}
                        className="province-hit"
                        data-province-id={provinceId}
                        role={province ? "link" : undefined}
                        tabIndex={province ? 0 : undefined}
                        aria-label={province ? `打开${province.name}地图` : undefined}
                        onMouseEnter={() => province && setHoveredProvince(province)}
                        onMouseLeave={() => setHoveredProvince(null)}
                        onClick={() => province && router.push(`/province/${province.id}`)}
                        onKeyDown={(event) => {
                          if (province && (event.key === "Enter" || event.key === " ")) router.push(`/province/${province.id}`);
                        }}
                      />
                    );
                  })}
                </g>
              )}
              <g className={`visited-nodes ${provinceOverlay ? "overview" : ""}`}>
                {data.cities.filter((city) => city.visited && city.longitude && city.latitude).map((city) => {
                  const point = projection([city.longitude!, city.latitude!]);
                  if (!point) return null;
                  return <g key={city.id} transform={`translate(${point[0]} ${point[1]})`} onClick={() => !provinceOverlay && setSelected(city)}>
                    <circle className="node-pulse" r="10" />
                    <circle className="node-dot" r="4.5" />
                  </g>;
                })}
              </g>
              {provinceOverlay && data.provinces.map((province) => {
                const city = province.cities[Math.floor(province.cities.length / 2)];
                if (!city?.longitude || !city.latitude) return null;
                const point = projection([city.longitude, city.latitude]);
                if (!point) return null;
                return <text key={province.id} className="province-label" x={point[0]} y={point[1]}>{shortName(province.name)}</text>;
              })}
            </svg>

            {provinceOverlay && hoveredProvince ? (
              <div className="map-tooltip province-tooltip">
                <span className={hoveredProvince.visitedCount ? "status-dot lit" : "status-dot"} />
                <strong>{hoveredProvince.name}</strong>
                <small>{hoveredProvince.visitedCount} / {hoveredProvince.cityCount} 城市已探索 · 点击进入省份地图</small>
              </div>
            ) : hovered && (
              <div className="map-tooltip">
                <span className={hovered.visited ? "status-dot lit" : "status-dot"} />
                <strong>{hovered.name}</strong>
                <small>{hovered.visited ? `${hovered.photoCount} 张照片` : "尚未点亮"}</small>
              </div>
            )}

            {photoGroups.map((group, groupIndex) => {
              const position = getGroupPosition(groupIndex);
              const city = cityById.get(group.cityId);
              const point = city?.longitude && city.latitude ? projection([city.longitude, city.latitude]) : null;
              if (!city) return null;
              return <DraggableMemoryGroup
                key={group.cityId}
                city={city}
                photos={group.photos}
                point={point}
                position={position}
                groupIndex={groupIndex}
                boardRef={boardRef}
                boardSize={boardSize}
                storageScope={provinceOverlay ? "china" : mapUrl}
                cityArchiveHref={provinceOverlay ? `/city/${city.id}?from=atlas` : `/city/${city.id}?from=province&provinceId=${city.provinceId}`}
                onOpen={setLightbox}
              />;
            })}
          </>
        )}

        {!data.totals.photos && wallPhotos && (
          <div className="empty-note paper-card">
            <MapPin size={22} />
            <p><strong>这里还没有被钉上的故事</strong><br />上传第一组照片，地图会从那座城市开始发光。</p>
            <button onClick={() => onUpload()}><Plus size={16} /> 添加第一段旅程</button>
          </div>
        )}

        <AnimatePresence>
          {selected && (
            <motion.aside className="city-drawer paper-card" initial={{ opacity: 0, x: 30, rotate: 1 }} animate={{ opacity: 1, x: 0, rotate: 0.6 }} exit={{ opacity: 0, x: 20 }}>
              <button className="icon-button city-drawer-close" onClick={() => setSelected(null)} aria-label="关闭"><X size={18} /></button>
              <p className="eyebrow">{selected.provinceName}</p>
              <h3>{selected.name}</h3>
              <div className="drawer-stats">
                <span><b>{selected.tripCount}</b> 次旅行</span>
                <span><b>{selected.photoCount}</b> 张照片</span>
              </div>
              {selected.photos.length > 0 ? (
                <div className="drawer-photos">
                  {selected.photos.slice(0, 3).map((photo, index) => <button key={photo.id} style={{ rotate: `${index * 3 - 3}deg` }} onClick={() => setLightbox(photo)}><img src={`/api/files/${photo.id}`} alt={photo.filename} /></button>)}
                </div>
              ) : <p className="drawer-empty">这座城市还在等一张照片。</p>}
              <div className="drawer-actions">
                <button className="primary-button" onClick={() => onUpload(selected.id)}><Camera size={16} /> 添加照片</button>
                <Link className="text-link" href={provinceOverlay ? `/city/${selected.id}?from=atlas` : `/city/${selected.id}?from=province&provinceId=${selected.provinceId}`}>打开档案 <ArrowUpRight size={15} /></Link>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
      <PhotoLightbox photoId={lightbox?.id ?? null} alt={lightbox?.filename ?? "旅行照片"} onClose={() => setLightbox(null)} />
    </div>
  );
}
