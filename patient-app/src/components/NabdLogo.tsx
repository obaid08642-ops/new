import React, { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { tokens, type ThemeName } from '../../../packages/design-tokens/dist/ts/tokens';

/**
 * NabdLogo — the owner-approved "Noon Dot" mark for the mobile apps.
 *
 * The geometry is fixed by the brand owner (docs/audit/05 Part A §A1 and
 * docs/design/canvas/Main.dc.html): the open bowl of the Arabic letter ن (a
 * holding hand) with the pulse dot above it. It is identical to
 * packages/brand/src/logo-mark.svg, which is also what every raster app icon,
 * the favicon and the splash are generated from — so the mark cannot drift
 * between the store listing and the running app.
 *
 * A9: the dot beats at 60 bpm on the splash, on loading and on success, and it
 * stops completely when the reader has asked for reduced motion.
 *
 * The wordmark is NOT part of this component: "نبض" stays real text next to it,
 * so it uses Readex Pro, reaches screen readers and follows the active locale.
 */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const BOWL_PATH = 'M40 104 C40 196 200 196 200 104';
const DOT_RADIUS = 24;
const STROKE_WIDTH = 36;
/** 60 bpm = one beat per second; a full cycle is 1000ms. */
const BEAT_MS = 1000;

/**
 * `text` is the boards' sign-in mark (canvas/Auth.dc.html): the bowl in the text
 * colour of the theme (ink on light, near-white on dark) and the coral dot.
 */
export type NabdLogoVariant = 'brand' | 'onBrand' | 'ink' | 'text';

export interface NabdLogoProps {
  size?: number;
  variant?: NabdLogoVariant;
  /** Beat the dot at 60 bpm. Used on the splash and on loading. */
  pulse?: boolean;
  /** The theme the `text` variant reads its colours from. */
  theme?: ThemeName;
  /** Accessible name of the image (e.g. the brand name in the screen's language). */
  label?: string;
  testID?: string;
}

export function NabdLogo({
  size = 120,
  variant = 'brand',
  pulse = false,
  theme = 'light',
  label,
  testID = 'nabd-logo',
}: NabdLogoProps) {
  const t = tokens(variant === 'text' ? theme : 'light');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const beat = useSharedValue(0);
  const beating = pulse && !reduceMotion;

  useEffect(() => {
    if (!beating) {
      beat.value = 0;
      return;
    }
    // A quick swell then a settle, repeated once per second.
    beat.value = withRepeat(
      withSequence(
        withTiming(1, { duration: BEAT_MS * 0.12, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: BEAT_MS * 0.18, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: BEAT_MS * 0.70, easing: Easing.linear }),
      ),
      -1,
      false,
    );
  }, [beating, beat]);

  const dotProps = useAnimatedProps(() => ({
    r: DOT_RADIUS * (1 + beat.value * 0.22),
    opacity: 1 - beat.value * 0.18,
  }));

  const stroke =
    variant === 'onBrand'
      ? t.color.text.onBrand
      : variant === 'ink'
        ? t.color.text.onInverse
        : variant === 'text'
          ? t.color.text.primary
          : t.color.brand.coral;
  const dot =
    variant === 'onBrand' ? t.color.text.onBrand : t.color.brand.coral;

  return (
    <Svg width={size} height={size} viewBox="0 0 240 240" testID={testID} accessibilityRole="image" accessibilityLabel={label}>
      <G>
        <Path
          d={BOWL_PATH}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          fill="none"
        />
        {beating ? (
          <AnimatedCircle cx={120} cy={58} fill={dot} animatedProps={dotProps} />
        ) : (
          <Circle cx={120} cy={58} r={DOT_RADIUS} fill={dot} />
        )}
      </G>
    </Svg>
  );
}

export default NabdLogo;
