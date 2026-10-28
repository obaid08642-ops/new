import { Platform } from 'react-native';

import { tokens } from '../../../packages/design-tokens/dist/ts/tokens';

// ---------------------------------------------------------------------------
// Brand tokens – single source of truth.
// In the future, an Admin Dashboard can override `BrandColors` at runtime
// through a remote config / API, and the rest of the system adapts automatically.
// End-users only switch Light / Dark; they do NOT change brand colors.
// ---------------------------------------------------------------------------
// Every value below is read from packages/design-tokens (base palette + the 10 service tones, light and dark versions);
// the historical key names stay because several hundred call sites use them. No colour literal lives in this file.
const L = tokens('light').color;
const D = tokens('dark').color;

export const BrandColors = {
  primary: L.action.primary.bg,
  primaryLight: L.service.coral.solid.from,
  primaryDark: L.action.primary.gradient.from,
  secondary: L.service.blue.fg,
  secondaryLight: L.service.blue.bg,
  secondaryDark: L.service.blue.solid.to,
  accent: L.service.violet.fg,
  accentDark: L.service.violet.solid.to,
  success: L.status.success.fg,
  successLight: L.status.success.bg,
  warning: L.status.warning.fg,
  warningLight: L.status.warning.bg,
  error: L.status.danger.fg,
  errorLight: L.status.danger.bg,
  gold: L.service.amber.fg,
  silver: L.text.secondary,
  bronze: L.service.peach.fg,
  emergency: L.service.emergency.glyph,
  emergencyLight: L.service.emergency.bg,
  // Maternity Module
  maternity: L.service.maternity.glyph,
  maternityDark: L.service.pink.solid.to,
  maternityLight: L.service.maternity.bg,
  planning: L.service.violet.fg,
  planningDark: L.service.violet.solid.to,
  planningLight: L.service.violet.bg,
};

type TokenColors = ReturnType<typeof tokens>['color'];
const palette = (c: TokenColors) => ({
  // Brand
  primary: c.action.primary.bg,
  primaryLight: c.service.coral.solid.from,
  primaryDark: c.action.primary.gradient.from,
  primarySurface: c.service.coral.bg,
  secondary: c.service.blue.fg,
  secondaryLight: c.service.blue.bg,
  secondaryDark: c.service.blue.solid.to,
  secondarySurface: c.service.blue.bg,
  accent: c.service.violet.fg,
  accentLight: c.service.violet.bg,
  accentDark: c.service.violet.solid.to,
  accentSurface: c.service.violet.bg,

  // Semantic
  success: c.status.success.fg,
  successLight: c.status.success.bg,
  successSurface: c.status.success.bg,
  warning: c.status.warning.fg,
  warningLight: c.status.warning.bg,
  warningSurface: c.status.warning.bg,
  error: c.status.danger.fg,
  errorLight: c.status.danger.bg,
  errorSurface: c.status.danger.bg,
  info: c.status.info.fg,
  infoSurface: c.status.info.bg,

  // Neutral
  white: c.icon.onSolid,
  background: c.bg.canvas,
  backgroundSecondary: c.bg.sunken,
  surface: c.bg.surface,
  surfaceSecondary: c.bg.canvas,
  border: c.border.subtle,
  borderLight: c.border.subtle,

  // Text
  textPrimary: c.text.primary,
  textSecondary: c.text.secondary,
  textTertiary: c.text.tertiary,
  textDisabled: c.text.tertiary,
  textInverse: c.text.onBrand,

  // Special
  emergency: c.service.emergency.glyph,
  emergencyLight: c.service.emergency.bg,
  gold: c.service.amber.fg,
  silver: c.text.secondary,
  bronze: c.service.peach.fg,
  maternity: c.service.maternity.glyph,
  maternityDark: c.service.pink.solid.to,
  maternityLight: c.service.maternity.bg,
  planning: c.service.violet.fg,
  planningDark: c.service.violet.solid.to,
  planningLight: c.service.violet.bg,

  // Navigation
  tabActive: c.action.primary.bg,
  tabInactive: c.text.secondary,
  navBackground: c.bg.surface,

  // Effects
  shadowColor: c.brand.ink,
  overlay: D.glass.bg,
  overlayLight: c.glass.scrim,
  glassBg: c.glass.bg,
  glassBorder: c.border.onGlass,

  // Shimmer
  shimmerBase: c.bg.sunken,
  shimmerHighlight: c.bg.elevated,
});

