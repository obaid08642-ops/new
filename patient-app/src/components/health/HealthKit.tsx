import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { Button, Card, Chip, FIcon, type FillIconName, type ServiceTone } from '../../../../packages/ui-native/src';
import { CARE_TONE, RX_TONE, ConsultScreen, Chevron, Sheet, goBack, type GateStatus } from '../consult/ConsultKit';
import { Glyph } from '../pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { isOffline } from '../../utils/isOffline';
import { logError } from '../../utils/logger';

/**
 * What the Health screens share (Batch 5): the screen frame whose back button returns to the health hub, link tabs
 * whose state lives in the route query (so a redirect can open a tab), a sheet form, a list row, a metric tile, a
 * notice, a line chart and the load / reload hook with the shared loading, failure and offline states. A screen holds
 * no colour, no font size and no sentence. Health data is never put in a route.
 */

export const HEALTH_HUB = '/(tabs)/health' as Href;

/** The frame of a health screen: the board header, back to the health hub when there is nothing to go back to. */
export function HealthScreen(props: Omit<React.ComponentProps<typeof ConsultScreen>, 'onBack'> & { onBack?: () => void }) {
  return <ConsultScreen {...props} onBack={props.onBack ?? (() => goBack(HEALTH_HUB))} />;
}

/** A list response as an array: the API answers a bare array or `{ data: [...] }`. */
export function rowsOf<T = Record<string, unknown>>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  const data = (response as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

/** The `data` envelope of an object response, or the object itself. */
export function bodyOf<T = Record<string, unknown>>(response: unknown): T {
  const data = (response as { data?: unknown } | null)?.data;
  return ((data && typeof data === 'object' && !Array.isArray(data) ? data : response) ?? {}) as T;
}

/**
 * The data of a screen: loads on mount and when `deps` change, keeps the last good copy while a reload runs or fails,
 * and says whether a failure is "offline" or "could not load".
 */
export function useRemote<T>(load: () => Promise<T>, deps: React.DependencyList, tag: string) {
  const [state, setState] = useState<{ status: GateStatus; data: T | null }>({ status: 'loading', data: null });
  const loadRef = useRef(load);
  loadRef.current = load;
  const run = useCallback(async (silent = false) => {
    if (!silent) setState((s) => ({ ...s, status: 'loading' }));
    try {
      const data = await loadRef.current();
      setState({ status: 'ready', data });
    } catch (e) {
      logError(tag, e);
      const off = await isOffline();
      setState((s) => ({ ...s, status: off ? 'offline' : 'error' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    void run();
  }, [run]);
  return { status: state.status, data: state.data, reload: run, setData: (data: T | null) => setState((s) => ({ ...s, data })) };
}

/** The tab of the route (`?tab=`), limited to the tabs the screen has, and a setter that keeps the rest of the route. */
export function useTab<T extends string>(allowed: readonly T[], fallback: T): [T, (tab: T) => void] {
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab = typeof params.tab === 'string' && (allowed as readonly string[]).includes(params.tab) ? (params.tab as T) : fallback;
  const set = useCallback((next: T) => router.setParams({ tab: next }), []);
  return [tab, set];
}

export interface HealthTabItem<T extends string = string> {
  key: T;
  label: string;
  count?: number;
}

/** Link tabs: a row of chips that scrolls when the labels are long. The selected one is the ink chip of the boards. */
export function HealthTabs<T extends string>({ tabs, value, onChange, testID }: { tabs: HealthTabItem<T>[]; value: T; onChange: (tab: T) => void; testID?: string }) {
  const { theme } = useScreenUi();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" testID={testID} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {tabs.map((tab) => (
        <Chip key={tab.key} label={tab.label} count={tab.count} selected={tab.key === value} onPress={() => onChange(tab.key)} theme={theme} testID={testID ? `${testID}-${tab.key}` : undefined} />
      ))}
    </ScrollView>
  );
}

type NoticeTone = 'success' | 'warning' | 'danger' | 'info';

/** A message in the status tokens (an error under a form, a hint above a list). `role=alert` for danger. */
export function Notice({ tone = 'info', text, testID }: { tone?: NoticeTone; text: string; testID?: string }) {
  const { t, c, flow } = useScreenUi();
  const look = c.status[tone];
  return (
    <View accessibilityRole={tone === 'danger' ? 'alert' : undefined} testID={testID} style={{ borderRadius: 16, backgroundColor: look.bg, paddingHorizontal: 14, paddingVertical: 10 }}>
      <Text style={{ ...scale(t, 'meta', 'medium'), color: look.fg, ...flow }}>{text}</Text>
    </View>
  );
}

/** A form in a bottom sheet: the title, the fields, the error of the last save and the one save button. */
export function SheetForm({ open, title, onClose, onSave, saving = false, error, saveLabel, children, testID }: { open: boolean; title: string; onClose: () => void; onSave: () => void; saving?: boolean; error?: string | null; saveLabel: string; children: React.ReactNode; testID?: string }) {
  const { theme, k } = useScreenUi();
  return (
    <Sheet open={open} title={title} onClose={onClose} closeLabel={k('consult.close')}>
      <View testID={testID} style={{ gap: 14 }}>
        {children}
        {error ? <Notice tone="danger" text={error} /> : null}
        <Button label={saveLabel} size="lg" fullWidth loading={saving} onPress={onSave} theme={theme} testID={testID ? `${testID}-save` : undefined} />
      </View>
    </Sheet>
  );
}

/** A titled group of rows in one card (board HealthHub: radius 24, hairline, rows divided by a hairline). */
export function Panel({ children, testID }: { children: React.ReactNode; testID?: string }) {
  const { theme } = useScreenUi();
  return (
    <Card theme={theme} padding="none" testID={testID}>
      <View style={{ gap: 0 }}>{children}</View>
    </Card>
  );
}

/** A row of a panel: a service-tone glyph tile, a title and a line, an optional trailing element, a chevron when it opens something. */
export function Row({ icon, tone, title, subtitle, caption, trailing, onPress, last = false, testID }: { icon: FillIconName; tone: ServiceTone; title: string; subtitle?: string; caption?: string; trailing?: React.ReactNode; onPress?: () => void; last?: boolean; testID?: string }) {
  const { theme, t, c, flow } = useScreenUi();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 64, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border.hairline }}>
      <FIcon icon={icon} tone={tone} size={40} chip="soft" theme={theme} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ ...scale(t, 'body', 'bold'), color: c.text.primary, ...flow }}>{title}</Text>
        {subtitle ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{subtitle}</Text> : null}
        {caption ? <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary, ...flow }}>{caption}</Text> : null}
      </View>
      {trailing}
      {onPress && !trailing ? <Chevron /> : null}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={[title, subtitle].filter(Boolean).join(', ')} onPress={onPress} testID={testID} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {body}
    </Pressable>
  ) : (
    <View testID={testID}>{body}</View>
  );
}

