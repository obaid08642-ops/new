/**
 * Design System Tokens
 * Single source of truth for all visual constants.
 * Wraps src/theme/index.ts and adds runtime Admin override support.
 */

import {
  Colors, Typography, Spacing, BorderRadius,
  Shadows, Animation, ZIndex, Gradients, BrandColors,
} from '../theme';
import type { LangCode } from '../context/AppContext';

// ─────────────────────────────────────────────────────────────────────────────
// Runtime override store (Admin Dashboard can push updates via RemoteConfig)
// ─────────────────────────────────────────────────────────────────────────────
type ThemeOverrides = {
  overlayOpacity?: number;
  tooltipRadius?: number;
  animationSpeedMultiplier?: number;
  primaryAccent?: string;
  spotlightPadding?: number;
};

let _overrides: ThemeOverrides = {};

export function applyThemeOverrides(overrides: ThemeOverrides): void {
  _overrides = { ..._overrides, ...overrides };
}

export function resetThemeOverrides(): void {
  _overrides = {};
}

export function getOverrides(): Readonly<ThemeOverrides> {
  return _overrides;
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export base tokens (tree-shakeable)
// ─────────────────────────────────────────────────────────────────────────────
export {
  Colors, Typography, Spacing, BorderRadius,
  Shadows, Animation, ZIndex, Gradients, BrandColors,
};

// ─────────────────────────────────────────────────────────────────────────────
// Semantic tokens — meaningful names for specific use cases
// ─────────────────────────────────────────────────────────────────────────────
export const SemanticColors = {
  interactive: BrandColors.primary,
  interactiveDark: BrandColors.primaryDark,
  interactiveLight: BrandColors.primaryLight,

  destructive: BrandColors.error,
  destructiveLight: BrandColors.errorLight,

  success: BrandColors.success,
  successLight: '#EBF6E9',

  warning: BrandColors.warning,
  warningLight: BrandColors.warningLight,

  info: BrandColors.primary,
  infoLight: '#DEF5F9',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Component-level tokens — map semantic names to component props
// ─────────────────────────────────────────────────────────────────────────────
export const ComponentTokens = {
  button: {
    height: { sm: 36, md: 48, lg: 56 },
    radius: BorderRadius.lg,
    fontVariant: { sm: 'labelMD', md: 'buttonMD', lg: 'buttonLG' },
    paddingH: { sm: Spacing.md, md: Spacing.xl, lg: Spacing['2xl'] },
  },
  input: {
    height: 52,
    radius: BorderRadius.lg,
    paddingH: Spacing.lg,
    borderWidth: 1.5,
    focusBorderWidth: 2,
  },
  card: {
    radius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  tooltip: {
    radius: () => _overrides.tooltipRadius ?? BorderRadius['2xl'],
    maxWidth: 360,
    padding: Spacing.xl,
    shadow: Shadows.xl,
  },
  overlay: {
    opacity: () => _overrides.overlayOpacity ?? 0.78,
  },
  avatar: {
    sizes: { xs: 28, sm: 36, md: 48, lg: 64, xl: 80 },
  },
  badge: {
    radius: BorderRadius.full,
    height: { sm: 18, md: 22, lg: 26 },
    paddingH: { sm: 6, md: 8, lg: 10 },
  },
  toast: {
    radius: BorderRadius.xl,
    paddingH: Spacing.lg,
    paddingV: Spacing.md,
    minHeight: 52,
  },
  skeleton: {
    radius: BorderRadius.md,
    animationDuration: 1200,
  },
  bottomSheet: {
    handleHeight: 4,
    handleWidth: 36,
    handleRadius: BorderRadius.full,
    topRadius: BorderRadius['2xl'],
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// RTL helpers
// ─────────────────────────────────────────────────────────────────────────────
export function isRTLLanguage(lang: LangCode): boolean {
  return lang === 'ar' || lang === 'ur';
}

export function getTextAlign(
  lang: LangCode,
  override?: 'left' | 'right' | 'center',
): 'left' | 'right' | 'center' {
  if (override === 'center') return 'center';
  if (override) return override;
  return isRTLLanguage(lang) ? 'right' : 'left';
}

export function getFlexDirection(
  lang: LangCode,
): 'row' | 'row-reverse' {
  return isRTLLanguage(lang) ? 'row-reverse' : 'row';
}
