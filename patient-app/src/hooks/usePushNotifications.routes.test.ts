import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { translateBackendRoute } from './usePushNotifications';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../services/HttpClient', () => ({ HttpClient: { post: jest.fn().mockResolvedValue({}) } }));

const APP = join(__dirname, '..', '..', 'app');
const screenExists = (pathname: string) => {
  const base = join(APP, pathname);
  return [`${base}.tsx`, join(base, 'index.tsx')].some((f) => existsSync(f));
};

describe('notification routes the backend writes, translated to screens that exist', () => {
  it('result and report notifications pass the id the report screen reads (`id`, not `reportId`)', () => {
    for (const route of ['/health/results/r1', '/health/reports/r1', '/reports/r1']) {
      expect(translateBackendRoute(route)).toEqual({ pathname: '/reports/view-report', params: { id: 'r1' } });
    }
  });

  it('a community notification opens the articles (community is removed, owner decision 1)', () => {
    expect(translateBackendRoute('/community/post-detail?id=p42')).toEqual({ pathname: '/articles' });
    expect(translateBackendRoute('/community/post-detail')).toEqual({ pathname: '/articles' });
    expect(translateBackendRoute('/community')).toEqual({ pathname: '/articles' });
  });

  it('the family permission request opens the Requests section of the family hub (Batch 6)', () => {
    expect(translateBackendRoute('/family/permission-request')).toEqual({ pathname: '/family' });
    expect(translateBackendRoute('/health/family-hub')).toEqual({ pathname: '/family' });
  });

  it('the old loyalty routes open their tab of the loyalty hub; the removed leaderboard opens the hub (Batch 11)', () => {
    expect(translateBackendRoute('/loyalty/hub')).toEqual({ pathname: '/loyalty/hub' });
    expect(translateBackendRoute('/loyalty/referrals')).toEqual({ pathname: '/loyalty/hub', params: { tab: 'invite' } });
    expect(translateBackendRoute('/loyalty/challenges')).toEqual({ pathname: '/loyalty/hub', params: { tab: 'challenges' } });
    expect(translateBackendRoute('/loyalty/leaderboard')).toEqual({ pathname: '/loyalty/hub' });
  });

  it('routes the app has no screen for stay untranslated (the wallet is not a product: no wallet screen)', () => {
    expect(translateBackendRoute('/wallet/hub')).toBeNull();
    expect(translateBackendRoute('/offers-of-the-week/o1')).toBeNull();
  });

  it('what it returns is a screen of the app', () => {
    for (const route of ['/health/results/r1', '/reports/r1', '/community/post-detail?id=p1', '/family/permission-request', '/health/family-hub', '/orders/o1/tracking', '/consultations/appointments']) {
      const target = translateBackendRoute(route);
      expect(target).not.toBeNull();
      expect(screenExists(target!.pathname)).toBe(true);
    }
  });
});
