/**
 * DS Button — All button variants with haptics, loading state,
 * icon support, RTL layout, and full accessibility compliance.
 */
import React, { useCallback } from 'react';
import {
  TouchableOpacity, ActivityIndicator, View,
  StyleSheet, ViewStyle, TextStyle, StyleProp,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { Spacing, BorderRadius, Gradients, Animation } from '../tokens';
import { DSText } from './Text';
import { Icon, IconName } from '../Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'gradient'
  | 'glass';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface DSButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  /** Skip haptic feedback */
  noHaptics?: boolean;
  accessibilityHint?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 48, lg: 56 };
const H_PAD: Record<ButtonSize, number> = {
  sm: Spacing.md, md: Spacing.xl, lg: Spacing['2xl'],
};
const TEXT_VARIANT = { sm: 'labelMD', md: 'buttonMD', lg: 'buttonLG' } as const;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function DSButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  labelStyle,
  noHaptics = false,
  accessibilityHint,
}: DSButtonProps) {
  const { colors, isRTL } = useApp();

  const handlePress = useCallback(() => {
    if (!noHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  }, [onPress, noHaptics]);

  const isDisabled = disabled || loading;

  // Resolve styles per variant
  const variantStyles = getVariantStyles(variant, colors);

  const containerBase: ViewStyle = {
    height: HEIGHT[size],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: H_PAD[size],
    flexDirection: (isRTL && iconPosition === 'right')
      ? 'row-reverse'
      : isRTL ? 'row' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: fullWidth ? 'stretch' : 'auto',
    opacity: isDisabled ? 0.52 : 1,
    gap: Spacing.sm,
  };

  const iconColor = variantStyles.iconColor ?? variantStyles.textColor;
  const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : 22;

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        activeOpacity={0.82}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={[{ borderRadius: BorderRadius.lg, overflow: 'hidden', alignSelf: fullWidth ? 'stretch' : 'auto' }, style]}
      >
        <LinearGradient
          colors={Gradients.primary as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[containerBase, { paddingHorizontal: H_PAD[size] }]}
        >
          <ButtonContent
            label={label}
            loading={loading}
            icon={icon}
            iconPosition={iconPosition}
            iconColor="#fff"
            iconSize={iconSize}
            textColor="#fff"
            textVariant={TEXT_VARIANT[size]}
            labelStyle={labelStyle}
          />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.82}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        containerBase,
        variantStyles.container,
        style,
      ]}
    >
      <ButtonContent
        label={label}
        loading={loading}
        icon={icon}
        iconPosition={iconPosition}
        iconColor={iconColor}
        iconSize={iconSize}
        textColor={variantStyles.textColor}
        textVariant={TEXT_VARIANT[size]}
        labelStyle={labelStyle}
      />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner content
// ─────────────────────────────────────────────────────────────────────────────
function ButtonContent({
  label, loading, icon, iconPosition,
  iconColor, iconSize, textColor, textVariant, labelStyle,
}: {
  label: string; loading: boolean; icon?: IconName;
  iconPosition: 'left' | 'right'; iconColor: string;
  iconSize: number; textColor: string;
  textVariant: 'labelMD' | 'buttonMD' | 'buttonLG';
  labelStyle?: StyleProp<TextStyle>;
}) {
  if (loading) {
    return <ActivityIndicator size="small" color={textColor} />;
  }
  return (
    <>
      {icon && iconPosition === 'left' && (
        <Icon name={icon} size={iconSize} color={iconColor} />
      )}
      <DSText
        variant={textVariant}
        color={textColor}
        noScale
        style={labelStyle}
      >
        {label}
      </DSText>
      {icon && iconPosition === 'right' && (
        <Icon name={icon} size={iconSize} color={iconColor} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Variant resolver
// ─────────────────────────────────────────────────────────────────────────────
function getVariantStyles(
  variant: ButtonVariant,
  colors: any,
): { container: ViewStyle; textColor: string; iconColor?: string } {
  switch (variant) {
    case 'primary':
      return {
        container: { backgroundColor: colors.primary },
        textColor: '#fff',
      };
    case 'secondary':
      return {
        container: { backgroundColor: colors.primarySurface },
        textColor: colors.primary,
      };
    case 'outline':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.primary,
        },
        textColor: colors.primary,
      };
    case 'ghost':
      return {
        container: { backgroundColor: 'transparent' },
        textColor: colors.primary,
      };
    case 'danger':
      return {
        container: { backgroundColor: colors.error },
        textColor: '#fff',
      };
    case 'success':
      return {
        container: { backgroundColor: colors.success },
        textColor: '#fff',
      };
    case 'glass':
      return {
        container: {
          backgroundColor: colors.glassBg,
          borderWidth: 1,
          borderColor: colors.glassBorder,
        },
        textColor: colors.textPrimary,
      };
    default:
      return {
        container: { backgroundColor: colors.primary },
        textColor: '#fff',
      };
  }
}
