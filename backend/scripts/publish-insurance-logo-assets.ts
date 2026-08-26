/*
 * Reviewed release step for insurance-logo assets.
 *
 * Default: dry run; no database/object-storage mutation.
 * Apply: MONGO_URI=... S3_BUCKET=... S3_ENDPOINT=... S3_ACCESS_KEY_ID=...
 *        S3_SECRET_ACCESS_KEY=... S3_PUBLIC_BASE_URL=... \
 *        npx ts-node scripts/publish-insurance-logo-assets.ts --apply
 *
 * Never deletes objects or insurer records and never changes is_active,
 * catalog_status, aliases, or network data. Only official_source_collected
 * assets whose SHA-256 matches the manifest are uploaded and linked.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');
const ROOT = path.resolve(__dirname, '../assets/insurance-logos');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const approved = manifest.companies.filter((company: any) => company.logo_status === 'official_source_collected');
const required = ['MONGO_URI', 'S3_BUCKET', 'S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_BASE_URL'];

function verify(company: any) {
  const file = path.join(ROOT, path.basename(company.icon_path));
  const data = fs.readFileSync(file);
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  if (hash !== company.icon_sha256) throw new Error(`checksum mismatch: ${company.code}`);
  return { file, data };
}

async function main() {
  const checks = approved.map((company: any) => ({ code: company.code, ...verify(company), company }));
  if (!APPLY) {
    console.log(JSON.stringify({ mode: 'dry_run', candidates: checks.map(({ code, file, company }: any) => ({ code, file: path.basename(file), sha256: company.icon_sha256 })) }, null, 2));
    return;
  }
  for (const key of required) if (!process.env[key]) throw new Error(`${key} is required with --apply`);
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({ region: process.env.S3_REGION || 'auto', endpoint: process.env.S3_ENDPOINT, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }, forcePathStyle: true });
  await mongoose.connect(process.env.MONGO_URI as string);
  const collection = mongoose.connection.collection('insurance_companies');
  for (const { company, data } of checks) {
    const key = `catalog/insurance-logos/${company.code}.webp`;
    await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: data, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' }));
    await collection.updateOne({ code: company.code }, { $set: { logo_url: `${process.env.S3_PUBLIC_BASE_URL}/${key}`, logo_source_url: company.logo_source_url, logo_sha256: company.icon_sha256, logo_verified_at: new Date() } });
  }
  await mongoose.disconnect();
  console.log(JSON.stringify({ mode: 'apply', published: checks.map(({ code }: any) => code) }, null, 2));
}
main().catch(async (error) => { console.error(error); await mongoose.disconnect().catch(() => undefined); process.exit(1); });
