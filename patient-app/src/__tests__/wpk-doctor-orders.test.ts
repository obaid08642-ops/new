// WP-K: the doctor-order notification opens the patient's real doctor orders.
import * as fs from 'fs';
import * as path from 'path';
import { translateBackendRoute } from '../hooks/usePushNotifications';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('doctor orders in the patient app (WP-K)', () => {
  it('the notification route opens the actionable-order screen', () => {
    expect(translateBackendRoute('/health/actionable-order')).toEqual({ pathname: '/health/actionable-order' });
  });
  it('the screen reads GET /patient/doctor-orders, not a pushed payload', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'health', 'actionable-order.tsx'), 'utf8');
    expect(src).toMatch(/apiFetch\('\/patient\/doctor-orders'\)/);
    expect(src).not.toMatch(/params\.payload/);
  });
});
