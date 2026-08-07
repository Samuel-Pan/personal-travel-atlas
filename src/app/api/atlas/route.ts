import { getAtlasData } from "@/lib/atlas";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getAtlasData());
}

