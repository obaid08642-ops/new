import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InsuranceService } from './insurance.module';

function serviceFor(booking: any, existingClaim?: any, paid: any[] = [], copayTxn?: any) {
  const service: any = Object.create(InsuranceService.prototype);
  const created: any[] = [];
  // `transactions` answers the paid-amount read; every other collection answers the booking lookup
  service.conn = {
    collection: jest.fn((name: string) => (name === 'transactions'
      ? { find: jest.fn(() => ({ toArray: async () => paid })), findOne: jest.fn().mockResolvedValue(copayTxn ?? null) }
      : name === 'insuranceservicerequests'
        ? { find: jest.fn(() => ({ limit: () => ({ toArray: async () => (copayTxn ? [{ id: 'req-1' }] : []) }) })) }
        : { findOne: jest.fn().mockResolvedValue(booking) })),
  };
  service.claimModel = {
    create: jest.fn().mockImplementation(async (doc: any) => { created.push(doc); return { id: 'claim-1', ...doc, toObject: () => doc }; }),
    findOne: jest.fn().mockResolvedValue(existingClaim || null),
  };
  service.refundExec = { execute: jest.fn().mockResolvedValue({ ok: true, method: 'card' }) };
  return { service, created };
}

describe('InsuranceService claims (LJ-02)', () => {
  it('files a claim against the patient-owned paid booking and ignores client status', async () => {
    const { service, created } = serviceFor({ id: 'lab-1', patient_id: 'patient-1', total: 250 }, undefined, [{ amount: 250 }]);

    const out = await service.submitClaim('patient-1', { booking_kind: 'lab', booking_id: 'lab-1', claim_type: 'reimbursement', status: 'approved', submitted_at: '1999-01-01T00:00:00Z' });

    expect(out.status).toBe('pending');
    expect(created[0]).toMatchObject({ patient_id: 'patient-1', booking_kind: 'lab', booking_id: 'lab-1', amount: 250, status: 'pending' });
    expect(created[0].date).not.toBe('1999-01-01T00:00:00Z');
  });

  it('rejects an unknown booking kind or a booking that is not the patient’s', async () => {
    const unknown = serviceFor(null);
    await expect(unknown.service.submitClaim('patient-1', { booking_kind: 'spaceship', booking_id: 'x' })).rejects.toThrow(BadRequestException);

    const foreign = serviceFor({ id: 'lab-1', patient_id: 'someone-else', total: 250 });
    await expect(foreign.service.submitClaim('patient-1', { booking_kind: 'lab', booking_id: 'lab-1' })).rejects.toThrow(NotFoundException);
  });

  it('files a pharmacy claim against pharmacy_orders (owner patient_account_id, amount totals.total)', async () => {
    const order = { id: 'ph-1', patient_account_id: 'patient-1', totals: { total: 53 }, total_price: 0 };
    const { service, created } = serviceFor(null);
    service.conn.collection = jest.fn((name: string) => (name === 'transactions'
      ? { find: () => ({ toArray: async () => [{ amount: 53 }] }) }
      : { findOne: jest.fn().mockResolvedValue(name === 'pharmacy_orders' ? order : null) }));
    await service.submitClaim('patient-1', { booking_kind: 'pharmacy', booking_id: 'ph-1' });
    expect(service.conn.collection).toHaveBeenCalledWith('pharmacy_orders');
    expect(created[0]).toMatchObject({ booking_kind: 'pharmacy', booking_id: 'ph-1', amount: 53 });
    await expect(service.submitClaim('patient-2', { booking_kind: 'pharmacy', booking_id: 'ph-1' })).rejects.toThrow(NotFoundException);
  });

  it('admin claim list never lets a query-string object become a Mongo operator', async () => {
    const { service } = serviceFor(null);
    const lean = jest.fn().mockResolvedValue([]);
    service.claimModel.find = jest.fn().mockReturnValue({ sort: () => ({ limit: () => ({ lean }) }) });
    await service.adminClaims({ $ne: 'x' } as any);
    expect(service.claimModel.find).toHaveBeenCalledWith({ status: { $eq: '[object Object]' } });
  });

  it('a booking nobody paid cannot be claimed', async () => {
    const { service } = serviceFor({ id: 'lab-1', patient_id: 'patient-1', total: 250 });
    await expect(service.submitClaim('patient-1', { booking_kind: 'lab', booking_id: 'lab-1' })).rejects.toThrow('booking_not_paid');
  });

  // PT-19: the claim is for what was paid, whatever the client types
  it('claims the amount paid, not the amount the client sends', async () => {
    const { service, created } = serviceFor({ id: 'lab-1', patient_id: 'patient-1', total: 250 }, undefined, [{ amount: 60 }]);
    await service.submitClaim('patient-1', { booking_kind: 'lab', booking_id: 'lab-1', amount: 5000 });
    expect(created[0].amount).toBe(60);
  });

  it('a smaller amount than was paid is kept; less what was already refunded', async () => {
    const a = serviceFor({ id: 'lab-1', patient_id: 'patient-1' }, undefined, [{ amount: 100 }]);
    await a.service.submitClaim('patient-1', { booking_kind: 'lab', booking_id: 'lab-1', amount: 40 });
    expect(a.created[0].amount).toBe(40);
    const b = serviceFor({ id: 'lab-1', patient_id: 'patient-1' }, undefined, [{ amount: 100, refunded_amount: 30 }]);
    await b.service.submitClaim('patient-1', { booking_kind: 'lab', booking_id: 'lab-1' });
    expect(b.created[0].amount).toBe(70);
  });

  it('an insured booking is claimed for the co-pay the patient paid on the insurance request', async () => {
    const { service, created } = serviceFor({ id: 'a-1', patient_id: 'patient-1', total_price: 400 }, undefined, [], { status: 'paid', amount: 80, refunded_amount: 0 });
    await service.submitClaim('patient-1', { booking_kind: 'consultation', booking_id: 'a-1' });
    expect(created[0].amount).toBe(80);
  });

  it('cash the provider collected counts as paid', async () => {
    const { service, created } = serviceFor({ id: 'n-1', patient_id: 'patient-1', collection_proof: { amount_collected: 150 } });
    await service.submitClaim('patient-1', { booking_kind: 'nursing', booking_id: 'n-1' });
    expect(created[0].amount).toBe(150);
  });

  it('a booking that already has a pending or reimbursed claim cannot be claimed again', async () => {
    const { service } = serviceFor({ id: 'lab-1', patient_id: 'patient-1' }, { id: 'claim-1', status: 'pending' }, [{ amount: 100 }]);
    await expect(service.submitClaim('patient-1', { booking_kind: 'lab', booking_id: 'lab-1' })).rejects.toThrow('claim_already_filed');
  });

  it('reimburses through RefundExecutor on approval', async () => {
    const claim: any = { id: 'claim-9', patient_id: 'patient-1', booking_kind: 'lab', booking_id: 'lab-1', amount: 250, status: 'pending', save: jest.fn(), toObject: () => ({ id: 'claim-9' }) };
    const { service } = serviceFor(null, claim);

    const out = await service.decideClaim({ id: 'admin-1' }, 'claim-9', true, 'approved');

    expect(service.refundExec.execute).toHaveBeenCalledWith(expect.objectContaining({ refund_id: 'claim-9', booking_kind: 'lab', booking_id: 'lab-1', patient_id: 'patient-1', amount: 250 }));
    expect(claim.status).toBe('reimbursed');
    expect(claim.refund_id).toBe('claim-9');
    expect(out).toEqual({ id: 'claim-9' });
  });

  it('rejects a claim without refunding, and never re-decides', async () => {
    const claim: any = { id: 'claim-10', status: 'pending', save: jest.fn(), toObject: () => ({ id: 'claim-10' }) };
    const { service } = serviceFor(null, claim);
    await service.decideClaim({ id: 'admin-1' }, 'claim-10', false, 'not covered');
    expect(service.refundExec.execute).not.toHaveBeenCalled();
    expect(claim.status).toBe('rejected');

    const decided = { id: 'claim-11', status: 'reimbursed', save: jest.fn() };
    const { service: s2 } = serviceFor(null, decided);
    await expect(s2.decideClaim({ id: 'admin-1' }, 'claim-11', false)).rejects.toThrow(BadRequestException);
  });
});
