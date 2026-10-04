import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Q29 — pharmacy data-integrity indexes, single source of truth for the app.
 * Mirrored idempotently in deploy/mongo/init-indexes.js (fresh-deploy path).
 *
 * Background: the code treats E11000 as "already a recipient / already queued"
 * (pharmacy-broadcast.service, pharmacy-expiry-command.service,
 * pharmacy-payment-evidence.service), but the unique indexes lived only in
 * manual migration scripts (backend/scripts/migrations/20260827-*.js). Without
 * them, concurrent upserts can insert duplicates and every upsert is a COLLSCAN.
 *
 * Wiring: registered as a provider in pharmacy.module.ts only. OnModuleInit
 * creates each index idempotently (createIndex with a fixed name is a no-op
 * when the identical index exists; it never drops anything), then verifies by
 * name via listIndexes and THROWS when one is still missing — the app never
 * becomes ready, so the liveness/readiness health check fails instead of
 * serving traffic without duplicate guards.
 *
 * Follow-up (health owner, shared file — intentionally not touched here):
 * expose `checkPharmacyIndexes()` in GET health/readiness details, e.g.
 * `details.pharmacy_indexes = { ok, missing }`.
 */

export interface PharmacyRequiredIndex {
  collection: string;
  key: { [field: string]: 1 | -1 };
  options: { name: string; unique?: boolean };
}

export const PHARMACY_REQUIRED_INDEXES: PharmacyRequiredIndex[] = [
  {
    collection: 'domain_outbox',
    key: { aggregate_type: 1, aggregate_id: 1, event_type: 1, idempotency_key: 1 },
    options: { name: 'domain_outbox_pharmacy_idempotency_unique', unique: true },
  },
  {
    collection: 'pharmacy_broadcast_recipients',
    key: { broadcast_id: 1, pharmacy_account_id: 1 },
    options: { name: 'pharmacy_broadcast_recipient_unique', unique: true },
  },
  {
    collection: 'pharmacy_payment_intents',
    key: { order_id: 1, idempotency_key: 1 },
    options: { name: 'payment_intent_order_idempotency_unique', unique: true },
  },
  {
    collection: 'pharmacy_payment_intents',
    key: { intent_id: 1 },
    options: { name: 'payment_intent_id_unique', unique: true },
  },
  {
    collection: 'pharmacy_payment_evidence',
    key: { gateway: 1, gateway_payment_id: 1, webhook_event_id: 1 },
    options: { name: 'payment_evidence_gateway_event_unique', unique: true },
  },
  // Non-unique by design (status is part of the key): quote lookup, not a guard.
  {
    collection: 'pharmacy_payment_evidence',
    key: {
      order_id: 1,
      selected_offer_id: 1,
      selected_offer_version: 1,
      quote_snapshot_hash: 1,
      status: 1,
    },
    options: { name: 'payment_evidence_quote_lookup' },
  },
];

/** Idempotent: plain createIndex with a fixed name; never drops. Returns names ensured. */
export async function ensurePharmacyIndexes(conn: Connection): Promise<string[]> {
  const ensured: string[] = [];
  for (const def of PHARMACY_REQUIRED_INDEXES) {
    await conn.collection(def.collection).createIndex(def.key as any, def.options as any);
    ensured.push(def.options.name);
  }
  return ensured;
}

/** Names from PHARMACY_REQUIRED_INDEXES absent from the live collections. */
export async function findMissingPharmacyIndexes(conn: Connection): Promise<string[]> {
  const missing: string[] = [];
  const byCollection = new Map<string, PharmacyRequiredIndex[]>();
  for (const def of PHARMACY_REQUIRED_INDEXES) {
    const list = byCollection.get(def.collection) || [];
    list.push(def);
    byCollection.set(def.collection, list);
  }
  for (const [collection, defs] of byCollection) {
    let live: Array<{ name?: string }>;
    try {
      live = await conn.collection(collection).listIndexes().toArray();
    } catch {
      for (const def of defs) missing.push(def.options.name);
      continue;
    }
    const names = new Set((live || []).map((ix) => ix?.name));
    for (const def of defs) {
      if (!names.has(def.options.name)) missing.push(def.options.name);
    }
  }
  return missing;
}

/** Read-only probe for the future readiness-details wiring (see header). */
export async function checkPharmacyIndexes(
  conn: Connection,
): Promise<{ ok: boolean; missing: string[] }> {
  const missing = await findMissingPharmacyIndexes(conn);
  return { ok: missing.length === 0, missing };
}

@Injectable()
export class PharmacyIndexesService implements OnModuleInit {
  private readonly logger = new Logger(PharmacyIndexesService.name);
  status: { ok: boolean; missing: string[] } = { ok: false, missing: [] };

  constructor(@InjectConnection() private readonly conn: Connection) {}

  async onModuleInit(): Promise<void> {
    const ensured = await ensurePharmacyIndexes(this.conn);
    const missing = await findMissingPharmacyIndexes(this.conn);
    this.status = { ok: missing.length === 0, missing };
    if (!this.status.ok) {
      throw new Error(`pharmacy_required_indexes_missing:${missing.join(',')}`);
    }
    this.logger.log(`pharmacy required indexes verified (${ensured.length})`);
  }
}
