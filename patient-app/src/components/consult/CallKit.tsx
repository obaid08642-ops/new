import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { tokens } from '../../../../packages/design-tokens/dist/ts/tokens';
import { step as scale, tint, useScreenUi } from '../screen/ScreenKit';

/**
 * What the four call screens share (video call, incoming call, waiting room, room): the call screens are dark in either
 * app theme (a call is seen in a dim room and over video), so they always read the dark tokens; the controls are labelled
 * pills (no icon of their own: the boards have none for a call), 56 tall, growing with their label.
 */

/** The dark tokens with the type scale and the translator, in the shape of useScreenUi. */
export function useCallUi() {
  const ui = useScreenUi();
  const dark = tokens('dark');
  return { ...ui, tk: dark, c: dark.color, theme: 'dark' as const };
}

/** A call control: mute, camera, accept, decline or end (`tone` danger / accept are the filled ones). */
export function CallButton({ label, onPress, tone = 'plain', active = true, testID }: { label: string; onPress: () => void; tone?: 'plain' | 'danger' | 'accept'; active?: boolean; testID?: string }) {
  const { tk, c } = useCallUi();
  const bg = tone === 'danger' ? c.action.danger.bg : tone === 'accept' ? c.status.success.fill : active ? tint(c.text.primary, 0.18) : tint(c.text.primary, 0.08);
  const fg = tone === 'danger' ? c.action.danger.fg : tone === 'accept' ? c.text.onInverse : c.text.primary;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={tone === 'plain' ? { selected: active } : undefined}
      onPress={onPress}
      style={({ pressed }) => ({ minHeight: 56, minWidth: 56, paddingHorizontal: 18, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, opacity: pressed ? 0.8 : 1 })}
    >
      <Text style={{ ...scale(tk, 'small', 'bold'), color: fg, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

/** The doctor's avatar of a call: a large round tile on the dark surface with the initial, a name and a status line. */
export function CallIdentity({ name, line }: { name: string; line?: string }) {
  const { tk, c, flow } = useCallUi();
  const initial = (name.trim()[0] ?? '').toUpperCase();
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingHorizontal: 24 }}>
      <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: c.bg.elevated, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ ...scale(tk, 'display'), color: c.text.primary }}>{initial}</Text>
      </View>
      {name ? <Text accessibilityRole="header" style={{ ...scale(tk, 'h3'), color: c.text.primary, textAlign: 'center' }}>{name}</Text> : null}
      {line ? <Text style={{ ...scale(tk, 'small', 'regular'), color: c.text.onInverseSecondary, textAlign: 'center', writingDirection: flow.writingDirection }}>{line}</Text> : null}
    </View>
  );
}

/** A status line over the call (reconnecting, sound only): announced to screen readers, on a dark pill, never a colour that is not a token. */
export function CallNotice({ text, testID }: { text: string; testID?: string }) {
  const { tk, c, flow } = useCallUi();
  return (
    <View testID={testID} accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ alignSelf: 'center', maxWidth: '92%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: tint(c.text.primary, 0.18) }}>
      <Text style={{ ...scale(tk, 'small', 'bold'), color: c.text.primary, textAlign: 'center', writingDirection: flow.writingDirection }}>{text}</Text>
    </View>
  );
}

/** Connection quality of one side as three bars (excellent 3, good 2, poor 1, lost/unknown 0); the label is read out, the bars are drawn. */
export function QualityBars({ bars, label, testID }: { bars: number; label: string; testID?: string }) {
  const { c } = useCallUi();
  return (
    <View testID={testID} accessible accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 16 }}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={{ width: 4, height: 4 + n * 4, borderRadius: 1, backgroundColor: n <= bars ? c.text.primary : tint(c.text.primary, 0.3) }} />
      ))}
    </View>
  );
}
