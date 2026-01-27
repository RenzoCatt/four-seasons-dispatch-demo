import fs from 'node:fs';

async function main() {
  const url = 'http://localhost:3000/api/pricebook/uploads';
  const csvPath = 'pricebook_items_tiers_extracted.csv';
  const buffer = fs.readFileSync(csvPath);
  const form = new FormData();
  form.append('files', new Blob([buffer], { type: 'text/csv' }), 'pricebook_items_tiers_extracted.csv');

  const res = await fetch(url, { method: 'POST', body: form });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log(text);
}

main().catch((e) => { console.error(e); process.exit(1); });
