import { TimelineView, type TimelineItem } from "@/components/timeline-view";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function yearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

export default async function TimelinePage() {
  const records = await prisma.travelRecord.findMany({
    orderBy: { date: "desc" },
    include: {
      city: { include: { province: true } },
      photos: { orderBy: { takenTime: "asc" } },
    },
  });

  const grouped = new Map<string, TimelineItem>();
  for (const record of records) {
    const { year, month } = yearMonth(record.date);
    const key = `${record.cityId}:${year}-${month}`;
    const existing = grouped.get(key);
    const representative = record.photos.find((photo) => photo.featured) ?? record.photos[0];
    if (existing) {
      existing.photoCount += record.photos.length;
      existing.recordCount += 1;
      if (!existing.photoId && representative) existing.photoId = representative.id;
    } else {
      grouped.set(key, {
        id: key,
        cityId: record.cityId,
        year,
        month,
        cityName: record.city.name,
        provinceName: record.city.province.name,
        photoId: representative?.id ?? null,
        photoCount: record.photos.length,
        recordCount: 1,
      });
    }
  }

  const items = [...grouped.values()].sort((a, b) => a.year - b.year || a.month - b.month || a.cityId - b.cityId);
  return <TimelineView items={items} />;
}
