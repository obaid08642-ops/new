import { PharmacyAllocationService } from './pharmacy-allocation.service';
import { PharmacyAllocationState, PharmacyOrderState } from '../schemas/pharmacy.schema';
import { isProviderRole } from '../../../common/enums';

/**
 * D2: a pharmacy allocation named by the licence lapse sweep is cancelled through the pharmacy's OWN cancel (the "pharmacy cancels" path): stock released, patient told, and the order cancelled as a
 * PROVIDER cancel when it was the only live allocation (which is what ProviderCancelRefundListener refunds in full).
 */
describe('PharmacyAllocationService.onLicenceLapseCancel (D2)', () => {
  const event = { kind: 'pharmacy_allocation', booking_id: 'al1', provider_profile_id: 'ph-1', lapse_at: '2026-11-30T21:00:00.000Z' } as any;

  function make(status: string | null, others: Array<{ id: string; status: string }> = []) {
    const alloc: any = { id: 'al1', order_id: 'o1', pharmacy_account_id: 'acc-ph', status, timeline: [], save: jest.fn(async () => undefined), toObject() { return { id: this.id, status: this.status }; } };
    const order: any = { id: 'o1', status: PharmacyOrderState.CONFIRMED, patient_account_id: 'pat-1', timeline: [], save: jest.fn(async () => undefined), toObject() { return { id: this.id }; } };
    const svc: any = Object.create(PharmacyAllocationService.prototype);
    svc.logger = { error: jest.fn(), warn: jest.fn() };
    svc.allocs = { findOne: jest.fn(async () => (status ? alloc : null)), find: jest.fn(() => ({ lean: async () => [{ id: 'al1', status }, ...others] })) };
    svc.orders = { findOne: jest.fn(async () => order) };
    svc.split = { releaseStockForAllocation: jest.fn(async () => undefined) };
    svc.notif = { notifyPatientAllocationCancelled: jest.fn(async () => undefined) };
    svc.bus = { emit: jest.fn(async () => undefined) };
    svc.engine = { transition: jest.fn(async (o: any) => o.mutate()) };
    svc.refreshOrderAfterAllocationChange = jest.fn(async () => undefined);
    return { svc, alloc, order };
  }

  it('the actor the handler uses passes the provider guard of cancel', () => {
    expect(isProviderRole('pharmacy')).toBe(true);
  });

  it.each([PharmacyAllocationState.PENDING_REVIEW, PharmacyAllocationState.PARTIALLY_CONFIRMED, PharmacyAllocationState.CONFIRMED])('a %s allocation is cancelled with the lapse reason, stock released, patient told; as the ONLY live allocation the order is cancelled as a PROVIDER cancel (the full-refund path)', async (status) => {
    const { svc, alloc, order } = make(status);
    await svc.onLicenceLapseCancel(event);
    expect(alloc.status).toBe(PharmacyAllocationState.CANCELLED);
    expect(alloc.cancellation_reason).toBe('provider_license_expired');
    expect(svc.split.releaseStockForAllocation).toHaveBeenCalledWith(alloc);
    expect(svc.notif.notifyPatientAllocationCancelled).toHaveBeenCalledWith(alloc, 'provider_license_expired');
    expect(svc.engine.transition).toHaveBeenCalledWith(expect.objectContaining({ kind: 'pharmacy', to_domain: PharmacyOrderState.CANCELLED, actor_role: 'provider', patient_account_id: 'pat-1', reason: 'provider_license_expired' }));
    expect(order.status).toBe(PharmacyOrderState.CANCELLED);
  });

  it('when another allocation of the order is still live, only this allocation is cancelled (the order follows the others, as in any pharmacy cancel)', async () => {
    const { svc, alloc, order } = make(PharmacyAllocationState.CONFIRMED, [{ id: 'al2', status: PharmacyAllocationState.CONFIRMED }]);
    await svc.onLicenceLapseCancel(event);
    expect(alloc.status).toBe(PharmacyAllocationState.CANCELLED);
    expect(svc.engine.transition).not.toHaveBeenCalled();
    expect(order.status).toBe(PharmacyOrderState.CONFIRMED);
    expect(svc.refreshOrderAfterAllocationChange).toHaveBeenCalledWith('o1');
  });

  it.each([PharmacyAllocationState.PREPARING, PharmacyAllocationState.READY_FOR_PICKUP, PharmacyAllocationState.OUT_FOR_DELIVERY, PharmacyAllocationState.DELIVERED, PharmacyAllocationState.CANCELLED, null])('leaves an allocation that is %s alone (the pharmacy finishes existing work)', async (status) => {
    const { svc, alloc } = make(status as any);
    await svc.onLicenceLapseCancel(event);
    expect(svc.split.releaseStockForAllocation).not.toHaveBeenCalled();
    expect(svc.engine.transition).not.toHaveBeenCalled();
    if (status) expect(alloc.status).toBe(status);
  });

  it('ignores events of other kinds and never throws', async () => {
    const { svc } = make(PharmacyAllocationState.CONFIRMED);
    await svc.onLicenceLapseCancel({ ...event, kind: 'lab' });
    expect(svc.split.releaseStockForAllocation).not.toHaveBeenCalled();
    svc.split.releaseStockForAllocation.mockRejectedValueOnce(new Error('boom'));
    await expect(svc.onLicenceLapseCancel(event)).resolves.toBeUndefined();
    expect(svc.logger.error).toHaveBeenCalled();
  });
});
