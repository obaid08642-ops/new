import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';

import { Button, FIcon, Icon, Screen, SERVICE_ICONS } from '../../../packages/ui-native/src';
import { LANGUAGES, useApp, type LangCode, type ThemeMode } from '../../src/context/AppContext';
import { LocalizedText } from '../../src/components/LocalizedText';
import { NabdLogo } from '../../src/components/NabdLogo';
import { AUTH_COLUMN, FONT, SocialButtons, availableSocialProviders, useAuthUi, type SocialProvider } from '../../src/components/auth/AuthKit';
import { apiFetch, storeAuthSession } from '../../utils/api';
import { useSocialLogin } from '../../src/hooks/useSocialLogin';
import { getDeviceId } from '../../src/utils/deviceId';
import { decodeJwt } from '../../src/utils/jwt';
import { guestLogin } from '../../src/store/slices/authSlice';

/**
 * Welcome — board Auth screen=welcome (canvas/Welcome.dc.html, WelcomeDark.dc.html).
 *
 * Top row: language pill and the theme switch. Centre: the Noon Dot at 150 with
 * the four service tiles around it, the wordmark, the ECG line and the tagline.
 * Bottom: the sign-in providers (Apple on iOS; Google, X, Snapchat everywhere), then create account |
 * sign in, then the guest link.
 */

// The language board's order: Arabic, English, Urdu, Hindi, Filipino, Bengali.
const LANG_ORDER: LangCode[] = ['ar', 'en', 'ur', 'hi', 'fil', 'bn'];

