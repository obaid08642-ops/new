/**
 * DS Badge, Chip, Tag — Lightweight label components.
 * Badge: numeric or dot indicator.
 * Chip: interactive filter/selection pill.
 * Tag: read-only label pill.
 */
import React from 'react';
import {
  View, TouchableOpacity, StyleSheet, ViewStyle, StyleProp,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { BorderRadius, Spacing } from '../tokens';
import { DSText } from './Text';
import { Icon, IconName } from '../Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Badge
// ─────────────────────────────────────────────────────────────────────────────
export interface DSBadgeProps {
  /** Number to display. If undefined — renders a dot. */
  count?: number;
  maxCount?: number;
  visible?: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

export function DSBadge({
  count,
  maxCount = 99,
  visible = true,
  color,
  size = 'md',
  style,
}: DSBadgeProps) {
  const { colors } = useApp();
  if (!visible) return null;

  const isDot = count === undefined;
  const displayCount = count !== undefined && count > maxCount ? `${maxCount}+` : String(count ?? '');
  const dotSize = size === 'sm' ? 8 : size === 'md' ? 10 : 12;
  const badgeHeight = size === 'sm' ? 18 : size === 'md' ? 20 : 24;

  if (isDot) {
    return (
      <View
        style={[
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: color ?? colors.error,
          },
          style,
        ]}
        accessible
        accessibilityRole="text"
        accessibilityLabel="إشعار جديد"
      />
    );
  }

  return (
    <View
      style={[
        {
          minWidth: badgeHeight,
          height: badgeHeight,
          borderRadius: badgeHeight / 2,
          backgroundColor: color ?? colors.error,
          paddingHorizontal: 5,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${displayCount} إشعار`}
    >
      <DSText
        variant={size === 'sm' ? 'caption' : 'labelSM'}
        color="#fff"
        noScale
      >
        {displayCount}
      </DSText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chip
// ─────────────────────────────────────────────────────────────────────────────
export interface DSChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  color?: string;
}

export function DSChip({
  label,
  selected = false,
  onPress,
  onRemove,
  icon,
  disabled = false,
  style,
  color,
}: DSChipProps) {
  const { colors, isRTL } = useApp();

  const bg = selected ? (color ?? colors.primarySurface) : colors.backgroundSecondary;
  const textColor = selected ? (color ? lighten(color) : colors.primary) : colors.textSecondary;
  const borderColor = selected ? (color ?? colors.primary) : colors.border;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.76}
      accessible
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      style={[
        {
          height: 36,
          borderRadius: BorderRadius.full,
          paddingHorizontal: Spacing.md,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 6,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={15} color={textColor} />}
      <DSText variant="labelSM" color={textColor} noScale>
        {label}
      </DSText>
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={`إزالة ${label}`}
        >
          <Icon name="close" size={14} color={textColor} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tag (read-only)
// ─────────────────────────────────────────────────────────────────────────────
export type TagVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'custom';

export interface DSTagProps {
  label: string;
  variant?: TagVariant;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  /** For custom variant */
  customBg?: string;
  customText?: string;
  icon?: IconName;
}

export function DSTag({
  label,
  variant = 'default',
  size = 'md',
  style,
  customBg,
  customText,
  icon,
}: DSTagProps) {
  const { colors, isRTL } = useApp();
  const { bg, text } = getTagColors(variant, colors, customBg, customText);

  const height = size === 'sm' ? 22 : 28;
  const padH  = size === 'sm' ? 7 : 10;
  const iconSize = size === 'sm' ? 11 : 13;

  return (
    <View
      style={[
        {
          height,
          borderRadius: BorderRadius.full,
          paddingHorizontal: padH,
          backgroundColor: bg,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 4,
        },
        style,
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      {icon && <Icon name={icon} size={iconSize} color={text} />}
      <DSText variant="caption" color={text} noScale>
        {label}
      </DSText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getTagColors(
  variant: TagVariant,
  colors: any,
  customBg?: string,
  customText?: string,
): { bg: string; text: string } {
  switch (variant) {
    case 'success': return { bg: '#EBF6E9', text: colors.success };
    case 'warning': return { bg: '#FFF7E6', text: colors.warning };
    case 'error':   return { bg: '#FEF2F2', text: colors.error };
    case 'info':    return { bg: '#DEF5F9', text: colors.primary };
    case 'custom':  return { bg: customBg ?? colors.backgroundSecondary, text: customText ?? colors.textPrimary };
    default:        return { bg: colors.backgroundSecondary, text: colors.textSecondary };
  }
}

function lighten(hex: string): string {
  return hex; // In production, use a color library
}
