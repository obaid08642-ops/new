/**
 * DS Avatar — User/Provider/System avatar with fallback initials,
 * online indicator, badge overlay, and image loading states.
 */
import React, { useState } from 'react';
import {
  View, Image, StyleSheet, StyleProp, ViewStyle, Text,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { BorderRadius, Typography } from '../tokens';
import { DSBadge } from './Badge';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface DSAvatarProps {
  source?: string | null;
  name?: string;
  size?: AvatarSize;
  showOnline?: boolean;
  isOnline?: boolean;
  badgeCount?: number;
  shape?: 'circle' | 'rounded';
  style?: StyleProp<ViewStyle>;
  /** Background color for initials fallback */
  fallbackColor?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Size map
// ─────────────────────────────────────────────────────────────────────────────
const SIZES: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 64,
  xl: 80,
  '2xl': 100,
};

const FONT_SIZES: Record<AvatarSize, number> = {
  xs: 10, sm: 12, md: 16, lg: 20, xl: 26, '2xl': 32,
};

const INDICATOR_SIZES: Record<AvatarSize, number> = {
  xs: 7, sm: 9, md: 11, lg: 14, xl: 17, '2xl': 20,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const FALLBACK_COLORS = [
  '#23B5CE', '#7C3AED', '#059669', '#D97706', '#DC2626',
  '#2563EB', '#DB2777', '#0891B2', '#65A30D', '#9333EA',
];

function getColorForName(name?: string): string {
  if (!name) return FALLBACK_COLORS[0];
  const idx = name.charCodeAt(0) % FALLBACK_COLORS.length;
  return FALLBACK_COLORS[idx];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function DSAvatar({
  source,
  name,
  size = 'md',
  showOnline = false,
  isOnline = false,
  badgeCount,
  shape = 'circle',
  style,
  fallbackColor,
}: DSAvatarProps) {
  const { colors } = useApp();
  const [imgError, setImgError] = useState(false);

  const dim = SIZES[size];
  const radius = shape === 'circle' ? dim / 2 : BorderRadius.lg;
  const initials = getInitials(name);
  const bgColor = fallbackColor ?? getColorForName(name);
  const fontSize = FONT_SIZES[size];
  const indicatorSize = INDICATOR_SIZES[size];
  const hasImage = source && !imgError;

  return (
    <View style={[{ width: dim, height: dim }, style]}>
      {/* Main circle */}
      <View
        style={{
          width: dim,
          height: dim,
          borderRadius: radius,
          backgroundColor: hasImage ? 'transparent' : bgColor,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={name ?? 'صورة المستخدم'}
      >
        {hasImage ? (
          <Image
            source={{ uri: source }}
            style={{ width: dim, height: dim }}
            onError={() => setImgError(true)}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={{
              fontSize,
              fontWeight: '700',
              color: '#fff',
              includeFontPadding: false,
            }}
            allowFontScaling={false}
          >
            {initials}
          </Text>
        )}
      </View>

      {/* Online indicator */}
      {showOnline && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: indicatorSize,
            height: indicatorSize,
            borderRadius: indicatorSize / 2,
            backgroundColor: isOnline ? colors.success : colors.textTertiary,
            borderWidth: 2,
            borderColor: colors.surface,
          }}
          accessibilityLabel={isOnline ? 'متصل' : 'غير متصل'}
        />
      )}

      {/* Badge */}
      {badgeCount !== undefined && badgeCount > 0 && (
        <View style={{ position: 'absolute', top: -2, right: -2 }}>
          <DSBadge count={badgeCount} size="sm" />
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar Group — stacked avatars
// ─────────────────────────────────────────────────────────────────────────────
export interface DSAvatarGroupProps {
  users: Array<{ source?: string; name?: string }>;
  max?: number;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
}

export function DSAvatarGroup({
  users,
  max = 4,
  size = 'sm',
  style,
}: DSAvatarGroupProps) {
  const { colors } = useApp();
  const visible = users.slice(0, max);
  const overflow = users.length - max;
  const dim = SIZES[size];
  const offset = Math.floor(dim * 0.35);

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          height: dim,
          width: dim + (visible.length - 1) * (dim - offset),
        },
        style,
      ]}
    >
      {visible.map((user, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: i * (dim - offset),
            zIndex: visible.length - i,
            borderWidth: 2,
            borderColor: colors.surface,
            borderRadius: dim / 2,
          }}
        >
          <DSAvatar source={user.source} name={user.name} size={size} />
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={{
            position: 'absolute',
            left: visible.length * (dim - offset),
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            backgroundColor: colors.backgroundSecondary,
            borderWidth: 2,
            borderColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ fontSize: FONT_SIZES[size] - 2, color: colors.textSecondary, fontWeight: '600' }}
          >
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}
