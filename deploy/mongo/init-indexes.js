// ═══ MongoDB production indexes — run after every fresh deploy ═══
// Usage: mongosh "$MONGO_URL/$DB_NAME" mongo/init-indexes.js
/* eslint-disable */
(function () {
  const ix = (col, spec, opts) => {
    try {
      db.getCollection(col).createIndex(spec, opts || {});
      print(`  ✔ ${col} ${JSON.stringify(spec)}`);
    } catch (e) {
      print(`  ⚠ ${col}: ${e.message}`);
    }
  };

  print('Applying production indexes…');

  // ── Medicines catalog (hottest reads) ──
  ix('medicines', { id: 1 }, { unique: true, sparse: true });
  ix('medicines', { slug: 1 }, { unique: true, sparse: true });
  ix('medicines', { category: 1, is_deleted: 1 });
  ix('medicines', { availability_status: 1 });
  ix('medicines', { online_exclusive: 1 });
  ix('medicines', { barcode: 1 }, { unique: true, sparse: true });
  ix('medicines', { verified: -1, usage_count: -1 });
  ix('medicines', { name_ar: 'text', name_en: 'text', active_ingredient: 'text', generic_name: 'text' },
    { weights: { name_ar: 10, name_en: 8, active_ingredient: 5, generic_name: 5 }, name: 'medicines_text' });

  // ── Commerce ──
  ix('orders', { patient_id: 1, status: 1, createdAt: -1 });
  ix('orders', { id: 1 }, { unique: true, sparse: true });
  ix('orders', { status: 1, createdAt: -1 });
  ix('carts', { user_id: 1 }, { unique: true, sparse: true });
  ix('pharmacy_inventory', { medicine_id: 1, pharmacy_id: 1 });
  ix('pharmacy_inventory', { pharmacy_id: 1, is_available: 1 });
  ix('pharmacy_shortage_reports', { status: 1, createdAt: -1 });
  ix('pharmacy_shortage_reports', { id: 1 }, { unique: true, sparse: true });

  // ── Pharmacy data-integrity guards (Q29) ──
  // Previously these lived only in manual migration scripts
  // (backend/scripts/migrations/20260827-*.js), so a fresh deploy had no
  // duplicate guard and every idempotent upsert was a COLLSCAN. Mirrored in
  // backend/src/modules/pharmacy/pharmacy-indexes.ts, which also ensures
  // them at boot. createIndex is idempotent: re-running never duplicates
  // and nothing here ever drops an index.
  ix('domain_outbox', { aggregate_type: 1, aggregate_id: 1, event_type: 1, idempotency_key: 1 },
    { name: 'domain_outbox_pharmacy_idempotency_unique', unique: true });
  ix('pharmacy_broadcast_recipients', { broadcast_id: 1, pharmacy_account_id: 1 },
    { name: 'pharmacy_broadcast_recipient_unique', unique: true });
  ix('pharmacy_payment_intents', { order_id: 1, idempotency_key: 1 },
    { name: 'payment_intent_order_idempotency_unique', unique: true });
  ix('pharmacy_payment_intents', { intent_id: 1 },
    { name: 'payment_intent_id_unique', unique: true });
  ix('pharmacy_payment_evidence', { gateway: 1, gateway_payment_id: 1, webhook_event_id: 1 },
    { name: 'payment_evidence_gateway_event_unique', unique: true });
  // Non-unique by design (status is part of the key): quote lookup, not a guard.
  ix('pharmacy_payment_evidence', { order_id: 1, selected_offer_id: 1, selected_offer_version: 1, quote_snapshot_hash: 1, status: 1 },
    { name: 'payment_evidence_quote_lookup' });

  // ── Appointments / consultations ──
  ix('appointments', { patient_id: 1, scheduled_time: -1 });
  ix('appointments', { provider_id: 1, scheduled_time: -1 });
  ix('appointments', { status: 1, scheduled_time: 1 });
  ix('callsessions', { room_name: 1 });
  ix('callsessions', { patient_id: 1, createdAt: -1 });
  ix('callsessions', { provider_id: 1, createdAt: -1 });
  ix('callsessions', { status: 1 });

  // ── Notifications & push ──
  ix('notifications', { user_id: 1, createdAt: -1 });
  ix('notifications', { role: 1, createdAt: -1 });
  ix('pushtokens', { user_id: 1, active: 1 });
  ix('pushtokens', { token: 1 }, { unique: true });
  ix('pushengagements', { campaign_id: 1, event: 1 });
  ix('pushengagements', { user_id: 1, createdAt: -1 });
  ix('pushlogs', { createdAt: -1 });
  ix('campaigns', { status: 1, scheduled_at: 1 });
  ix('webpushsubscriptions', { user_id: 1, active: 1 });

  // ── Chat ──
  ix('chatthreads', { participants: 1, updatedAt: -1 });
  ix('chatmessages', { thread_id: 1, createdAt: -1 });

  // ── Users / providers ──
  ix('users', { email: 1 }, { unique: true, sparse: true });
  ix('users', { phone: 1 }, { unique: true, sparse: true });
  ix('users', { role: 1 });
  ix('provider_profiles', { user_id: 1 });
  ix('provider_profiles', { provider_type: 1, verification_status: 1 });

  // ── Storage ──
  ix('storageobjects', { id: 1 }, { unique: true, sparse: true });
  ix('storageobjects', { owner_account_id: 1 });

  // ── Analytics ──
  ix('search_queries', { term_lc: 1 });
  ix('search_queries', { createdAt: -1 });

  // ── AI triage / assessments ──
  ix('ai_triage_sessions', { patient_id: 1, createdAt: -1 });

  print('✅ Indexes applied.');
})();