// The board's theme glyphs (24-grid strokes): auto, light, dark.
const THEME_OPTIONS: { mode: ThemeMode; label: string; d: string }[] = [
  { mode: 'system', label: 'تلقائي', d: 'M12 21a9 9 0 1 0 0-18v18z M12 3a9 9 0 0 1 0 18' },
  { mode: 'light', label: 'فاتح', d: 'M12 16a4 4 0 1 0 0-8a4 4 0 0 0 0 8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4' },
  { mode: 'dark', label: 'غامق', d: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z' },
];
const GLOBE = 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18';
const ECG = 'M0 7h58l6-6 7 12 6-10 4 4h79';

/** The four tiles around the mark: position in the 300-tall stage (start = right in RTL, as drawn). */
const TILES = [
  { ...SERVICE_ICONS.pharmacy, box: 68, radius: 22, glyph: 44, pos: { top: 18, start: 46 } },
  { ...SERVICE_ICONS.consult, box: 62, radius: 20, glyph: 40, pos: { top: 74, end: 34 } },
  { ...SERVICE_ICONS.lab, box: 58, radius: 19, glyph: 38, pos: { bottom: 30, start: 60 } },
  { ...SERVICE_ICONS.nursing, box: 64, radius: 21, glyph: 44, pos: { bottom: 8, end: 70 } },
] as const;

export default function Welcome() {
  const { themeMode, setThemeMode, lang, setLang } = useApp();
  const { theme, c, t, tr, isRTL } = useAuthUi();
  const insets = useSafeAreaInsets();
  const go = (screen: string) => {
    if (screen === 'sH') router.push('/(tabs)');
    else if (screen === 's86') router.push('/(auth)/register');
    else if (screen === 's85') router.push('/(auth)/login');
  };
  const [langModalVisible, setLangModalVisible] = useState(false);
  const dispatch = useDispatch();
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  // Guest entry — a REAL device-bound guest account from the backend
  // (/auth/guest). The same device always gets the same guest account, so the
  // guest's orders/history persist and merge into their account on register.
  const continueAsGuest = async () => {
    if (guestBusy) return;
    setGuestBusy(true);
    setGuestError(null);
    try {
      const deviceId = await getDeviceId();
      const res = await apiFetch('/auth/guest', {
        method: 'POST',
        headers: { 'x-device-id': deviceId },
        body: JSON.stringify({}),
      });
      const token = typeof res?.token === 'string' ? res.token : (res?.token?.accessToken || null);
      if (!token) throw new Error('guest_session_failed');
      await storeAuthSession(res?.token);
      const decoded = decodeJwt(token) || {};
      dispatch(guestLogin({
        user: res?.user || { id: decoded.sub, role: 'guest', name: tr('زائر') },
        token,
      }));
      router.replace('/(tabs)');
    } catch (e) {
      setGuestError('تعذّرت المتابعة كضيف الآن. تحقّق من الاتصال وحاول مرة أخرى.');
    } finally {
      setGuestBusy(false);
    }
  };

  // Entrance: fade and rise once; nothing moves when the reader asked for reduced motion.
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduced) => {
        if (cancelled) return;
        if (reduced) {
          fadeAnim.setValue(1);
          slideAnim.setValue(0);
          return;
        }
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 520, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 520, useNativeDriver: true }),
        ]).start();
      });
    return () => {
      cancelled = true;
    };
  }, [fadeAnim, slideAnim]);

  // The provider's flow runs here, through the same hook as the sign-in screen.
  const providers = availableSocialProviders();
  const social = useSocialLogin();
  const onSocial = (p: SocialProvider) => {
    setGuestError(null);
    void social.signIn(p);
  };

  const current = LANGUAGES.find((l) => l.code === lang);
  const pill = { height: 40, borderRadius: 20, borderWidth: 1, borderColor: c.border.subtle, backgroundColor: c.glass.bg };

  return (
    <Screen theme={theme} edges={['top', 'start', 'end']} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}>
      {/* the board's soft wash: surface at the centre fading to the canvas (tokens only) */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0 }}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={`welcome-wash-${theme}`} cx="0.5" cy="0.3" r="0.6" gradientTransform="translate(0.5 0.3) scale(2 1) translate(-0.5 -0.3)">
              <Stop offset="0" stopColor={c.bg.surface} />
              <Stop offset="0.7" stopColor={c.bg.canvas} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#welcome-wash-${theme})`} />
        </Svg>
      </View>

      {/* language and theme */}
      <View style={{ ...AUTH_COLUMN, marginTop: 7, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${tr('اللغة')}: ${current?.native ?? ''}`}
          accessibilityState={{ expanded: langModalVisible }}
          onPress={() => setLangModalVisible(true)}
          style={{ ...pill, paddingStart: 10, paddingEnd: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d={GLOBE} stroke={c.text.primary} strokeWidth={1.7} strokeLinecap="round" />
          </Svg>
          <Text style={{ fontFamily: FONT.medium, fontSize: 14, color: c.text.primary }}>{current?.native ?? ''}</Text>
          <Icon name="caret-down" size={14} theme={theme} color={c.text.secondary} />
        </Pressable>

        <View accessibilityRole="radiogroup" accessibilityLabel={tr('المظهر')} style={{ ...pill, padding: 3, flexDirection: 'row', gap: 2 }}>
          {THEME_OPTIONS.map((o) => {
            const on = themeMode === o.mode;
            return (
              <Pressable
                key={o.mode}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={tr(o.label)}
                onPress={() => setThemeMode(o.mode)}
                hitSlop={6}
                style={{
                  width: 40,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? c.bg.surface : 'transparent',
                  boxShadow: on ? t.shadow.segmented : undefined,
                }}
              >
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                  <Path d={o.d} stroke={on ? c.text.primary : c.text.secondary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Modal visible={langModalVisible} transparent animationType="fade" onRequestClose={() => setLangModalVisible(false)}>
        <Pressable accessibilityLabel={tr('إغلاق')} style={{ flex: 1 }} onPress={() => setLangModalVisible(false)}>
          <View
            accessibilityRole="menu"
            style={{
              position: 'absolute',
              top: insets.top + 7 + 46,
              start: 20,
              width: 220,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: c.border.subtle,
              backgroundColor: c.glass.bgStrong,
              boxShadow: t.shadow.raised,
              padding: 6,
            }}
          >
            {LANG_ORDER.map((code) => {
              const l = LANGUAGES.find((x) => x.code === code);
              if (!l) return null;
              const on = lang === code;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setLang(code);
                    setLangModalVisible(false);
                  }}
                  style={{ height: 46, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: on ? c.bg.canvas : 'transparent' }}
                >
                  <Text style={{ fontFamily: on ? FONT.bold : FONT.regular, fontSize: 15, color: c.text.primary }}>{l.native}</Text>
                  {on ? <Icon name="check" size={16} theme={theme} color={c.brand.coral} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      <Animated.View style={{ ...AUTH_COLUMN, flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* the mark and the four services (board: a 300-tall stage 24 under the top row) */}
        <View style={{ marginTop: 24, flexShrink: 1, minHeight: 220, maxHeight: 300, justifyContent: 'center' }}>
          <View style={{ height: 300, width: '100%', maxWidth: 390, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
            {TILES.map((x) => (
              <View
                key={x.icon}
                style={{
                  position: 'absolute',
                  ...x.pos,
                  width: x.box,
                  height: x.box,
                  borderRadius: x.radius,
                  backgroundColor: c.bg.surface,
                  boxShadow: t.shadow.feature,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FIcon icon={x.icon} tone={x.tone} chip="none" size={x.glyph} theme={theme} />
              </View>
            ))}
            <NabdLogo size={150} variant="text" theme={theme} pulse label={tr('نبض بلس')} />
          </View>
        </View>

        {/* wordmark, ECG, tagline */}
        <View style={{ marginTop: 8, alignItems: 'center', gap: 6, paddingHorizontal: 24 }}>
          <Text accessibilityRole="header" style={{ fontFamily: FONT.bold, fontSize: 40, lineHeight: 46, letterSpacing: -0.5, color: c.text.primary }}>
            {lang === 'ar' ? 'نبض' : 'Nabd'}
            <Text style={{ color: c.brand.coral }}>+</Text>
          </Text>
          <Svg width={160} height={14} viewBox="0 0 160 14" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Path d={ECG} fill="none" stroke={c.brand.coral} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <LocalizedText style={{ fontFamily: FONT.regular, fontSize: 16, lineHeight: 24, color: c.text.secondary, textAlign: 'center' }}>
            رعايتك الصحية المتكاملة
          </LocalizedText>
        </View>

        {/* providers, create account | sign in, guest */}
        <View style={{ flex: 1, minHeight: 24 }} />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <SocialButtons layout="labelled" providers={providers} onPress={onSocial} disabled={social.busy || guestBusy} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: providers.length ? 4 : 0 }}>
            <View style={{ flex: 1 }}>
              <Button label={tr('إنشاء حساب')} variant="primary" size="lg" fullWidth theme={theme} onPress={() => go('s86')} testID="welcome-register" />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={tr('تسجيل الدخول')} variant="outline" size="lg" fullWidth theme={theme} onPress={() => go('s85')} testID="welcome-login" />
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: guestBusy, disabled: guestBusy }}
            onPress={continueAsGuest}
            disabled={guestBusy}
            testID="welcome-guest"
            style={{ height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: guestBusy ? 0.6 : 1 }}
          >
            <LocalizedText style={{ fontFamily: FONT.medium, fontSize: 15, color: c.text.primary }}>
              {guestBusy ? 'لحظة…' : 'المتابعة كضيف'}
            </LocalizedText>
            <Icon name={isRTL ? 'caret-left' : 'caret-right'} size={16} theme={theme} color={c.text.primary} />
          </Pressable>
          {guestError ?? social.error ? (
            <LocalizedText accessibilityRole="alert" style={{ fontFamily: FONT.regular, fontSize: 13, lineHeight: 20, color: c.status.danger.fg, textAlign: 'center' }}>
              {guestError ?? social.error}
            </LocalizedText>
          ) : null}
        </View>
      </Animated.View>
    </Screen>
  );
}
