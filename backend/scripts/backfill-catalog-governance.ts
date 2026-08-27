import mongoose from 'mongoose';

/**
 * Smart catalog-governance backfill.
 *
 * It never treats operational activity as public approval. A legacy row is
 * inherited as publicly eligible only when its collection has an explicit
 * pre-governance verification signal. Everything else remains pending/hidden.
 * The script is dry-run by default and must never be run against production
 * outside an approved deployment window.
 *
 * Usage:
 *   MONGO_URL=... npx ts-node scripts/backfill-catalog-governance.ts
 *   MONGO_URL=... CATALOG_GOVERNANCE_MIGRATION_CONFIRM=apply npx ts-node scripts/backfill-catalog-governance.ts --apply
 *   MONGO_URL=... CATALOG_GOVERNANCE_MIGRATION_CONFIRM=rollback npx ts-node scripts/backfill-catalog-governance.ts --rollback
 */

type CollectionPolicy = {
  name: string;
  inheritedVerificationFilter?: Record<string, unknown>;
  inheritedProvenance?: string;
};

export const policies: CollectionPolicy[] = [
  {
    name: 'medicines_master',
    inheritedVerificationFilter: { verified: true, is_deleted: { $ne: true } },
    inheritedProvenance: 'legacy_verification_inherited:medicine.verified',
  },
  {
    name: 'provider_profiles',
    // `status: active` alone is operational, not a public-review decision.
    // A provider must also carry the pre-governance license-verification signal.
    inheritedVerificationFilter: {
      status: 'active',
      $or: [{ license_verified: true }, { license_status: 'verified' }],
    },
    inheritedProvenance: 'legacy_verification_inherited:provider.license_verified',
  },
  // Facilities and service catalogs have activity flags only in the legacy
  // schema; those are intentionally insufficient for inherited publication.
  { name: 'facilities' },
  { name: 'labservices' },
  { name: 'radiologyservices' },
  { name: 'homecareservices' },
];

export const governanceMissing = {
  public_eligibility: { $exists: false },
  medical_review_status: { $exists: false },
  provenance: { $exists: false },
};

export function inheritedFilter(policy: CollectionPolicy) {
  return { ...governanceMissing, ...(policy.inheritedVerificationFilter || { _id: { $exists: false } }) };
}

async function dryRun(collection: mongoose.mongo.Collection, policy: CollectionPolicy) {
  const totalLegacy = await collection.countDocuments(governanceMissing);
  const inherited = policy.inheritedVerificationFilter
    ? await collection.countDocuments(inheritedFilter(policy))
    : 0;
  return {
    mode: 'dry-run',
    collection: policy.name,
    legacy_without_governance: totalLegacy,
    inherited_public_candidates: inherited,
    pending_hidden_candidates: totalLegacy - inherited,
    inherited_provenance: policy.inheritedProvenance || null,
  };
}

async function applyBackfill(collection: mongoose.mongo.Collection, policy: CollectionPolicy) {
  const now = new Date();
  let inherited = { matchedCount: 0, modifiedCount: 0 };
  if (policy.inheritedVerificationFilter && policy.inheritedProvenance) {
    inherited = await collection.updateMany(inheritedFilter(policy), {
      $set: {
        public_eligibility: true,
        indexing_eligibility: false,
        medical_review_status: 'approved',
        last_reviewed: now,
        provenance: policy.inheritedProvenance,
        catalog_governance_backfill_at: now,
      },
    });
  }
  const pending = await collection.updateMany(governanceMissing, {
    $set: {
      public_eligibility: false,
      indexing_eligibility: false,
      medical_review_status: 'pending',
      last_reviewed: null,
      provenance: 'legacy_backfill_pending_review',
      catalog_governance_backfill_at: now,
    },
  });
  return {
    inherited_public: { matched: inherited.matchedCount, modified: inherited.modifiedCount },
    pending_hidden: { matched: pending.matchedCount, modified: pending.modifiedCount },
  };
}

async function rollbackBackfill(collection: mongoose.mongo.Collection) {
  // Roll back only records untouched since this migration. A human review or a
  // later governance transition changes provenance/status and cannot be undone.
  const result = await collection.updateMany({
    provenance: { $in: ['legacy_verification_inherited:medicine.verified', 'legacy_verification_inherited:provider.license_verified', 'legacy_backfill_pending_review'] },
    catalog_governance_backfill_at: { $exists: true },
  }, {
    $unset: {
      public_eligibility: '', indexing_eligibility: '', medical_review_status: '',
      last_reviewed: '', provenance: '', catalog_governance_backfill_at: '',
    },
  });
  return { matched: result.matchedCount, modified: result.modifiedCount };
}

async function main() {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) throw new Error('MONGO_URL is required');
  const rollback = process.argv.includes('--rollback');
  const apply = process.argv.includes('--apply');
  if (apply && rollback) throw new Error('choose only one of --apply or --rollback');
  const requiredConfirmation = rollback ? 'rollback' : 'apply';

  await mongoose.connect(mongoUrl);
  try {
    for (const policy of policies) {
      const collection = mongoose.connection.collection(policy.name);
      if (!apply && !rollback) {
        console.log(JSON.stringify(await dryRun(collection, policy)));
        continue;
      }
      if (process.env.CATALOG_GOVERNANCE_MIGRATION_CONFIRM !== requiredConfirmation) {
        throw new Error(`refusing ${rollback ? 'rollback' : 'apply'} without CATALOG_GOVERNANCE_MIGRATION_CONFIRM=${requiredConfirmation}`);
      }
      const result = rollback ? await rollbackBackfill(collection) : await applyBackfill(collection, policy);
      console.log(JSON.stringify({ mode: rollback ? 'rollback' : 'apply', collection: policy.name, result }));
    }
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}

export { dryRun, applyBackfill, rollbackBackfill };
