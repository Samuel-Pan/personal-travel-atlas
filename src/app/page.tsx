import { HomeClient } from "@/components/home-client";
import { getAtlasData } from "@/lib/atlas";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getAtlasData();
  return <HomeClient data={data} />;
}

