"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArchiveX, LoaderCircle, ShieldAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CONFIRMATION = "清空所有档案";

export function ArchiveDangerZone({ photoCount }: { photoCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function clearArchive() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/archive", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "清空失败");
      setMessage(payload.recoverablePath
        ? `已清空。原照片暂存于 ${payload.recoverablePath}`
        : "当前没有需要清空的旅行档案。");
      setConfirmation("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "清空失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="danger-zone">
      <div>
        <p className="eyebrow">ARCHIVE MAINTENANCE</p>
        <h2>档案维护</h2>
        <p>删除数据库中的全部旅行记录，并将原照片移动到本地回收目录。</p>
      </div>
      <button className="danger-button" onClick={() => { setOpen(true); setMessage(""); }} disabled={photoCount === 0}>
        <ArchiveX size={17} /> {photoCount ? "清空所有旅行档案" : "当前没有旅行档案"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="confirm-dialog paper-card" initial={{ opacity: 0, scale: .96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .97 }}>
              <button className="icon-button dialog-close" onClick={() => setOpen(false)} aria-label="关闭"><X size={19} /></button>
              <ShieldAlert className="danger-icon" size={30} />
              <p className="eyebrow">DESTRUCTIVE ACTION</p>
              <h2>确认清空所有旅行档案？</h2>
              <p>地图将恢复为未探索状态。照片不会立即永久删除，而是移动到 <code>travel-data/trash</code>。</p>
              <label className="confirm-field">
                <span>请输入“{CONFIRMATION}”</span>
                <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
              </label>
              {message && <p className="confirm-message">{message}</p>}
              <div className="confirm-actions">
                <button className="secondary-button" onClick={() => setOpen(false)}>取消</button>
                <button className="danger-button solid" disabled={confirmation !== CONFIRMATION || busy} onClick={clearArchive}>
                  {busy ? <LoaderCircle className="spin" size={17} /> : <ArchiveX size={17} />}
                  {busy ? "正在清空…" : "确认清空"}
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

