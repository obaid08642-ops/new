import { LabBookingSchema } from './lab.schema';
import { RadiologyBookingSchema } from './radiology.schema';
import { HomeCareBookingSchema } from './home-care.schema';
import { AppointmentSchema } from './appointment.schema';
import { InsuranceServiceRequestSchema } from '../modules/insurance-engine/insurance-engine.module';

// PaymentsService.verifyPayment / finance refunds write these through modelFor(kind): a strict schema
// without them silently drops the payment state (booking stays "unpaid" after a successful charge).
describe('booking schemas used by payments keep payment state', () => {
  it.each([
    ['LabBooking', LabBookingSchema], ['RadiologyBooking', RadiologyBookingSchema], ['HomeCareBooking', HomeCareBookingSchema],
    ['Appointment', AppointmentSchema], ['InsuranceServiceRequest', InsuranceServiceRequestSchema],
  ])('%s declares payment_status, transaction_id, paid_at, refund_status', (_name, schema: any) => {
    for (const path of ['payment_status', 'transaction_id', 'paid_at', 'refund_status']) expect(schema.path(path)).toBeDefined();
  });
});
