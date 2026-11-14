import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { registerAuditSink } from '../../../common/audit-record';
import { AdminBroadcastController } from '../pharmacy.controllers';
import { BroadcastConfigDto } from '../pharmacy.controllers.dto';

describe('admin pharmacy broadcast config (stop after offers)', () => {
  const admin = { id: 'adm-1', role: 'admin' };
  let audits: any[];
  const make = (current = 3) => {
    const updateOne = jest.fn().mockResolvedValue({});
    const conn: any = { collection: jest.fn(() => ({ updateOne })) };
    const bc: any = { getStopAfterOffers: jest.fn().mockResolvedValue(current), getBroadcastStages: jest.fn().mockResolvedValue([{ stage: 1, radius_km: 3, timeout_seconds: 60 }]) };
    return { controller: new AdminBroadcastController(bc, {} as any, conn), updateOne, bc };
  };
  beforeEach(() => { audits = []; registerAuditSink(async (e) => { audits.push(e); }); });
  afterAll(() => registerAuditSink(null));

  it('GET returns the stages and the current stop-after-offers value together', async () => {
    const { controller } = make(5);
    await expect(controller.config()).resolves.toEqual({ stages: [{ stage: 1, radius_km: 3, timeout_seconds: 60 }], stop_after_offers: 5 });
  });

  it('GET still answers when the stages policy is invalid (stages null, the setting is readable)', async () => {
    const { controller, bc } = make(3);
    bc.getBroadcastStages.mockRejectedValue(new Error('validated_pharmacy_broadcast_policy_required'));
    await expect(controller.config()).resolves.toMatchObject({ stages: null, stop_after_offers: 3 });
  });

  it('PUT stores the value under its system_configs key and writes a chained audit entry with before and after', async () => {
    const { controller, updateOne } = make(3);
    await controller.setConfig(admin, { stop_after_offers: 0 });
    expect(updateOne).toHaveBeenCalledWith({ key: 'pharmacy_broadcast_stop_after_offers' }, expect.objectContaining({ $set: expect.objectContaining({ value: 0, updated_by: 'adm-1' }) }), { upsert: true });
    expect(audits[0]).toMatchObject({ action: 'pharmacy.broadcast_stop_after_offers_set', user_id: 'adm-1', changes: { before: { stop_after_offers: 3 }, after: { stop_after_offers: 0 } } });
  });

  it('the DTO accepts 0..100 whole numbers only', async () => {
    const ok = async (v: unknown) => (await validate(plainToInstance(BroadcastConfigDto, { stop_after_offers: v }))).length === 0;
    for (const good of [0, 3, 100]) expect(await ok(good)).toBe(true);
    for (const bad of [-1, 101, 2.5, '3', null, undefined]) expect(await ok(bad)).toBe(false);
  });
});
