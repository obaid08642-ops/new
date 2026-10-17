// Issue 1556 (owner comment 2026-10-16): the CDN bucket holds 2-5 pictures for most products, the database kept one.
// This backfill takes the picture list from the BUCKET LISTING (S3/R2 ListObjectsV2), never from guessed URLs:
//   keys `<code>_<n>.<ext>` and `<code>_img_<n>.<ext>` (code = the product's source_product_id), ordered by n
//   (the plain name before `_img_` for the same n), written in that order to images[] and image_1..image_5
//   (image = the first). Entries already in images[] that are not bucket keys (admin uploads) are kept after them.
// Idempotent (a product whose list is already right is not written) and resumable (it can stop and run again).
// Dry-run by default; --apply writes; --purge (with --apply) purges the "medicines" cache tag once at the end
// (Cloudflare Cache-Tag + Next revalidateTag, the same targets as the API's PurgeBus).
//
// Env: MONGODB_URI, DB_NAME; bucket: CATALOGUE_IMAGES_BUCKET (default S3_BUCKET), CATALOGUE_IMAGES_PREFIX (default ''),
//      S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY. Runbook: docs/ops/catalogue-images-backfill.md
// Usage: npx ts-node --transpile-only scripts/migrations/2026-10-catalogue-images-from-bucket.ts [--apply [--purge]] [--codes=1,2,3]
import mongoose from 'mongoose';
import { defaultTargets } from '../../src/common/purge-bus';

const APPLY = process.argv.includes('--apply');
const PURGE = process.argv.includes('--purge');
const CODES = process.argv.find((a) => a.startsWith('--codes='))?.slice(8).split(',').map((s) => s.trim()).filter(Boolean);
const BUCKET = process.env.CATALOGUE_IMAGES_BUCKET || process.env.S3_BUCKET || '';
const PREFIX = process.env.CATALOGUE_IMAGES_PREFIX || '';
const KEY_RX = /^(\d+)_(img_)?(\d+)\.(webp|jpe?g|png)$/i;

/** Bucket listing -> code -> ordered keys (without the prefix, as the catalogue stores them). */
export function groupKeys(keys: string[]): Map<string, string[]> {
  const by = new Map<string, { key: string; n: number; img: number }[]>();
  for (const full of keys) {
    const key = full.slice(PREFIX.length);
    const m = KEY_RX.exec(key);
    if (!m) continue;
    const list = by.get(m[1]) || [];
    list.push({ key, n: Number(m[3]), img: m[2] ? 1 : 0 });
    by.set(m[1], list);
  }
  const out = new Map<string, string[]>();
  for (const [code, list] of by) out.set(code, list.sort((a, b) => a.n - b.n || a.img - b.img || a.key.localeCompare(b.key)).map((x) => x.key));
  return out;
}

async function listBucket(): Promise<string[]> {
  if (!BUCKET || !process.env.S3_ENDPOINT) throw new Error('bucket not configured (CATALOGUE_IMAGES_BUCKET or S3_BUCKET, S3_ENDPOINT, keys)');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
  const client = new S3Client({
    region: process.env.S3_REGION || 'auto', endpoint: process.env.S3_ENDPOINT, forcePathStyle: true,
    credentials: { accessKeyId: String(process.env.S3_ACCESS_KEY_ID || ''), secretAccessKey: String(process.env.S3_SECRET_ACCESS_KEY || '') },
  });
  const prefixes = CODES?.length ? CODES.map((c) => `${PREFIX}${c}_`) : [PREFIX];
  const keys: string[] = [];
  for (const Prefix of prefixes) {
    let token: string | undefined;
    do {
      const page: { Contents?: { Key?: string }[]; IsTruncated?: boolean; NextContinuationToken?: string } =
        await client.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix, ContinuationToken: token, MaxKeys: 1000 }));
      for (const o of page.Contents || []) if (o.Key) keys.push(o.Key);
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  }
  return keys;
}

async function run() {
  const keys = await listBucket();
  const byCode = groupKeys(keys);
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017', { dbName: process.env.DB_NAME || 'nabd' });
  const meds = mongoose.connection.collection('medicines');
  const filter: Record<string, unknown> = { is_deleted: { $ne: true }, source_product_id: { $exists: true } };
  if (CODES?.length) filter.source_product_id = { $in: CODES.map(Number) };
  const hist = (m: Map<number, number>, n: number) => m.set(n, (m.get(n) || 0) + 1);
  const before = new Map<number, number>(); const after = new Map<number, number>(); const atSource = new Map<number, number>();
  let products = 0, changed = 0, reordered = 0, noBucketKeys = 0, written = 0;
  const cur = meds.find(filter, { projection: { _id: 1, id: 1, source_product_id: 1, images: 1, image: 1 } }).sort({ _id: 1 }).batchSize(500);
  for await (const m of cur) {
    products += 1;
    const current: string[] = Array.isArray(m.images) ? m.images.filter(Boolean) : [];
    hist(before, current.length);
    const fromBucket = byCode.get(String(m.source_product_id)) || [];
    hist(atSource, fromBucket.length);
    if (!fromBucket.length) { noBucketKeys += 1; hist(after, current.length); continue; }
    const others = current.filter((u) => !KEY_RX.test(u));
    const next = [...fromBucket, ...others];
    hist(after, next.length);
    if (JSON.stringify(next) === JSON.stringify(current)) continue;
    changed += 1;
    if (fromBucket.length === current.filter((u) => KEY_RX.test(u)).length && fromBucket.every((k) => current.includes(k))) reordered += 1;
    if (APPLY) {
      const slots = Object.fromEntries([1, 2, 3, 4, 5].map((i) => [`image_${i}`, next[i - 1] ?? null]));
      await meds.updateOne({ _id: m._id }, { $set: { images: next, image: next[0], ...slots, updatedAt: new Date() } });
      written += 1;
    }
  }
  const obj = (h: Map<number, number>) => Object.fromEntries([...h.entries()].sort((a, b) => a[0] - b[0]));
  const report = {
    mode: APPLY ? 'apply' : 'dry-run', bucket: BUCKET, prefix: PREFIX, bucket_keys: keys.length, codes_in_bucket: byCode.size,
    products, products_without_bucket_keys: noBucketKeys, would_change: changed, of_which_order_only: reordered, written,
    pictures_per_product: { db_before: obj(before), bucket: obj(atSource), db_after: obj(after) },
    more_than_one_picture: { db_before: [...before].filter(([n]) => n > 1).reduce((s, [, c]) => s + c, 0), bucket: [...atSource].filter(([n]) => n > 1).reduce((s, [, c]) => s + c, 0) },
  };
  console.log(JSON.stringify(report));
  if (APPLY && PURGE && written) {
    const t = defaultTargets();
    await t.cloudflare(['medicines']);
    await t.next(['medicines']);
    console.log(JSON.stringify({ purged: ['medicines'] }));
  }
}

if (require.main === module) {
  run()
    .then(() => mongoose.disconnect())
    .catch(async (e) => {
      console.error(e);
      await mongoose.disconnect().catch(() => null);
      process.exit(1);
    });
}
