import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Brand tokens – single source of truth.
// In the future, an Admin Dashboard can override `BrandColors` at runtime
// through a remote config / API, and the rest of the system adapts automatically.
// End-users only switch Light / Dark; they do NOT change brand colors.
// ---------------------------------------------------------------------------
export const BrandColors = {
  primary: '#23B5CE',
  primaryLight: '#8FD4E3',
  primaryDark: '#1A9FB6',
  secondary: '#2BB89C',
  secondaryLight: '#E2F7F2',
  secondaryDark: '#0D9488',
  accent: '#7A6BEA',
  accentDark: '#9B8BFA',
  success: '#5BA84F',
  successLight: '#8FD4E3',
  warning: '#F0A526',
  warningLight: '#FEF4E0',
  error: '#F0695C',
  errorLight: '#FEEFED',
  gold: '#F0A526',
  silver: '#8C93A3',
  bronze: '#F58634',
  emergency: '#F0695C',
  emergencyLight: '#FEEFED',
  // Maternity Module
  maternity: '#EC4899',
  maternityDark: '#9D174D',
  maternityLight: '#FBCFE8',
  planning: '#7A6BEA',
  planningDark: '#5B21B6',
  planningLight: '#EDEBFD',
};

// ---------------------------------------------------------------------------
// Full palette – Light & Dark
// ---------------------------------------------------------------------------
export const Colors = {
  light: {
    // Brand
    primary: BrandColors.primary,
    primaryLight: BrandColors.primaryLight,
    primaryDark: BrandColors.primaryDark,
    primarySurface: '#DEF5F9',
    secondary: BrandColors.secondary,
    secondaryLight: BrandColors.secondaryLight,
    secondaryDark: BrandColors.secondaryDark,
    secondarySurface: '#E2F7F2',
    accent: BrandColors.accent,
    accentLight: '#EDEBFD',
    accentDark: BrandColors.accentDark,
    accentSurface: '#EDEBFD',

    // Semantic
    success: BrandColors.success,
    successLight: BrandColors.successLight,
    successSurface: '#EBF6E9',
    warning: BrandColors.warning,
    warningLight: BrandColors.warningLight,
    warningSurface: '#FEF4E0',
    error: BrandColors.error,
    errorLight: BrandColors.errorLight,
    errorSurface: '#FEEFED',
    info: BrandColors.primary,
    infoSurface: '#DEF5F9',

    // Neutral
    white: '#FFFFFF',
    background: '#F2F4F7',
    backgroundSecondary: '#E5E8EE',
    surface: '#FFFFFF',
    surfaceSecondary: '#F2F4F7',
    border: '#E5E8EE',
    borderLight: '#F2F4F7',

    // Text
    textPrimary: '#141A2A',
    textSecondary: '#4C5566',
    textTertiary: '#8C93A3',
    textDisabled: '#D1D5DB',
    textInverse: '#FFFFFF',

    // Special
    emergency: BrandColors.emergency,
    emergencyLight: BrandColors.emergencyLight,
    gold: BrandColors.gold,
    silver: BrandColors.silver,
    bronze: BrandColors.bronze,
    maternity: BrandColors.maternity,
    maternityDark: BrandColors.maternityDark,
    maternityLight: BrandColors.maternityLight,
    planning: BrandColors.planning,
    planningDark: BrandColors.planningDark,
    planningLight: BrandColors.planningLight,

    // Navigation
    tabActive: BrandColors.primary,
    tabInactive: '#8C93A3',
    navBackground: '#FFFFFF',

    // Effects
    shadowColor: '#141A2A',
    shadowOpacity: 0.08,
    overlay: 'rgba(20,26,42,0.45)',
    overlayLight: 'rgba(20,26,42,0.15)',
    glassBg: 'rgba(255,255,255,0.75)',
    glassBorder: 'rgba(255,255,255,0.85)',

    // Shimmer
    shimmerBase: '#E5E8EE',
    shimmerHighlight: '#F2F4F7',
  },
  dark: {
    // Brand (brighter variants for dark bg)
    primary: '#62C5D7',
    primaryLight: '#8FD4E3',
    primaryDark: '#23B5CE',
    primarySurface: '#1A2234',
    secondary: '#2BB89C',
    secondaryLight: '#E2F7F2',
    secondaryDark: '#0D9488',
    secondarySurface: '#1A2234',
    accent: '#9B8BFA',
    accentLight: '#EDEBFD',
    accentDark: '#7A6BEA',
    accentSurface: '#1A2234',

    // Semantic
    success: '#5BA84F',
    successLight: '#8FD4E3',
    successSurface: '#1A2234',
    warning: '#F0A526',
    warningLight: '#FEF4E0',
    warningSurface: '#1A2234',
    error: '#F0695C',
    errorLight: '#FEEFED',
    errorSurface: '#1A2234',
    info: '#62C5D7',
    infoSurface: '#1A2234',

    // Neutral
    white: '#FFFFFF',
    background: '#0E1422',
    backgroundSecondary: '#2A3346',
    surface: '#1A2234',
    surfaceSecondary: '#0E1422',
    border: '#2A3346',
    borderLight: '#1A2234',

    // Text
    textPrimary: '#F2F4F7',
    textSecondary: '#B8BEC9',
    textTertiary: '#7C8494',
    textDisabled: '#475569',
    textInverse: '#0E1422',

    // Special
    emergency: '#F0695C',
    emergencyLight: '#FEEFED',
    gold: '#F0A526',
    silver: '#7C8494',
    bronze: '#F58634',
    maternity: '#F472B6', // Lighter for dark mode
    maternityDark: '#BE185D',
    maternityLight: '#4D0E2B',
    planning: '#A78BFA', // Lighter for dark mode
    planningDark: '#6D28D9',
    planningLight: '#2E1A47',

    // Navigation
    tabActive: '#62C5D7',
    tabInactive: '#7C8494',
    navBackground: '#1A2234',

    // Effects
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    overlay: 'rgba(0,0,0,0.65)',
    overlayLight: 'rgba(0,0,0,0.35)',
    glassBg: 'rgba(26,34,52,0.65)',
    glassBorder: 'rgba(255,255,255,0.08)',

    // Shimmer
    shimmerBase: '#2A3346',
    shimmerHighlight: '#334155',
  },
};

