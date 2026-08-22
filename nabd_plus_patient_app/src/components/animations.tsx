import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

interface ECGPulseProps {
  width?: number;
  height?: number;
  color?: string;
  speed?: number;
  opacity?: number;
}

const ECG_PATH =
  'M0,25 L15,25 L20,25 L22,15 L25,35 L28,5 L31,45 L34,20 L37,25 L50,25 L65,25 L67,15 L70,35 L73,5 L76,45 L79,20 L82,25 L100,25';

export function ECGPulse({
  width = 300,
  height = 50,
  color = '#3B82F6',
  speed = 2000,
  opacity = 0.3,
}: ECGPulseProps) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(-width, {
        duration: speed,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [width, speed, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.container, { width, height, opacity }]}>
      <Animated.View style={[styles.track, animatedStyle]}>
        <Svg width={width * 2} height={height} viewBox="0 0 200 50">
          <Path
            d={ECG_PATH}
            stroke={color}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shimmer Loading Placeholder
// ---------------------------------------------------------------------------

interface ShimmerProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}

export function Shimmer({
  width,
  height,
  borderRadius = 8,
  style,
}: ShimmerProps) {
  const shimmerValue = useSharedValue(0);

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.ease }),
      -1,
      true,
    );
  }, [shimmerValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerValue.value, [0, 1], [0.4, 0.8]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: '#E2E8F0',
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Skeleton Loader for lists
// ---------------------------------------------------------------------------

interface SkeletonCardProps {
  count?: number;
}

export function SkeletonCard({ count = 3 }: SkeletonCardProps) {
  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <Shimmer width={56} height={56} borderRadius={18} />
          <View style={styles.skeletonLines}>
            <Shimmer width={160} height={14} />
            <Shimmer width={100} height={12} />
            <Shimmer width={80} height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pulse Ring Animation (for broadcast/searching states)
// ---------------------------------------------------------------------------

interface PulseRingProps {
  size?: number;
  color?: string;
  children?: React.ReactNode;
}

export function PulseRing({
  size = 80,
  color = '#3B82F6',
  children,
}: PulseRingProps) {
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);

  useEffect(() => {
    ring1.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.ease }),
      -1,
    );
    setTimeout(() => {
      ring2.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.ease }),
        -1,
      );
    }, 600);
  }, [ring1, ring2]);

  const ringStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring1.value, [0, 1], [1, 2.5]) }],
    opacity: interpolate(ring1.value, [0, 1], [0.4, 0]),
  }));

  const ringStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring2.value, [0, 1], [1, 2.5]) }],
    opacity: interpolate(ring2.value, [0, 1], [0.3, 0]),
  }));

  const ringBase = {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 2,
    borderColor: color,
  };

  return (
    <View style={[styles.pulseContainer, { width: size * 3, height: size * 3 }]}>
      <Animated.View style={[ringBase, ringStyle1]} />
      <Animated.View style={[ringBase, ringStyle2]} />
      <View
        style={[
          styles.pulseCenter,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color + '15',
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
  },
  skeletonContainer: {
    gap: 16,
    padding: 16,
  },
  skeletonCard: {
    flexDirection: 'row-reverse',
    gap: 12,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  skeletonLines: {
    flex: 1,
    gap: 8,
    alignItems: 'flex-end',
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ECGPulse;
