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
