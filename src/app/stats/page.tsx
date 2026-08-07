import { StatsClient } from "@/components/stats-client";
import { getAtlasData } from "@/lib/atlas";
import { getMapGeoData } from "@/lib/map-data";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const [data, mapGeo, provinceGeo] = await Promise.all([
    getAtlasData(),
    getMapGeoData("china-cities.json"),
    getMapGeoData("china-provinces.json"),
  ]);
  return <StatsClient data={data} mapGeo={mapGeo} provinceGeo={provinceGeo} />;
}
