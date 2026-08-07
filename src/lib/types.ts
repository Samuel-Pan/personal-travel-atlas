export type PhotoSummary = {
  id: string;
  filename: string;
  takenTime: string | null;
  cityId: number;
  cityName: string;
  provinceName: string;
  latitude: number | null;
  longitude: number | null;
  featured: boolean;
};

export type AtlasCity = {
  id: number;
  name: string;
  provinceId: number;
  provinceName: string;
  longitude: number | null;
  latitude: number | null;
  showOnWall: boolean;
  visited: boolean;
  tripCount: number;
  photoCount: number;
  firstArchivedAt: string | null;
  lastVisited: string | null;
  photos: PhotoSummary[];
};

export type AtlasProvince = {
  id: number;
  name: string;
  cityCount: number;
  visitedCount: number;
  cities: AtlasCity[];
};

export type AtlasData = {
  provinces: AtlasProvince[];
  cities: AtlasCity[];
  recentPhotos: PhotoSummary[];
  totals: {
    cities: number;
    visited: number;
    photos: number;
  };
};

export type AtlasGeoFeature = {
  type: "Feature";
  properties: {
    id?: number;
    adcode?: number;
    name?: string;
    center?: [number, number];
    provinceId?: number;
  };
  geometry: GeoJSON.Geometry;
};

export type AtlasGeoCollection = {
  type: "FeatureCollection";
  features: AtlasGeoFeature[];
};
