"use client";

import { motion } from "framer-motion";
import { Check, Eye, EyeOff, LoaderCircle, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoLightbox } from "@/components/photo-lightbox";

type Photo = { id: string; filename: string; takenTime: string | null; featured: boolean };

export function CityPhotoWall({
  photos,
  cityId,
  cityName,
  initialShowOnWall,
}: {
  photos: Photo[];
  cityId: number;
  cityName: string;
  initialShowOnWall: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Photo | null>(null);
  const [photoList, setPhotoList] = useState(photos);
  const [showOnWall, setShowOnWall] = useState(initialShowOnWall);
  const [featuredIds, setFeaturedIds] = useState(() => photos.filter((photo) => photo.featured).slice(0, 3).map((photo) => photo.id));
  const [saving, setSaving] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function saveWallSettings(nextShowOnWall: boolean, nextFeaturedIds: string[], previous: { showOnWall: boolean; featuredIds: string[] }) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/cities/${cityId}/wall`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showOnWall: nextShowOnWall, featuredPhotoIds: nextFeaturedIds }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "保存失败");
      setMessage(nextShowOnWall
        ? nextFeaturedIds.length > 0
          ? `已即时同步：首页将展示 ${nextFeaturedIds.length} 张照片。`
          : "已即时同步：点亮星标后照片会展示在首页。"
        : "已即时同步：城市保持点亮，但首页不展示照片。");
      router.refresh();
    } catch (error) {
      setShowOnWall(previous.showOnWall);
      setFeaturedIds(previous.featuredIds);
      setMessage(error instanceof Error ? error.message : "保存失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  function toggleFeatured(photoId: string) {
    if (saving || deleting || selectionMode) return;
    const previous = { showOnWall, featuredIds };
    const nextFeaturedIds = featuredIds.includes(photoId)
      ? featuredIds.filter((id) => id !== photoId)
      : featuredIds.length >= 3
        ? null
        : [...featuredIds, photoId];
    if (!nextFeaturedIds) {
      setMessage("最多选择 3 张作为照片墙展示。");
      return;
    }
    const nextShowOnWall = nextFeaturedIds.length > 0;
    setFeaturedIds(nextFeaturedIds);
    setShowOnWall(nextShowOnWall);
    void saveWallSettings(nextShowOnWall, nextFeaturedIds, previous);
  }

  function toggleWallVisibility() {
    if (saving || deleting) return;
    const previous = { showOnWall, featuredIds };
    const nextShowOnWall = !showOnWall;
    setShowOnWall(nextShowOnWall);
    void saveWallSettings(nextShowOnWall, featuredIds, previous);
  }

  function toggleSelectionMode() {
    setSelectionMode((current) => !current);
    setSelectedPhotoIds(new Set());
    setMessage("");
  }

  function togglePhotoSelection(photoId: string) {
    setSelectedPhotoIds((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  function selectAllPhotos() {
    setSelectedPhotoIds((current) => current.size === photoList.length
      ? new Set()
      : new Set(photoList.map((photo) => photo.id)));
  }

  async function deleteSelectedPhotos() {
    if (selectedPhotoIds.size === 0 || deleting || saving) return;
    const ids = [...selectedPhotoIds];
    if (!window.confirm(`确定删除选中的 ${ids.length} 张照片吗？删除后无法恢复。`)) return;
    setDeleting(true);
    setMessage("");
    try {
      const response = await fetch("/api/photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "删除失败");
      setPhotoList((current) => current.filter((item) => !ids.includes(item.id)));
      setFeaturedIds((current) => current.filter((id) => !ids.includes(id)));
      if (selected && ids.includes(selected.id)) setSelected(null);
      setSelectedPhotoIds(new Set());
      setSelectionMode(false);
      setMessage(`已删除 ${payload.deleted ?? ids.length} 张照片，城市档案已同步更新。`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败，请重试。");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="wall-display-settings paper-card">
        <div className="wall-setting-copy">
          <p className="eyebrow">HOME MEMORY WALL</p>
          <h2>首页照片墙展示</h2>
          <p>城市是否展示照片与“已点亮”状态相互独立。关闭后，这座城市仍会保持高亮。</p>
        </div>
        <button className={`wall-visibility-toggle ${showOnWall ? "active" : ""}`} onClick={toggleWallVisibility} disabled={saving}>
          {showOnWall ? <Eye size={18} /> : <EyeOff size={18} />}
          <span><b>{showOnWall ? "展示照片" : "仅点亮城市"}</b><small>{showOnWall ? "首页会显示所选封面" : "首页不显示这座城市的照片"}</small></span>
        </button>
        <div className="wall-setting-footer">
          <span>已选择 <b>{featuredIds.length}</b> / 3 张</span>
          {message && <p className="wall-setting-message" role="status">{message}</p>}
          <span className="wall-auto-save-status">{saving ? <><LoaderCircle className="spin" size={13} /> 保存中…</> : "点击星标即可即时同步"}</span>
        </div>
      </section>

      {photoList.length > 0 && (
        <div className={`photo-batch-toolbar ${selectionMode ? "active" : ""}`}>
          {!selectionMode ? (
            <button className="secondary-button" onClick={toggleSelectionMode} disabled={saving || deleting}><Trash2 size={15} /> 批量删除</button>
          ) : (
            <>
              <span>已选择 <b>{selectedPhotoIds.size}</b> / {photoList.length} 张</span>
              <button className="secondary-button" onClick={selectAllPhotos} disabled={deleting}>{selectedPhotoIds.size === photoList.length ? "取消全选" : "全选"}</button>
              <button className="secondary-button" onClick={toggleSelectionMode} disabled={deleting}><X size={15} /> 取消</button>
              <button className="danger-button solid" onClick={deleteSelectedPhotos} disabled={selectedPhotoIds.size === 0 || deleting || saving}>
                {deleting ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />} 删除选中照片
              </button>
            </>
          )}
        </div>
      )}

      {!photoList.length ? (
        <div className="city-empty-wall paper-card"><span>✦</span><h2>档案页还是空白</h2><p>从地图页添加照片后，它们会按时间落在这里。</p></div>
      ) : (
        <div className="masonry-wall">
          {photoList.map((photo, index) => {
            const featured = featuredIds.includes(photo.id);
            return (
              <motion.article
                key={photo.id}
                className={`archive-photo polaroid ${featured ? "featured" : ""}`}
                initial={{ opacity: 0, y: 24, rotate: index % 2 ? 2 : -2 }}
                animate={{ opacity: 1, y: 0, rotate: (index % 5 - 2) * 0.65 }}
                transition={{ delay: Math.min(index * 0.06, 0.5) }}
              >
                <button className={`photo-open ${selectionMode && selectedPhotoIds.has(photo.id) ? "selected-for-delete" : ""}`} onClick={() => selectionMode ? togglePhotoSelection(photo.id) : setSelected(photo)}>
                  <img src={`/api/files/${photo.id}`} alt={photo.filename} />
                </button>
                {!selectionMode && <button className={`feature-photo-button ${featured ? "active" : ""}`} onClick={() => toggleFeatured(photo.id)} disabled={saving || deleting} aria-label={featured ? "取消首页展示" : "设为首页展示照片"}>
                  <Star size={16} fill={featured ? "currentColor" : "none"} />
                </button>}
                {selectionMode && <span className={`photo-select-indicator ${selectedPhotoIds.has(photo.id) ? "selected" : ""}`} aria-hidden="true">
                  {selectedPhotoIds.has(photo.id) && <Check size={15} />}
                </span>}
                <span>{photo.takenTime ? new Date(photo.takenTime).toLocaleDateString("zh-CN") : cityName}</span>
              </motion.article>
            );
          })}
        </div>
      )}
      <PhotoLightbox photoId={selected?.id ?? null} alt={selected?.filename ?? cityName} onClose={() => setSelected(null)} />
    </>
  );
}
