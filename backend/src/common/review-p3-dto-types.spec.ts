/**
 * REVIEW-P3 round 3: DTO types must match what the clients send and the
 * services consume (run through the production ValidationPipe).
 */
import { ValidationPipe } from '@nestjs/common';
import { DeclareEmergencyDto, RescheduleDto } from '../modules/labs/labs.dto';
import { FinishAppointmentDto } from '../modules/care/appointments.generated.dto';
import { PutCrmDto } from '../modules/provider-ops/provider-ops.dto';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const errors = async (dto: any, body: unknown): Promise<string[]> => {
  try { await pipe.transform(body, { type: 'body', metatype: dto }); return []; } catch (e: any) { return e.getResponse().message; }
};

describe('REVIEW-P3 DTO types vs clients/services', () => {
  it('labs reschedule: reason is the text the lab app sends', async () => {
    expect(await errors(RescheduleDto, { new_date: '2026-10-01T09:00:00.000Z', reason: 'Provider Reschedule' })).toEqual([]);
    expect(await errors(RescheduleDto, { reason: ['x'] })).not.toEqual([]);
  });

  it('labs emergency: reason is a text code (PATIENT_ABSENT, WRONG_LOCATION)', async () => {
    expect(await errors(DeclareEmergencyDto, { reason: 'PATIENT_ABSENT' })).toEqual([]);
    expect(await errors(DeclareEmergencyDto, { reason: 'WRONG_LOCATION' })).toEqual([]);
  });

  it('appointment finish: summary fields are strings, prescription optional (schema: summary.diagnosis/notes/recommendations: string)', async () => {
    expect(await errors(FinishAppointmentDto, {})).toEqual([]);
    expect(await errors(FinishAppointmentDto, {
      diagnosis: 'التهاب الحلق', notes: 'راحة', recommendations: 'سوائل',
      prescription: [{ name: 'Paracetamol', dose: '500mg', duration: '3 days' }],
      follow_up_recommended: true, follow_up_window_days: 7,
    })).toEqual([]);
    expect(await errors(FinishAppointmentDto, { diagnosis: ['x'] })).not.toEqual([]);
  });

  it('doctor patient CRM: partial update with tags array (service reads tags/notes as arrays)', async () => {
    expect(await errors(PutCrmDto, { vip: true })).toEqual([]);
    expect(await errors(PutCrmDto, { tags: ['diabetic', 'vip'], notes: [{ id: 'n1', date: '2026-09-26', text: 'follow up' }] })).toEqual([]);
    expect(await errors(PutCrmDto, { tags: 'diabetic' })).not.toEqual([]);
  });
});

describe('REVIEW-P3: Moyasar webhook body is not whitelisted (signature-verified third-party payload)', () => {
  it('a real Moyasar event shape passes the production pipe untouched', async () => {
    const { MoyasarController } = require('../modules/moyasar/moyasar.module');
    const types = Reflect.getMetadata('design:paramtypes', MoyasarController.prototype, 'webhook');
    const event = {
      id: 'evt_1', type: 'payment_paid', created_at: '2026-09-26T10:00:00.000Z', secret_token: 's', account_name: 'nabd', live: false,
      data: { id: 'pay_1', status: 'paid', amount: 10000, currency: 'SAR', metadata: { booking_id: 'b1' } },
    };
    expect(await errors(types[0], event)).toEqual([]);
    const out = await pipe.transform(event, { type: 'body', metatype: types[0] });
    expect(out).toEqual(event);
  });
});

describe('REVIEW-P3: refund amounts must be positive', () => {
  it('payments + moyasar refund reject zero/negative amounts', async () => {
    const { RefundPaymentDto } = require('../modules/payments/payments.dto');
    const { RefundDto } = require('../modules/moyasar/moyasar.dto');
    for (const dto of [RefundPaymentDto, RefundDto]) {
      expect(await errors(dto, { amount: 25.5 })).toEqual([]);
      expect(await errors(dto, {})).toEqual([]);
      expect(await errors(dto, { amount: -5 })).not.toEqual([]);
      expect(await errors(dto, { amount: 0 })).not.toEqual([]);
    }
  });
});
