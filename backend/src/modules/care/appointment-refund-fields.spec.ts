import { model } from 'mongoose';
import { AppointmentSchema } from '../../schemas/appointment.schema';

// journeys#44: the refund a cancellation computes is kept on the appointment (strict mode used to drop it).
describe('Appointment refund fields', () => {
  it('keeps the refund percentage, destination and doctor penalty', () => {
    const Appointment = model('AppointmentRefundFieldsSpec', AppointmentSchema);
    const doc: any = new Appointment({ id: 'a1', refund_percentage: 50, refund_destination: 'original_payment', doctor_penalty: 0 });
    expect(doc.toObject()).toMatchObject({ refund_percentage: 50, refund_destination: 'original_payment', doctor_penalty: 0 });
  });
});
