import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Href } from 'expo-router';

import { ConsultScreen, goBack } from '../consult/ConsultKit';
import { Glyph } from '../pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';

/**
 * What the AI screens share (Batch 9): the frame (back goes home when there is nothing to go back to), the patient's own
 * message as an ink bubble, the answer as a surface card with the disclaimer that goes under every answer, and a checkbox
 * row for the choices of the symptoms form. A screen holds no colour, no size and no sentence.
 */

export const AI_HOME = '/(tabs)' as Href;

export function AiScreen(props: Omit<React.ComponentProps<typeof ConsultScreen>, 'onBack'> & { subtitle?: string }) {
  const { subtitle, children, ...rest } = props;
  const { t, c } = useScreenUi();
  return (
    <ConsultScreen {...rest} onBack={() => goBack(AI_HOME)}>
      {subtitle ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.tertiary, textAlign: 'center' }}>{subtitle}</Text> : null}
      {children}
    </ConsultScreen>
  );
}

/** The patient's message: the ink bubble of the chat template, at the end of the row. */
export function MyBubble({ text, testID }: { text: string; testID?: string }) {
  const { t, c, flow } = useScreenUi();
  return (
    <View style={{ width: '100%', alignItems: 'flex-end' }} testID={testID}>
      <View style={{ maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: c.action.selected.bg }}>
        <Text style={{ ...scale(t, 'body', 'regular'), color: c.action.selected.fg, ...flow }}>{text}</Text>
      </View>
    </View>
  );
}

/** An answer: a surface card, the disclaimer under it, always. */
export function AnswerCard({ children, disclaimer, testID }: { children: React.ReactNode; disclaimer: string; testID?: string }) {
  const { t, c, flow } = useScreenUi();
  return (
    <View testID={testID} style={{ width: '100%', gap: 8 }}>
      <View style={{ padding: 14, borderRadius: 20, gap: 12, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>{children}</View>
      <Text accessibilityRole="text" style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary, ...flow }}>{disclaimer}</Text>
    </View>
  );
}

/** A multi-select choice: 48 high, a box that fills with the check when chosen. */
export function CheckRow({ label, checked, onPress, testID }: { label: string; checked: boolean; onPress: () => void; testID?: string }) {
  const { t, c, flow } = useScreenUi();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: checked ? 2 : 1, borderColor: checked ? c.border.strong : c.border.hairline, backgroundColor: checked ? c.bg.surface : 'transparent', opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{ width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: checked ? c.action.selected.bg : 'transparent', borderWidth: checked ? 0 : 2, borderColor: c.border.strong }}>
        {checked ? <Glyph name="check-circle" size={14} color={c.action.selected.fg} /> : null}
      </View>
      <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.primary, flex: 1, ...flow }}>{label}</Text>
    </Pressable>
  );
}
