/** Design parity (#1819): the order detail carries the courier the pharmacy recorded, vehicle included. */
import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PharmacyOrderService } from './pharmacy-order.service';
import { PharmacyAllocationService } from './pharmacy-allocation.service';
import { OutDto } from '../pharmacy.controllers.dto';

describe('order detail courier', () => {
  const svcWith = (order: any, allocs: any[]) => {
    const svc: any = Object.create(PharmacyOrderService.prototype);
    svc.orders = { findOne: () => ({ lean: async () => ({ id: 'o1', patient_account_id: 'pat', status: 'out_for_delivery', ...order }) }) };
    svc.allocs = { find: () => ({ lean: async () => allocs }) };
    svc.conn = { collection: () => ({ find: () => ({ toArray: async () => [] }) }) };
    return svc;
  };
  const patient = { id: 'pat', role: 'patient' };

  it('reads name, phone and vehicle from the order delivery the pharmacy wrote', async () => {
    const out = await svcWith({ delivery: { courier_name: 'Omar', courier_phone: '+9665', courier_vehicle: 'White Toyota Hilux 1234' } }, [{ id: 'a1', pharmacy_account_id: 'ph1' }]).detail(patient, 'o1');
    expect(out).toMatchObject({ courier_name: 'Omar', courier_phone: '+9665', courier_vehicle: 'White Toyota Hilux 1234' });
  });

  it('an allocation delivery wins when it has one', async () => {
    const out = await svcWith({ delivery: { courier_vehicle: 'order-level' } }, [{ id: 'a1', pharmacy_account_id: 'ph1', delivery: { courier_vehicle: 'alloc-level' } }]).detail(patient, 'o1');
    expect(out.courier_vehicle).toBe('alloc-level');
  });

  it('nothing recorded is null, never invented', async () => {
    const out = await svcWith({}, [{ id: 'a1', pharmacy_account_id: 'ph1' }]).detail(patient, 'o1');
    expect(out).toMatchObject({ courier_name: null, courier_phone: null, courier_vehicle: null });
  });
});

describe('out-for-delivery body', () => {
  it('accepts a vehicle up to 60 chars and refuses longer or non-string', async () => {
    expect(await validate(plainToInstance(OutDto, { courier_vehicle: 'Hilux 1234' }))).toHaveLength(0);
    expect(await validate(plainToInstance(OutDto, { courier_vehicle: 'x'.repeat(61) }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(OutDto, { courier_vehicle: 5 }))).not.toHaveLength(0);
  });

  it('stores the vehicle (trimmed to 60) on the order delivery', async () => {
    const svc: any = Object.create(PharmacyAllocationService.prototype);
    const alloc: any = { id: 'a1', order_id: 'o1', pharmacy_account_id: 'ph1', status: 'ready_for_pickup', save: jest.fn(), toObject: () => ({}) };
    svc.allocs = { findOne: jest.fn(async () => alloc) };
    svc.orders = { findOne: () => ({ lean: async () => ({ id: 'o1', delivery: { method: 'pharmacy_delivery' } }) }), updateOne: jest.fn() };
    svc.assertFulfillmentAuthorized = jest.fn(async () => undefined);
    svc.transition = jest.fn();
    svc.refreshOrderAfterAllocationChange = jest.fn();
    svc.notif = { notifyPatientAllocationProgress: jest.fn() };
    svc.bus = { emit: jest.fn() };
    await svc.outForDelivery({ id: 'ph1', role: 'pharmacy' }, 'a1', { courier_name: 'Omar', courier_vehicle: 'v'.repeat(80) });
    const set = svc.orders.updateOne.mock.calls[0][1].$set;
    expect(set['delivery.courier_vehicle']).toBe('v'.repeat(60));
  });
});
