import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Avatar, Icon } from '../../../../packages/ui-native/src';
import { withAlpha } from '../../../../packages/ui-native/src/shells/shellTokens';
import { LANGUAGES, useApp, type LangCode } from '../../context/AppContext';
import { ServiceCartButton, useAnyCartItems } from '../cart/ServiceCartButton';
import { HeaderMenuButton } from '../nav/HeaderMenuButton';
import { HEADER_ICON, HeaderDot, HeaderRound, HeaderSlot, useHeaderGap } from '../nav/HeaderRound';
import { WishlistButton } from '../pharmacy/PharmacyKit';
import { Plain, Txt, useScreenUi } from './homeKit';

/**
 * Top row of Home (canvas/HomeApp.dc.html): the profile avatar with its coral ring, then, at the far end and in this fixed
 * order, language, light/dark, notifications, favourites, cart, menu. Every button is the shared round header button
 * (components/nav/HeaderRound.tsx: 44 hit, 24 icon, one gap, one badge corner; the board draws 40).
 */

// the board's glyphs (24 grid, stroked)
const SUN = 'M12 16a4 4 0 1 0 0-8a4 4 0 0 0 0 8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4';
const MOON = 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z';

/** What the language button shows: the board's "ع" for Arabic, a short code or script for the others. */
const LANG_SHORT: Record<LangCode, string> = { ar: 'ع', en: 'EN', ur: 'اردو', hi: 'हिं', bn: 'বাং', fil: 'FIL' };
/** The language board's order. */
const LANG_ORDER: LangCode[] = ['ar', 'en', 'ur', 'hi', 'fil', 'bn'];

export function HomeTopRow({ name }: { name: string | null }) {
  const { isDark, lang, toggleTheme } = useApp();
  const { theme, t, c, tr } = useScreenUi();
  const [langOpen, setLangOpen] = useState(false);
  // unread rows of GET /notifications (Home and the notifications screen report the count to the store); the dot
  // shows only when the count is known and above zero
  const unread = useSelector((state: { notifications?: { unreadCount?: number | null } }) => state.notifications?.unreadCount ?? 0);
  // the cart is the one optional button: it is drawn only while some cart has items
  const cartShown = useAnyCartItems();
  const first = name ? name.split(/\s+/)[0] : '';
  const gap = useHeaderGap();

  // The fixed order, start to end (it mirrors by the layout direction, never by left/right): profile, then language, theme,
  // notifications, favourites, cart, menu. The cart is the only optional one; its place is kept while every cart is empty.
  return (
    <View testID="home-top-row" style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      <Pressable accessibilityRole="button" accessibilityLabel={tr('common.profile')} onPress={() => router.push('/profile')} hitSlop={4}>
        <Avatar name={first} size="md" theme={theme} />
      </Pressable>
      <View style={{ flex: 1 }} />
      <HeaderRound label={tr('common.language')} testID="home-language-button" onPress={() => setLangOpen(true)}>
        <Plain weight="medium" size={15} color={c.text.secondary} maxFontSizeMultiplier={1.3}>{LANG_SHORT[lang]}</Plain>
      </HeaderRound>
      <HeaderRound label={tr('common.darkMode')} testID="home-theme-button" role="switch" state={{ checked: isDark }} onPress={toggleTheme}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: isDark ? c.text.primary : c.service.amber.bg,
            boxShadow: t.shadow.knob,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Svg width={HEADER_ICON} height={HEADER_ICON} viewBox="0 0 24 24" fill="none">
            <Path d={isDark ? MOON : SUN} stroke={isDark ? c.text.onBrand : c.service.amber.fg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      </HeaderRound>
      <HeaderRound
        label={tr('common.notifications')}
        testID="home-bell-button"
        onPress={() => router.push('/notifications')}
        badge={unread > 0 ? <HeaderDot testID="home-bell-dot" /> : null}
      >
        <Icon name="bell" size={HEADER_ICON} theme={theme} color={c.text.secondary} />
      </HeaderRound>
      <WishlistButton testID="home-wishlist-button" />
      {cartShown ? <ServiceCartButton testID="home-cart-button" /> : <HeaderSlot testID="home-cart-slot" />}
      <HeaderMenuButton testID="home-menu-button" />
      <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />
    </View>
  );
}

/** The language choice: a bottom sheet of the six languages in their own names, the current one ticked. */
function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { lang, setLang } = useApp();
  const { theme, c, tr } = useScreenUi();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('common.close')}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: withAlpha(c.text.primary, 0.4) }}
        />
        <View
          style={{
            width: '100%',
            maxWidth: 440,
            alignSelf: 'center',
            backgroundColor: c.bg.surface,
            borderTopStartRadius: 28,
            borderTopEndRadius: 28,
            paddingTop: 20,
            paddingHorizontal: 16,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            gap: 4,
          }}
        >
          <Txt accessibilityRole="header" weight="bold" size={18} style={{ marginBottom: 8, paddingHorizontal: 4 }}>{'common.language'}</Txt>
          {LANG_ORDER.map((code) => {
            const item = LANGUAGES.find((l) => l.code === code);
            if (!item) return null;
            const selected = code === lang;
            return (
              <Pressable
                key={code}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={item.native}
                onPress={() => {
                  setLang(code);
                  onClose();
                }}
                style={{ minHeight: 52, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: selected ? c.service.coral.bg : 'transparent' }}
              >
                <Plain weight={selected ? 'bold' : 'medium'} size={16} color={selected ? c.service.coral.fg : c.text.primary} style={{ flex: 1 }}>
                  {item.native}
                </Plain>
                {selected ? <Icon name="check" size={20} theme={theme} color={c.service.coral.fg} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}
