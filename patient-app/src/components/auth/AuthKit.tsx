import React, { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View, type KeyboardTypeOptions, type TextInputProps } from 'react-native';
import Constants from 'expo-constants';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';

import { tokens, type ThemeName } from '../../../../packages/design-tokens/dist/ts/tokens';
import { Icon, IconButton, SHELL_FONT } from '../../../../packages/ui-native/src';
import { withAlpha } from '../../../../packages/ui-native/src/shells/shellTokens';
import { useApp } from '../../context/AppContext';
import { autoTranslate } from '../../i18n';
import { LocalizedText } from '../LocalizedText';
import { NabdLogo } from '../NabdLogo';

/**
 * The sign-in family's building blocks (boards Welcome / Login / Register / Otp,
 * canvas/Auth.dc.html), built once for welcome, login, register, otp,
 * forgot-password and reset-password.
 *
 * Geometry is the board's, with the owner's field decision (2026-10): fields are
 * 56 tall, radius 18, a 1px hairline, and when focused a 2px ink border with a
 * 4px soft ring; the label sits above at 14/500 and the hint below at 12.5 in the
 * secondary colour. Colours come only from the tokens of the active theme.
 */

export const FONT = SHELL_FONT;

/** The active theme, its tokens, the reading direction and a translator for strings that are not Text children. */
export function useAuthUi() {
  const { isDark, lang, isRTL } = useApp();
  const theme: ThemeName = isDark ? 'dark' : 'light';
  const t = tokens(theme);
  const tr = (s: string): string => autoTranslate(s, lang);
  return { theme, t, c: t.color, lang, isRTL, tr };
}

/** The soft ring around a focused control (board: ink at 6% on light, white at 10% on dark). */
export function focusRing(theme: ThemeName): string {
  const c = tokens(theme).color;
  return `0 0 0 4px ${withAlpha(theme === 'dark' ? c.text.onInverse : c.text.primary, theme === 'dark' ? 0.1 : 0.06)}`;
}

/**
 * The form screens' column: 20 at the sides and 7 under the top inset (the board's 54 on a 47
 * inset). Its own View, so the Screen's inset padding is added to it instead of being replaced.
 */
export function AuthBody({ children }: { children: React.ReactNode }) {
  return <View style={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 7, paddingBottom: 16 }}>{children}</View>;
}

/** The footer's content, 4 inside the StickyFooter's 16 so the CTA lines up with the 20 column. */
export function AuthFooter({ children }: { children: React.ReactNode }) {
  return <View style={{ paddingHorizontal: 4, gap: 12 }}>{children}</View>;
}

/** Top row of the form screens: back button, the Noon Dot, and a 44 balance so the mark stays centred. */
export function AuthTopBar({ onBack }: { onBack?: () => void }) {
  const { theme, isRTL, tr } = useAuthUi();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {onBack ? (
        <IconButton name={isRTL ? 'caret-right' : 'caret-left'} label={tr('رجوع')} variant="glass" theme={theme} onPress={onBack} />
      ) : (
        <View style={{ width: 44 }} />
      )}
      <NabdLogo size={30} variant="text" theme={theme} label={tr('نبض بلس')} />
      <View style={{ width: 44 }} />
    </View>
  );
}

/** Title (30/700) and subtitle (15, secondary) under the top row. `children` go after the subtitle text (e.g. the address). */
export function AuthTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  const { c } = useAuthUi();
  return (
    <View style={{ marginTop: 22, gap: 6 }}>
      <LocalizedText accessibilityRole="header" style={{ fontFamily: FONT.bold, fontSize: 30, lineHeight: 38, letterSpacing: -0.3, color: c.text.primary, textAlign: 'auto' }}>
        {title}
      </LocalizedText>
      {sub ? (
        <Text style={{ fontFamily: FONT.regular, fontSize: 15, lineHeight: 24, color: c.text.secondary, textAlign: 'auto' }}>
          <LocalizedText>{sub}</LocalizedText>
          {children}
        </Text>
      ) : null}
    </View>
  );
}

export interface AuthFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  /** Typed left to right whatever the screen direction (email, phone, codes). */
  ltr?: boolean;
  secure?: boolean;
  /** A fixed prefix chip inside the field, e.g. the +966 country code. */
  prefix?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  testID?: string;
}

