import mongoose from 'mongoose';
import * as fs from 'fs';
import * as zlib from 'zlib';
import * as readline from 'readline';

/**
 * Catalog v14 full replacement import.
 *
 * Replaces the medicines_master collection with the v14 catalog export
 * (JSONL, optionally gzipped). Every row carries:
 *   - canonical retail identity: sku (unique), source_product_id
 *   - governance: verified + public_eligibility + indexing_eligibility + approved
 *   - provenance: 'catalog_v14'
 *   - 6-locale translations map (ar,en,ur,hi,bn + fil stored under tl)
 *
 * Safety contract: run only AFTER the pre-v14 backup has been exported and
 * uploaded (see release `medicines-backup-pre-v14-20260830`).
 *
 * Usage:
 *   MONGO_URL=... CATALOG_V14_FILE=/tmp/catalog_v14.jsonl.gz CATALOG_V14_CONFIRM=apply \
 *     npx ts-node scripts/import-catalog-v14.ts
 *   # dry-run (parse + validate only, no writes):
 *   MONGO_URL=... CATALOG_V14_FILE=... npx ts-node scripts/import-catalog-v14.ts
 */

const DB_LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'tl'] as const;

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}
function strArr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x ?? '').trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    return v.split(/\n|•/).map((s) => s.replace(/^[\s\-–—*·]+/, '').trim()).filter(Boolean);
  }
  return [];
}

export function mapV14Row(row: any): Record<string, any> {
  const tr = row.translations || {};
  const translations: Record<string, any> = {};
  for (const [src, db] of [['ar', 'ar'], ['en', 'en'], ['ur', 'ur'], ['hi', 'hi'], ['bn', 'bn'], ['fil', 'tl']] as const) {
    const t = tr[src];
    if (t && typeof t === 'object') translations[db] = t;
  }
  const ar = translations.ar || {};
  const en = translations.en || {};
  const images = [row.image_1, row.image_2, row.image_3, row.image_4, row.image_5].filter((u: any) => typeof u === 'string' && u.length > 4);

  return {
    id: `med_v14_${row.productId}`,
    sku: typeof row.sku === 'number' ? row.sku : Number(row.sku) || undefined,
    source_product_id: typeof row.productId === 'number' ? row.productId : Number(row.productId) || undefined,
    slug: str(en.slug) || str(ar.slug),
    name_ar: str(ar.name) || str(en.name),
    name_en: str(en.name) || str(ar.name),
    active_ingredient: str(row.active_ingredient),
    generic_name: str(row.active_ingredient),
    category: str(ar.main_category) || 'medications',
    sub_category: str(ar.sub_category),
    sub_sub_category: str(ar.sub_sub_category),
    categories: [str(ar.main_category), str(ar.sub_category), str(ar.sub_sub_category)].filter(Boolean),
    price: Number(row.price || 0),
    old_price: row.old_price != null ? Number(row.old_price) : undefined,
    barcode: str(row.barcode),
    requires_prescription: row.is_rx === true,
    available_online: row.available_online === true,
    online_exclusive: row.has_exclusive_online_label === true,
    country_of_origin: str(row.country_of_origin),
    translation_conflict: row.translation_conflict === true,
    review_reason: str(row.review_reason),
    form: str(row.dosage_form),
    strength: str(row.strength),
    package_size: str(row.size_volume),
    // Long-text columns (ar/en) from the translations map
    description_ar: str(ar.description), description_en: str(en.description),
    indications_ar: strArr(ar.indications_uses), indications_en: strArr(en.indications_uses),
    warnings_ar: strArr(ar.warnings_precautions), warnings_en: strArr(en.warnings_precautions),
    side_effects_ar: strArr(ar.side_effects), side_effects_en: strArr(en.side_effects),
    dosage_ar: str(ar.dosage_instructions), dosage_en: str(en.dosage_instructions),
    usage_instructions_ar: strArr(ar.how_to_use).join('\n'), usage_instructions_en: strArr(en.how_to_use).join('\n'),
    storage_conditions_ar: str(ar.storage_conditions), storage_conditions_en: str(en.storage_conditions),
    more_info_ar: str(ar.more_information), more_info_en: str(en.more_information),
    images,
    image_1: str(row.image_1), image_2: str(row.image_2), image_3: str(row.image_3), image_4: str(row.image_4), image_5: str(row.image_5),
    translations,
    // v14 is a reviewed, published retail catalog — full public governance flags
    verified: true,
    public_eligibility: true,
    indexing_eligibility: true,
    medical_review_status: 'approved',
    last_reviewed: new Date(),
    provenance: 'catalog_v14',
    source: 'master',
    availability_status: 'none',
    is_deleted: false,
    version: 14,
  };
}

