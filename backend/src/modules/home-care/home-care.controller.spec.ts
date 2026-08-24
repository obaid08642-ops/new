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
    const homeCareSvc: any = {
      book: jest.fn().mockResolvedValue({ id: 'booking-1', state: NursingBookingState.NEW_REQUEST }),
      mineFor: jest.fn().mockResolvedValue([]),
      getBooking: jest.fn().mockResolvedValue({ id: 'booking-1', patient_id: 'patient-1' }),
      cancel: jest.fn().mockResolvedValue({ id: 'booking-1', state: NursingBookingState.CANCELLED }),
    };
    return { controller: new NursingController(model, serviceModel, nurseModel, conn, events, engine, homeCareSvc), model, engine, homeCareSvc };
  }

  it('delegates patient booking, owned read, and cancellation to the bounded home-care service', async () => {
    const { controller, homeCareSvc } = makeController(undefined);
    const user = { id: 'patient-1', role: 'patient' };
    const body = { service_id: 'svc-1', scheduled_at: new Date(Date.now() + 3600000).toISOString() };

    await expect(controller.createBooking(user, body)).resolves.toEqual({ id: 'booking-1', state: NursingBookingState.NEW_REQUEST });
    await expect(controller.myBooking('booking-1', user)).resolves.toEqual({ id: 'booking-1', patient_id: 'patient-1' });
    await expect(controller.cancelBooking('booking-1', user)).resolves.toEqual({ id: 'booking-1', state: NursingBookingState.CANCELLED });
    expect(homeCareSvc.book).toHaveBeenCalledWith(user, body);
    expect(homeCareSvc.getBooking).toHaveBeenCalledWith('booking-1', user);
    expect(homeCareSvc.cancel).toHaveBeenCalledWith('booking-1', user);
  });

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

  it('allows an unassigned nursing provider to accept and binds the provider id', async () => {
    const booking: any = {
      id: 'visit-1', state: NursingBookingState.NEW_REQUEST, patient_id: 'patient-1',
      state_history: [], save: jest.fn().mockResolvedValue(undefined),
    };
    const { controller, engine } = makeController(booking);
    const result = await controller.respondToVisit('visit-1', { accept: true }, { id: 'nurse-1', role: 'nurse' });
    expect(result.state).toBe(NursingBookingState.CONFIRMED);
    expect(booking.provider_id).toBe('nurse-1');
    expect(booking.state_history[0].from).toBe(NursingBookingState.NEW_REQUEST);
    expect(engine.apply).toHaveBeenCalledWith(expect.objectContaining({ kind: 'nursing', to_domain: NursingBookingState.CONFIRMED }));
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
