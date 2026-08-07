"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export function PhotoLightbox({ photoId, alt, onClose }: { photoId: string | null; alt: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      {photoId && (
        <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <button className="icon-button lightbox-close" aria-label="关闭"><X /></button>
          <motion.img
            src={`/api/files/${photoId}`}
            alt={alt}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            onClick={(event) => event.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

