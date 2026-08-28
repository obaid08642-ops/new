import { ServiceUnavailableException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderState, DeliveryState } from '../../common/enums';

describe('OrdersService pharmacy legacy containment', () => {
  const pharmacyOrder: any = {
    id: 'legacy-pharmacy-1', patient_id: 'patient-1', pharmacy_id: 'pharmacy-1', state: OrderState.CREATED,
    basket_review_status: 'none', items: [{ medicine_id: 'med-1', qty: 1 }], save: jest.fn(),
  };
  function setup(order = pharmacyOrder) {
    const orderModel: any = { findOne: jest.fn().mockResolvedValue(order), create: jest.fn(), updateOne: jest.fn() };
    const delModel: any = { findOne: jest.fn(), findOneAndUpdate: jest.fn(), create: jest.fn() };
    const service = new OrdersService(orderModel, {} as any, delModel, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    return { service, orderModel, delModel };
  }
  it('rejects transition, insurance, assignment, and delivery update for a saved pharmacy order', async () => {
    const { service } = setup();
    await expect(service.transition(pharmacyOrder.id, OrderState.ACCEPTED, { id: 'pharmacy-1', role: 'pharmacy' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.updateInsuranceApproval(pharmacyOrder.id, { status: 'APPROVED' }, { id: 'pharmacy-1', role: 'pharmacy' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.assignDelivery(pharmacyOrder.id, 'driver-1', { id: 'pharmacy-1', role: 'pharmacy' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.updateDelivery(pharmacyOrder.id, DeliveryState.IN_TRANSIT)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('rejects a client-created pharmacy order before medicine lookup or dispatch', async () => {
    const { service, orderModel } = setup();
    await expect(service.create({ id: 'patient-1', role: 'patient' }, { type: 'pharmacy', items: [{ medicine_id: 'med-1', qty: 1 }] })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(orderModel.create).not.toHaveBeenCalled();
  });
});
