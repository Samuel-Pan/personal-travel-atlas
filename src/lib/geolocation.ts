import administrative from "@/data/administrative.json";
import cityGeoJson from "../../public/maps/china-cities.json";

type Position = [number, number];
type PolygonCoordinates = Position[][];
type MultiPolygonCoordinates = Position[][][];

type CityFeature = {
  properties: { id?: number; adcode?: number; provinceId?: number };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: PolygonCoordinates | MultiPolygonCoordinates;
  };
};

const validCities = new Map(administrative.cities.map((city) => [city.id, city]));
const features = cityGeoJson.features as unknown as CityFeature[];

function pointInRing([x, y]: Position, ring: Position[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point: Position, polygon: PolygonCoordinates) {
  if (!polygon.length || !pointInRing(point, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(point, hole));
}

function contains(feature: CityFeature, point: Position) {
  if (feature.geometry.type === "Polygon") {
    return pointInPolygon(point, feature.geometry.coordinates as PolygonCoordinates);
  }
  return (feature.geometry.coordinates as MultiPolygonCoordinates).some((polygon) => pointInPolygon(point, polygon));
}

function nearestCity(provinceId: number, longitude: number, latitude: number) {
  const candidates = administrative.cities.filter((city) => city.provinceId === provinceId && city.center);
  const latitudeScale = Math.cos(latitude * Math.PI / 180);
  return candidates
    .map((city) => ({
      id: city.id,
      distance: Math.hypot((city.center![0] - longitude) * latitudeScale, city.center![1] - latitude),
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.id ?? null;
}

export function resolveCityFromCoordinates(latitude: number, longitude: number) {
  const feature = features.find((item) => contains(item, [longitude, latitude]));
  if (!feature) return null;

  const featureId = Number(feature.properties.id ?? feature.properties.adcode);
  if (validCities.has(featureId)) return featureId;

  const provinceId = Number(feature.properties.provinceId);
  return Number.isFinite(provinceId) ? nearestCity(provinceId, longitude, latitude) : null;
}
