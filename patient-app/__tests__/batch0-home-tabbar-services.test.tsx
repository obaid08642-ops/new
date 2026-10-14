import * as React from 'react';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as TestRenderer from 'react-test-renderer';

import { MAIN_TABS } from '../../packages/ui/components/fixtures';
import { BottomTabBar } from '../../packages/ui-native/src';
import { MAIN_TAB_ITEMS, activeMainTab } from '../src/components/navigation/MainTabBar';
import { HOME_SERVICES, HOME_TOOLS } from '../src/features/home/homeItems';
import { MAIN_SERVICES, MORE_SERVICES } from '../src/features/services/catalog';
import { autoTranslate } from '../src/i18n';
import type { LangCode } from '../src/context/AppContext';

/**
 * Batch 0 app: Home, the main tab bar and Services (boards HomeApp, ServiceHub).
 *  - the tab bar items are the board's (packages/ui fixtures MAIN_TABS), the centre one raised;
 *  - every route the screens link to is a real screen file of the app;
 *  - every Arabic label they show has a translation in all six languages (no visible fallback to Arabic).
 */

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, usePathname: () => '/' }));

jest.mock('react-native-localize', () => ({ getLocales: () => [{ languageCode: 'ar' }] }));

const LANGS: LangCode[] = ['en', 'ur', 'hi', 'bn', 'fil'];
const APP = join(__dirname, '..', 'app');

/** '/(tabs)/pharmacy' -> app/(tabs)/pharmacy.tsx or app/(tabs)/pharmacy/index.tsx */
function routeExists(route: string): boolean {
  const path = route.split('?')[0]; // a route may carry a query (/search?view=doctors&specialty=dentistry)
  const base = join(APP, path === '/(tabs)' ? '(tabs)/index' : path);
  return [`${base}.tsx`, join(base, 'index.tsx')].some((file) => existsSync(file));
}

describe('main tab bar', () => {
  it('has the five items of the HomeApp board, Consultations raised in the centre', () => {
    expect(MAIN_TAB_ITEMS.map(({ id, icon, raised }) => ({ id, icon, raised: Boolean(raised) }))).toEqual(
      MAIN_TABS.map(({ id, icon, raised }) => ({ id, icon, raised: Boolean(raised) })),
    );
    expect(MAIN_TAB_ITEMS[2].raised).toBe(true);
  });

  it('marks the tab of the current path, and none for pages that are not a tab', () => {
    expect(activeMainTab('/')).toBe('home');
    expect(activeMainTab('/(tabs)')).toBe('home');
    expect(activeMainTab('/pharmacy')).toBe('pharmacy');
    expect(activeMainTab('/consultations')).toBe('consult');
    expect(activeMainTab('/diagnostics')).toBe('labs');
    expect(activeMainTab('/nursing')).toBe('nursing');
    expect(activeMainTab('/services')).toBeNull();
    expect(activeMainTab('/health')).toBeNull();
  });

  it('renders as a tab list with the current tab selected and every tab named', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tree = TestRenderer.create(
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } }}>
          <BottomTabBar value="home" items={MAIN_TAB_ITEMS.map(({ id, label, icon, raised }) => ({ id, label, icon, raised }))} />
        </SafeAreaProvider>,
      );
    });
    const tabs = tree.root.findAll((n) => n.props.accessibilityRole === 'tab' && typeof n.type === 'string');
    expect(tabs).toHaveLength(5);
    expect(tabs.map((n) => n.props.accessibilityLabel)).toEqual(MAIN_TAB_ITEMS.map((item) => item.label));
    expect(tabs.filter((n) => n.props.accessibilityState?.selected)).toHaveLength(1);
  });
});

describe('Home and Services links', () => {
  const routes = [
    ...MAIN_TAB_ITEMS.map((item) => item.route),
    ...HOME_SERVICES.map((item) => item.route),
    ...HOME_TOOLS.map((item) => item.route),
    ...MAIN_SERVICES.map((item) => item.route),
    ...MORE_SERVICES.map((item) => item.route),
    '/ai',
    '/ai-assistant',
    '/(tabs)/services',
    '/orders',
    '/search',
    '/profile',
    '/notifications',
    '/loyalty/hub',
    '/consultations/appointments',
    '/health/medications',
  ];

  it.each([...new Set(routes)])('%s is a screen of the app', (route) => {
    expect(routeExists(route)).toBe(true);
  });
});

describe('All services opens the Services tab (owner 2026-10-10, issue 409)', () => {
  it('the 23-row guide screen is gone, so /services is the tab (the group name is not part of the URL) and old links still open it', () => {
    expect(existsSync(join(APP, 'services', 'index.tsx'))).toBe(false);
    expect(existsSync(join(APP, 'services.tsx'))).toBe(false);
    expect(existsSync(join(APP, '(tabs)', 'services.tsx'))).toBe(true);
  });

  it('the Home all-services row pushes the tab, and nothing in the app links to the removed screen', () => {
    const home = readFileSync(join(APP, '(tabs)', 'index.tsx'), 'utf8');
    expect(home).toMatch(/<AllServicesRow onPress=\{\(\) => router\.push\('\/\(tabs\)\/services'\)\} \/>/);
    expect(home).not.toMatch(/push\('\/services'\)/);
  });
});

describe('labels in six languages', () => {
  const labels = [
    ...MAIN_TAB_ITEMS.map((item) => item.label),
    'التنقل الرئيسي',
    'صباح الخير',
    'مساء الخير',
    'الوضع الغامق',
    'تذكير صحي',
    'مدعوم بالذكاء الاصطناعي',
    'المساعد الطبي الذكي',
    'صف أعراضك، ونقترح لك التخصص المناسب',
    'كل الخدمات',
    'موعدك القادم',
    'كل المواعيد',
    'التفاصيل',
    'نقاط نبض+',
    'تخصم حتى ١٠٪ من قيمة طلبك',
    'الخدمات',
    'طلباتي',
    'ابحث عن خدمة أو طبيب أو دواء',
    'الخدمات الرئيسية',
    'خدمات إضافية',
    ...HOME_SERVICES.map((item) => item.label),
    ...HOME_TOOLS.map((item) => item.label),
    ...MAIN_SERVICES.flatMap((item) => [item.title, item.badge ?? 'جديد']),
    ...MORE_SERVICES.flatMap((item) => [item.title, item.desc]),
  ];

  it.each([...new Set(labels)])('%s', (label) => {
    for (const lang of LANGS) {
      const out = autoTranslate(label, lang);
      expect(typeof out).toBe('string');
      expect(out).not.toBe(label);
    }
  });
});
