/** 19.11 step 2: a nursing visit on insurance opens its insurance request, so the nurse receives it. */
import { ConflictException } from '@nestjs/common';
import { HomeCareSvc } from './home-care.service';

const build = (insurance: any) => {
  const booking: any = { id: 'b1', state: 'PROVIDER_ASSIGNED', toObject() { return { id: this.id, state: this.state }; } };
  const svcModel: any = {
    findOne: async () => ({ id: 'svc1', price: 120, duration: 60, name_ar: 'خدمة', name_en: 'Service' }),
    // findOne: the booked nurse; find: the offers reader (common/service-offers) - the nurse has no price of her own here, so the catalogue price (120) is charged
    db: { collection: () => ({ findOne: async () => ({ id: 'nurse-1' }), find: () => ({ toArray: async () => [] }) }) },
  };
  const bkgModel: any = { findOne: () => ({ lean: async () => null }), create: jest.fn(async () => booking), updateOne: jest.fn(async () => undefined) };
  const engine: any = { announceCreated: jest.fn(async () => undefined) };
  const svc: any = new (HomeCareSvc as any)(svcModel, bkgModel, {}, {}, {}, { emit: jest.fn() }, engine, { emit: jest.fn() }, undefined, undefined, insurance);
  return { svc, bkgModel };
};

const data = (payment_method: string) => ({
  service_id: 'svc1', provider_id: 'nurse-1', payment_method,
  scheduled_at: new Date(Date.now() + 86_400_000).toISOString(), address: { city: 'Riyadh' },
});
const patient = { id: 'pat-1', role: 'patient', full_name: 'Patient' };

describe('nursing visit on insurance (19.11)', () => {
  it('opens the insurance request for the booked nurse and links it to the visit', async () => {
    const insurance = { createRequest: jest.fn(async () => ({ id: 'req-1' })) };
    const { svc, bkgModel } = build(insurance);
    await svc.book(patient, data('insurance'));
    expect(insurance.createRequest).toHaveBeenCalledWith(patient, { booking_kind: 'nursing', booking_id: 'b1' });
    expect(bkgModel.updateOne).toHaveBeenCalledWith({ id: 'b1' }, { $set: { insurance_request_id: 'req-1', insurance_status: 'pending' } });
  });

  it('does not open a request for a card visit', async () => {
    const insurance = { createRequest: jest.fn() };
    const { svc } = build(insurance);
    await svc.book(patient, data('card'));
    expect(insurance.createRequest).not.toHaveBeenCalled();
  });

  it('cancels the visit and tells the patient why when the request is refused', async () => {
    const insurance = { createRequest: jest.fn(async () => { throw new ConflictException('insurance_not_accepted_by_provider'); }) };
    const { svc, bkgModel } = build(insurance);
    await expect(svc.book(patient, data('insurance'))).rejects.toThrow('insurance_not_accepted_by_provider');
    expect(bkgModel.updateOne).toHaveBeenCalledWith({ id: 'b1' }, expect.objectContaining({ $set: { state: 'CANCELLED' } }));
  });
});
