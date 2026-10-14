import React from 'react';
import { View } from 'react-native';
import { router, usePathname } from 'expo-router';

import { BottomTabBar, useTabBarHeight } from '../../../../packages/ui-native/src';
import type { BottomTabItem } from '../../../../packages/ui/components/contract';
import { useApp } from '../../context/AppContext';
import { autoTranslate } from '../../i18n';
import { useModules } from '../../context/ModulesContext';

/**
 * The main tab bar, exactly as canvas/HomeApp.dc.html draws it: the shared native TabBar (floating glass pill,
 * ink pill with the label for the current tab, the raised coral Consultations button in the centre) fed the
 * board's fill glyphs. The five tabs and their routes are the ones the previous bar had.
 *
 * On a tablet the pill keeps the phone width (440) and sits in the middle, like the screens above it.
 */

export type MainTabId = 'home' | 'pharmacy' | 'consult' | 'labs' | 'nursing';

/** The board's items (packages/ui/components/fixtures.ts MAIN_TABS), with Arabic source labels that go through the catalogue. */
export const MAIN_TAB_ITEMS: (BottomTabItem & { id: MainTabId; route: string })[] = [
  { id: 'home', label: 'الرئيسية', icon: 'house', route: '/(tabs)' },
  { id: 'pharmacy', label: 'الصيدلية', icon: 'pill', route: '/(tabs)/pharmacy' },
  { id: 'consult', label: 'الاستشارات', icon: 'stethoscope', route: '/(tabs)/consultations', raised: true },
  { id: 'labs', label: 'التحاليل', icon: 'test-tube', route: '/(tabs)/diagnostics' },
  { id: 'nursing', label: 'التمريض', icon: 'first-aid-kit', route: '/(tabs)/nursing' },
];

/** Which tab a path belongs to; null for pages that are in the tabs group but have no tab (Services, Health). */
export function activeMainTab(pathname: string): MainTabId | null {
  if (pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index' || pathname === '/index') return 'home';
  if (pathname.includes('/pharmacy')) return 'pharmacy';
  if (pathname.includes('/consultations')) return 'consult';
  if (pathname.includes('/diagnostics')) return 'labs';
  if (pathname.includes('/nursing')) return 'nursing';
  return null;
}

const BAR_COLUMN = 440;
/** The raised button stands 34 above the pill. */
const FAB_OVERHANG = 40;

export default function MainTabBar() {
  const pathname = usePathname();
  const { isDark, lang } = useApp();
  const barHeight = useTabBarHeight();
  const tr = (s: string) => autoTranslate(s, lang);
  const active = activeMainTab(pathname);
  // a switched-off module has no tab (#953)
  const { isHidden } = useModules();
  const tabs = MAIN_TAB_ITEMS.filter((item) => !isHidden(item.route));

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', start: 0, end: 0, bottom: 0, height: barHeight + FAB_OVERHANG, alignItems: 'center' }}
    >
      <View pointerEvents="box-none" style={{ width: '100%', maxWidth: BAR_COLUMN, height: '100%' }}>
        <BottomTabBar
          theme={isDark ? 'dark' : 'light'}
          label={tr('التنقل الرئيسي')}
          value={active ?? ''}
          items={tabs.map(({ id, label, icon, raised }) => ({ id, label: tr(label), icon, raised }))}
          onChange={(id) => {
            const tab = tabs.find((item) => item.id === id);
            if (tab) router.push(tab.route as never);
          }}
        />
      </View>
    </View>
  );
}
