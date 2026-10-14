import { resolveNotificationTarget } from './notification-target';

// OC-C C-15 (446): every listed notification carries a platform-neutral target.
describe('notification targets (446)', () => {
  it.each([
    ['/orders/ord-1/tracking', 'order_tracking', 'ord-1', '/orders/ord-1/tracking'],
    ['/orders/ord-1', 'order', 'ord-1', '/orders/ord-1'],
    ['/reports/rep-2', 'report', 'rep-2', '/reports/rep-2'],
    ['/health/reports/rep-3', 'report', 'rep-3', '/reports/rep-3'],
    ['/consultations/appointments/ap-4', 'appointment', 'ap-4', '/appointments/ap-4'],
    ['/consultations/appointments', 'appointments', null, '/appointments'],
    ['/tracking/lab/lab-5', 'lab_tracking', 'lab-5', null],
    ['/tracking/pharmacy/bk-6', 'pharmacy_tracking', 'bk-6', null],
    ['/provider/job/j-7', 'provider_job', 'j-7', null],
    ['/labs/booking/view/lb-8', 'lab_booking', 'lb-8', null],
    ['/nursing/tracking/nr-9', 'nursing_visit', 'nr-9', null],
    ['/radiology/booking/view/rd-10', 'radiology_booking', 'rd-10', null],
    ['/orders/ord-1/tracking?x=1', 'order_tracking', 'ord-1', '/orders/ord-1/tracking'],
  ])('%s resolves kind=%s id=%s web=%s', (route, kind, id, web) => {
    expect(resolveNotificationTarget(route)).toEqual({ kind, id, web_path: web });
  });

  it('returns null for static or unknown routes', () => {
    expect(resolveNotificationTarget('/ai/symptom-timeline')).toBeNull();
    expect(resolveNotificationTarget('/health/family-hub')).toBeNull();
    expect(resolveNotificationTarget(undefined)).toBeNull();
    expect(resolveNotificationTarget('not-a-route')).toBeNull();
  });
});
