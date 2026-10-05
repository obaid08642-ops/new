import * as React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { ButtonProps, IconButtonProps, Size, Variant } from '../../../ui/components/contract';
import { tokens, type ThemeName } from '../../../design-tokens/dist/ts/tokens';
import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX, type FillIconName } from '../../../ui/icons/fill';
import type { IconName } from '../../../ui/icons/names';
import { Icon, Spinner } from '../Icon';

/**
 * Button and IconButton — handoff §3 (PrimaryButton, OutlineButton, IconButton),
 * React Native.
 *
 * Same props and the same geometry as the web renderer (the conformance check in
 * `packages/ui/components/conformance.ts` will not compile if the props
 * diverge): the page CTA is 56 tall with radius 18 and a 17/700 label, the
 * smaller buttons 44 or 40 with radius 14. Colours and shadows come from
 * `tokens(theme)`, so the dark theme is the token file's switch: the primary
 * fill is the `action.primary.gradient` pair (flat coral with an ink label in
 * dark, as on the Auth dark board) under `shadow.button`.
 */

const HEIGHT: Record<Size, number> = { sm: 40, md: 44, lg: 56 };
const RADIUS: Record<Size, number> = { sm: 14, md: 14, lg: 18 };
const PAD_X: Record<Size, number> = { sm: 14, md: 16, lg: 24 };
// The boards set sm/md at 600; the app ships Readex Pro 400/500/700, and 600 draws with the 700 face.
const FONT: Record<Size, { size: number; family: string }> = {
  sm: { size: 13.5, family: 'ReadexPro-700' },
  md: { size: 14, family: 'ReadexPro-700' },
  lg: { size: 17, family: 'ReadexPro-700' },
};
const ICON_PX: Record<Size, number> = { sm: 16, md: 18, lg: 22 };

/** A handoff fill glyph when the name is one (the boards draw button icons filled), else the line icon. */
function ButtonIcon({ name, size, color, theme }: { name: IconName | FillIconName; size: number; color: string; theme: ThemeName }) {
  if (name in FILL_ICON_PATHS) {
    return (
      <Svg width={size} height={size} viewBox={FILL_ICON_VIEWBOX}>
        <Path d={FILL_ICON_PATHS[name as FillIconName]} fill={color} />
      </Svg>
    );
  }
  return <Icon name={name as IconName} size={size} theme={theme} color={color} />;
}

export interface NativeButtonProps extends ButtonProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  theme?: ThemeName;
}

function variantStyle(variant: Variant, theme: ThemeName) {
  const c = tokens(theme).color;
  switch (variant) {
    case 'primary':
      return { bg: 'transparent', fg: c.action.primary.fg, border: 0, borderColor: 'transparent' };
    case 'outline':
      return { bg: 'transparent', fg: c.text.primary, border: 1.5, borderColor: c.text.primary };
    case 'secondary':
      return { bg: c.action.secondary.bg, fg: c.action.secondary.fg, border: 1, borderColor: c.border.onGlass };
    case 'danger':
      return { bg: c.action.danger.bg, fg: c.action.danger.fg, border: 0, borderColor: 'transparent' };
    case 'lime':
      // The canvas restricts acid lime to dark surfaces and always with ink text,
      // so the pairing is fixed here exactly as on the web.
      return { bg: c.accent.lime, fg: c.text.onAccent, border: 0, borderColor: 'transparent' };
    default:
      return { bg: 'transparent', fg: c.text.primary, border: 0, borderColor: 'transparent' };
  }
}

