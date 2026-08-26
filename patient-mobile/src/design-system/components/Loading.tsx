/**
 * DS Loading + Skeleton — Activity indicators and skeleton screens
 * for every loading state in the app.
 */
import React, { useEffect, useRef } from 'react';
import {
  View, ActivityIndicator, Animated,
  StyleSheet, StyleProp, ViewStyle,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { BorderRadius, Spacing } from '../tokens';
import { DSText } from './Text';

// ─────────────────────────────────────────────────────────────────────────────
// DS Spinner — Simple activity indicator
// ─────────────────────────────────────────────────────────────────────────────
export interface DSSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function DSSpinner({ size = 'small', color, style }: DSSpinnerProps) {
  const { colors } = useApp();
  return (
    <ActivityIndicator
      size={size}
      color={color ?? colors.primary}
      style={style}
      accessible
      accessibilityLabel="جارٍ التحميل"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DS Loading Overlay — Full screen or section loader
// ─────────────────────────────────────────────────────────────────────────────
export interface DSLoadingOverlayProps {
  visible: boolean;
  message?: string;
  overlay?: boolean;
}

export function DSLoadingOverlay({ visible, message, overlay = false }: DSLoadingOverlayProps) {
  const { colors } = useApp();
  if (!visible) return null;

  return (
    <View
      style={[
        styles.loadingOverlay,
        overlay && {
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: colors.overlay + 'CC',
          zIndex: 999,
        },
      ]}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={message ?? 'جارٍ التحميل'}
    >
      <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        {message && (
          <DSText variant="bodySM" color={colors.textSecondary} style={{ marginTop: Spacing.md }}>
            {message}
          </DSText>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DS Skeleton — Shimmer placeholder for content loading
// ─────────────────────────────────────────────────────────────────────────────
export interface DSSkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  circle?: boolean;
}

export function DSSkeleton({
  width = '100%',
  height = 16,
  radius,
  style,
  circle = false,
}: DSSkeletonProps) {
  const { colors } = useApp();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

  const resolvedRadius = circle
    ? (typeof height === 'number' ? height / 2 : 50)
    : (radius ?? BorderRadius.md);

  return (
    <Animated.View
      style={[
        {
          width: circle ? height : width,
          height,
          borderRadius: resolvedRadius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton presets — Common loading patterns
// ─────────────────────────────────────────────────────────────────────────────

/** Profile/doctor card skeleton */
export function DSSkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useApp();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: BorderRadius.xl,
          padding: Spacing.lg,
          gap: Spacing.md,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
        <DSSkeleton width={48} height={48} circle />
        <View style={{ flex: 1, gap: Spacing.sm }}>
          <DSSkeleton height={14} width="70%" />
          <DSSkeleton height={12} width="50%" />
        </View>
      </View>
      <DSSkeleton height={12} />
      <DSSkeleton height={12} width="80%" />
      <DSSkeleton height={12} width="60%" />
    </View>
  );
}

/** List item skeleton */
export function DSSkeletonListItem({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center', padding: Spacing.md }, style]}>
      <DSSkeleton width={40} height={40} circle />
      <View style={{ flex: 1, gap: 8 }}>
        <DSSkeleton height={13} width="60%" />
        <DSSkeleton height={11} width="40%" />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loadingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingCard: {
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    minWidth: 120,
  },
});
