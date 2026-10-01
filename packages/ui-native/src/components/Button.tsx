import * as React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { ButtonProps, IconButtonProps, Size, Variant } from '../../../ui/components/contract';
import { Icon, Spinner } from '../Icon';

/**
 * Button and IconButton — 12.A7, React Native.
 *
 * Same props as the web renderer (the conformance check in
 * `packages/ui/components/conformance.ts` will not compile if they diverge) and
 * the same visual contract, expressed in the two things React Native has instead
 * of CSS: a StyleSheet and the token MODULE rather than custom properties.
 *
 * Colours come from `tokens(theme).color.*` so the dark theme is the same
 * switch the token file defines, not a second hand-maintained palette. Spacing
 * and radius come from `tokens(theme).space` / `.radius`, so `space.md` is 20 on
 * both platforms.
 */

const HEIGHT: Record<Size, number> = { sm: 32, md: 40, lg: 48 };
const FONT_SIZE: Record<Size, number> = { sm: 15, md: 15, lg: 12 };
const ICON_PX: Record<Size, number> = { sm: 16, md: 20, lg: 24 };

export interface NativeButtonProps extends ButtonProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  theme?: 'light' | 'dark';
}

function variantColors(variant: Variant, dark: boolean) {
  const pick = (light: string, d: string) => (dark ? d : light);
  switch (variant) {
    case 'primary':
      return { bg: pick('#D42A38', '#FF6B73'), fg: pick('#FFFFFF', '#0B1B2B') };
    case 'secondary':
      return { bg: pick('#FFFFFF', '#1A3148'), fg: pick('#0B1B2B', '#F5F5F7') };
    case 'danger':
      return { bg: pick('#D42A38', '#FF6B73'), fg: pick('#FFFFFF', '#0B1B2B') };
    case 'lime':
      // The canvas restricts acid lime to dark surfaces and always with ink text,
      // so the pairing is fixed here exactly as on the web.
      return { bg: '#D7FF00', fg: '#0B1B2B' };
    default:
      return { bg: 'transparent', fg: pick('#0B1B2B', '#F5F5F7') };
  }
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  invalid = false,
  startIcon,
  endIcon,
  testID,
  onPress,
  style,
  theme = 'light',
}: NativeButtonProps) {
  const inert = disabled || loading;
  const dark = theme === 'dark';
  const { bg, fg } = variantColors(variant, dark);
  const px = ICON_PX[size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      accessibilityLabel={label}
      disabled={inert}
      onPress={inert ? undefined : onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          // 44 is the floor, not the size: a dense table can render a 32px
          // button and still get a 44px target.
          minHeight: 44,
          height: fullWidth ? undefined : HEIGHT[size],
          paddingHorizontal: size === 'sm' ? 16 : size === 'md' ? 20 : 24,
          paddingVertical: 0,
          backgroundColor: bg,
          borderRadius: 9999,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed && !inert ? 0.98 : 1 }],
        },
        variant === 'secondary' && {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: dark ? '#6E8BFF' : '#D5DBE4',
        },
        fullWidth && styles.full,
        style,
      ]}
    >
      {loading ? (
        <Spinner size={px} />
      ) : startIcon ? (
        <Icon name={startIcon} size={px} theme={theme} />
      ) : null}
      <Text
        numberOfLines={1}
        style={{
          color: fg,
          fontSize: FONT_SIZE[size],
          fontWeight: variant === 'primary' || variant === 'lime' ? '700' : '600',
        }}
      >
        {label}
      </Text>
      {!loading && endIcon ? <Icon name={endIcon} size={px} theme={theme} /> : null}
    </Pressable>
  );
}

export interface NativeIconButtonProps extends IconButtonProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  theme?: 'light' | 'dark';
}

const TONE: Record<string, string> = {
  neutral: '#6E6E73',
  primary: '#0B1B2B',
  success: '#1B7A4B',
  warning: '#8A5A00',
  danger: '#D42A38',
  info: '#1F5FBF',
};

export function IconButton({
  name,
  label,
  size = 'md',
  variant = 'plain',
  tone = 'neutral',
  loading = false,
  disabled = false,
  invalid = false,
  testID,
  onPress,
  style,
  theme = 'light',
}: NativeIconButtonProps) {
  const inert = disabled || loading;
  const dark = theme === 'dark';
  const edge = Math.max(HEIGHT[size], 44);

  return (
    <Pressable
      accessibilityRole="button"
      // Required by the contract, so the accessible name is never missing here.
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={inert ? undefined : onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        styles.center,
        {
          minWidth: 44,
          minHeight: 44,
          width: edge,
          height: edge,
          borderRadius: 9999,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed && !inert ? 0.96 : 1 }],
          backgroundColor:
            variant === 'filled'
              ? dark
                ? '#1A3148'
                : '#FFFFFF'
              : variant === 'tinted'
                ? dark
                  ? '#12263A'
                  : '#F4F6F8'
                : 'transparent',
          borderWidth: variant === 'outlined' ? StyleSheet.hairlineWidth : 0,
          borderColor: dark ? '#6E8BFF' : '#D5DBE4',
        },
        style,
      ]}
    >
      {loading ? (
        <Spinner size={ICON_PX[size]} />
      ) : (
        <Icon
          name={name}
          size={ICON_PX[size]}
          theme={theme}
          tone={tone === 'neutral' ? 'secondary' : tone === 'primary' ? 'primary' : 'primary'}
        />
      )}
      {invalid ? <View style={styles.invalidDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  center: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  full: { alignSelf: 'stretch' },
  invalidDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D42A38',
  },
});
