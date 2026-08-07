import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Travel Atlas",
  description: "属于你的中国旅行足迹数字档案馆",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{const saved=localStorage.getItem('travel-atlas-theme');const dark=saved?saved==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=dark?'dark':'light'}catch{}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
