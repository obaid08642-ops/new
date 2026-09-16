/**
 * Performance Indexes Migration Script
 * Run: mongosh <MONGO_URL> --eval "load('./scripts/add-performance-indexes.js')"
 * Or via: node -e "require('./scripts/add-performance-indexes.js')"
 *
 * These indexes are the single biggest DB-level performance gain:
 * - Compound indexes eliminate full collection scans on hot queries
 * - background:true means no collection lock during creation
 */

const indexes = [
  // ── medicines ────────────────────────────────────────────────────────────────
  {
    collection: 'medicines',
    index: { category: 1, is_deleted: 1, public_eligibility: 1, indexing_eligibility: 1 },
    options: { name: 'perf_catalog_category', background: true }
  },
  {
    collection: 'medicines',
    index: { search_text: 1, is_deleted: 1 },
    options: { name: 'perf_search_text', background: true }
  },
  {
    collection: 'medicines',
    index: { medical_review_status: 1, is_deleted: 1, public_eligibility: 1 },
    options: { name: 'perf_review_status', background: true }
  },
  {
    collection: 'medicines',
    index: { usage_count: -1, is_deleted: 1 },
    options: { name: 'perf_usage_count', background: true }
  },

  // ── orders ───────────────────────────────────────────────────────────────────
  {
    collection: 'orders',
    index: { patient_id: 1, status: 1, createdAt: -1 },
    options: { name: 'perf_orders_patient_status', background: true }
  },
  {
    collection: 'orders',
    index: { pharmacy_id: 1, status: 1, createdAt: -1 },
    options: { name: 'perf_orders_pharmacy_status', background: true }
  },
  {
    collection: 'orders',
    index: { status: 1, createdAt: -1 },
    options: { name: 'perf_orders_status_time', background: true }
  },

  // ── bookings ─────────────────────────────────────────────────────────────────
  {
    collection: 'bookings',
    index: { patient_id: 1, status: 1, scheduled_at: -1 },
    options: { name: 'perf_bookings_patient', background: true }
  },
  {
    collection: 'bookings',
    index: { provider_id: 1, status: 1, scheduled_at: 1 },
    options: { name: 'perf_bookings_provider', background: true }
  },

  // ── users ────────────────────────────────────────────────────────────────────
  {
    collection: 'users',
    index: { phone: 1, role: 1 },
    options: { name: 'perf_users_phone_role', background: true, sparse: true }
  },
  {
    collection: 'users',
    index: { role: 1, is_verified: 1 },
    options: { name: 'perf_users_role_verified', background: true }
  },

  // ── providers ────────────────────────────────────────────────────────────────
  {
    collection: 'providers',
    index: { provider_type: 1, city: 1, is_active: 1 },
    options: { name: 'perf_providers_type_city', background: true }
  },
  {
    collection: 'providers',
    index: { 'provider_profile.lat': 1, 'provider_profile.lng': 1, provider_type: 1 },
    options: { name: 'perf_providers_geo', background: true }
  },

  // ── search_queries (analytics) ───────────────────────────────────────────────
  {
    collection: 'search_queries',
    index: { createdAt: -1 },
    options: { name: 'perf_search_queries_time', background: true }
  },
  {
    collection: 'search_queries',
    index: { term_lc: 1, createdAt: -1 },
    options: { name: 'perf_search_queries_term', background: true }
  },

  // ── radiology_services ───────────────────────────────────────────────────────
  {
    collection: 'radiology_services',
    index: { is_active: 1, category: 1 },
    options: { name: 'perf_radiology_active_cat', background: true }
  },

  // ── lab_services ─────────────────────────────────────────────────────────────
  {
    collection: 'lab_services',
    index: { is_active: 1, category: 1 },
    options: { name: 'perf_lab_active_cat', background: true }
  },
];

// Will be injected by the calling script
const dbs = ['nabd_nestjs', 'nabd_staging'];

for (const dbName of dbs) {
  const db = db.getSiblingDB(dbName);
  print(`\n=== Creating indexes on ${dbName} ===`);
  for (const { collection, index, options } of indexes) {
    try {
      db[collection].createIndex(index, options);
      print(`  ✅ ${collection}: ${options.name}`);
    } catch (e) {
      if (e.code === 85 || e.code === 86) {
        print(`  ℹ️  ${collection}: ${options.name} already exists (skipping)`);
      } else {
        print(`  ❌ ${collection}: ${options.name} — ${e.message}`);
      }
    }
  }
}
print('\nDone. Run db.medicines.getIndexes() to verify.');
