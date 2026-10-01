import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { router } from 'expo-router';
import { routeFromNotificationData, translateBackendRoute } from '../usePushNotifications';

const push = router.push as jest.Mock;

function appFile(pathname: string): string {
  return resolve(__dirname, '../../../app', `${pathname.replace(/^\/+/, '')}.tsx`);
}

describe('[7E.N1] single push/deep-link router', () => {
  beforeEach(() => push.mockClear());

  it.each([
    ['/orders/abc/tracking', '/pharmacy/order-tracking', { orderId: 'abc' }],
    ['/tracking/pharmacy/abc', '/pharmacy/order-tracking', { orderId: 'abc' }],
    ['/tracking/lab/abc', '/diagnostics/sample-tracking', { bookingId: 'abc' }],
    ['/tracking/radiology/abc', '/diagnostics/order/[id]', { id: 'abc' }],
    ['/tracking/nursing/abc', '/nursing/live-tracking', { type: 'nurse', bookingId: 'abc' }],
    ['/tracking/consultation/abc', '/consultations/appointment-detail', { appointmentId: 'abc' }],
    ['/nursing/tracking/abc', '/nursing/live-tracking', { type: 'nurse', bookingId: 'abc' }],
    ['/labs/booking/view/abc', '/diagnostics/order/[id]', { id: 'abc' }],
    ['/labs/bookings/abc', '/diagnostics/order/[id]', { id: 'abc' }],
    ['/radiology/booking/view/abc', '/diagnostics/order/[id]', { id: 'abc' }],
    ['/health/results/abc', '/reports/view-report', { reportId: 'abc' }],
    ['/health/reports/abc', '/reports/view-report', { reportId: 'abc' }],
    ['/consultations/appointments', '/consultations/appointments', undefined],
    ['/diagnostics/results-history', '/diagnostics/results-history', undefined],
    ['/insurance/hub', '/insurance/hub', undefined],
    ['/returns/hub', '/returns/hub', undefined],
    ['/loyalty/challenges', '/loyalty/challenges', undefined],
    ['/health/family-hub', '/health/family-hub', undefined],
    ['/ai/symptom-timeline', '/ai/symptom-timeline', undefined],
    ['/emergency/tracking', '/emergency/tracking', undefined],
  ] as Array<[string, string, Record<string, string> | undefined]>)(
    'maps %s to an existing app route',
    (backendRoute, pathname, params) => {
      expect(translateBackendRoute(backendRoute)).toEqual(params ? { pathname, params } : { pathname });
      expect(existsSync(appFile(pathname))).toBe(true);
    },
  );

  it.each([
    [{ type: 'chat', senderId: 'd1', senderName: 'Dr' }, '/consultations/chat-with-doctor'],
    [{ type: 'call_missed' }, '/consultations/appointments'],
    [{ type: 'order', order_id: 'o1' }, '/pharmacy/order-tracking'],
    [{ type: 'booking' }, '/consultations/appointments'],
    [{ type: 'retarget' }, '/pharmacy/cart'],
    [{ type: 'lab' }, '/diagnostics/my-results'],
    [{ type: 'nursing_visit', bookingId: 'n1' }, '/nursing/live-tracking'],
    [{ type: 'refund' }, '/returns/hub'],
    [{ type: 'insurance' }, '/insurance/hub'],
    [{ type: 'family' }, '/health/family-hub'],
    [{ type: 'wallet' }, '/notifications/index'],
    [{ type: 'medication' }, '/health/medication-reminder-list'],
    [{ type: 'loyalty' }, '/loyalty/hub'],
    [{ type: 'emergency' }, '/emergency/tracking'],
    [{ type: 'unknown-kind' }, '/notifications/index'],
  ] as Array<[Record<string, string>, string]>)('routes notification type to an existing screen', (data, pathname) => {
    routeFromNotificationData(data);
    expect(push).toHaveBeenCalled();
    expect(existsSync(appFile(pathname))).toBe(true);
  });
});
