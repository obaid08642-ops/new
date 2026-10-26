/**
 * READ-ONLY. Counts, per locale and content field, the published products that have the text in that locale, the ones that have it
 * only in another language, and the ones that have it nowhere; plus the health of the per-locale slugs. Prints counts only (JSON lines),
 * never a text or a document. Run inside the backend container by `tools/ops/tasks/95-content-coverage.sh`; uses MONGO_URL / DB_NAME.
 */
import mongoose from 'mongoose';
import { mongoDirectConnection } from '../common/database/mongo-uri';
import { publicMedicineFilter } from '../modules/medicines/public-medicine-filter';
import { CATALOG_COLLECTIONS } from '../modules/catalogs/catalog-collections';
import { CONTENT_FIELDS } from '../modules/medicines/med-i18n';
import { CONTENT_LOCALES, addProduct, emptyCoverage, slugHealth } from '../modules/medicines/content-coverage';

const out = (o: Record<string, unknown>) => console.log(JSON.stringify(o));

export async function main(): Promise<number> {
  const uri = process.env.MONGO_URL;
  if (!uri) throw new Error('MONGO_URL is not set in this container');
  const conn = await mongoose.createConnection(uri, { dbName: process.env.DB_NAME || 'nabd_nestjs', directConnection: mongoDirectConnection(uri), maxPoolSize: 1, serverSelectionTimeoutMS: 30_000 }).asPromise();
  try {
    const cov = emptyCoverage();
    const rows: Array<Record<string, any>> = [];
    const cursor = conn.db!.collection(CATALOG_COLLECTIONS.medicines).find(publicMedicineFilter() as never, { projection: { _id: 0 } });
    for await (const raw of cursor) {
      addProduct(cov, raw);
      // only what the slug check reads is kept
      rows.push({ id: raw.id, slug: raw.slug, translations: Object.fromEntries(Object.entries(raw.translations ?? {}).map(([k, v]) => [k, { slug: (v as { slug?: string })?.slug }])) });
    }
    out({ cmd: 'content-coverage', published_products: rows.length });
    for (const l of CONTENT_LOCALES) for (const f of CONTENT_FIELDS) out({ locale: l, field: f, ...cov[l][f] });
    for (const l of CONTENT_LOCALES) out({ cmd: 'slugs', locale: l, ...slugHealth(rows, l) });
    return 0;
  } finally {
    await conn.close().catch(() => undefined);
  }
}

if (require.main === module) {
  main().then((c) => process.exit(c)).catch((e) => { console.error(`error: ${String((e as Error)?.message || e).replace(/mongodb(\+srv)?:\/\/\S+/gi, 'mongodb://<hidden>').slice(0, 300)}`); process.exit(1); });
}
