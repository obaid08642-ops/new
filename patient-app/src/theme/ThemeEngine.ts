/**
 * Theme Engine — Runtime theme management with Admin override support.
 * Wraps the base theme and allows CMS-driven color/font changes without
 * requiring a new app release.
 *
 * Usage:
 *   const theme = useThemeEngine();
 *   const color = theme.resolve('primary');
 */
import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { resolveColor } from './colors';
import { Typography, Spacing, BorderRadius, Shadows, Animation, ZIndex } from './index';
import { getOverrides } from '../design-system/tokens';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface ThemeConfig {
  /** CSS hex color string, replaces the app's primary brand color */
  primaryAccent?: string;
  /** Font family override — must be loaded before applying */
  fontFamily?: string;
  /** Logo URL from CDN — for whitelabeling */
  logoUrl?: string;
  /** Onboarding background image URL */
  onboardingAssetUrl?: string;
  /** Banner URL for home screen */
  bannerUrl?: string;
  /** Border radius scale (0.5 = half, 2.0 = double) */
  radiusScale?: number;
}

const THEME_CONFIG_KEY = '@nabdah_admin_theme_config';
let _themeConfig: ThemeConfig = {};

export async function loadAdminThemeConfig(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(THEME_CONFIG_KEY);
    if (stored) {
      _themeConfig = JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load admin theme config', e);
  }
}

export async function applyAdminThemeConfig(config: Partial<ThemeConfig>): Promise<void> {
  _themeConfig = { ..._themeConfig, ...config };
  try {
    await AsyncStorage.setItem(THEME_CONFIG_KEY, JSON.stringify(_themeConfig));
  } catch (e) {
    console.warn('Failed to save admin theme config', e);
  }
}

export function getAdminThemeConfig(): Readonly<ThemeConfig> {
  return _themeConfig;
}

export async function resetAdminThemeConfig(): Promise<void> {
  _themeConfig = {};
  try {
    await AsyncStorage.removeItem(THEME_CONFIG_KEY);
  } catch (e) {
    console.warn('Failed to reset admin theme config', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useThemeEngine — hook for consuming the full theme
// ─────────────────────────────────────────────────────────────────────────────
export function useThemeEngine() {
  const { colors, isDark } = useApp();
  const overrides = getOverrides();
  const adminConfig = _themeConfig;

  // Resolve a color key with Admin override fallback
  const resolveThemeColor = useCallback(
    (key: keyof typeof colors, fallback?: string): string => {
      if (key === 'primary' && adminConfig.primaryAccent) {
        return adminConfig.primaryAccent;
      }
      return String(colors[key] ?? fallback ?? '#000');
    },
    [colors, adminConfig],
  );

  // Resolve border radius with Admin scale
  const resolveRadius = useCallback(
    (size: keyof typeof BorderRadius): number => {
      const base = BorderRadius[size];
      const scale = adminConfig.radiusScale ?? 1;
      return Math.round(base * scale);
    },
    [adminConfig],
  );

  return {
    colors,
    typography: Typography,
    spacing: Spacing,
    borderRadius: BorderRadius,
    shadows: Shadows,
    animation: Animation,
    zIndex: ZIndex,

    // Admin-overridden values
    resolveColor: resolveThemeColor,
    resolveRadius,

    // Remote config overrides
    overlayOpacity: overrides.overlayOpacity ?? 0.78,
    tooltipRadius: overrides.tooltipRadius ?? BorderRadius['2xl'],
    animationSpeedMultiplier: overrides.animationSpeedMultiplier ?? 1.0,
    primaryAccent: adminConfig.primaryAccent ?? colors.primary,

    // Asset URLs (Admin-configurable)
    logoUrl: adminConfig.logoUrl ?? null,
    onboardingAssetUrl: adminConfig.onboardingAssetUrl ?? null,
    bannerUrl: adminConfig.bannerUrl ?? null,

    // Convenience
    isDark: isDark,
  };
}
