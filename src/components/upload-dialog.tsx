"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, LoaderCircle, MapPinned, MousePointer2, Sparkles, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { AtlasData } from "@/lib/types";

type Props = {
  data: AtlasData;
  open: boolean;
  initialCityId?: number | null;
  onClose: () => void;
  onUploaded: () => void;
};

export function UploadDialog({ data, open, initialCityId, onClose, onUploaded }: Props) {
  const initialCity = data.cities.find((item) => item.id === initialCityId);
  const [mode, setMode] = useState<"auto" | "manual">(initialCity ? "manual" : "auto");
  const [provinceId, setProvinceId] = useState<number>(initialCity?.provinceId ?? data.provinces[0]?.id ?? 0);
  const [cityId, setCityId] = useState<number>(initialCity?.id ?? data.provinces[0]?.cities[0]?.id ?? 0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cities = useMemo(
    () => data.provinces.find((province) => province.id === provinceId)?.cities ?? [],
    [data.provinces, provinceId],
  );

  function changeProvince(value: number) {
    setProvinceId(value);
    const nextCities = data.provinces.find((province) => province.id === value)?.cities ?? [];
    setCityId(nextCities[0]?.id ?? 0);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!files.length) {
      setError("请先选择照片。");
      return;
    }

    setBusy(true);
    setError("");
    const body = new FormData();
    body.set("mode", mode);
    body.set("date", date);
    if (mode === "manual") body.set("cityId", String(cityId));
    files.forEach((file) => body.append("photos", file));

    try {
      const response = await fetch("/api/photos", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 422 && mode === "auto") setMode("manual");
        throw new Error(payload.error || "上传失败");
      }
      setFiles([]);
      onUploaded();
      onClose();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "上传失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
          <motion.section
            className="upload-dialog paper-card"
            initial={{ opacity: 0, y: 28, rotate: -1.5, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, rotate: -0.35, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
          >
            <button className="icon-button dialog-close" onClick={onClose} aria-label="关闭">
              <X size={20} />
            </button>
            <p className="eyebrow">NEW MEMORY</p>
            <h2>把一段旅程钉上地图</h2>
            <p className="dialog-intro">照片只在本机处理与保存。GPS、拍摄时间不会发送到外部服务。</p>

            <div className="archive-mode-switch" role="group" aria-label="归档方式">
              <button type="button" className={mode === "auto" ? "active" : ""} onClick={() => setMode("auto")}>
                <Sparkles size={17} /><span><b>智能归档</b><small>读取 EXIF GPS 与时间</small></span>
              </button>
              <button type="button" className={mode === "manual" ? "active" : ""} onClick={() => setMode("manual")}>
                <MousePointer2 size={17} /><span><b>手动归档</b><small>自己选择省份与城市</small></span>
              </button>
            </div>

            <form onSubmit={submit} className="upload-form">
              <AnimatePresence initial={false}>
                {mode === "manual" && (
                  <motion.div className="field-row" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <label>
                      <span>省份 / 地区</span>
                      <select value={provinceId} onChange={(event) => changeProvince(Number(event.target.value))}>
                        {data.provinces.map((province) => <option key={province.id} value={province.id}>{province.name}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>城市</span>
                      <select value={cityId} onChange={(event) => setCityId(Number(event.target.value))}>
                        {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                      </select>
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              <label>
                <span>{mode === "auto" ? "无 EXIF 时使用的备用日期" : "旅行日期"}</span>
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
              </label>

              {mode === "auto" && <div className="auto-archive-note"><MapPinned size={18} /><span>含 GPS 的照片会自动匹配城市；同一批照片可以来自不同城市和日期。</span></div>}

              <label className="drop-zone">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  multiple
                  onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                />
                <ImagePlus size={30} strokeWidth={1.5} />
                <strong>{files.length ? `已选择 ${files.length} 张照片` : "选择旅行照片"}</strong>
                <span>JPG / PNG / WebP / HEIC · 单张不超过 20MB</span>
              </label>

              {files.length > 0 && <p className="file-preview">{files.slice(0, 3).map((file) => file.name).join(" · ")}{files.length > 3 ? " …" : ""}</p>}
              {error && <p className="form-error">{error}{mode === "manual" && error.includes("GPS") ? " 已切换为手动归档。" : ""}</p>}

              <button className="primary-button wide" type="submit" disabled={busy}>
                {busy ? <LoaderCircle className="spin" size={18} /> : <Upload size={18} />}
                {busy ? "正在读取并珍藏…" : mode === "auto" ? "识别并点亮城市" : "点亮这座城市"}
              </button>
            </form>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

