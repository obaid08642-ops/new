/**
 * Phase 21.2 — the merge registry must not fall behind the schemas.
 *
 * The plan says the list of collections to move is "generated from the schemas
 * so new collections are not forgotten". A static list can only honour that if
 * something checks it, so this test walks every mongoose schema in the repo and
 * fails when a schema declares an account-id field that the registry does not
 * know about.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ACCOUNT_ID_FIELDS, GUEST_OWNED_COLLECTIONS, registryCovers } from './guest-merge.registry';

const SRC = path.join(__dirname, '../..');
const SCHEMA_DIRS = [path.join(SRC, 'schemas'), path.join(SRC, 'modules')];

function schemaFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      schemaFiles(p, out);
    } else if (entry.name.endsWith('.schema.ts') || entry.name.endsWith('.schemas.ts')) {
      out.push(p);
    }
  }
  return out;
}

/** Reads `collection: 'x'` and the mongoose default (class name → plural). */
function declaredCollections(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/collection:\s*'([a-z0-9_]+)'/g)) out.push(m[1]);
  return out;
}

function declaredAccountFields(text: string): string[] {
  return ACCOUNT_ID_FIELDS.filter((field) => new RegExp(`\\b${field}\\s*[:?]\\s`).test(text));
}

/**
 * Collections that declare an account id but are NOT patient-owned, so they
 * must not be in the registry. Each exclusion has a reason: either the row
 * belongs to a provider/staff member, or the feature is a removed one.
 */
const EXCLUDED: Record<string, string> = {
  // Provider- and staff-owned rows: they are rewritten by the provider's own
  // account id, never by a patient's guest merge.
  provider_profiles: 'provider-owned', provider_sessions: 'provider-owned',
  provider_accounts: 'provider-owned', provider_documents: 'provider-owned',
  provider_bank_accounts: 'provider-owned', provider_operators: 'provider-owned',
  provider_otp_codes: 'provider-owned', provider_audit_logs: 'provider-owned',
  provider_deltas: 'provider-owned', provider_schedule_slots: 'provider-owned',
  provider_availability: 'provider-owned', provider_branches: 'provider-owned',
  provider_delivery_zones: 'provider-owned', provider_assignment_attempts: 'provider-owned',
  provider_requests: 'provider-owned', provider_notifications: 'provider-owned',
  hospital_staff: 'staff-owned', hospital_branches: 'facility-owned',
  hospital_departments: 'facility-owned', hospital_sub_entities: 'facility-owned',
  hospital_invitations: 'staff-owned', facility_wards: 'facility-owned',
  facility_beds: 'facility-owned', staff_shifts: 'staff-owned',
  staff_attendance: 'staff-owned', doctors: 'provider-owned',
  nurse_providers: 'provider-owned', job_postings: 'not patient data',
  job_applications: 'recruiter data', candidate_profiles: 'recruiter data',
  candidate_experiences: 'recruiter data', ad_placements: 'commercial data',
  slot_locks: 'short-lived booking lock, not patient data',
  pharmacy_bids: 'pharmacy-owned', pharmacy_offers: 'pharmacy-owned',
  pharmacy_broadcasts: 'pharmacy-owned', pharmacy_allocations: 'pharmacy-owned',
  pharmacy_low_stock_alerts: 'pharmacy-owned', pharmacy_substitute_map: 'catalogue data',
  pharmacy_prescription_intakes: 'pharmacy intake, owned by the pharmacy',
  pharmacy_drug_shortage_flags: 'catalogue data',
  // Removed features (owner decision, §2 rule 6): never merged, never revived.
  emergency_requests: 'SOS/ambulance is a removed feature',
  mood_entries: 'mental-health scoring is a removed feature',
  meditation_sessions: 'mental-health scoring is a removed feature',
  breathing_sessions: 'mental-health scoring is a removed feature',
};

describe('Phase 21.2 guest merge registry', () => {
  const files = SCHEMA_DIRS.flatMap((d) => schemaFiles(d));

  it('finds schemas to check (the drift guard must not be vacuous)', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('every registry entry names a collection and at least one account field', () => {
    for (const entry of GUEST_OWNED_COLLECTIONS) {
      expect(entry.collection).toMatch(/^[a-z0-9_]+$/);
      expect(entry.fields.length).toBeGreaterThan(0);
      for (const field of entry.fields) expect(ACCOUNT_ID_FIELDS).toContain(field);
    }
  });

  it('has no duplicate collection entries', () => {
    const names = GUEST_OWNED_COLLECTIONS.map((c) => c.collection);
    expect(new Set(names).size).toBe(names.length);
  });

  it('covers every schema that stores patient-owned data', () => {
    const uncovered: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      if (!declaredAccountFields(text).length) continue;
      for (const collection of declaredCollections(text)) {
        if (collection in EXCLUDED) continue;
        // A collection named after a table/queue is reference data, not patient data.
        if (/(_catalog|_catalogs|_services|queue|_settings|_templates|_rules|_coverage|_networks|_companies)$/.test(collection)) continue;
        const fields = declaredAccountFields(text);
        if (!fields.some((f) => registryCovers(collection, f))) {
          uncovered.push(`${collection} (${fields.join(',')}) in ${path.relative(SRC, file)}`);
        }
      }
    }
    expect(uncovered).toEqual([]);
  });

  it('the registry never contains a removed feature collection', () => {
    const names = GUEST_OWNED_COLLECTIONS.map((c) => c.collection);
    for (const removed of ['emergency_requests', 'mood_entries', 'meditation_sessions', 'breathing_sessions']) {
      expect(names).not.toContain(removed);
    }
  });
});
