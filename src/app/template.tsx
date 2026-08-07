"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: .42, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
