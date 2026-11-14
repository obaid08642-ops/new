import * as React from 'react';
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

import { tokens } from '../../design-tokens/dist/ts/tokens';

/**
 * The shared motion of the native components (owner, 2026-10-26). Durations, easing, the press scale and the enter offset are the
 * design tokens (`motion.*`); nothing here moves when the system asks for reduced motion. The app's own screens use
 * patient-app/src/utils/motion.ts, pinned to the same tokens by a test.
 */
const m = tokens('light').motion;
const ms = (value: string) => Number.parseInt(value, 10);
const px = (value: string) => Number.parseFloat(value);

export const NATIVE_MOTION = {
  enter: ms(m.duration.enter),
  enterMax: ms(m.duration.enterMax),
  skeleton: ms(m.duration.skeleton),
  success: ms(m.duration.success),
  stagger: ms(m.stagger.min),
  enterOffset: px(m.enter.translateY),
  pressScale: m.press.scale,
  easing: Easing.bezier(0.22, 1, 0.36, 1), // motion.easing.enter, written out because Easing.bezier takes numbers
} as const;

let reduced = false;
let watching = false;

/** True when the system asks for less motion (read once, then kept current by the system's change event). */
export function reduceMotionNow(): boolean {
  if (!watching) {
    watching = true;
    try {
      void AccessibilityInfo.isReduceMotionEnabled().then((on) => { reduced = on; }).catch(() => undefined);
      AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => { reduced = on; });
    } catch {
      /* no accessibility service: motion stays on */
    }
  }
  return reduced;
}

/** For tests. */
export function setReduceMotionForTest(value: boolean): void {
  watching = true;
  reduced = value;
}

/** How long the `index`-th item of a list waits before it rises in: one token step (`motion.stagger.min`) per place, at most five steps so a long list is not slow. */
export function staggerDelay(index: number): number {
  return Math.min(Math.max(Math.trunc(index) || 0, 0), 5) * NATIVE_MOTION.stagger;
}

/** A state (empty, error, offline) or any block that fades and rises into place once, over the enter duration (an item of a list: `index` staggers it). Static with reduced motion. */
export function FadeIn({ children, style, index = 0 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; index?: number }) {
  const progress = React.useRef(new Animated.Value(reduceMotionNow() ? 1 : 0)).current;
  React.useEffect(() => {
    if (reduceMotionNow()) { progress.setValue(1); return; }
    Animated.timing(progress, { toValue: 1, delay: staggerDelay(index), duration: NATIVE_MOTION.enterMax, easing: NATIVE_MOTION.easing, useNativeDriver: true }).start();
  }, [progress, index]);
  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [NATIVE_MOTION.enterOffset, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** A loading block: its opacity breathes between full and a soft dip over the skeleton duration. Static with reduced motion. */
export function Pulse({ children, style, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  const level = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (reduceMotionNow()) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(level, { toValue: 0.55, duration: NATIVE_MOTION.skeleton / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(level, { toValue: 1, duration: NATIVE_MOTION.skeleton / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [level]);
  return (
    <Animated.View testID={testID} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[style, { opacity: level }]}>
      {children}
    </Animated.View>
  );
}

/** The check after an order, a booking or a payment: pops in once (0.6 -> 1.12 -> 1). Static with reduced motion. */
export function PopIn({ children }: { children: React.ReactNode }) {
  const scale = React.useRef(new Animated.Value(reduceMotionNow() ? 1 : 0.6)).current;
  React.useEffect(() => {
    if (reduceMotionNow()) { scale.setValue(1); return; }
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.12, duration: NATIVE_MOTION.enter, easing: NATIVE_MOTION.easing, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: NATIVE_MOTION.enter / 2, easing: NATIVE_MOTION.easing, useNativeDriver: true }),
    ]).start();
  }, [scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

/** Pops its children once (scale 1 -> 1.25 -> 1) each time `active` turns on: the heart of a favourite. Static with reduced motion. */
export function PopWhen({ active, children }: { active: boolean; children: React.ReactNode }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const before = React.useRef(active);
  React.useEffect(() => {
    if (active && !before.current && !reduceMotionNow()) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: NATIVE_MOTION.enter / 2, easing: NATIVE_MOTION.easing, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: NATIVE_MOTION.enter / 2, easing: NATIVE_MOTION.easing, useNativeDriver: true }),
      ]).start();
    }
    before.current = active;
  }, [active, scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

/** The eased whole number between two values at `progress` (0..1). */
export function countUpValue(from: number, to: number, progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
}

/** A number that counts to its new value over the enterMax duration (a cart's count). The value itself with reduced motion. */
export function useCountUp(value: number): number {
  const [shown, setShown] = React.useState(value);
  const from = React.useRef(value);
  React.useEffect(() => {
    if (reduceMotionNow() || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const origin = from.current;
    const start = Date.now();
    const timer = setInterval(() => {
      const progress = (Date.now() - start) / NATIVE_MOTION.enterMax;
      setShown(countUpValue(origin, value, progress));
      if (progress >= 1) { clearInterval(timer); from.current = value; }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return shown;
}
