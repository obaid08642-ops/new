import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { type Href } from 'expo-router';

import { Button, Card, ProgressRing, SERVICE_TONES, type ServiceTone } from '../../../../packages/ui-native/src';
import { goBack } from '../consult/ConsultKit';
import { HealthScreen } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';

/**
 * What the care hubs share (Batch 8: maternity, nutrition, mental health, programs): the screen frame whose back button
 * returns to the services tab, the hero card of the CareHub board (a progress ring with its lines on the tone's wash),
 * a linear progress bar, a titled form card and a link row. A screen holds no colour, no font size and no sentence.
 */

export const CARE_BACK = '/(tabs)/services' as Href;

/** The frame of a care screen: the board header, back to the services tab when there is nothing to go back to. */
export function CareScreen(props: React.ComponentProps<typeof HealthScreen>) {
  return <HealthScreen {...props} onBack={props.onBack ?? (() => goBack(CARE_BACK))} />;
}

/** The hero card (board CareHub): a ring with a value in the centre and, beside it, a title and up to three lines. */
export function CareHero({ tone, ring, title, lines, children, testID }: { tone: ServiceTone; ring: { value: number; label: string; valueText: string; caption?: string }; title: string; lines?: string[]; children?: React.ReactNode; testID?: string }) {
  const { theme, t, c, flow } = useScreenUi();
  return (
    <Card theme={theme} tint={tone} padding="lg" testID={testID}>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <ProgressRing value={ring.value} tone={tone} label={ring.label} valueText={ring.valueText} caption={ring.caption} theme={theme} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{title}</Text>
            {(lines ?? []).map((line) => (
              <Text key={line} style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{line}</Text>
            ))}
          </View>
        </View>
        {children}
      </View>
    </Card>
  );
}

/** A linear progress bar in the tone's foreground (a real share of a real target, 0 to 1). */
export function CareBar({ value, tone, label, testID }: { value: number; tone: ServiceTone; label: string; testID?: string }) {
  const { c } = useScreenUi();
  const share = Math.min(1, Math.max(0, value));
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(share * 100) }} testID={testID} style={{ height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: c.service[tone].bg }}>
      <View style={{ height: '100%', width: `${Math.round(share * 100)}%`, borderRadius: 4, backgroundColor: c.service[tone].fg }} />
    </View>
  );
}

/** A titled form card: the numbered heading of the board's form steps and the fields under it. */
export function FormCard({ title, step, children, testID }: { title: string; step?: number; children: React.ReactNode; testID?: string }) {
  const { theme, t, c, flow, num } = useScreenUi();
  return (
    <Card theme={theme} padding="md" testID={testID}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {step ? (
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.action.primary.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...scale(t, 'tag', 'bold'), color: c.action.primary.fg }}>{num(step)}</Text>
            </View>
          ) : null}
          <Text accessibilityRole="header" style={{ ...scale(t, 'body', 'bold'), color: c.text.primary, flexShrink: 1, ...flow }}>{title}</Text>
        </View>
        {children}
      </View>
    </Card>
  );
}

/** A line of a hero: a label at the start and its value at the end, both from real data. */
export function StatLine({ label, value, testID }: { label: string; value: string; testID?: string }) {
  const { t, c, flow } = useScreenUi();
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 32 }}>
      <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, flexShrink: 1, ...flow }}>{label}</Text>
      <Text style={{ ...scale(t, 'meta', 'bold'), color: c.text.primary, ...flow }}>{value}</Text>
    </View>
  );
}

/** A selectable tile (a mood, a score): the label in a 44-high pressable that shows its state with the tone. */
export function ChoiceTile({ label, selected, tone, onPress, testID }: { label: string; selected: boolean; tone: ServiceTone; onPress: () => void; testID?: string }) {
  const { t, c } = useScreenUi();
  const look = c.service[tone];
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress} testID={testID} style={({ pressed }) => ({ minHeight: 44, minWidth: 44, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? look.bg : c.bg.surface, borderWidth: selected ? 2 : 1, borderColor: selected ? look.fg : c.border.hairline, opacity: pressed ? 0.85 : 1 })}>
      <Text style={{ ...scale(t, 'meta', selected ? 'bold' : 'regular'), color: selected ? look.fg : c.text.primary }}>{label}</Text>
    </Pressable>
  );
}

/** The one action under a form or a hero: a full-width button. */
export function PrimaryAction({ label, onPress, loading = false, variant = 'primary', testID }: { label: string; onPress: () => void; loading?: boolean; variant?: 'primary' | 'outline'; testID?: string }) {
  const { theme } = useScreenUi();
  return <Button label={label} size="lg" variant={variant} fullWidth loading={loading} onPress={onPress} theme={theme} testID={testID} />;
}

/** The local calendar date as YYYY-MM-DD (what the nutrition day endpoints take). */
export function localDateKey(now = new Date()): string {
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** A number from a text field: undefined when empty, NaN when not a number. */
export const numberOrUndefined = (value: string): number | undefined => (value.trim() === '' ? undefined : Number(value));

/** A figure with its unit kept in reading order inside right-to-left text ("800 / 2,000 kcal"): a left-to-right isolate. */
export const ltr = (text: string): string => `\u2066${text}\u2069`;

/** Service tones by position in the token list (color.service.*), so a screen names no colour. */
export const CORAL_TONE: ServiceTone = SERVICE_TONES[0];
export const LIME_TONE: ServiceTone = SERVICE_TONES[6];
export const TEAL_TONE: ServiceTone = SERVICE_TONES[8];
