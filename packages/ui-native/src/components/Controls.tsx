import * as React from 'react';
import { Animated, Easing, I18nManager, Pressable, Text, View } from 'react-native';

import type { RadioProps, SegmentedProps, StatusChipProps, ToggleProps } from '../../../ui/components/contract';
import { tokens, type ThemeName } from '../../../design-tokens/dist/ts/tokens';

/**
 * Segmented, Toggle, Radio and StatusChip — handoff §3, React Native. Same props
 * and geometry as `packages/ui/components/Controls.tsx`; colours and shadows
 * from `tokens(theme)`. Controls drawn smaller than 44pt reach it with hitSlop.
 */

type Themed = { theme?: ThemeName };

const SEGMENT: Record<'sm' | 'md', { height: number; font: number }> = {
  sm: { height: 38, font: 13.5 },
  md: { height: 44, font: 14.5 },
};

export function Segmented({ options, value, onChange, label, size = 'md', loading = false, disabled = false, testID, theme = 'light' }: SegmentedProps & Themed) {
  const t = tokens(theme);
  const { height, font } = SEGMENT[size];
  const slop = Math.max(0, (44 - height) / 2);
  const inert = disabled || loading;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      testID={testID}
      style={{ flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: t.color.control.segmentedTrack, opacity: disabled ? 0.5 : 1 }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: on, disabled: inert || o.disabled }}
            disabled={inert || o.disabled}
            onPress={() => onChange?.(o.value)}
            hitSlop={{ top: slop, bottom: slop }}
            testID={testID ? `${testID}-${o.value}` : undefined}
            style={{
              flex: 1,
              height,
              paddingHorizontal: 14,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? t.color.bg.surface : 'transparent',
              boxShadow: on ? t.shadow.segmented : undefined,
              opacity: o.disabled ? 0.5 : 1,
            }}
          >
            <Text numberOfLines={1} style={{ fontSize: font, fontFamily: on ? 'ReadexPro-700' : 'ReadexPro-500', color: t.color.text.primary }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const TRACK_W = 50;
const TRACK_H = 30;
const KNOB = 24;
const INSET = 3;

export function Toggle({ value, onChange, label, loading = false, disabled = false, testID, theme = 'light' }: ToggleProps & Themed) {
  const t = tokens(theme);
  const inert = disabled || loading;
  // The knob slides 200ms (handoff §5); on is the knob at the inline start, as the boards draw it.
  const pos = React.useRef(new Animated.Value(value ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.timing(pos, { toValue: value ? 1 : 0, duration: 200, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
  }, [value, pos]);
  const travel = TRACK_W - KNOB - 2 * INSET;
  // translateX is physical: in RTL the inline start is the right edge
  const offStart = I18nManager.isRTL ? -travel : travel;
  const translateX = pos.interpolate({ inputRange: [0, 1], outputRange: [offStart, 0] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: inert, busy: loading }}
      disabled={inert}
      onPress={() => onChange?.(!value)}
      hitSlop={{ top: 7, bottom: 7 }}
      testID={testID}
      style={{
        width: TRACK_W,
        height: TRACK_H,
        borderRadius: TRACK_H / 2,
        padding: INSET,
        backgroundColor: value ? t.color.control.switchOn : t.color.border.strong,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Animated.View
        style={{
          width: KNOB,
          height: KNOB,
          borderRadius: KNOB / 2,
          backgroundColor: t.color.control.switchKnob,
          boxShadow: t.shadow.knob,
          alignSelf: 'flex-start',
          transform: [{ translateX }],
        }}
      />
    </Pressable>
  );
}

export interface NativeRadioProps extends RadioProps, Themed {
  /** Draw the row divider below (canvas/Settings: every row but the last). */
  divider?: boolean;
  /**
   * The reading direction of the screen. A label in another script than the screen's (a Latin name in an Arabic
   * screen, as in the language list) is aligned to the start of the row instead of by its own script.
   */
  direction?: 'ltr' | 'rtl';
}

export function Radio({ label, meta, selected, onChange, divider = false, direction, loading = false, disabled = false, testID, theme = 'light' }: NativeRadioProps) {
  const c = tokens(theme).color;
  const inert = disabled || loading;
  const align = direction ? ({ writingDirection: direction, textAlign: direction === 'rtl' ? 'right' : 'left' } as const) : null;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={meta ? `${label}, ${meta}` : label}
      accessibilityState={{ checked: selected, disabled: inert }}
      disabled={inert}
      onPress={() => onChange?.(true)}
      testID={testID}
      style={{
        minHeight: 54,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: c.border.subtle,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ flex: 1, fontSize: 15.5, fontFamily: selected ? 'ReadexPro-700' : 'ReadexPro-400', color: c.text.primary, ...align }}>{label}</Text>
      {meta ? <Text style={{ fontSize: 12.5, fontFamily: 'ReadexPro-400', color: c.text.secondary }}>{meta}</Text> : null}
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: selected ? 7 : 2,
          borderColor: selected ? c.action.primary.bg : c.control.radioOff,
        }}
      />
    </Pressable>
  );
}

export function StatusChip({ label, tone, testID, theme = 'light' }: StatusChipProps & Themed) {
  const s = tokens(theme).color.service[tone];
  return (
    <View testID={testID} style={{ height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: s.bg, justifyContent: 'center', alignSelf: 'flex-start' }}>
      {/* canvas/Orders: 12/600, drawn with the 700 face (the app ships 400/500/700) */}
      <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: 'ReadexPro-700', color: s.fg }}>
        {label}
      </Text>
    </View>
  );
}