export function validateV14Doc(doc: Record<string, any>, lineNo: number): string[] {
  const problems: string[] = [];
  if (!doc.name_ar || !doc.name_en) problems.push('missing name_ar/name_en');
  if (doc.sku === undefined) problems.push('missing sku');
  for (const l of DB_LANGS) {
    if (!doc.translations?.[l]?.name) problems.push(`missing translations.${l}.name`);
    if (!doc.translations?.[l]?.slug) problems.push(`missing translations.${l}.slug`);
  }
  return problems.map((p) => `line ${lineNo}: ${p}`);
}

async function main() {
  const file = process.env.CATALOG_V14_FILE;
  const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGODB_URI;
  const apply = process.env.CATALOG_V14_CONFIRM === 'apply';
  if (!file) throw new Error('CATALOG_V14_FILE is required');
  if (!mongoUrl) throw new Error('MONGO_URL is required');

  const stream = fs.createReadStream(file).pipe(file.endsWith('.gz') ? zlib.createGunzip() : new (require('stream').PassThrough)());
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const docs: Record<string, any>[] = [];
  const errors: string[] = [];
  const seenSku = new Set<number>();
  const seenSlugs = new Map<string, Set<string>>();
  let lineNo = 0;
  for await (const line of rl) {
    lineNo += 1;
    if (!line.trim()) continue;
    let row: any;
    try { row = JSON.parse(line); } catch { errors.push(`line ${lineNo}: invalid JSON`); continue; }
    const doc = mapV14Row(row);
    errors.push(...validateV14Doc(doc, lineNo));
    if (doc.sku !== undefined) {
      if (seenSku.has(doc.sku)) errors.push(`line ${lineNo}: duplicate sku ${doc.sku}`);
      seenSku.add(doc.sku);
    }
    for (const l of DB_LANGS) {
      const slug = doc.translations?.[l]?.slug;
      if (!slug) continue;
      const key = `${l}:${slug}`;
      const set = seenSlugs.get(key) || new Set<string>();
      if (set.size) errors.push(`line ${lineNo}: duplicate slug ${l}:${slug}`);
      set.add(doc.id);
      seenSlugs.set(key, set);
    }
    docs.push(doc);
  }

  console.log(`parsed ${docs.length} rows, ${errors.length} validation problems`);
  if (errors.length) {
    console.log(errors.slice(0, 40).join('\n'));
    throw new Error(`validation failed with ${errors.length} problems — refusing to import`);
  }
  if (!apply) {
    console.log('dry-run complete (no writes). Set CATALOG_V14_CONFIRM=apply to import.');
    return;
  }

  await mongoose.connect(mongoUrl, { dbName: process.env.MONGO_DB || undefined });
  const col = mongoose.connection.collection('medicines_master');
  const before = await col.countDocuments({});
  console.log(`existing documents: ${before} — deleting (backup release: medicines-backup-pre-v14-20260830)`);
  await col.deleteMany({});
  const BATCH = 1000;
  for (let i = 0; i < docs.length; i += BATCH) {
    await col.insertMany(docs.slice(i, i + BATCH), { ordered: false });
    console.log(`inserted ${Math.min(i + BATCH, docs.length)}/${docs.length}`);
  }
  // Rebuild indexes declared by the schema (sku, per-locale slugs, text search…)
  const { MedicineSchema } = await import('../src/schemas/medicine.schema');
  await mongoose.model('Medicine', MedicineSchema).createIndexes();
  console.log(`done: ${await col.countDocuments({})} documents, indexes rebuilt`);
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((e) => { console.error(e?.message || e); process.exit(1); });
}
