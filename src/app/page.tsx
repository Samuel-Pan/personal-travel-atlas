import { HomeClient } from "@/components/home-client";
import { getAtlasData } from "@/lib/atlas";
import { getMapGeoData } from "@/lib/map-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [data, mapGeo, provinceGeo] = await Promise.all([
    getAtlasData(),
    getMapGeoData("china-cities.json"),
    getMapGeoData("china-provinces.json"),
  ]);
  return <HomeClient data={data} mapGeo={mapGeo} provinceGeo={provinceGeo} />;
}
