import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * HeartbeatLogo — the Nabd pulse mark, drawn live.
 * An ECG line continuously draws itself (stroke-dash animation) inside a
 * gradient disc, with a soft heart at the center of the beat. Replaces the
 * old static image that rendered as a white glyph on a white card.
 */
export default function HeartbeatLogo({ size = 58 }: { size?: number }) {
  const draw = useSharedValue(0);
  const heartbeat = useSharedValue(1);

  useEffect(() => {
    draw.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false);
    heartbeat.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(0.95, { duration: 140 }),
        withTiming(1.12, { duration: 120 }),
        withTiming(1, { duration: 300 }),
        withTiming(1, { duration: 700 })
      ),
      -1,
      false
    );
  }, []);

  const ecgProps = useAnimatedProps(() => ({
    strokeDashoffset: 120 * (1 - draw.value),
  }));
  const heartProps = useAnimatedProps(() => ({
    opacity: 0.75 + 0.25 * (heartbeat.value - 1) * 4,
  }));

  const s = size;
  return (
    <View style={{ width: s, height: s, borderRadius: s / 2, overflow: 'hidden' }}>
      <LinearGradient
        colors={['#23B5CE', '#1A8FA8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <Svg width={s * 0.72} height={s * 0.72} viewBox="0 0 48 48">
          {/* ECG line that draws itself in a loop */}
          <AnimatedPath
            d="M4 24 h8 l4 -12 l6 24 l5 -18 l3 6 h14"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={120}
            animatedProps={ecgProps}
          />
          {/* Soft heart glow at the center of the beat */}
          <AnimatedPath
            d="M24 33 c-5 -4.5 -9 -8 -9 -12 a5 5 0 0 1 9 -3 a5 5 0 0 1 9 3 c0 4 -4 7.5 -9 12 z"
            fill="#FFFFFF"
            opacity={0.28}
            animatedProps={heartProps}
          />
        </Svg>
      </LinearGradient>
    </View>
  );
}