// ---------------------------------------------------------------------------
// Typography – Cairo font family
// ---------------------------------------------------------------------------
export const Typography = {
  displayLG: { fontSize: 32, fontFamily: 'Cairo-Bold', lineHeight: 48 },
  displayMD: { fontSize: 28, fontFamily: 'Cairo-Bold', lineHeight: 42 },
  h1: { fontSize: 26, fontFamily: 'Cairo-Bold', lineHeight: 40 },
  h2: { fontSize: 22, fontFamily: 'Cairo-Bold', lineHeight: 34 },
  h3: { fontSize: 20, fontFamily: 'Cairo-SemiBold', lineHeight: 32 },
  h4: { fontSize: 18, fontFamily: 'Cairo-SemiBold', lineHeight: 30 },
  h5: { fontSize: 16, fontFamily: 'Cairo-SemiBold', lineHeight: 28 },
  h6: { fontSize: 14, fontFamily: 'Cairo-SemiBold', lineHeight: 24 },
  bodyLG: { fontSize: 16, fontFamily: 'Cairo-Regular', lineHeight: 30 },
  bodyMD: { fontSize: 15, fontFamily: 'Cairo-Regular', lineHeight: 28 },
  bodySM: { fontSize: 14, fontFamily: 'Cairo-Regular', lineHeight: 26 },
  bodyXS: { fontSize: 12, fontFamily: 'Cairo-Regular', lineHeight: 20 },
  labelLG: { fontSize: 14, fontFamily: 'Cairo-SemiBold', lineHeight: 22 },
  labelMD: { fontSize: 13, fontFamily: 'Cairo-SemiBold', lineHeight: 20 },
  labelSM: { fontSize: 12, fontFamily: 'Cairo-Medium', lineHeight: 18 },
  caption: { fontSize: 11, fontFamily: 'Cairo-Regular', lineHeight: 17 },
  buttonLG: { fontSize: 16, fontFamily: 'Cairo-Bold', lineHeight: 24 },
  buttonMD: { fontSize: 15, fontFamily: 'Cairo-Bold', lineHeight: 22 },
  buttonSM: { fontSize: 13, fontFamily: 'Cairo-SemiBold', lineHeight: 20 },
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  xl: {
    shadowColor: '#0F172A',
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
  hero: [BrandColors.primary, BrandColors.success],
  accent: [BrandColors.accent, BrandColors.accentDark],
  emergency: [BrandColors.error, BrandColors.errorLight],
  dark: ['#0F172A', '#1E293B'],
  sunset: [BrandColors.warning, BrandColors.error],
  ocean: [BrandColors.primaryDark, BrandColors.primary],
  mint: [BrandColors.success, BrandColors.successLight],
  premium: ['#1E293B', '#334155'],
  gold: [BrandColors.gold, BrandColors.bronze],
  maternity: [BrandColors.maternityDark, BrandColors.maternity],
  planning: [BrandColors.planningDark, BrandColors.planning],
};

// ---------------------------------------------------------------------------
// Deep Link scheme
// ---------------------------------------------------------------------------
export const DEEP_LINK_SCHEME = 'nabdplus';
export const WEB_BASE_URL = 'https://nabdahplus.com';
