import 'dotenv/config';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { importPricebook } from '../lib/pricebook/importPricebook.js';

async function main() {
  const filePath = 'pricebook_items_tiers_extracted.csv';
  const csvText = fs.readFileSync(filePath, 'utf8');
  const checksum = crypto.createHash('md5').update(csvText).digest('hex');

  console.log('Checksum:', checksum);

  // Create upload record
  const upload = await prisma.priceBookUpload.create({
    data: {
      filename: filePath,
      checksum,
      notes: null,
      isActive: false,
      effectiveDate: new Date(),
    },
  });
  console.log('Created upload:', upload.id);

  // Import
  const result = await importPricebook({ uploadId: upload.id, csvText });
  console.log('Import result:', result);

  // Deactivate others, activate this
  await prisma.priceBookUpload.updateMany({ where: { isActive: true }, data: { isActive: false } });
  await prisma.priceBookUpload.update({ where: { id: upload.id }, data: { isActive: true } });

  console.log('Upload activated.');
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
