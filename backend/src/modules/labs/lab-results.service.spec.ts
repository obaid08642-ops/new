import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LabResultsService } from './lab-results.service';
import { LabBookingState } from '../../schemas/lab.schema';

describe('LabResultsService workflow integrity', () => {
  const results: any = { create: jest.fn(), findOne: jest.fn() };
  const bookings: any = { findOne: jest.fn() };
  const events: any = { emit: jest.fn() };
  const engine: any = { apply: jest.fn(async (opts: any) => opts.mutate()) };
  const service = new LabResultsService(results, {} as any, bookings, events, engine);

  beforeEach(() => jest.clearAllMocks());

  it('rejects a foreign provider before creating a result', async () => {
    bookings.findOne.mockResolvedValue({ id: 'b1', provider_account_id: 'lab-a', state: LabBookingState.RESULT_UPLOADED });
    await expect(service.create({ id: 'lab-b', role: 'provider', provider_type: 'lab' }, { booking_id: 'b1', type: 'blood' })).rejects.toThrow(ForbiddenException);
    expect(results.create).not.toHaveBeenCalled();
  });

  it('rejects result creation until the sample has reached result upload', async () => {
    bookings.findOne.mockResolvedValue({ id: 'b1', provider_account_id: 'lab-a', state: LabBookingState.PROCESSING });
    await expect(service.create({ id: 'lab-a', role: 'provider', provider_type: 'lab' }, { booking_id: 'b1', type: 'blood' })).rejects.toThrow(BadRequestException);
    expect(results.create).not.toHaveBeenCalled();
  });

  it('creates and releases a result through the workflow engine only', async () => {
    const booking: any = { id: 'b1', patient_id: 'p1', provider_account_id: 'lab-a', state: LabBookingState.RESULT_UPLOADED, state_history: [], reports: [], items: [], save: jest.fn() };
    bookings.findOne.mockResolvedValue(booking);
    results.create.mockResolvedValue({ id: 'r1', tracking_id: 'RES-1', toObject: () => ({ id: 'r1' }) });
    await expect(service.create({ id: 'lab-a', role: 'provider', provider_type: 'lab' }, { booking_id: 'b1', type: 'blood', entries: [] })).resolves.toEqual({ id: 'r1' });
    expect(engine.apply).toHaveBeenCalledWith(expect.objectContaining({ from_domain: LabBookingState.RESULT_UPLOADED, to_domain: LabBookingState.REPORTED }));
    expect(booking.save).toHaveBeenCalled();
  });

  it('resolves an embedded booking report for its owning patient when the list exposes its id', async () => {
    const embeddedBooking = {
      id: 'booking-1', patient_id: 'patient-1', state: LabBookingState.REPORTED,
      reports: [{ id: 'embedded-report-1', name: 'report.pdf', mime: 'application/pdf', url: 'https://example.invalid/report.pdf', notes: 'ready', uploaded_at: new Date('2026-01-01') }],
    };
    const findOne = jest.fn().mockResolvedValue(embeddedBooking);
    const connection: any = { collection: jest.fn(() => ({ findOne })) };
    const localService = new LabResultsService(results, connection, bookings, events, engine);
    results.findOne.mockResolvedValue(null);

    await expect(localService.one({ id: 'patient-1', role: 'patient' }, 'embedded-report-1')).resolves.toEqual(expect.objectContaining({
      id: 'embedded-report-1', booking_id: 'booking-1', patient_id: 'patient-1', source: 'lab_booking',
    }));
    expect(findOne).toHaveBeenCalledWith(
      { 'reports.id': 'embedded-report-1', patient_id: 'patient-1' },
      expect.objectContaining({ projection: expect.any(Object) }),
    );
  });

  it('does not resolve an embedded booking report for a foreign patient', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const connection: any = { collection: jest.fn(() => ({ findOne })) };
    const localService = new LabResultsService(results, connection, bookings, events, engine);
    results.findOne.mockResolvedValue(null);

    await expect(localService.one({ id: 'patient-2', role: 'patient' }, 'embedded-report-1')).rejects.toThrow(NotFoundException);
    expect(findOne).toHaveBeenCalledWith(
      { 'reports.id': 'embedded-report-1', patient_id: 'patient-2' },
      expect.objectContaining({ projection: expect.any(Object) }),
    );
  });
});
