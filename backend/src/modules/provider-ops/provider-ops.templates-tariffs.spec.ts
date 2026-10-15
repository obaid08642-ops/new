import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProviderCompatController, ProviderOpsService } from './provider-ops.module';

/** provider-doctor#2: applying a saved template is a real, counted action on the doctor's own template. */
describe('ProviderOpsService.useTemplate', () => {
  it("counts the use on the doctor's own template and returns it", async () => {
    const tpl = { id: 'tpl_1', doctor_id: 'doc-1', name: 'Asthma', items: [{ name: 'Salbutamol' }], usage_count: 1 };
    const col = { findOneAndUpdate: jest.fn().mockResolvedValue(tpl) };
    const svc = new ProviderOpsService({ collection: jest.fn(() => col) } as any);
    await expect(svc.useTemplate('doc-1', 'tpl_1')).resolves.toBe(tpl);
    const [filter, update, opts] = col.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ id: { $eq: 'tpl_1' }, doctor_id: { $eq: 'doc-1' } });
    expect(update.$inc).toEqual({ usage_count: 1 });
    expect(update.$set.last_used_at).toBeInstanceOf(Date);
    expect(opts).toEqual(expect.objectContaining({ returnDocument: 'after' }));
  });

  it("another doctor's template is not found", async () => {
    const col = { findOneAndUpdate: jest.fn().mockResolvedValue(null) };
    const svc = new ProviderOpsService({ collection: jest.fn(() => col) } as any);
    await expect(svc.useTemplate('doc-2', 'tpl_1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

/** provider-facility#6: tariffs start from the saved values and only the entered prices go to review. */
describe('ProviderCompatController facility tariffs', () => {
  const hosp = { id: 'hosp-1', role: 'provider', provider_type: 'hospital' };
  function make(saved: any, pending: any) {
    const svc: any = {
      getProviderSetting: jest.fn().mockResolvedValue(saved),
      pendingSettingChange: jest.fn().mockResolvedValue(pending),
      requestSettingChange: jest.fn().mockResolvedValue({ ok: true, pending_review: true }),
    };
    return { svc, controller: new ProviderCompatController(svc, {} as never) }; // the tariff routes do not touch the ledger
  }

  it('reads the approved tariffs and the pending change', async () => {
    const { svc, controller } = make({ icu_daily: 2500 }, { id: 'd1', value: { icu_daily: 2600 } });
    await expect(controller.getTariffs(hosp)).resolves.toEqual({ tariffs: { icu_daily: 2500 }, pending: { id: 'd1', value: { icu_daily: 2600 } } });
    expect(svc.getProviderSetting).toHaveBeenCalledWith('hosp-1', 'tariffs', null);
    expect(svc.pendingSettingChange).toHaveBeenCalledWith('hosp-1', 'tariffs');
  });

  it('nothing saved yet: null, never invented numbers', async () => {
    const { controller } = make(null, null);
    await expect(controller.getTariffs(hosp)).resolves.toEqual({ tariffs: null, pending: null });
  });

  it('sends only the entered prices to admin review', async () => {
    const { svc, controller } = make(null, null);
    await controller.putTariffs(hosp, { icu_daily: 2500, emergency_fee: 0 } as any);
    expect(svc.requestSettingChange).toHaveBeenCalledWith('hosp-1', 'tariffs', { icu_daily: 2500, emergency_fee: 0 });
  });

  it('an empty form is refused', async () => {
    const { svc, controller } = make(null, null);
    await expect(controller.putTariffs(hosp, {} as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(svc.requestSettingChange).not.toHaveBeenCalled();
  });
});

describe('ProviderOpsService.pendingSettingChange', () => {
  it('returns the newest pending change of that key', async () => {
    const at = new Date('2026-10-15T08:00:00Z');
    const col = { findOne: jest.fn().mockResolvedValue({ id: 'd1', requested_changes: { settings_key: 'tariffs', value: { ward_daily: 900 } }, createdAt: at }) };
    const svc = new ProviderOpsService({ collection: jest.fn(() => col) } as any);
    await expect(svc.pendingSettingChange('hosp-1', 'tariffs')).resolves.toEqual({ id: 'd1', value: { ward_daily: 900 }, submitted_at: at });
    expect(col.findOne.mock.calls[0][0]).toEqual({ provider_id: { $eq: 'hosp-1' }, status: 'pending', target: 'settings', 'requested_changes.settings_key': { $eq: 'tariffs' } });
  });
});