/** One labelled field. Strings are Arabic source text; they are translated here. */
export function AuthField({ label, value, onChangeText, placeholder, hint, error, ltr, secure, prefix, keyboardType, autoCapitalize, autoComplete, textContentType, testID }: AuthFieldProps) {
  const { theme, c, tr } = useAuthUi();
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const bad = Boolean(error);
  return (
    <View style={{ gap: 6 }}>
      <LocalizedText style={{ fontFamily: FONT.medium, fontSize: 14, lineHeight: 20, color: c.text.primary, textAlign: 'auto' }}>{label}</LocalizedText>
      <View
        style={{
          height: 56,
          borderRadius: 18,
          borderWidth: focused || bad ? 2 : 1,
          borderColor: bad ? c.status.danger.fg : focused ? c.text.primary : c.border.subtle,
          backgroundColor: c.bg.surface,
          boxShadow: focused ? focusRing(theme) : undefined,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          // keep the text where it was when the border thickens
          paddingHorizontal: focused || bad ? 13 : 14,
        }}
      >
        {prefix ? (
          <View style={{ height: 34, paddingHorizontal: 10, borderRadius: 10, backgroundColor: c.control.segmentedTrack, justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT.medium, fontSize: 14.5, color: c.text.primary, writingDirection: 'ltr' }}>{prefix}</Text>
          </View>
        ) : null}
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ? tr(placeholder) : undefined}
          placeholderTextColor={c.text.tertiary}
          secureTextEntry={secure && !shown}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? (ltr || secure ? 'none' : 'sentences')}
          autoCorrect={!(ltr || secure)}
          autoComplete={autoComplete}
          textContentType={textContentType}
          accessibilityLabel={tr(label)}
          accessibilityHint={hint ? tr(hint) : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            fontFamily: FONT.regular,
            fontSize: 16,
            color: c.text.primary,
            writingDirection: ltr ? 'ltr' : undefined,
            textAlign: ltr ? 'left' : 'auto',
            outlineStyle: 'none',
          } as object}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr(shown ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور')}
            onPress={() => setShown((v) => !v)}
            hitSlop={4}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name={shown ? 'eye-slash' : 'eye'} size={20} theme={theme} color={c.text.secondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <LocalizedText accessibilityRole="alert" style={{ fontFamily: FONT.regular, fontSize: 12.5, lineHeight: 18, color: c.status.danger.fg, textAlign: 'auto' }}>{error}</LocalizedText>
      ) : hint ? (
        <LocalizedText style={{ fontFamily: FONT.regular, fontSize: 12.5, lineHeight: 18, color: c.text.secondary, textAlign: 'auto' }}>{hint}</LocalizedText>
      ) : null}
    </View>
  );
}

/** A plain text link (forgot password, terms, the footer's second action), in action.primary like the web sign-in pages. */
export function AuthLink({ label, onPress, weight = 'medium', size = 14, disabled }: { label: string; onPress: () => void; weight?: 'medium' | 'bold'; size?: number; disabled?: boolean }) {
  const { c } = useAuthUi();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} disabled={disabled} hitSlop={8} style={{ paddingVertical: 4, opacity: disabled ? 0.5 : 1 }}>
      <LocalizedText style={{ fontFamily: weight === 'bold' ? FONT.bold : FONT.medium, fontSize: size, color: c.action.primary.bg }}>{label}</LocalizedText>
    </Pressable>
  );
}

/** "ليس لديك حساب؟ إنشاء حساب" — the line under the primary button. */
export function AuthAltLine({ text, link, onPress }: { text?: string; link: string; onPress: () => void }) {
  const { c } = useAuthUi();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {text ? <LocalizedText style={{ fontFamily: FONT.regular, fontSize: 14, color: c.text.secondary }}>{text}</LocalizedText> : null}
      <AuthLink label={link} onPress={onPress} weight="bold" />
    </View>
  );
}

/** An error the screen shows inline (danger tokens), announced to screen readers. */
export function AuthError({ message }: { message: string | null }) {
  const { c } = useAuthUi();
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: c.status.danger.bg, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 }}>
      <LocalizedText style={{ fontFamily: FONT.medium, fontSize: 13.5, lineHeight: 20, color: c.status.danger.fg, textAlign: 'auto' }}>{message}</LocalizedText>
    </View>
  );
}

