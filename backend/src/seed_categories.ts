import { prisma } from './infrastructure/prisma/prisma.client';

export const STANDARD_CATEGORIES = [
  { name: 'Sedan', slug: 'sedan', description: 'Standard & Executive 4-Door Sedans (up to 5-6 passengers)', baseRate: 8000 },
  { name: 'SUV', slug: 'suv', description: 'Compact, Mid-Size & Full-Size SUVs (5 to 8 passengers)', baseRate: 15000 },
  { name: 'Pickup Truck', slug: 'pickup', description: 'Single & Double Cab Utility Pickups (2 to 5-6 passengers)', baseRate: 14000 },
  { name: 'Van / Minibus', slug: 'van-minibus', description: 'High-Capacity Passenger Vans & Shuttles (10 to 20 passengers)', baseRate: 22000 },
  { name: 'Hatchback', slug: 'hatchback', description: 'City Compact & Urban Runabouts (4 to 5 passengers)', baseRate: 6000 },
  { name: 'Coupe / Sports', slug: 'coupe-sports', description: 'High Performance & Grand Tourers (2 to 4 passengers)', baseRate: 25000 },
  { name: 'Luxury / Executive', slug: 'luxury-executive', description: 'Flagship Premium & Chauffeur Fleet (4 to 5 passengers)', baseRate: 35000 },
];

async function seedCategories() {
  console.log('Seeding standard vehicle categories...');
  for (const cat of STANDARD_CATEGORIES) {
    await prisma.vehicleCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, baseRate: cat.baseRate },
      create: { name: cat.name, slug: cat.slug, description: cat.description, baseRate: cat.baseRate },
    });
  }
  const all = await prisma.vehicleCategory.findMany();
  console.log(`Successfully seeded ${all.length} categories:`, all.map(c => c.name));
  await prisma.$disconnect();
}

seedCategories().catch((e) => {
  console.error(e);
  process.exit(1);
});
