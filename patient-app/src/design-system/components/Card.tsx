/**
 * DS Card — Reusable card container with elevation, press state,
 * gradient support, and RTL-first layout.
 */
import React from 'react';
import {
  TouchableOpacity, View, StyleSheet,
  StyleProp, ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';
import { BorderRadius, Spacing, Shadows } from '../tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat' | 'gradient';
export type CardSize   = 'sm' | 'md' | 'lg';

export interface DSCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** For gradient variant — pass two hex colors */
  gradientColors?: [string, string];
  gradientDirection?: 'horizontal' | 'vertical' | 'diagonal';
  fullWidth?: boolean;
  accessibilityLabel?: string;
  noPadding?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sizes
// ─────────────────────────────────────────────────────────────────────────────
const PADDING: Record<CardSize, number> = {
  sm: Spacing.md,
  md: Spacing.lg,
  lg: Spacing.xl,
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function DSCard({
  children,
  variant = 'default',
  size = 'md',
  onPress,
  style,
  gradientColors,
  gradientDirection = 'vertical',
  fullWidth = false,
  accessibilityLabel,
  noPadding = false,
}: DSCardProps) {
  const { colors } = useApp();
  const padding = noPadding ? 0 : PADDING[size];

  const baseStyle: ViewStyle = {
    borderRadius: BorderRadius.xl,
    padding,
    alignSelf: fullWidth ? 'stretch' : 'auto',
    overflow: 'hidden',
  };

  const variantStyle = getVariantStyle(variant, colors);

  const gradientStart = gradientDirection === 'horizontal'
    ? { x: 0, y: 0.5 } : gradientDirection === 'diagonal'
    ? { x: 0, y: 0 }
    : { x: 0.5, y: 0 };

  const gradientEnd = gradientDirection === 'horizontal'
    ? { x: 1, y: 0.5 } : gradientDirection === 'diagonal'
    ? { x: 1, y: 1 }
    : { x: 0.5, y: 1 };

  if (variant === 'gradient' && gradientColors) {
    const Content = (
      <LinearGradient
        colors={gradientColors}
        start={gradientStart}
        end={gradientEnd}
        style={[baseStyle, { padding }]}
      >
        {children}
      </LinearGradient>
    );

    return onPress ? (
      <TouchableOpacity
        onPress={() => { Haptics.selectionAsync(); onPress(); }}
        activeOpacity={0.86}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[{ borderRadius: BorderRadius.xl, overflow: 'hidden' }, style]}
      >
        {Content}
      </TouchableOpacity>
    ) : (
      <View style={[{ borderRadius: BorderRadius.xl, overflow: 'hidden' }, style]}>
        {Content}
      </View>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={() => { Haptics.selectionAsync(); onPress(); }}
        activeOpacity={0.86}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[baseStyle, variantStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[baseStyle, variantStyle, style]}>
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getVariantStyle(variant: CardVariant, colors: any): ViewStyle {
  switch (variant) {
    case 'default':
      return {
        backgroundColor: colors.surface,
        ...Shadows.md,
      };
    case 'elevated':
      return {
        backgroundColor: colors.surface,
        ...Shadows.lg,
      };
    case 'outlined':
      return {
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
      };
    case 'flat':
      return {
        backgroundColor: colors.backgroundSecondary,
      };
    default:
      return {
        backgroundColor: colors.surface,
        ...Shadows.md,
      };
  }
}
