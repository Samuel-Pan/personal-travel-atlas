import { PrismaClient } from "@prisma/client";
import administrative from "../src/data/administrative.json";

const prisma = new PrismaClient();

async function main() {
  for (const province of administrative.provinces) {
    await prisma.province.upsert({
      where: { id: province.id },
      update: {
        name: province.name,
        centerLng: province.center?.[0] ?? null,
        centerLat: province.center?.[1] ?? null,
      },
      create: {
        id: province.id,
        name: province.name,
        centerLng: province.center?.[0] ?? null,
        centerLat: province.center?.[1] ?? null,
      },
    });
  }

  for (const city of administrative.cities) {
    await prisma.city.upsert({
      where: { id: city.id },
      update: {
        name: city.name,
        provinceId: city.provinceId,
        longitude: city.center?.[0] ?? null,
        latitude: city.center?.[1] ?? null,
      },
      create: {
        id: city.id,
        name: city.name,
        provinceId: city.provinceId,
        longitude: city.center?.[0] ?? null,
        latitude: city.center?.[1] ?? null,
      },
    });
  }

  console.log(`Seeded ${administrative.provinces.length} provinces and ${administrative.cities.length} cities.`);
}

main()
  .finally(async () => prisma.$disconnect());

