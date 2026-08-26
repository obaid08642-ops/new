import { NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService ownership contract', () => {
  const service = new OrdersService(
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );

  it('permits the patient owner and returns 404 to an unrelated patient', () => {
    const check = (service as any).assertOrderAccess.bind(service);
    expect(() => check({ patient_id: 'patient-owner' }, { id: 'patient-owner', role: 'patient' })).not.toThrow();
    expect(() => check({ patient_id: 'patient-owner' }, { id: 'patient-stranger', role: 'patient' })).toThrow(NotFoundException);
  });
});
