import { StatsClient } from "@/components/stats-client";
import { getAtlasData } from "@/lib/atlas";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  return <StatsClient data={await getAtlasData()} />;
}

