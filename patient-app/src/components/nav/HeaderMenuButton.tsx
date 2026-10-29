import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { withAlpha } from '../../../../packages/ui-native/src/shells/shellTokens';
import { useScreenUi } from '../screen/ScreenKit';
import { useNewResultsCount } from '../../hooks/useNewResultsCount';

/**
 * The header MENU button (owner decision, reviewer 2026-10-26): the round button that is the LAST item of a header, at the
 * inline-end edge (far left in ar/ur, far right in en/hi/bn/tl, because the header row follows the app's direction). It opens a
 * bottom sheet with the places the phone menu of the web lists (patient-web core-shell): profile, orders, family, articles,
 * notifications, settings, help. The sheet closes on a pick, on the scrim and on back.
 */
export const MENU_ITEMS: { key: string; label: string; href: string }[] = [
  { key: 'profile', label: 'menu.profile', href: '/profile' },
  { key: 'orders', label: 'menu.orders', href: '/orders' },
  { key: 'family', label: 'menu.family', href: '/family' },
  { key: 'articles', label: 'menu.articles', href: '/articles' },
  { key: 'notifications', label: 'menu.notifications', href: '/notifications' },
  { key: 'settings', label: 'menu.settings', href: '/settings' },
  { key: 'help', label: 'menu.help', href: '/settings/help' },
];

/** Three strokes on the 24 grid, drawn in a token colour. */
const BARS = 'M4 7h16 M4 12h16 M4 17h16';

export function HeaderMenuButton({ testID = 'header-menu-button' }: { testID?: string }) {
  const { c, k, num, flow } = useScreenUi();
  const fresh = useNewResultsCount();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const openSheet = () => {
    fresh.refresh();
    setOpen(true);
  };
  const pick = (href: string) => {
    setOpen(false);
    router.push(href as Href);
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={k('menu.open')}
        accessibilityState={{ expanded: open }}
        testID={testID}
        onPress={openSheet}
        style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.onGlass, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d={BARS} stroke={c.text.secondary} strokeWidth={2} strokeLinecap="round" />
        </Svg>
        {fresh.count > 0 ? (
          <View
            testID={`${testID}-dot`}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ position: 'absolute', top: 8, end: 9, width: 10, height: 10, borderRadius: 5, backgroundColor: c.avatar.ring, borderWidth: 2, borderColor: c.bg.surface }}
          />
        ) : null}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={k('menu.close')}
            testID={`${testID}-scrim`}
            onPress={() => setOpen(false)}
            style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: withAlpha(c.text.primary, 0.4) }}
          />
          <View
            testID={`${testID}-sheet`}
            style={{ width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: c.bg.surface, borderTopStartRadius: 28, borderTopEndRadius: 28, paddingTop: 20, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 4 }}
          >
            <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: '700', color: c.text.primary, marginBottom: 8, paddingHorizontal: 4, ...flow }}>{k('menu.open')}</Text>
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={item.key === 'orders' && fresh.count > 0 ? k('menu.ordersNew', { n: num(fresh.count) }) : k(item.label)}
                testID={`${testID}-${item.key}`}
                onPress={() => pick(item.href)}
                style={{ minHeight: 52, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
              >
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '500', color: c.text.primary, ...flow }}>{k(item.label)}</Text>
                {item.key === 'orders' && fresh.count > 0 ? (
                  <View testID={`${testID}-orders-badge`} style={{ minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: c.avatar.ring }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: c.text.onBrand }}>{num(fresh.count)}</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}
