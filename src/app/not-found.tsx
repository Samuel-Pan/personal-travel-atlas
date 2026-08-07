import Link from "next/link";

export default function NotFound() {
  return <main className="not-found"><p className="eyebrow">ARCHIVE NOT FOUND</p><h1>这页旅行档案不存在。</h1><Link className="primary-button" href="/">回到地图</Link></main>;
}

