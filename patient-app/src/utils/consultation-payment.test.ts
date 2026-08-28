import { appointmentMutationHeaders, consultationMutationHeaders, isHttpsCheckout } from './consultation-payment';

describe('consultation payment helpers', () => {
  it('accepts only HTTPS checkout URLs', () => {
    expect(isHttpsCheckout('https://payments.example/checkout')).toBe(true);
    expect(isHttpsCheckout('http://payments.example/checkout')).toBe(false);
    expect(isHttpsCheckout('javascript:alert(1)')).toBe(false);
  });

  it('creates a bounded idempotency header for appointment creation', () => {
    const headers = appointmentMutationHeaders('doctor-1', '2026-08-28T10:00:00.000Z');
    expect(headers['Idempotency-Key']).toMatch(/^appointment-create-doctor-1-/);
    expect(headers['Idempotency-Key'].length).toBeLessThanOrEqual(128);
  });

  it('creates a distinct bounded idempotency header for appointment cancellation', () => {
    const headers = consultationMutationHeaders('cancel', 'appointment-1');
    expect(headers['Idempotency-Key']).toMatch(/^appointment-cancel-appointment-1-/);
    expect(headers['Idempotency-Key'].length).toBeLessThanOrEqual(128);
  });
});
