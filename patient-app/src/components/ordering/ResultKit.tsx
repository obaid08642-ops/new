import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { useScreenUi } from '../screen/ScreenKit';

type Flag = 'normal' | 'high' | 'low' | 'critical' | string | undefined;

/** The status colour of a flag from the status tokens (no new colour). */
export function useFlagColor() {
  const { c } = useScreenUi();
  return (flag: Flag): string => (flag === 'critical' ? c.status.danger.fg : flag === 'high' || flag === 'low' ? c.status.warning.fg : c.status.success.fg);
}

/** Where `value` and the reference band sit on one line: 0..1 positions from the server's numbers (padding of a quarter of the band on both sides). */
export function rangeLayout(value: number, low: number, high: number): { band: [number, number]; dot: number } | null {
  if (![value, low, high].every(Number.isFinite) || high <= low) return null;
  const pad = (high - low) / 2;
  const min = Math.min(low - pad, value - pad / 2);
  const max = Math.max(high + pad, value + pad / 2);
  const at = (x: number) => (x - min) / (max - min);
  return { band: [at(low), at(high)], dot: Math.min(1, Math.max(0, at(value))) };
}

/** Ord11 board: a grey track, the reference range as a soft green band and the value as a dot in its status colour. */
export function RangeBar({ value, low, high, flag, label }: { value: number; low: number; high: number; flag: Flag; label?: string }) {
  const { c } = useScreenUi();
  const flagColor = useFlagColor();
  const layout = rangeLayout(value, low, high);
  if (!layout) return null;
  const pct = (x: number) => `${Math.round(x * 1000) / 10}%` as const;
  return (
    <View accessibilityLabel={label} style={{ height: 14, justifyContent: 'center' }}>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: c.border.hairline }} />
      <View style={{ position: 'absolute', top: 3, start: pct(layout.band[0]), width: pct(layout.band[1] - layout.band[0]), height: 8, borderRadius: 4, backgroundColor: c.status.success.bg, borderWidth: 1, borderColor: c.status.success.fg }} />
      <View style={{ position: 'absolute', top: 0, start: pct(layout.dot), marginStart: -7, width: 14, height: 14, borderRadius: 7, backgroundColor: flagColor(flag), borderWidth: 2, borderColor: c.bg.surface }} />
    </View>
  );
}

/** Ord11 board: the earlier values of the same test as a small line with the current one as the last dot (oldest first; the helper returns six at most). */
export function Spark({ values, flag, label }: { values: number[]; flag: Flag; label?: string }) {
  const { c } = useScreenUi();
  const flagColor = useFlagColor();
  if (values.length < 2) return null;
  const W = 64;
  const H = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [4 + (i * (W - 8)) / (values.length - 1), H - 4 - ((v - min) / span) * (H - 8)] as const);
  const last = pts[pts.length - 1];
  return (
    <View accessibilityLabel={label} accessible={Boolean(label)}>
      <Svg width={W} height={H}>
        <Polyline points={pts.map((p) => `${p[0]},${p[1]}`).join(' ')} fill="none" stroke={c.text.secondary} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={last[0]} cy={last[1]} r={3.5} fill={flagColor(flag)} />
      </Svg>
    </View>
  );
}
