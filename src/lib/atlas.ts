import { prisma } from "@/lib/prisma";
import type { AtlasCity, AtlasData, PhotoSummary } from "@/lib/types";

export async function getAtlasData(): Promise<AtlasData> {
  const provinces = await prisma.province.findMany({
    orderBy: { id: "asc" },
    include: {
      cities: {
        orderBy: { id: "asc" },
        include: {
          travelRecords: {
            orderBy: { date: "desc" },
            include: {
              photos: { orderBy: { takenTime: "desc" } },
            },
          },
        },
      },
    },
  });

  const recentPhotos: PhotoSummary[] = [];
  const flattened: AtlasCity[] = [];

  const mappedProvinces = provinces.map((province) => {
    const cities = province.cities.map((city) => {
      const photos = city.travelRecords
        .flatMap((record) => record.photos.map((photo) => ({ photo, record })))
        .sort((a, b) => (b.photo.takenTime ?? b.record.date).getTime() - (a.photo.takenTime ?? a.record.date).getTime());
      const firstArchivedAt = city.travelRecords.reduce<Date | null>((earliest, record) => {
        if (!earliest || record.createdAt < earliest) return record.createdAt;
        return earliest;
      }, null);

      const photoSummaries = photos.slice(0, 5).map(({ photo }) => ({
        id: photo.id,
        filename: photo.filename,
        takenTime: photo.takenTime?.toISOString() ?? null,
        cityId: city.id,
        cityName: city.name,
        provinceName: province.name,
        latitude: photo.latitude,
        longitude: photo.longitude,
        featured: photo.featured,
      }));

      if (city.showOnWall) {
        recentPhotos.push(...photos
          .filter(({ photo }) => photo.featured)
          .slice(0, 3)
          .map(({ photo }) => ({
            id: photo.id,
            filename: photo.filename,
            takenTime: photo.takenTime?.toISOString() ?? null,
            cityId: city.id,
            cityName: city.name,
            provinceName: province.name,
            latitude: photo.latitude,
            longitude: photo.longitude,
            featured: photo.featured,
          })));
      }

      const mapped: AtlasCity = {
        id: city.id,
        name: city.name,
        provinceId: province.id,
        provinceName: province.name,
        longitude: city.longitude,
        latitude: city.latitude,
        showOnWall: city.showOnWall,
        visited: city.travelRecords.length > 0,
        tripCount: city.travelRecords.length,
        photoCount: photos.length,
        firstArchivedAt: firstArchivedAt?.toISOString() ?? null,
        lastVisited: city.travelRecords[0]?.date.toISOString() ?? null,
        photos: photoSummaries,
      };
      flattened.push(mapped);
      return mapped;
    });

    return {
      id: province.id,
      name: province.name,
      cityCount: cities.length,
      visitedCount: cities.filter((city) => city.visited).length,
      cities,
    };
  });

  recentPhotos.sort((a, b) => (b.takenTime ?? "").localeCompare(a.takenTime ?? ""));

  return {
    provinces: mappedProvinces,
    cities: flattened,
    recentPhotos,
    totals: {
      cities: flattened.length,
      visited: flattened.filter((city) => city.visited).length,
      photos: flattened.reduce((sum, city) => sum + city.photoCount, 0),
    },
  };
}