/** The register board's check box: 22, radius 7, ink when ticked. */
export function AuthCheckbox({ checked, onToggle, label, children }: { checked: boolean; onToggle: () => void; label: string; children: React.ReactNode }) {
  const { theme, c, tr } = useAuthUi();
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={tr(label)}
        onPress={onToggle}
        hitSlop={11}
        style={{
          width: 22,
          height: 22,
          marginTop: 1,
          borderRadius: 7,
          backgroundColor: checked ? c.text.primary : c.bg.surface,
          borderWidth: checked ? 0 : 1.5,
          borderColor: c.border.strong,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Icon name="check" size={14} theme={theme} color={c.bg.canvas} /> : null}
      </Pressable>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

/** The "أو تابع عبر" divider above the social buttons. */
export function AuthDivider({ label }: { label: string }) {
  const { c } = useAuthUi();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: c.border.subtle }} />
      <LocalizedText style={{ fontFamily: FONT.regular, fontSize: 12.5, color: c.text.secondary }}>{label}</LocalizedText>
      <View style={{ flex: 1, height: 1, backgroundColor: c.border.subtle }} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Social sign-in
// ---------------------------------------------------------------------------

export type SocialProvider = 'apple' | 'google' | 'x' | 'snapchat';

/**
 * The providers that can actually sign someone in from this build — a button is
 * shown only for these (owner, 2026-10: no button that cannot complete).
 *
 *  - apple: iOS only, and only when the build has the Sign in with Apple
 *    entitlement (`ios.usesAppleSignIn` in app.json). Without it
 *    `signInAsync` fails on every device.
 *  - google: when the client id for THIS platform is configured
 *    (EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID / _ANDROID_ / _CLIENT_ID on the web); the
 *    Google provider exchanges the code for the access token the backend verifies.
 *  - x, snapchat: never, for now. Their requests use the authorization-code flow
 *    with no code exchange, so `authentication.accessToken` is never set and the
 *    backend is never reached (login.tsx / register.tsx keep the requests so the
 *    flow can be finished, at which point they are listed here).
 */
export function availableSocialProviders(): SocialProvider[] {
  const list: SocialProvider[] = [];
  const iosConfig = (Constants.expoConfig?.ios ?? {}) as { usesAppleSignIn?: boolean };
  if (Platform.OS === 'ios' && iosConfig.usesAppleSignIn === true) list.push('apple');
  const googleId =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      : Platform.OS === 'android'
        ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
        : process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  if (googleId) list.push('google');
  return list;
}

const PROVIDER_NAME: Record<SocialProvider, string> = { apple: 'Apple', google: 'Google', x: 'X', snapchat: 'Snapchat' };

function ProviderGlyph({ provider, color, size = 20 }: { provider: SocialProvider; color: string; size?: number }) {
  if (provider === 'x') return <FontAwesome6 name="x-twitter" size={size} color={color} />;
  if (provider === 'snapchat') return <FontAwesome5 name="snapchat-ghost" size={size} color={color} />;
  return <FontAwesome5 name={provider} size={size} color={color} />;
}

/**
 * Login board: a centred row of 64×52 icon buttons (Apple filled ink).
 * Welcome board: Apple as a full-width 54 button, the others in equal columns with their name.
 */
export function SocialButtons({ providers, onPress, layout, disabled }: { providers: SocialProvider[]; onPress: (p: SocialProvider) => void; layout: 'icons' | 'labelled'; disabled?: boolean }) {
  const { c, tr } = useAuthUi();
  if (!providers.length) return null;
  const aria = (p: SocialProvider) => `${tr('المتابعة مع')} ${PROVIDER_NAME[p]}`;
  const appleColours = { bg: c.text.primary, fg: c.bg.canvas };

  if (layout === 'icons') {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
        {providers.map((p) => (
          <Pressable
            key={p}
            accessibilityRole="button"
            accessibilityLabel={aria(p)}
            disabled={disabled}
            onPress={() => onPress(p)}
            style={({ pressed }) => ({
              width: 64,
              height: 52,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.border.subtle,
              backgroundColor: p === 'apple' ? appleColours.bg : c.bg.surface,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: disabled ? 0.5 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <ProviderGlyph provider={p} color={p === 'apple' ? appleColours.fg : c.text.primary} size={22} />
          </Pressable>
        ))}
      </View>
    );
  }

  const others = providers.filter((p) => p !== 'apple');
  return (
    <View style={{ gap: 10 }}>
      {providers.includes('apple') ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={aria('apple')}
          disabled={disabled}
          onPress={() => onPress('apple')}
          style={{ height: 54, borderRadius: 18, backgroundColor: appleColours.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          <ProviderGlyph provider="apple" color={appleColours.fg} size={20} />
          <Text style={{ fontFamily: FONT.bold, fontSize: 16, color: appleColours.fg }}>{aria('apple')}</Text>
        </Pressable>
      ) : null}
      {others.length ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {others.map((p) => (
            <Pressable
              key={p}
              accessibilityRole="button"
              accessibilityLabel={aria(p)}
              disabled={disabled}
              onPress={() => onPress(p)}
              style={{ flex: 1, height: 52, borderRadius: 16, borderWidth: 1, borderColor: c.border.subtle, backgroundColor: c.bg.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <ProviderGlyph provider={p} color={c.text.primary} size={18} />
              <Text style={{ fontFamily: FONT.medium, fontSize: 14, color: c.text.primary }}>{PROVIDER_NAME[p]}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
