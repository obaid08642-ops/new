import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedProps, withTiming, withRepeat,
  withSequence, withDelay, Easing, useAnimatedStyle,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  size?: number;
  animated?: boolean;
  pulseColor?: string;
}

// The ECG path traced under/through the N
const ECG_PATH = 'M4 38 H30 L37 20 L46 54 L55 12 L63 38 H92';
const ECG_LENGTH = 200;

export function NabdahLogo({ size = 120, animated = true, pulseColor = '#10B981' }: Props) {
  const dash = useSharedValue(animated ? ECG_LENGTH : 0);
  const scale = useSharedValue(animated ? 0.9 : 1);
  const heartScale = useSharedValue(1);

  useEffect(() => {
    if (!animated) return;
    // draw the ECG line
    dash.value = withDelay(300, withTiming(0, { duration: 1400, easing: Easing.out(Easing.cubic) }));
    // gentle entrance
    scale.value = withSequence(
      withTiming(1.04, { duration: 600, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 400 })
    );
    // subtle continuous heartbeat
    heartScale.value = withDelay(
      1600,
      withRepeat(
        withSequence(
          withTiming(1.06, { duration: 220, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 260 }),
          withTiming(1.04, { duration: 180 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        false
      )
    );
  }, [animated]);

  const ecgProps = useAnimatedProps(() => ({ strokeDashoffset: dash.value }));
  const wrapStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value * heartScale.value }] }));

  return (
    <Animated.View style={[{ width: size, height: size }, wrapStyle]}>
      <Svg width={size} height={size} viewBox="0 0 96 72">
        <Defs>
          <SvgGradient id="nGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#3B82F6" />
            <Stop offset="1" stopColor="#60A5FA" />
          </SvgGradient>
        </Defs>
        {/* Letter N */}
        <Path d="M14 60 V14 H24 L52 46 V14 H62 V60 H52 L24 28 V60 Z" fill="url(#nGrad)" />
        {/* ECG pulse line animated draw */}
        <AnimatedPath
          d={ECG_PATH}
          stroke={pulseColor}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={ECG_LENGTH}
          animatedProps={ecgProps}
        />
      </Svg>
    </Animated.View>
  );
}

export default NabdahLogo;
