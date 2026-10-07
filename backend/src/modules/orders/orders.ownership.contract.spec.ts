import { NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService ownership contract', () => {
  const events: any = { emit: jest.fn() };
  const dispatchSvc: any = {};
  const engine: any = {};
  const conn: any = { collection: jest.fn(() => ({ findOne: jest.fn().mockResolvedValue(null) })) };
  const coupons: any = {};
  const loyaltyRedeem: any = {};
  const refundExec: any = {};
  const cancelPolicy: any = {};
  const abusePrevention: any = {};
  const rankingEvents: any = {};
  const service = new OrdersService(
    {} as any, {} as any, {} as any, {} as any,
    events, dispatchSvc, engine, conn,
    coupons, loyaltyRedeem, refundExec, cancelPolicy,
    abusePrevention, rankingEvents,
  );

  it('permits the patient owner and returns 404 to an unrelated patient', () => {
    const check = (service as any).assertOrderAccess.bind(service);
    expect(() => check({ patient_id: 'patient-owner' }, { id: 'patient-owner', role: 'patient' })).not.toThrow();
    expect(() => check({ patient_id: 'patient-owner' }, { id: 'patient-stranger', role: 'patient' })).toThrow(NotFoundException);
  });
});
