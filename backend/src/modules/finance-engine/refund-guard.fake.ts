/**
 * Test fixture: in-memory stand-ins for the two collections RefundExecutor.reserveRefund uses (`refund_reservations`, `refund_totals`), for the specs that
 * give the executor a hand-made `conn`. Only the operations the executor calls. The concurrency behaviour itself is proved on a real MongoDB in refund-race.spec.ts.
 */
export function refundGuardCollections() {
  const reservations: any[] = [];
  const totals: any[] = [];
  const reservationsCol = {
    createIndex: async () => 'ok',
    insertOne: async (d: any) => {
      if (reservations.some((r) => r.refund_id === d.refund_id)) throw Object.assign(new Error('E11000'), { code: 11000 });
      reservations.push({ ...d });
      return {};
    },
    findOne: async (q: any) => reservations.find((r) => r.refund_id === q.refund_id) ?? null,
    findOneAndUpdate: async () => null,
    updateOne: async (q: any, u: any) => { const r = reservations.find((x) => x.refund_id === q.refund_id); if (r && u.$set) Object.assign(r, u.$set); return {}; },
    deleteOne: async (q: any) => { const i = reservations.findIndex((x) => x.refund_id === q.refund_id); if (i >= 0) reservations.splice(i, 1); return {}; },
  };
  const totalsCol = {
    createIndex: async () => 'ok',
    updateOne: async (q: any, u: any) => {
      let t = totals.find((x) => x.booking_id === q.booking_id);
      if (!t) { if (!u.$setOnInsert) return { matchedCount: 0 }; t = { ...u.$setOnInsert }; totals.push(t); return { matchedCount: 0, upsertedCount: 1 }; }
      if (q.refunded_halalas?.$lte !== undefined && !(t.refunded_halalas <= q.refunded_halalas.$lte)) return { matchedCount: 0 };
      if (u.$inc) t.refunded_halalas += u.$inc.refunded_halalas;
      return { matchedCount: 1 };
    },
  };
  return { refund_reservations: reservationsCol, refund_totals: totalsCol, _reservations: reservations, _totals: totals };
}
