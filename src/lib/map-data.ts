import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AtlasGeoCollection } from "@/lib/types";

export async function getMapGeoData(relativePath: string): Promise<AtlasGeoCollection> {
  const absolutePath = path.join(process.cwd(), "public", "maps", relativePath);
  return JSON.parse(await readFile(absolutePath, "utf8")) as AtlasGeoCollection;
}
