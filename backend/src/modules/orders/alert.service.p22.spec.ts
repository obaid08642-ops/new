import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AlertService } from './alert.service';

function chain<T>(value: T): any {
  return { lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }) };
}

/** findById double that supports BOTH `await findById()` and `findById().lean().exec()`. */
function dual<T>(value: T): any {
  const p: any = Promise.resolve(value);
  p.lean = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) });
  return p;
}

function listQuery<T>(value: T): any {
  const c = chain(value);
  return { sort: jest.fn().mockReturnValue(c), limit: jest.fn().mockReturnValue(c) };
}

function setup(opts: {
  existing?: any;
  med?: any;
  alertDoc?: any;
  alertList?: any[];
} = {}) {
  const AlertModel: any = jest.fn().mockImplementation((data: any) => ({
    ...data,
    _id: 'alert-1',
    save: jest.fn().mockResolvedValue(true),
  }));
  AlertModel.findOne = jest.fn().mockReturnValue(chain(opts.existing ?? null));
  AlertModel.findById = jest.fn().mockImplementation(() => dual(opts.alertDoc ?? null));
  AlertModel.find = jest.fn().mockReturnValue(listQuery(opts.alertList ?? []));
  AlertModel.findOneAndUpdate = jest.fn().mockResolvedValue(opts.alertDoc ?? null);
  AlertModel.findByIdAndUpdate = jest.fn().mockResolvedValue(opts.alertDoc ?? null);

  const meds = { findOne: jest.fn().mockReturnValue(chain(opts.med ?? null)) };
  const conn = { collection: jest.fn(() => ({ findOne: jest.fn().mockResolvedValue(null) })) };

  const svc = new AlertService(AlertModel as never, meds as never, conn as never);
  return { svc, AlertModel, meds };
}

const inStockMed = { id: 'med-1', aggregate_stock: 10, availability_status: 'in_stock', price: 100 };
const outOfStockMed = { id: 'med-1', aggregate_stock: 0, availability_status: 'out_of_stock', price: 100 };

describe('AlertService.create (P22)', () => {
  it('creates a back_in_stock alert when the medicine exists', async () => {
    const { svc, AlertModel } = setup({ med: inStockMed });
    const alert = await svc.create('patient-1', { medicine_id: 'med-1', medicine_name: 'Med', type: 'back_in_stock' });
    expect(alert).toMatchObject({ patient_id: 'patient-1', medicine_id: 'med-1', status: 'active' });
    expect(AlertModel).toHaveBeenCalledWith(expect.objectContaining({ type: 'back_in_stock' }));
  });

  it('prevents duplicate active alerts for the same patient+medicine+type', async () => {
    const { svc } = setup({ existing: { _id: 'alert-0', status: 'active' }, med: inStockMed });
    await expect(
      svc.create('patient-1', { medicine_id: 'med-1', medicine_name: 'Med', type: 'back_in_stock' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s when the medicine does not exist', async () => {
    const { svc } = setup({ med: null });
    await expect(
      svc.create('patient-1', { medicine_id: 'med-9', medicine_name: 'Ghost', type: 'price_drop', target_price: 50 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AlertService.checkEligibility / processAlert triggers (P22)', () => {
  it('triggers back_in_stock when the medicine is back', async () => {
    const alertDoc = { _id: 'alert-1', patient_id: 'patient-1', type: 'back_in_stock', medicine_id: 'med-1', status: 'active' };
    const { svc } = setup({ alertDoc, med: inStockMed });
    await expect(svc.checkEligibility('alert-1')).resolves.toMatchObject({ eligible: true, in_stock: true });
    await expect(svc.processAlert('alert-1')).resolves.toEqual({ triggered: true });
  });

  it('does not trigger back_in_stock while out of stock', async () => {
    const alertDoc = { _id: 'alert-1', patient_id: 'patient-1', type: 'back_in_stock', medicine_id: 'med-1', status: 'active' };
    const { svc, AlertModel } = setup({ alertDoc, med: outOfStockMed });
    await expect(svc.processAlert('alert-1')).resolves.toEqual({ triggered: false });
    expect(AlertModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('triggers price_drop when the price is at or below target', async () => {
    const alertDoc = { _id: 'alert-1', patient_id: 'patient-1', type: 'price_drop', medicine_id: 'med-1', target_price: 100, status: 'active' };
    const { svc } = setup({ alertDoc, med: { ...inStockMed, price: 90 } });
    await expect(svc.checkEligibility('alert-1')).resolves.toMatchObject({ eligible: true, current_price: 90 });
    await expect(svc.processAlert('alert-1')).resolves.toEqual({ triggered: true });
  });

  it('does not trigger price_drop while the price is above target', async () => {
    const alertDoc = { _id: 'alert-1', patient_id: 'patient-1', type: 'price_drop', medicine_id: 'med-1', target_price: 50, status: 'active' };
    const { svc, AlertModel } = setup({ alertDoc, med: { ...inStockMed, price: 100 } });
    await expect(svc.checkEligibility('alert-1')).resolves.toMatchObject({ eligible: false });
    await expect(svc.processAlert('alert-1')).resolves.toEqual({ triggered: false });
    expect(AlertModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('skips processAlert for non-active alerts and 404s unknown ids', async () => {
    const { svc } = setup({ alertDoc: { _id: 'alert-1', status: 'cancelled', patient_id: 'patient-1' }, med: inStockMed });
    await expect(svc.processAlert('alert-1')).resolves.toEqual({ triggered: false });

    const missing = setup({ alertDoc: null, med: inStockMed });
    await expect(missing.svc.processAlert('alert-9')).rejects.toBeInstanceOf(NotFoundException);
    await expect(missing.svc.checkEligibility('alert-9')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AlertService.cancel / cron (P22)', () => {
  it('cancels an alert and 404s on foreign ids', async () => {
    const alertDoc = { _id: 'alert-1', status: 'active' };
    const { svc, AlertModel } = setup({ alertDoc });
    await svc.cancel('alert-1', 'patient-1');
    expect(AlertModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'alert-1', patient_id: 'patient-1' },
      { status: 'cancelled' },
      { new: true },
    );

    const missing = setup({ alertDoc: null });
    await expect(missing.svc.cancel('alert-9', 'patient-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('checkAllAlerts no-ops on empty', async () => {
    const { svc, AlertModel } = setup({ alertList: [] });
    await expect(svc.checkAllAlerts()).resolves.toBeUndefined();
    expect(AlertModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('checkAllAlerts processes each active alert', async () => {
    const alertDoc = { _id: 'alert-1', patient_id: 'patient-1', type: 'back_in_stock', medicine_id: 'med-1', status: 'active' };
    const { svc, AlertModel } = setup({ alertDoc, med: inStockMed, alertList: [alertDoc] });
    await svc.checkAllAlerts();
    expect(AlertModel.findByIdAndUpdate).toHaveBeenCalledWith('alert-1', expect.objectContaining({ status: 'triggered' }));
  });
});
