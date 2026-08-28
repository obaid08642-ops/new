import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { NursingController } from './home-care.controller';
import { NursingBookingState } from '../../schemas/home-care.schema';

describe('NursingController ownership', () => {
  function makeController(booking: any) {
    const model: any = {
      findOne: jest.fn().mockResolvedValue(booking),
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(booking ? [booking] : []) }),
      create: jest.fn(),
    };
    const serviceModel: any = {};
    const nurseModel: any = {};
    const conn: any = { db: { collection: jest.fn() } };
    const events: any = { emit: jest.fn() };
    const engine: any = { apply: jest.fn(async (opts: any) => opts.mutate()) };
    return { controller: new NursingController(model, serviceModel, nurseModel, conn, events, engine), model, engine };
  }

  it('rejects a patient from reading another patient visit', async () => {
    const booking: any = { id: 'visit-1', patient_id: 'patient-1', provider_id: 'nurse-1' };
    const { controller } = makeController(booking);
    await expect(controller.getVisitById('visit-1', { id: 'patient-2', role: 'patient' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a non-nursing provider from listing nursing visits', async () => {
    const { controller, model } = makeController(undefined);
    await expect(controller.getVisits(undefined, { id: 'doctor-1', role: 'provider', provider_type: 'doctor' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(model.find).not.toHaveBeenCalled();
  });

  it('fails closed for the legacy provider acceptance route so it cannot allocate a visit before governed payment, coverage, and capacity checks', () => {
    const booking: any = {
      id: 'visit-1', state: NursingBookingState.NEW_REQUEST, patient_id: 'patient-1',
      state_history: [], save: jest.fn().mockResolvedValue(undefined),
    };
    const { controller, engine } = makeController(booking);
    expect(() => controller.respondToVisit()).toThrow('legacy_nursing_visit_response_disabled');
    expect(booking.provider_id).toBeUndefined();
    expect(booking.state_history).toEqual([]);
    expect(engine.apply).not.toHaveBeenCalled();
  });

  it('rejects a provider mutation on another provider visit', async () => {
    const booking: any = { id: 'visit-1', patient_id: 'patient-1', provider_id: 'nurse-other', state: NursingBookingState.CONFIRMED };
    const { controller } = makeController(booking);
    await expect(controller.startTransit('visit-1', { id: 'nurse-1', role: 'nurse' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects patient access to provider wallet', async () => {
    const booking: any = { id: 'visit-1', provider_id: 'nurse-1', state: NursingBookingState.COMPLETED, service_fee: 25 };
    const { controller, model } = makeController(booking);
    await expect(controller.getWalletData({ id: 'patient-1', role: 'patient' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(model.find).not.toHaveBeenCalled();
  });

  it('uses real booking amount and never invents the legacy 150 amount', async () => {
    const booking: any = { id: 'visit-1', provider_id: 'nurse-1', state: NursingBookingState.COMPLETED, total_price: 25, scheduled_at: new Date() };
    const { controller } = makeController(booking);
    const result = await controller.getWalletData({ id: 'nurse-1', role: 'nurse', provider_type: 'nursing' });
    expect(result.balance).toBe(25);
    expect(result.transactions[0].amount).toBe(25);
  });

  it('fails closed when start-care is called before arrival', async () => {
    const booking: any = { id: 'visit-1', patient_id: 'patient-1', provider_id: 'nurse-1', state: NursingBookingState.CONFIRMED, timers: {}, state_history: [], save: jest.fn() };
    const { controller } = makeController(booking);
    await expect(controller.startCare('visit-1', { id: 'nurse-1', role: 'nurse', provider_type: 'nursing' })).rejects.toBeInstanceOf(BadRequestException);
    expect(booking.save).not.toHaveBeenCalled();
  });
});
