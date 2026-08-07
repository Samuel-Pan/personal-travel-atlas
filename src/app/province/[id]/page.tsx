import { notFound } from "next/navigation";
import { ProvinceClient } from "@/components/province-client";
import { getAtlasData } from "@/lib/atlas";
import { getMapGeoData } from "@/lib/map-data";

export const dynamic = "force-dynamic";

export default async function ProvincePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, mapGeo] = await Promise.all([
    getAtlasData(),
    getMapGeoData(`provinces/${id}.json`),
  ]);
  const province = data.provinces.find((item) => item.id === Number(id));
  if (!province) notFound();
  return <ProvinceClient data={data} province={province} mapGeo={mapGeo} />;
}
