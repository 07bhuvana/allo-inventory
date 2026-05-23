import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.reservation.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.idempotencyRecord.deleteMany();

  // Create warehouses
  const warehouse1 = await prisma.warehouse.create({
    data: { name: 'Mumbai Central', location: 'Mumbai, Maharashtra' },
  });
  const warehouse2 = await prisma.warehouse.create({
    data: { name: 'Delhi North Hub', location: 'New Delhi, Delhi' },
  });
  const warehouse3 = await prisma.warehouse.create({
    data: { name: 'Bangalore Tech Park', location: 'Bengaluru, Karnataka' },
  });

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Wireless Noise-Cancelling Headphones',
        description: 'Premium over-ear headphones with 40-hour battery life and adaptive ANC.',
        sku: 'SKU-HEADPH-001',
        price: 8999,
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Mechanical Keyboard TKL',
        description: 'Tenkeyless mechanical keyboard with Cherry MX switches and RGB backlighting.',
        sku: 'SKU-KEYBD-002',
        price: 5499,
        imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&q=80',
      },
    }),
    prisma.product.create({
      data: {
        name: 'USB-C Hub 7-in-1',
        description: 'Expand your laptop ports with HDMI 4K, USB 3.0, SD card reader, and more.',
        sku: 'SKU-USBHB-003',
        price: 2299,
        imageUrl: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400&q=80',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Smart Watch Series X',
        description: 'Health and fitness tracker with AMOLED display and 7-day battery.',
        sku: 'SKU-WATCH-004',
        price: 12999,
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Portable SSD 1TB',
        description: 'NVMe portable SSD with 1050 MB/s read speed and shock resistance.',
        sku: 'SKU-PSSD-005',
        price: 6799,
        imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&q=80',
      },
    }),
  ]);

  // Create stock levels
  const stockData = [
    // Headphones
    { productId: products[0].id, warehouseId: warehouse1.id, totalUnits: 25, reservedUnits: 0 },
    { productId: products[0].id, warehouseId: warehouse2.id, totalUnits: 3, reservedUnits: 0 },
    { productId: products[0].id, warehouseId: warehouse3.id, totalUnits: 0, reservedUnits: 0 },
    // Keyboard
    { productId: products[1].id, warehouseId: warehouse1.id, totalUnits: 1, reservedUnits: 0 },
    { productId: products[1].id, warehouseId: warehouse2.id, totalUnits: 12, reservedUnits: 0 },
    { productId: products[1].id, warehouseId: warehouse3.id, totalUnits: 8, reservedUnits: 0 },
    // USB Hub
    { productId: products[2].id, warehouseId: warehouse1.id, totalUnits: 50, reservedUnits: 0 },
    { productId: products[2].id, warehouseId: warehouse3.id, totalUnits: 30, reservedUnits: 0 },
    // Smart Watch
    { productId: products[3].id, warehouseId: warehouse1.id, totalUnits: 2, reservedUnits: 0 },
    { productId: products[3].id, warehouseId: warehouse2.id, totalUnits: 2, reservedUnits: 0 },
    { productId: products[3].id, warehouseId: warehouse3.id, totalUnits: 15, reservedUnits: 0 },
    // Portable SSD
    { productId: products[4].id, warehouseId: warehouse2.id, totalUnits: 20, reservedUnits: 0 },
    { productId: products[4].id, warehouseId: warehouse3.id, totalUnits: 10, reservedUnits: 0 },
  ];

  for (const stock of stockData) {
    await prisma.stockLevel.create({ data: stock });
  }

  console.log('✅ Seeding complete!');
  console.log(`   Created ${3} warehouses`);
  console.log(`   Created ${products.length} products`);
  console.log(`   Created ${stockData.length} stock level entries`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