export const Colors = {
  light: { ...palette(L), shadowOpacity: 0.08 },
  dark: { ...palette(D), shadowOpacity: 0.5 },
};

// ---------------------------------------------------------------------------
// Typography – Cairo font family
// ---------------------------------------------------------------------------
export const Typography = {
  displayLG: { fontSize: 32, fontFamily: 'ReadexPro-700', lineHeight: 48 },
  displayMD: { fontSize: 28, fontFamily: 'ReadexPro-700', lineHeight: 42 },
  h1: { fontSize: 26, fontFamily: 'ReadexPro-700', lineHeight: 40 },
  h2: { fontSize: 22, fontFamily: 'ReadexPro-700', lineHeight: 34 },
  h3: { fontSize: 20, fontFamily: 'ReadexPro-500', lineHeight: 32 },
  h4: { fontSize: 18, fontFamily: 'ReadexPro-500', lineHeight: 30 },
  h5: { fontSize: 16, fontFamily: 'ReadexPro-500', lineHeight: 28 },
  h6: { fontSize: 14, fontFamily: 'ReadexPro-500', lineHeight: 24 },
  bodyLG: { fontSize: 16, fontFamily: 'ReadexPro-400', lineHeight: 30 },
  bodyMD: { fontSize: 15, fontFamily: 'ReadexPro-400', lineHeight: 28 },
  bodySM: { fontSize: 14, fontFamily: 'ReadexPro-400', lineHeight: 26 },
  bodyXS: { fontSize: 12, fontFamily: 'ReadexPro-400', lineHeight: 20 },
  labelLG: { fontSize: 14, fontFamily: 'ReadexPro-500', lineHeight: 22 },
  labelMD: { fontSize: 13, fontFamily: 'ReadexPro-500', lineHeight: 20 },
  labelSM: { fontSize: 12, fontFamily: 'ReadexPro-500', lineHeight: 18 },
  caption: { fontSize: 11, fontFamily: 'ReadexPro-400', lineHeight: 17 },
  buttonLG: { fontSize: 16, fontFamily: 'ReadexPro-700', lineHeight: 24 },
  buttonMD: { fontSize: 15, fontFamily: 'ReadexPro-700', lineHeight: 22 },
  buttonSM: { fontSize: 13, fontFamily: 'ReadexPro-500', lineHeight: 20 },
};

// ---------------------------------------------------------------------------
// Spacing, radii, shadows, animation, z-index, gradients
// ---------------------------------------------------------------------------
export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20,
  '2xl': 24, '3xl': 32, '4xl': 40, '5xl': 48, '6xl': 64,
  screen: 20,
};

export const BorderRadius = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20,
  '2xl': 24, '3xl': 32, full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: L.brand.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: L.brand.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: L.brand.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  xl: {
    shadowColor: L.brand.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 16,
  },
  glow: {
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  emergency: {
    shadowColor: BrandColors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
};

export const Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  spring: { damping: 15, stiffness: 150 },
  springBounce: { damping: 10, stiffness: 200 },
  springGentle: { damping: 20, stiffness: 120 },
};

export const ZIndex = {
  base: 0,
  card: 10,
  sticky: 50,
  modal: 100,
  overlay: 200,
  toast: 300,
  fab: 400,
  navigation: 500,
};

export const Gradients = {
  primary: [BrandColors.primary, BrandColors.primaryLight],
  secondary: [BrandColors.secondary, BrandColors.secondaryLight],
  hero: [BrandColors.primary, BrandColors.primaryLight],
  accent: [BrandColors.accent, BrandColors.accentDark],
  emergency: [BrandColors.error, BrandColors.errorLight],
  dark: [L.brand.ink, L.service.ink.solid.to],
  sunset: [BrandColors.warning, BrandColors.error],
  ocean: [BrandColors.primaryDark, BrandColors.primary],
  mint: [L.service.mint.solid.from, L.service.mint.solid.to],
  premium: [L.service.ink.solid.to, L.brand.ink],
  gold: [BrandColors.gold, BrandColors.bronze],
  maternity: [BrandColors.maternityDark, BrandColors.maternity],
  planning: [BrandColors.planningDark, BrandColors.planning],
};

// ---------------------------------------------------------------------------
// Deep Link scheme
// ---------------------------------------------------------------------------
export const DEEP_LINK_SCHEME = 'nabdahplus';
export const WEB_BASE_URL = 'https://nabdahplus.com';
