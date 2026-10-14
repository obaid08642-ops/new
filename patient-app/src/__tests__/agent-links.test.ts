import { takeDeepLinkLanguage } from '../navigation/deepLinkLanguage';
import { mapWebSegments, resolveWebLink } from '../navigation/webLinkMap';
import { redirectSystemPath } from '../../app/+native-intent';
import { PUBLIC_APP_LINK_PATHS, allAppLinkPatterns } from '../../../patient-web/lib/app-links';

/**
 * AC-4 (docs/review/AGENT_COMMERCE_SPEC_2026-10-12.md): every URL an agent tool returns
 * opens the same screen in the app (universal links + nabdplus:// deep links).
 * The four agent URL shapes below must map to real app screens — not to a hub that
 * drops the order/booking id — and the AASA/app-links list must cover their paths
 * (the native-intent parity tests then check every pattern maps to an existing route
 * and that app.json intent filters match the AASA list).
 */
describe('agent commerce deep links (AC-4)', () => {
  beforeEach(() => {
    takeDeepLinkLanguage();
  });

  it('the app-links list covers the agent URL paths', () => {
    const paths = PUBLIC_APP_LINK_PATHS.map((e) => e.path);
    for (const p of [
      '/pharmacy/broadcast-status',
      '/consultations/booking-status',
      '/diagnostics/bookings/*',
      '/nursing/visits/*',
    ]) {
      expect(paths).toContain(p);
    }
    const patterns = allAppLinkPatterns();
    for (const p of ['/pharmacy/broadcast-status', '/consultations/booking-status']) {
      expect(patterns).toContain(p);
      expect(patterns).toContain(`/ar${p}`);
    }
    expect(patterns).toContain('/diagnostics/bookings/*');
    expect(patterns).toContain('/ar/nursing/visits/*');
  });

  it('an order link opens the order screen, keeping the order id', () => {
    expect(mapWebSegments(['pharmacy', 'broadcast-status'])).toBe('/pharmacy/broadcast-status');
    expect(redirectSystemPath({ path: 'https://nabd.plus/ar/pharmacy/broadcast-status?orderId=o-1', initial: true }))
      .toBe('/pharmacy/broadcast-status?orderId=o-1');
    expect(takeDeepLinkLanguage()).toBe('ar');
  });

  it('a booking link opens the booking screen, keeping the booking id', () => {
    expect(mapWebSegments(['consultations', 'booking-status'])).toBe('/consultations/booking-status');
    expect(redirectSystemPath({ path: 'https://nabd.plus/ar/consultations/booking-status?appointmentId=b-1', initial: true }))
      .toBe('/consultations/booking-status?appointmentId=b-1');
    expect(takeDeepLinkLanguage()).toBe('ar');
  });

  it('a lab booking link opens the diagnostics order screen', () => {
    expect(mapWebSegments(['diagnostics', 'bookings', 'labs', 'lb-1'])).toBe('/diagnostics/order/lb-1');
    // app-scheme links name the app route and pass through unchanged (house convention)
    expect(resolveWebLink('nabdplus://diagnostics/order/lb-1')).toEqual({ route: '/diagnostics/order/lb-1', lang: null });
  });

  it('a nursing visit link opens the visit tracking screen', () => {
    expect(mapWebSegments(['nursing', 'visits', 'nv-1'])).toBe('/nursing/live-tracking?type=nurse&bookingId=nv-1');
    expect(redirectSystemPath({ path: 'https://nabd.plus/en/nursing/visits/nv-1', initial: false }))
      .toBe('/nursing/live-tracking?type=nurse&bookingId=nv-1');
  });
});
