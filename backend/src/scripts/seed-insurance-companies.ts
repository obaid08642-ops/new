/**
 * M3 — Seed the major Saudi insurance companies (idempotent).
 *   MONGO_URL=... npx ts-node src/scripts/seed-insurance-companies.ts
 */
import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';

const COMPANIES = [
  { code: 'bupa', name_ar: 'بوبا العربية', name_en: 'Bupa Arabia' },
  { code: 'tawuniya', name_ar: 'التعاونية للتأمين', name_en: 'Tawuniya' },
  { code: 'medgulf', name_ar: 'ميدغلف', name_en: 'MedGulf' },
  { code: 'saico', name_ar: 'سايكو للتأمين', name_en: 'SAICO' },
  { code: 'takaful_rajhi', name_ar: 'تكافل الراجحي', name_en: 'Al Rajhi Takaful' },
  { code: 'walaa', name_ar: 'ولاء للتأمين', name_en: 'Walaa' },
  { code: 'allianz', name_ar: 'أليانز السعودية', name_en: 'Allianz Saudi' },
  { code: 'axa', name_ar: 'أكسا الخليج', name_en: 'AXA Gulf' },
  { code: 'cig', name_ar: 'الخليجية العامة للتأمين', name_en: 'CIG' },
  { code: 'malath', name_ar: 'ملاذ للتأمين', name_en: 'Malath' },
];

async function main() {
  const { MONGO_URL, DB_NAME } = process.env;
  if (!MONGO_URL) { console.error('MONGO_URL is required'); process.exit(1); }
  await mongoose.connect(MONGO_URL, { dbName: DB_NAME || 'nabd' });
  const col = mongoose.connection.collection('insurancecompanies');

  let inserted = 0;
  for (const c of COMPANIES) {
    const exists = await col.findOne({ code: c.code });
    if (exists) continue;
    await col.insertOne({ id: uuid(), ...c, is_active: true, createdAt: new Date(), updatedAt: new Date() });
    inserted++;
  }
  console.log(`Insurance companies seeded: ${inserted} new (${COMPANIES.length} total catalog).`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
