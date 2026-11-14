/**
 * READ-ONLY by default: counts the Cloudinary assets under `nabd/` that no live storage row points to (ops task 96k). Counts and megabytes per folder only.
 *   node dist/scripts/cloudinary-orphans.js            env: MONGO_URL, DB_NAME, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * Deleting needs the owner's approval of the dry-run numbers FIRST, and then all of: `--apply`, CLOUDINARY_ORPHAN_CONFIRM=<the cloud name>, and the same
 * minimum age (default 24 h: an upload may still be writing its row). Even with `--apply` only the ids the dry run counted as deletable go, in batches of 100.
 */
import { mongo } from 'mongoose';
import { classifyOrphans, reportLines } from './cloudinary-orphans-core';

const MIN_AGE_MS = (Number(process.env.CLOUDINARY_ORPHAN_MIN_AGE_HOURS) || 24) * 3_600_000;

(async () => {
  const { MONGO_URL: url, DB_NAME: name, CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!url || !name || !cloud || !key || !secret) { console.error('MONGO_URL, DB_NAME and the three CLOUDINARY_* variables are required'); process.exit(2); }
  const apply = process.argv.includes('--apply');
  if (apply && process.env.CLOUDINARY_ORPHAN_CONFIRM !== cloud) { console.error('--apply needs CLOUDINARY_ORPHAN_CONFIRM=<the cloud name> (after the owner approved the dry run)'); process.exit(2); }
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({ cloud_name: cloud, api_key: key, api_secret: secret, secure: true });
  const client = await mongo.MongoClient.connect(url);
  try {
    const refs = new Set<string>();
    const cur = client.db(name).collection('storage_objects').find({ backend: 'cloudinary', deleted: { $ne: true } }, { projection: { external_key: 1, 'cloudinary.publicId': 1, _id: 0 } });
    for await (const row of cur as any) { if (row.external_key) refs.add(row.external_key); if (row.cloudinary?.publicId) refs.add(row.cloudinary.publicId); }
    const assets: Array<{ public_id: string; bytes: number; created_at: string; type: string }> = [];
    for (const type of ['authenticated', 'upload', 'private']) {
      let next: string | undefined;
      do {
        const page = await cloudinary.api.resources({ type, prefix: 'nabd/', max_results: 500, next_cursor: next, resource_type: 'image' });
        for (const r of page.resources || []) assets.push({ public_id: r.public_id, bytes: r.bytes, created_at: r.created_at, type });
        next = page.next_cursor;
      } while (next);
    }
    const report = classifyOrphans(assets, refs, Date.now(), MIN_AGE_MS);
    for (const line of reportLines(report)) console.log(line);
    if (!apply) { console.log('cloudinary-orphans: dry run only, nothing was deleted'); return; }
    let gone = 0;
    for (let i = 0; i < report.deletable.length; i += 100) {
      const batch = report.deletable.slice(i, i + 100);
      for (const type of ['authenticated', 'upload', 'private']) {
        const ids = batch.filter((id) => assets.find((a) => a.public_id === id)?.type === type);
        if (ids.length) { await cloudinary.api.delete_resources(ids, { type, resource_type: 'image' }); gone += ids.length; }
      }
    }
    console.log(`cloudinary-orphans: APPLIED: deleted ${gone} orphan assets`);
  } finally { await client.close(); }
})().catch((e) => { console.error('failed:', e?.message); process.exit(1); });
