import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { SHELL_FONT, resolveDirection, shellTokens, type Direction, type ThemeName } from './shellTokens';

/**
 * <TabBar> — handoff §3 and canvas/HomeApp.dc.html:
 *  - a floating glass pill (68 tall, radius 34, 14 from each side) above the
 *    bottom inset (DEVICE_STANDARD §1: tab bar height + bottom inset);
 *  - the active item is an ink pill that shows its label;
 *  - the centre item (Consultations) is a raised 66 pt coral button ringed in
 *    the canvas colour;
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
  icon: (color: string, size: number) => React.ReactNode;
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
const FAB_RING = 5;
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

  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{
        position: 'absolute',
        start: SIDE + (dir === 'rtl' ? insets.right : insets.left),
        end: SIDE + (dir === 'rtl' ? insets.left : insets.right),
        bottom: Math.max(insets.bottom, 16),
        height: BAR_HEIGHT,
        borderRadius: BAR_HEIGHT / 2,
        borderWidth: 1,
        borderColor: t.hairline,
        backgroundColor: background ? 'transparent' : t.glassStrong,
        boxShadow: t.shadowTabBar,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        zIndex: t.zSticky,
      }}
    >
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
              style={({ pressed }) => ({ width: ITEM, height: ITEM, alignItems: 'center', transform: [{ scale: pressed ? t.pressScale : 1 }] })}
            >
              <View
                style={{
                  width: FAB,
                  height: FAB,
                  marginTop: -34,
                  borderRadius: FAB / 2,
                  borderWidth: FAB_RING,
                  borderColor: t.canvas,
                  boxShadow: t.shadowFab,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <Svg width={FAB} height={FAB} style={{ position: 'absolute', top: -FAB_RING, start: -FAB_RING }}>
                  <Defs>
                    <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={t.fabFrom} />
                      <Stop offset="1" stopColor={t.fabTo} />
                    </LinearGradient>
                  </Defs>
                  <Circle cx={FAB / 2} cy={FAB / 2} r={FAB / 2} fill={`url(#${gradientId})`} />
                </Svg>
                {/* above the gradient: a positioned sibling paints over static content on web */}
                <View style={{ zIndex: 1 }}>{item.icon(t.fabFg, 28)}</View>
              </View>
            </Pressable>
          );
        }
        const color = selected ? t.selectedFg : t.muted;
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
              paddingHorizontal: selected ? 18 : 0,
              borderRadius: ITEM / 2,
              backgroundColor: selected ? t.selectedBg : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transform: [{ scale: pressed ? t.pressScale : 1 }],
            })}
          >
            {item.icon(color, 24)}
            {selected ? (
              <Text numberOfLines={1} style={{ fontSize: 13.5, fontFamily: SHELL_FONT.medium, color }}>
                {item.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