/** The coral gradient behind a primary button; a positioned SVG so it works on every renderer. */
function PrimaryFill({ theme, radius, id }: { theme: ThemeName; radius: number; id: string }) {
  const g = tokens(theme).color.action.primary.gradient;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={g.from} />
          <Stop offset="1" stopColor={g.to} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" rx={radius} ry={radius} fill={`url(#${id})`} />
    </Svg>
  );
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
  const t = tokens(theme);
  const v = variantStyle(variant, theme);
  const px = ICON_PX[size];
  const id = `nabd-btn-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      accessibilityLabel={label}
      aria-invalid={invalid || undefined}
      disabled={inert}
      onPress={inert ? undefined : onPress}
      hitSlop={HEIGHT[size] < 44 ? { top: (44 - HEIGHT[size]) / 2, bottom: (44 - HEIGHT[size]) / 2 } : undefined}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          // an sm button is 40 to look at and 44 to hit (hitSlop below)
          height: HEIGHT[size],
          paddingHorizontal: PAD_X[size],
          backgroundColor: v.bg,
          borderWidth: v.border,
          borderColor: v.borderColor,
          borderRadius: RADIUS[size],
          boxShadow: variant === 'primary' ? t.shadow.button : undefined,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed && !inert ? t.motion.press.scale : 1 }],
        },
        fullWidth && styles.full,
        style,
      ]}
    >
      {variant === 'primary' ? <PrimaryFill theme={theme} radius={RADIUS[size]} id={id} /> : null}
      {/* above the gradient: a positioned sibling paints over static content on web */}
      <View style={styles.content}>
        {loading ? (
          <Spinner size={px} color={v.fg} />
        ) : startIcon ? (
          <ButtonIcon name={startIcon} size={px} theme={theme} color={v.fg} />
        ) : null}
        <Text numberOfLines={1} style={{ color: v.fg, fontSize: FONT[size].size, fontFamily: FONT[size].family }}>
          {label}
        </Text>
        {!loading && endIcon ? <ButtonIcon name={endIcon} size={px} theme={theme} color={v.fg} /> : null}
      </View>
    </Pressable>
  );
}

export interface NativeIconButtonProps extends IconButtonProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  theme?: ThemeName;
}

/** IconButton: 44×44 at sm/md (canvas/Settings back, Cart delete), 52×52 at lg (Consult filter). */
const ICON_BOX: Record<Size, number> = { sm: 44, md: 44, lg: 52 };
const ICON_GLYPH: Record<Size, number> = { sm: 20, md: 22, lg: 22 };

export function IconButton({
  name,
  label,
  size = 'md',
  variant = 'plain',
  shape = 'circle',
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
  const t = tokens(theme);
  const c = t.color;
  const box = ICON_BOX[size];
  const toneColour: Record<string, string> = {
    neutral: c.icon.primary,
    primary: c.action.primary.bg,
    success: c.status.success.fg,
    warning: c.status.warning.fg,
    danger: c.status.danger.fg,
    info: c.status.info.fg,
  };
  const fill: Record<NonNullable<IconButtonProps['variant']>, { bg: string; border: number }> = {
    plain: { bg: 'transparent', border: 0 },
    outlined: { bg: c.bg.surface, border: 1 },
    filled: { bg: c.action.selected.bg, border: 0 },
    tinted: { bg: c.bg.sunken, border: 0 },
    glass: { bg: c.glass.bg, border: 1 },
  };
  const glyph = variant === 'filled' ? c.action.selected.fg : toneColour[tone] ?? toneColour.neutral;

  return (
    <Pressable
      accessibilityRole="button"
      // Required by the contract, so the accessible name is never missing here.
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      aria-invalid={invalid || undefined}
      disabled={inert}
      onPress={inert ? undefined : onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.center,
        {
          width: box,
          height: box,
          borderRadius: shape === 'square' ? (size === 'lg' ? 18 : 14) : box / 2,
          backgroundColor: fill[variant].bg,
          borderWidth: fill[variant].border,
          borderColor: c.border.onGlass,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed && !inert ? t.motion.press.scale : 1 }],
        },
        style,
      ]}
    >
      {loading ? <Spinner size={ICON_GLYPH[size]} color={glyph} /> : <Icon name={name} size={ICON_GLYPH[size]} theme={theme} color={glyph} />}
      {invalid ? <View style={[styles.invalidDot, { backgroundColor: c.status.danger.fg }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'visible',
  },
  center: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 1 },
  full: { alignSelf: 'stretch' },
  invalidDot: {
    position: 'absolute',
    top: 6,
    end: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
