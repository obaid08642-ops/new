import { ReturnsService } from './returns.service';

// OC-C C-18 (761/762): reason codes + refund ETA.
function serviceFor() {
  const service: any = Object.create(ReturnsService.prototype);
  const created: any[] = [];
  service.returnModel = { create: jest.fn().mockImplementation(async (doc: any) => { created.push(doc); return { ...doc, toObject: () => ({ ...doc }) }; }) };
  service.conn = {
    collection: jest.fn((name: string) => {
      if (name === 'appointments') {
        return { findOne: jest.fn().mockResolvedValue({ id: 'appt-1', patient_id: 'pat-1', status: 'COMPLETED', payment_status: 'paid', total_price: 150 }) };
      }
      if (name === 'transactions') {
        return { find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ amount: 150, status: 'paid' }]) }) };
      }
      if (name === 'system_configs') {
        return { findOne: jest.fn().mockResolvedValue({ key: 'system_config', value: { returns_policy: { wallet_refund_days_min: 3, wallet_refund_days_max: 5 } } }) };
      }
      return { findOne: jest.fn().mockResolvedValue(null), find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) };
    }),
  };
  return { service: service as ReturnsService, created };
}

describe('OC C-18 return reason codes and ETA', () => {
  it('stores a reason_code and keeps free text as details', async () => {
    const { service, created } = serviceFor();
    await service.createRequest('pat-1', { serviceType: 'consultation', orderId: 'appt-1', reason: 'damaged' });
    expect(created[0].reason_code).toBe('damaged');
    await service.createRequest('pat-1', { serviceType: 'consultation', orderId: 'appt-1', reason: 'المنتج تالف تماما' });
    expect(created[1].reason_code).toBe('other');
    expect(created[1].details).toContain('المنتج تالف تماما');
  });

  it('answers an expected refund window from policy', async () => {
    const { service } = serviceFor();
    const out: any = await service.createRequest('pat-1', { serviceType: 'consultation', orderId: 'appt-1', reason: 'damaged' });
    expect(out.expected_refund).toMatchObject({ min_days: 3, max_days: 5 });
  });
});
