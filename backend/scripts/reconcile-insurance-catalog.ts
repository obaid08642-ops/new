/*
 * Non-destructive insurance catalog reconciliation.
 *
 * Default: dry-run only.
 * Apply: MONGO_URI=... npx ts-node scripts/reconcile-insurance-catalog.ts --apply
 *
 * Guarantees:
 * - never deletes companies or networks;
 * - never changes is_active/catalog_status on existing records;
 * - adds only missing manifest entities as disabled, pending-review records;
 * - does not assign logo_url before approved R2/CDN publication.
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';

type ManifestCompany = {
  code: string;
  name_ar: string;
  name_en: string;
  regulatory_source_url?: string;
  logo_status?: string;
  logo_source_url?: string | null;
  icon_sha256?: string;
};

const APPLY = process.argv.includes('--apply');
const MONGO_URI = process.env.MONGO_URI;
const MANIFEST_PATH = path.resolve(__dirname, '../assets/insurance-logos/manifest.json');

function readManifest(): ManifestCompany[] {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  if (!Array.isArray(manifest?.companies)) throw new Error('manifest.companies is required');
  return manifest.companies;
}

async function main() {
  const companies = readManifest();
  if (!APPLY) {
    console.log(JSON.stringify({
      mode: 'dry_run',
      manifest_path: MANIFEST_PATH,
      company_count: companies.length,
      official_logo_candidates: companies.filter((company) => company.logo_status === 'official_source_collected').length,
      action: 'No database mutation. Re-run with --apply and an approved MONGO_URI after reviewer approval.',
    }, null, 2));
    return;
  }
  if (!MONGO_URI) throw new Error('MONGO_URI is required with --apply');

  await mongoose.connect(MONGO_URI);
  const collection = mongoose.connection.collection('insurance_companies');
  let inserted = 0;
  let existing = 0;
  for (const company of companies) {
    const result = await collection.updateOne(
      { code: company.code.toLowerCase() },
      {
        $setOnInsert: {
          id: uuid(),
          code: company.code.toLowerCase(),
          name_ar: company.name_ar,
          name_en: company.name_en,
          regulatory_source_url: company.regulatory_source_url || null,
          provenance: `catalog_manifest:${path.basename(MANIFEST_PATH)}`,
          catalog_version: 1,
          catalog_status: 'pending_review',
          is_active: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount) inserted += 1;
    else existing += 1;
  }
  console.log(JSON.stringify({ mode: 'apply', inserted, existing, company_count: companies.length }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
