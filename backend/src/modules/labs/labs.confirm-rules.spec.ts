import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LabsService } from './labs.service';

// transition(): only the booked lab may move a booking, and NEW_REQUEST -> CONFIRMED needs a settled
// or deferred payment (cash at the facility, paid card); insurance goes through coverage-decision.
function build(booking: any) {
  const saved: any[] = [];
  const b = { ...booking, state_history: [], save: jest.fn(async () => saved.push(true)), toObject() { return { ...this }; } };
  const bkgModel = { findOne: jest.fn(async () => b) };
  const engine = { apply: jest.fn(async ({ mutate }: any) => mutate()) };
  const svc = new (LabsService as any)({}, bkgModel, {}, {}, { emit: jest.fn() }, { emit: jest.fn(() => Promise.resolve()) }, engine, {});
  return { svc: svc as LabsService, b, engine };
}
const lab = { id: 'lab-1', role: 'provider', provider_type: 'lab' };
const base = { id: 'b1', patient_id: 'p1', provider_account_id: 'lab-1', state: 'NEW_REQUEST' };

describe('LabsService.transition confirm rules', () => {
  it('another lab cannot move the booking', async () => {
    const { svc } = build(base);
    await expect(svc.transition('b1', 'CONFIRMED' as any, { id: 'lab-2', role: 'lab' })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('cash at the facility is accepted', async () => {
    const { svc, b } = build({ ...base, payment_method: 'cash', location_type: 'facility' });
    await svc.transition('b1', 'CONFIRMED' as any, lab);
    expect(b.state).toBe('CONFIRMED');
  });
  it.each([
    [{ payment_method: 'insurance', location_type: 'facility' }, 'insurance_booking_requires_coverage_decision'],
    [{ payment_method: 'card', location_type: 'home' }, 'card_payment_not_completed'],
    [{ payment_method: 'cash', location_type: 'home' }, 'cash_only_at_facility'],
  ])('refuses %j', async (extra, code) => {
    const { svc } = build({ ...base, ...extra });
    await expect(svc.transition('b1', 'CONFIRMED' as any, lab)).rejects.toThrow(new BadRequestException(code));
  });
  it('a paid card booking is accepted', async () => {
    const { svc, b } = build({ ...base, payment_method: 'card', payment_status: 'paid', location_type: 'home' });
    await svc.transition('b1', 'CONFIRMED' as any, lab);
    expect(b.state).toBe('CONFIRMED');
  });
});