/** The board's dose mark (HealthHub "أدوية اليوم"): a 30 square, green with a check once the dose is taken, an empty ring until then. */
export function DoseMark({ taken }: { taken: boolean }) {
  const { c } = useScreenUi();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: taken ? c.status.success.fill : 'transparent', borderWidth: taken ? 0 : 2, borderColor: c.border.strong }}>
      {taken ? <Glyph name="check-circle" size={14} color={c.action.primary.fg} /> : null}
    </View>
  );
}

/** A small status label (a pill, 24 tall) in the status tokens. */
export function Pill({ label, tone }: { label: string; tone: NoticeTone | 'neutral' }) {
  const { t, c } = useScreenUi();
  const look = tone === 'neutral' ? { bg: c.bg.surface, fg: c.text.secondary } : c.status[tone];
  return (
    <View style={{ alignSelf: 'flex-start', minHeight: 24, paddingHorizontal: 9, paddingVertical: 2, borderRadius: 12, backgroundColor: look.bg, justifyContent: 'center', borderWidth: tone === 'neutral' ? 1 : 0, borderColor: c.border.hairline }}>
      <Text style={{ ...scale(t, 'tag', 'bold'), color: look.fg }}>{label}</Text>
    </View>
  );
}

/** A metric of the board's 2-column grid: a label with its glyph, the value in 22 bold with its unit and the time of the reading. */
export function MetricTile({ label, value, unit, caption, icon, tone, onPress, testID }: { label: string; value: string; unit?: string; caption?: string; icon: FillIconName; tone: ServiceTone; onPress?: () => void; testID?: string }) {
  const { theme, t, c, flow } = useScreenUi();
  const body = (
    <Card theme={theme} padding="sm">
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, flexShrink: 1, ...flow }}>{label}</Text>
          <FIcon icon={icon} tone={tone} size={20} chip="none" theme={theme} />
        </View>
        <Text style={{ ...scale(t, 'h3'), color: c.text.primary, ...flow }}>
          {value}
          {unit ? <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary }}>{` ${unit}`}</Text> : null}
        </Text>
        {caption ? <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary, ...flow }}>{caption}</Text> : null}
      </View>
    </Card>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={[label, value, unit].filter(Boolean).join(' ')} onPress={onPress} testID={testID} style={({ pressed }) => ({ flexBasis: '48%', flexGrow: 1, opacity: pressed ? 0.85 : 1 })}>
      {body}
    </Pressable>
  ) : (
    <View testID={testID} style={{ flexBasis: '48%', flexGrow: 1 }}>{body}</View>
  );
}

