import mongoose from 'mongoose';
import { writeFileSync } from 'fs';
import { buildMedicineReport, medicineReportMarkdown } from '../src/modules/seo-search/medicine-publication-report';

/**
 * Medicine SEO report (read-only): approved for publication and translation gaps per locale.
 * Same numbers as GET /api/v1/admin/seo/medicine-report.
 *
 * Usage:
 *   MONGO_URL=... DB_NAME=... npx ts-node -T scripts/seo-medicine-report.ts [--json out.json] [--md out.md]
 */
async function main() {
  const url = process.env.MONGO_URL;
  if (!url) throw new Error('MONGO_URL is required');
  const conn = await mongoose.createConnection(url, { dbName: process.env.DB_NAME || undefined }).asPromise();
  try {
    const report = await buildMedicineReport(conn);
    const arg = (flag: string) => { const i = process.argv.indexOf(flag); return i > 0 ? process.argv[i + 1] : undefined; };
    const json = arg('--json');
    const md = arg('--md');
    if (json) writeFileSync(json, JSON.stringify(report, null, 2));
    if (md) writeFileSync(md, medicineReportMarkdown(report) + '\n');
    process.stdout.write(medicineReportMarkdown(report) + '\n');
  } finally {
    await conn.close();
  }
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
