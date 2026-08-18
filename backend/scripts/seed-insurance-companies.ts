// @ts-nocheck
/**
 * M3 seed (recreated M6 — the original was lost from the workspace before M3 packaging):
 * 10 major Saudi insurers used by the insurance dropdown (BR-2 / ER-7 manual flow).
 * Run: npx ts-node scripts/seed-insurance-companies.ts
 */
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nabdah';

const COMPANIES = [
  { code: 'bupa', name_ar: 'بوبا العربية', name_en: 'Bupa Arabia' },
  { code: 'tawuniya', name_ar: 'التعاونية', name_en: 'Tawuniya' },
  { code: 'medgulf', name_ar: 'ميدغلف', name_en: 'MedGulf' },
  { code: 'saico', name_ar: 'سايكو', name_en: 'SAICO' },
  { code: 'takaful_rajhi', name_ar: 'تكافل الراجحي', name_en: 'Takaful Al Rajhi' },
  { code: 'walaa', name_ar: 'ولاء', name_en: 'Walaa' },
  { code: 'allianz', name_ar: 'أليانز', name_en: 'Allianz Saudi Fransi' },
  { code: 'axa', name_ar: 'أكسا الخليج', name_en: 'AXA Gulf' },
  { code: 'cig', name_ar: 'المتحدة للتأمين', name_en: 'CIG' },
  { code: 'malath', name_ar: 'ملاذ للتأمين', name_en: 'Malath Insurance' },
];

async function main() {
  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.collection('insurance_companies');
  for (const c of COMPANIES) {
    await col.updateOne(
      { code: c.code },
      { $set: { ...c, is_active: true }, $setOnInsert: { id: new mongoose.Types.UUID().toString(), createdAt: new Date() } },
      { upsert: true },
    );
  }
  console.log(`Seeded ${COMPANIES.length} insurance companies`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
