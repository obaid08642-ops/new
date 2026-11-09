import { BadRequestException } from '@nestjs/common';
import { AppointmentsService } from '../modules/care/appointments.service';
import { LabsService } from '../modules/labs/labs.service';
import { RadiologyOpsService } from '../modules/radiology/radiology.service';
import { HomeCareSvc } from '../modules/home-care/home-care.service';
import { PharmacyOrderService } from '../modules/pharmacy/services/pharmacy-order.service';
import { InstantConsultationService } from '../modules/instant-consultation/instant-consultation.service';
import { OrderingService } from '../modules/ordering/ordering.service';
import { OrderingBroadcastService } from '../modules/ordering/ordering-broadcast.service';
import { REFUND_POLICY_REQUIRED_CODE } from './refund-policy-acceptance';

/**
 * Owner decision 2026-11-09: every booking or order a patient creates carries `refund_policy_accepted: true` (the refund policy is agreed BEFORE payment). Each entry point answers
 * 400 `refund_policy_acceptance_required` for a patient without it, before it holds a slot, reads a catalogue or writes anything. One row per way to create a booking or an order.
 */
const patient = { id: 'pat-1', role: 'patient' };
const never = () => { throw new Error('reached past the refund-policy check'); };
const trap: any = new Proxy({}, { get: () => never });                       // any use of a collaborator means the check did not come first

const FUTURE = new Date(Date.now() + 2 * 86_400_000).toISOString();
type Case = [string, () => Promise<unknown>];
const cases: Case[] = [
  ['consultation (POST /care/appointments)', () => (Object.assign(Object.create(AppointmentsService.prototype), { killSwitches: trap, apptModel: trap, providerModel: trap, connection: trap }) as any)
    .create(patient, { doctor_id: 'd', service_type: 'clinic', slot_start: FUTURE })],
  ['lab booking (POST /labs/bookings)', () => (Object.assign(Object.create(LabsService.prototype), { svcModel: trap, bkgModel: trap }) as any)
    .book(patient, { items: [{ service_id: 's' }], scheduled_at: FUTURE })],
  ['radiology booking (POST /radiology/bookings)', () => (Object.assign(Object.create(RadiologyOpsService.prototype), { svcModel: trap, bkgModel: trap }) as any)
    .book(patient, { service_id: 's', scheduled_at: FUTURE })],
  ['home-care booking (POST /patient/home-care/book)', () => (Object.assign(Object.create(HomeCareSvc.prototype), { svcModel: trap, bkgModel: trap }) as any)
    .book(patient, { service_id: 's', scheduled_at: FUTURE })],
  ['pharmacy order (POST /patient/pharmacy/orders)', () => (Object.assign(Object.create(PharmacyOrderService.prototype), { orders: trap, conn: { collection: () => ({ find: () => ({ toArray: async () => [] }), findOne: async () => null }) } }) as any)
    .create(patient, { items: [{ raw_name: 'Panadol', qty: 1 }] })],
  ['instant consultation (POST /instant-consultation)', () => (Object.assign(Object.create(InstantConsultationService.prototype), { conn: trap }) as any)
    .create(patient, { specialty: 'cardiology', mode: 'video' })],
  ['ordering booking from a quote (POST /ordering/bookings)', () => (Object.assign(Object.create(OrderingService.prototype), { conn: trap }) as any)
    .book(patient, { quote_id: 'q1', selections: {} })],
  ['ASAP order (POST /ordering/asap)', () => (Object.assign(Object.create(OrderingBroadcastService.prototype), { conn: trap, ordering: trap }) as any)
    .startAsap(patient, { service_kind: 'lab', items: ['a'], lat: 24, lng: 46, payer: 'cash' })],
  ['photo order (POST /ordering/photo)', () => (Object.assign(Object.create(OrderingBroadcastService.prototype), { conn: { collection: () => ({ findOne: async () => ({ id: 'up1' }) }) }, ordering: trap }) as any)
    .startPhoto(patient, { service_kind: 'lab', upload_id: 'up1', lat: 24, lng: 46, payer: 'cash' })],
];

describe('every patient create asks for the refund-policy tick', () => {
  it.each(cases)('%s: 400 refund_policy_acceptance_required without it', async (_name, run) => {
    await expect(run()).rejects.toThrow(new BadRequestException(REFUND_POLICY_REQUIRED_CODE));
  });
});
