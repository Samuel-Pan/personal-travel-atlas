import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MAP_ROOT = path.join(ROOT, "public", "maps");
const PROVINCE_ROOT = path.join(MAP_ROOT, "provinces");
const DATA_ROOT = path.join(ROOT, "src", "data");
const BASE_URL = "https://geo.datav.aliyun.com/areas_v3/bound";
const SINGLE_CITY_REGIONS = new Set([110000, 120000, 310000, 500000, 710000, 810000, 820000]);

function isPrefectureLevel(feature, provinceId) {
  return SINGLE_CITY_REGIONS.has(provinceId) || feature.properties.id % 100 === 0;
}

async function download(adcode) {
  const response = await fetch(`${BASE_URL}/${adcode}_full.json`);
  if (!response.ok) throw new Error(`Failed to download ${adcode}: ${response.status}`);
  return response.json();
}

function compactFeature(feature, province) {
  const props = feature.properties ?? {};
  const id = Number(props.adcode ?? province.properties.adcode);
  return {
    type: "Feature",
    properties: {
      id,
      adcode: id,
      name: props.name ?? province.properties.name,
      center: props.center ?? props.centroid ?? province.properties.center ?? province.properties.centroid ?? null,
      centroid: props.centroid ?? props.center ?? province.properties.centroid ?? province.properties.center ?? null,
      provinceId: Number(province.properties.adcode),
      provinceName: province.properties.name,
    },
    geometry: feature.geometry,
  };
}

await mkdir(PROVINCE_ROOT, { recursive: true });
await mkdir(DATA_ROOT, { recursive: true });

console.log("Downloading national province boundaries...");
const china = await download(100000);
const provinceFeatures = china.features.filter((feature) => Number.isFinite(Number(feature.properties?.adcode)));
const provinces = provinceFeatures.map((feature) => ({
  id: Number(feature.properties.adcode),
  name: feature.properties.name,
  center: feature.properties.center ?? feature.properties.centroid ?? null,
}));

const cityFeatures = [];
const cities = [];

for (const province of provinceFeatures) {
  const provinceId = Number(province.properties.adcode);
  let rawFeatures;

  if (SINGLE_CITY_REGIONS.has(provinceId)) {
    rawFeatures = [province];
  } else {
    try {
      const provinceCities = await download(provinceId);
      rawFeatures = provinceCities.features?.length ? provinceCities.features : [province];
    } catch (error) {
      console.warn(`${province.properties.name}: falling back to province geometry (${error.message})`);
      rawFeatures = [province];
    }
  }

  const compact = rawFeatures.map((feature) => compactFeature(feature, province));
  cityFeatures.push(...compact);
  cities.push(...compact.filter((feature) => isPrefectureLevel(feature, provinceId)).map((feature) => ({
    id: feature.properties.id,
    name: feature.properties.name,
    provinceId,
    provinceName: province.properties.name,
    center: feature.properties.center,
  })));

  await writeFile(
    path.join(PROVINCE_ROOT, `${provinceId}.json`),
    JSON.stringify({ type: "FeatureCollection", features: compact }),
  );
  console.log(`${province.properties.name}: ${compact.length}`);
}

const provinceMapPayload = JSON.stringify({ ...china, features: provinceFeatures });
const cityMapPayload = JSON.stringify({ type: "FeatureCollection", features: cityFeatures });
await writeFile(path.join(MAP_ROOT, "china-provinces.json"), provinceMapPayload);
await writeFile(path.join(MAP_ROOT, "china-provinces.txt"), provinceMapPayload);
await writeFile(path.join(MAP_ROOT, "china-cities.json"), cityMapPayload);
await writeFile(path.join(MAP_ROOT, "china-cities.txt"), cityMapPayload);
await writeFile(
  path.join(DATA_ROOT, "administrative.json"),
  JSON.stringify({ provinces, cities }, null, 2),
);

console.log(`Map data ready: ${provinces.length} provinces, ${cities.length} cities.`);
