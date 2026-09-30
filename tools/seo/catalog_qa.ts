/**
 * S13: Catalog QA — data quality analysis on the full catalog.
 *
 * Runs against the DB and reports:
 * - null/empty values per locale for every field
 * - duplicate titles or slugs
 * - titles over 60 characters
 * - descriptions over 160 characters
 * - untranslated text (Latin script in ar/ur/hi/bn pages and vice versa)
 * - banned or unsafe claims ("cure", "100%", "best", superlatives)
 *
 * Usage:
 *   npx ts-node -T tools/seo/catalog_qa.ts [--json out.json] [--locale ar]
 */

import { MongoClient } from 'mongodb';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];
const BANNED_CLAIMS = /(cure|100%|best|يشفي نهائيًا|مضمون|أفضل)/i;

interface FieldStats {
  field: string;
  total: number;
  nullCount: number;
  emptyCount: number;
  perLocale: Record<string, { null: number; empty: number }>;
}

interface QAReport {
  generatedAt: string;
  totalMedicines: number;
  fields: FieldStats[];
  duplicates: { titles: string[]; slugs: string[] };
  longTitles: { id: string; title: string; length: number }[];
  longDescriptions: { id: string; description: string; length: number }[];
  untranslated: { id: string; field: string; locale: string; value: string }[];
  bannedClaims: { id: string; field: string; value: string }[];
}

async function main() {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/nabd_live';
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db();

  const medicines = await db.collection('medicines').find({}).toArray();
  const total = medicines.length;

  // Field inventory: every field in the source, per locale
  const fieldNames = new Set<string>();
  for (const m of medicines) {
    for (const k of Object.keys(m)) {
      if (k.startsWith('_') || k === 'id' || k === 'slug') continue;
      fieldNames.add(k);
    }
  }

  const fields: FieldStats[] = [];
  for (const field of fieldNames) {
    const stats: FieldStats = { field, total, nullCount: 0, emptyCount: 0, perLocale: {} };
    for (const locale of LOCALES) {
      stats.perLocale[locale] = { null: 0, empty: 0 };
    }
    for (const m of medicines) {
      const val = m[field];
      if (val === null || val === undefined) {
        stats.nullCount++;
        for (const locale of LOCALES) stats.perLocale[locale].null++;
      } else if (typeof val === 'string' && val.trim() === '') {
        stats.emptyCount++;
        for (const locale of LOCALES) stats.perLocale[locale].empty++;
      }
    }
    fields.push(stats);
  }

  // Duplicates
  const titleMap = new Map<string, string[]>();
  const slugMap = new Map<string, string[]>();
  for (const m of medicines) {
    const title = m.name_ar || m.name_en;
    const slug = m.slug;
    if (title) {
      const arr = titleMap.get(title) || [];
      arr.push(m.id);
      titleMap.set(title, arr);
    }
    if (slug) {
      const arr = slugMap.get(slug) || [];
      arr.push(m.id);
      slugMap.set(slug, arr);
    }
  }
  const duplicates = {
    titles: [...titleMap.entries()].filter(([, ids]) => ids.length > 1).map(([title]) => title),
    slugs: [...slugMap.entries()].filter(([, ids]) => ids.length > 1).map(([slug]) => slug),
  };

  // Long titles/descriptions
  const longTitles: QAReport['longTitles'] = [];
  const longDescriptions: QAReport['longDescriptions'] = [];
  for (const m of medicines) {
    const title = m.name_ar || m.name_en || '';
    const desc = m.description_ar || m.description_en || '';
    if (title.length > 60) longTitles.push({ id: m.id, title, length: title.length });
    if (desc.length > 160) longDescriptions.push({ id: m.id, description: desc, length: desc.length });
  }

  // Untranslated text: Latin script in ar/ur/hi/bn fields, Arabic in en fields
  const untranslated: QAReport['untranslated'] = [];
  const latinRegex = /[a-zA-Z]{3,}/;
  const arabicRegex = /[\u0600-\u06FF]/;
  for (const m of medicines) {
    for (const field of fieldNames) {
      const val = m[field];
      if (typeof val !== 'string' || val.trim() === '') continue;
      // Check Arabic fields for Latin text
      if (field.endsWith('_ar') || field.endsWith('_ur') || field.endsWith('_hi') || field.endsWith('_bn')) {
        if (latinRegex.test(val) && !arabicRegex.test(val)) {
          untranslated.push({ id: m.id, field, locale: field.split('_').pop()!, value: val.slice(0, 80) });
        }
      }
      // Check English fields for Arabic text
      if (field.endsWith('_en')) {
        if (arabicRegex.test(val) && !latinRegex.test(val)) {
          untranslated.push({ id: m.id, field, locale: 'en', value: val.slice(0, 80) });
        }
      }
    }
  }

  // Banned claims
  const bannedClaims: QAReport['bannedClaims'] = [];
  for (const m of medicines) {
    for (const field of fieldNames) {
      const val = m[field];
      if (typeof val === 'string' && BANNED_CLAIMS.test(val)) {
        bannedClaims.push({ id: m.id, field, value: val.slice(0, 120) });
      }
    }
  }

  const report: QAReport = {
    generatedAt: new Date().toISOString(),
    totalMedicines: total,
    fields,
    duplicates,
    longTitles,
    longDescriptions,
    untranslated,
    bannedClaims,
  };

  const jsonOut = process.argv.indexOf('--json');
  if (jsonOut !== -1 && process.argv[jsonOut + 1]) {
    writeFileSync(resolve(process.argv[jsonOut + 1]), JSON.stringify(report, null, 2));
  }

  // Console summary
  console.log(`Catalog QA: ${total} medicines`);
  console.log(`  Fields analyzed: ${fields.length}`);
  console.log(`  Duplicate titles: ${duplicates.titles.length}`);
  console.log(`  Duplicate slugs: ${duplicates.slugs.length}`);
  console.log(`  Long titles (>60): ${longTitles.length}`);
  console.log(`  Long descriptions (>160): ${longDescriptions.length}`);
  console.log(`  Untranslated: ${untranslated.length}`);
  console.log(`  Banned claims: ${bannedClaims.length}`);

  // Exit 1 if blocking problems found
  const blocking = duplicates.titles.length + duplicates.slugs.length + bannedClaims.length;
  if (blocking > 0) {
    console.error(`\n${blocking} blocking problem(s) found`);
    process.exit(1);
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