/** Two metrics per row, as the board lays them out. */
export function MetricGrid({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{children}</View>;
}

/** The line of a series, in the tone's foreground: the area is not filled, the last point is a dot. `values` are real readings in time order. */
export function LineChart({ values, tone, height = 120, label, testID }: { values: number[]; tone: ServiceTone; height?: number; label: string; testID?: string }) {
  const { c } = useScreenUi();
  const [width, setWidth] = useState(300);
  const pad = 10;
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: values.length === 1 ? width / 2 : pad + (i / (values.length - 1)) * (width - pad * 2),
    y: height - pad - ((v - min) / span) * (height - pad * 2),
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <View accessibilityRole="image" accessibilityLabel={label} testID={testID} onLayout={(e) => setWidth(Math.max(120, e.nativeEvent.layout.width))} style={{ height, width: '100%' }}>
      <Svg width={width} height={height}>
        <Path d={`M${pad} ${height - pad} L${width - pad} ${height - pad}`} stroke={c.border.strong} strokeWidth={1} />
        {pts.length > 1 ? <Path d={d} stroke={c.service[tone].fg} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
        <Circle cx={last.x} cy={last.y} r={5} fill={c.service[tone].fg} stroke={c.bg.surface} strokeWidth={2} />
      </Svg>
    </View>
  );
}

/** A tone for each vital of the API (`key` of GET /health/vitals/summary and the types of POST /health/vitals) and its glyph. */
export const VITAL_LOOK: Record<string, { icon: FillIconName; tone: ServiceTone; label: string }> = {
  bp: { icon: 'heart', tone: RX_TONE, label: 'health.vital.bp' },
  glucose: { icon: 'drop', tone: 'violet', label: 'health.vital.glucose' },
  heart_rate: { icon: 'heartbeat', tone: 'peach', label: 'health.vital.heart_rate' },
  weight: { icon: 'scales', tone: CARE_TONE, label: 'health.vital.weight' },
  temperature: { icon: 'thermometer', tone: 'amber', label: 'health.vital.temperature' },
  spo2: { icon: 'drop', tone: 'blue', label: 'health.vital.spo2' },
};
export const vitalLook = (key: unknown) => VITAL_LOOK[String(key)] ?? { icon: 'heartbeat' as FillIconName, tone: RX_TONE, label: '' };
