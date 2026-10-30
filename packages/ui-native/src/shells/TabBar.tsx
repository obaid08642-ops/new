import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { SHELL_FONT, resolveDirection, shellTokens, type Direction, type ThemeName } from './shellTokens';

/**
 * <TabBar> — handoff §3 and canvas/HomeApp.dc.html:
 *  - a floating glass pill (68 tall, radius 34, 14 from each side) above the
 *    bottom inset (DEVICE_STANDARD §1: tab bar height + bottom inset);
 *  - the active item is a coral pill (owner override 2026-10-26) that shows its label;
 *  - the centre item (Consultations) is a raised 66 pt coral button that floats
 *    over a circular cut-out of the bar (a transparent gap, 5 pt wide, so the
 *    content behind shows through) with the soft coral fab shadow under it.
 *    The bar is drawn as an SVG path with the notch; when an app passes a
 *    `background` (a real blur) the notch cannot be cut from it, and the
 *    button keeps the canvas-coloured ring instead;
 *  - every item is at least 52×52, above the 44/48 minimum (DEVICE_STANDARD §3.3).
 *
 * Icons are passed in, so the shell does not decide the icon set; give each
 * item `icon(color)` and it is drawn in the colour the state needs.
 *
 * `background` lets an app draw a real blur behind the pill (expo-blur); without
 * it the translucent glass token is used.
 */

export interface TabBarItem {
  key: string;
  label: string;
  icon: (color: string, size: number, selected: boolean) => React.ReactNode;
  /** An illustrated tab: the selected pill is tinted with the tab's tone instead of the coral pill. */
  tint?: { bg: string; fg: string };
  /** The raised centre button. At most one item should set it. */
  raised?: boolean;
}

export interface TabBarProps {
  items: TabBarItem[];
  value: string;
  onChange: (key: string) => void;
  /** Accessible name of the tab list, in the screen's language. */
  label?: string;
  background?: React.ReactNode;
  theme?: ThemeName;
  direction?: Direction;
  testID?: string;
}

const BAR_HEIGHT = 68;
const ITEM = 52;
const FAB = 66;
/** Width of the transparent gap between the button and the bar (the board's 5 pt ring). */
const FAB_GAP = 5;
/** Centre of the raised button, measured down from the top edge of the bar (item top 8 + 10 - 34 + 33). */
const FAB_CENTER_Y = 17;

/**
 * The bar outline (a pill of `w` x `h`, inset by half the 1 pt hairline) with a circular notch of radius `r`
 * centred at (w/2, cy), cut into the top edge. Arc from the left crossing to the right one, the long way round
 * the bottom of the circle (large-arc 1, sweep 0).
 */
export function tabBarPath(w: number, h: number, r: number, cy: number): string {
  const i = 0.5;
  const rad = h / 2 - i;
  const dx = Math.sqrt(Math.max(r * r - cy * cy, 0));
  const cx = w / 2;
  return [
    `M ${i + rad} ${i}`,
    `L ${(cx - dx).toFixed(2)} ${i}`,
    `A ${r} ${r} 0 1 0 ${(cx + dx).toFixed(2)} ${i}`,
    `L ${w - i - rad} ${i}`,
    `A ${rad} ${rad} 0 0 1 ${w - i - rad} ${h - i}`,
    `L ${i + rad} ${h - i}`,
    `A ${rad} ${rad} 0 0 1 ${i + rad} ${i}`,
    'Z',
  ].join(' ');
}
const SIDE = 14;

/** Height the bar takes from the bottom of the screen, so content can pad for it. */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + Math.max(insets.bottom, 16);
}

export function TabBar({ items, value, onChange, label = 'Main navigation', background, theme = 'light', direction, testID }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const t = shellTokens(theme);
  const dir = resolveDirection(direction);
  const gradientId = `nabd-fab-${theme}`;
  const [barWidth, setBarWidth] = React.useState(0);
  const cutOut = !background && barWidth > 0 && items.some((item) => item.raised);

  return (
    <View
      testID={testID}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{
        position: 'absolute',
        start: SIDE + (dir === 'rtl' ? insets.right : insets.left),
        end: SIDE + (dir === 'rtl' ? insets.left : insets.right),
        bottom: Math.max(insets.bottom, 16),
        height: BAR_HEIGHT,
        borderRadius: BAR_HEIGHT / 2,
        borderWidth: cutOut ? 0 : 1,
        borderColor: t.hairline,
        backgroundColor: background || cutOut ? 'transparent' : t.glassStrong,
        boxShadow: t.shadowTabBar,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        zIndex: t.zSticky,
      }}
    >
      {cutOut ? (
        <Svg width={barWidth} height={BAR_HEIGHT} style={{ position: 'absolute', top: 0, start: 0 }} pointerEvents="none">
          <Path d={tabBarPath(barWidth, BAR_HEIGHT, FAB / 2 + FAB_GAP, FAB_CENTER_Y)} fill={t.glassStrong} stroke={t.hairline} strokeWidth={1} />
        </Svg>
      ) : null}
      {background ? (
        <View style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, borderRadius: BAR_HEIGHT / 2, overflow: 'hidden' }}>{background}</View>
      ) : null}
      {items.map((item) => {
        const selected = item.key === value;
        if (item.raised) {
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(item.key)}
              // centred like the board's 52 slot, so the -34 lift lands where HomeApp draws it
              style={({ pressed }) => ({ width: ITEM, height: ITEM, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? t.pressScale : 1 }] })}
            >
              <View
                style={{
                  width: FAB,
                  height: FAB,
                  marginTop: -34,
                  borderRadius: FAB / 2,
                  borderWidth: cutOut ? 0 : FAB_GAP,
                  borderColor: t.canvas,
                  boxShadow: t.shadowFab,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <Svg width={FAB} height={FAB} style={{ position: 'absolute', top: cutOut ? 0 : -FAB_GAP, start: cutOut ? 0 : -FAB_GAP }}>
                  <Defs>
                    <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={t.fabFrom} />
                      <Stop offset="1" stopColor={t.fabTo} />
                    </LinearGradient>
                  </Defs>
                  <Circle cx={FAB / 2} cy={FAB / 2} r={FAB / 2} fill={`url(#${gradientId})`} />
                </Svg>
                {/* above the gradient: a positioned sibling paints over static content on web */}
                <View style={{ zIndex: 1 }}>{item.icon(t.fabFg, 28, selected)}</View>
              </View>
            </Pressable>
          );
        }
        const color = selected ? (item.tint?.fg ?? t.selectedFg) : t.muted;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(item.key)}
            style={({ pressed }) => ({
              height: ITEM,
              minWidth: ITEM,
              paddingHorizontal: selected ? (item.tint ? 14 : 18) : 0,
              borderRadius: ITEM / 2,
              backgroundColor: selected ? (item.tint?.bg ?? t.selectedBg) : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transform: [{ scale: pressed ? t.pressScale : 1 }],
            })}
          >
            {item.icon(color, item.tint ? 32 : 24, selected)}
            {selected ? (
              <Text numberOfLines={1} style={{ fontSize: 13.5, fontFamily: item.tint ? SHELL_FONT.bold : SHELL_FONT.medium, color }}>
                {item.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
