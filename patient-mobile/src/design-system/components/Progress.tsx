/**
 * DS ProgressBar + ProgressCircle — Smooth animated progress
 * indicators for upload, loading, onboarding steps, etc.
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Animated, StyleSheet, StyleProp, ViewStyle, Text,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { BorderRadius, Spacing } from '../tokens';
import { DSText } from './Text';

// ─────────────────────────────────────────────────────────────────────────────
// DS ProgressBar — linear
// ─────────────────────────────────────────────────────────────────────────────
export interface DSProgressBarProps {
  /** 0.0 → 1.0 */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  striped?: boolean;
}

export function DSProgressBar({
  progress,
  color,
  trackColor,
  height = 8,
  showLabel = false,
  label,
  animated = true,
  style,
}: DSProgressBarProps) {
  const { colors } = useApp();
  const widthAnim = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    if (animated) {
      Animated.timing(widthAnim, {
        toValue: clamped,
        duration: 350,
        useNativeDriver: false,
      }).start();
    } else {
      widthAnim.setValue(clamped);
    }
  }, [clamped, animated]);

  const pct = `${Math.round(clamped * 100)}%`;

  return (
    <View style={[styles.barWrapper, style]}>
      {showLabel && (
        <View style={styles.barLabel}>
          <DSText variant="caption" color={colors.textSecondary}>
            {label ?? pct}
          </DSText>
          {!label && (
            <DSText variant="caption" color={color ?? colors.primary}>
              {pct}
            </DSText>
          )}
        </View>
      )}
      <View
        style={[
          styles.track,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: trackColor ?? colors.border,
          },
        ]}
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              height,
              borderRadius: height / 2,
              backgroundColor: color ?? colors.primary,
              width: widthAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DS Step Indicator — for multi-step flows
// ─────────────────────────────────────────────────────────────────────────────
export interface DSStepIndicatorProps {
  totalSteps: number;
  currentStep: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  variant?: 'dots' | 'bars' | 'numbers';
}

export function DSStepIndicator({
  totalSteps,
  currentStep,
  color,
  style,
  variant = 'bars',
}: DSStepIndicatorProps) {
  const { colors } = useApp();
  const activeColor = color ?? colors.primary;

  if (variant === 'dots') {
    return (
      <View style={[styles.dotsRow, style]}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i <= currentStep - 1 ? activeColor : colors.border,
                width: i === currentStep - 1 ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>
    );
  }

  if (variant === 'bars') {
    return (
      <View style={[styles.barsRow, style]}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.barSegment,
              {
                backgroundColor:
                  i < currentStep ? activeColor : colors.border,
                flex: 1,
              },
            ]}
          />
        ))}
      </View>
    );
  }

  // numbers
  return (
    <View style={[styles.dotsRow, style]}>
      {Array.from({ length: totalSteps }).map((_, i) => {
        const isActive = i === currentStep - 1;
        const isDone = i < currentStep - 1;
        return (
          <View
            key={i}
            style={[
              styles.numberCircle,
              {
                backgroundColor:
                  isActive ? activeColor : isDone ? activeColor + '33' : colors.border,
                borderColor: isActive ? activeColor : 'transparent',
                borderWidth: isActive ? 2 : 0,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: isActive ? '#fff' : isDone ? activeColor : colors.textTertiary,
              }}
            >
              {i + 1}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DS Divider
// ─────────────────────────────────────────────────────────────────────────────
export interface DSDividerProps {
  label?: string;
  color?: string;
  thickness?: number;
  style?: StyleProp<ViewStyle>;
  direction?: 'horizontal' | 'vertical';
}

export function DSDivider({
  label,
  color,
  thickness = 1,
  style,
  direction = 'horizontal',
}: DSDividerProps) {
  const { colors } = useApp();
  const lineColor = color ?? colors.border;

  if (direction === 'vertical') {
    return (
      <View
        style={[
          { width: thickness, backgroundColor: lineColor, alignSelf: 'stretch' },
          style,
        ]}
      />
    );
  }

  if (label) {
    return (
      <View style={[styles.dividerRow, style]}>
        <View style={[styles.dividerLine, { backgroundColor: lineColor, height: thickness }]} />
        <DSText
          variant="caption"
          color={colors.textTertiary}
          style={{ marginHorizontal: Spacing.md }}
          noScale
        >
          {label}
        </DSText>
        <View style={[styles.dividerLine, { backgroundColor: lineColor, height: thickness }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        { height: thickness, backgroundColor: lineColor, alignSelf: 'stretch' },
        style,
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  barWrapper: { gap: Spacing.sm },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { width: '100%', overflow: 'hidden' },
  fill:  {},
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:   { height: 8, borderRadius: 4 },
  barsRow: { flexDirection: 'row', gap: 4, height: 4 },
  barSegment: { borderRadius: 2 },
  numberCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center' },
  dividerLine: { flex: 1 },
});
