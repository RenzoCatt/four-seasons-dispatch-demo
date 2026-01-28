import { prisma } from '../lib/prisma.ts';

async function main() {
  // Count total items
  const totalItems = await prisma.priceBookItem.count();
  console.log('Total items in database:', totalItems);

  // Count total rates
  const totalRates = await prisma.priceBookRate.count();
  console.log('Total rates in database:', totalRates);

  // Check for "duct" items
  const ductItems = await prisma.priceBookItem.findMany({
    where: {
      OR: [
        { name: { contains: 'duct', mode: 'insensitive' } },
        { description: { contains: 'duct', mode: 'insensitive' } },
        { code: { contains: 'duct', mode: 'insensitive' } },
      ],
    },
    include: {
      rates: true,
    },
  });

  console.log('\nFound', ductItems.length, 'items matching "duct":');
  ductItems.forEach(item => {
    console.log('-', item.code, ':', item.name);
    console.log('  Category:', item.category);
    console.log('  Rates:', item.rates.map(r => `${r.tier}=$${r.unitPrice}`).join(', '));
  });

  // Check active upload
  const activeUpload = await prisma.priceBookUpload.findFirst({
    where: { isActive: true },
  });

  if (activeUpload) {
    console.log('\nActive upload:');
    console.log('  Filename:', activeUpload.filename);
    console.log('  Uploaded:', activeUpload.createdAt);
    console.log('  Effective:', activeUpload.effectiveDate);
  } else {
    console.log('\nNo active upload found!');
  }

  // Get sample of categories
  const categories = await prisma.priceBookItem.groupBy({
    by: ['category'],
    _count: true,
  });

  console.log('\nCategories in database:');
  categories.forEach(cat => {
    console.log('-', cat.category, ':', cat._count, 'items');
  });
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
