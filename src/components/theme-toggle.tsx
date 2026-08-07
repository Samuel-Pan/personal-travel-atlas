"use client";

import { MoonStar, Sun } from "lucide-react";

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    localStorage.setItem("travel-atlas-theme", next);
  }

  return (
    <button className="theme-toggle icon-button" onClick={toggleTheme} aria-label="切换深夜模式" title="切换深夜模式">
      <MoonStar className="theme-icon moon" size={18} />
      <Sun className="theme-icon sun" size={18} />
    </button>
  );
}

