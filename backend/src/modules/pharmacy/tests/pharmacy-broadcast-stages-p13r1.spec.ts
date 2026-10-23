/**
 * P13-R1: staged pharmacy geo-broadcast (§8).
 *
 * Do: staged broadcast 3 km -> 5 km -> 8 km; interval from config (default 60 s).
 * Expanding the radius ADDS newly eligible pharmacies; existing offers stay valid;
 * no duplicate offers (unique index order_id + pharmacy_id).
 *
 * The staging, the config-driven interval and the additive expansion are already
 * implemented on the base; the DUPLICATE-OFFER GUARANTEE IS NOT - the offers
 * collection only declares a non-unique index, so two offers for the same
 * order and pharmacy can coexist. That is the first test below, and it fails
 * on the base.
 */
import { PharmacyOfferSchema } from '../schemas/pharmacy.schema';
import { PharmacyBroadcastService } from '../services/pharmacy-broadcast.service';

const STAGES_3_5_8 = [
  { stage: 1, radius_km: 3, timeout_seconds: 60 },
  { stage: 2, radius_km: 5, timeout_seconds: 60 },
  { stage: 3, radius_km: 8, timeout_seconds: 60 },
];

function broadcastServiceWithConfig(config: any) {
  const configs: any = { findOne: () => ({ lean: async () => config }) };
  return new (PharmacyBroadcastService as any)({}, {}, {}, {}, {}, {}, configs, {}, {}, {}, {}, {}, {}, {}, {});
}

describe('P13-R1 staged geo-broadcast', () => {
  it('never keeps two offers for the same order and pharmacy (unique index order_id + pharmacy_id)', () => {
    const indexes = PharmacyOfferSchema.indexes() as Array<[Record<string, number>, Record<string, unknown>?]>;
    const uniquePair = indexes.filter(
      ([keys, options]) => JSON.stringify(keys) === JSON.stringify({ order_id: 1, pharmacy_account_id: 1 }) && options?.unique === true,
    );
    expect(uniquePair).toHaveLength(1);
  });

  it('runs the stages 3 km -> 5 km -> 8 km at 60 s, read from the validated policy', async () => {
    const stages = await broadcastServiceWithConfig({ key: 'pharmacy_broadcast_stages', value: STAGES_3_5_8 }).getBroadcastStages();
    expect(stages).toEqual(STAGES_3_5_8);
    expect(stages.map((s: any) => s.radius_km)).toEqual([3, 5, 8]);
    expect(stages.every((s: any) => s.timeout_seconds === 60)).toBe(true);
  });

  it('refuses to broadcast when the staged policy is missing or unvalidated - never a silent fallback radius', async () => {
    await expect(broadcastServiceWithConfig(null).getBroadcastStages()).rejects.toThrow(/validated_pharmacy_broadcast_policy_required/);
    await expect(broadcastServiceWithConfig({ value: [{ stage: 1, radius_km: 0, timeout_seconds: 60 }] }).getBroadcastStages())
      .rejects.toThrow(/validated_pharmacy_broadcast_policy_required/);
    await expect(broadcastServiceWithConfig({ value: [{ stage: 2, radius_km: 3, timeout_seconds: 60 }] }).getBroadcastStages())
      .rejects.toThrow(/validated_pharmacy_broadcast_policy_required/);
  });

  it('reads pharmacy_broadcast_stop_after_offers: default 3, 0 = never stop, a malformed value means the default', async () => {
    const read = (value: any) => broadcastServiceWithConfig(value === undefined ? null : { key: 'pharmacy_broadcast_stop_after_offers', value }).getStopAfterOffers();
    expect(await read(undefined)).toBe(3);
    expect(await read(5)).toBe(5);
    expect(await read(0)).toBe(0);
    for (const bad of [-1, 1.5, '3', null, 101, {}]) expect(await read(bad)).toBe(3);
  });
});
