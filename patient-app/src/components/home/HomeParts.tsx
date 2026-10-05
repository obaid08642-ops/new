import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { Button, Card, FIcon, ListItem, SectionHeader, ServiceTile } from '../../../../packages/ui-native/src';
import { SERVICE_ICONS, type FillIconName, type ServiceName, type ServiceTone } from '../../../../packages/ui/icons/fill';
import { withAlpha } from '../../../../packages/ui-native/src/shells/shellTokens';
import { NabdLogo } from '../NabdLogo';
import { Plain, Txt, useScreenUi } from './homeKit';

/**
 * The blocks of Home below the top row, one per element of canvas/HomeApp.dc.html. Each takes only what the
 * screen already fetched; a block with nothing to show is not rendered by the screen.
 */

/** The board's forward chevron: points where the row leads (left when the page reads right to left). */
export function Chevron({ color, size = 18, width = 2 }: { color: string; size?: number; width?: number }) {
  const { isRTL } = useScreenUi();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={isRTL ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Reduced motion, as the OS reports it. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => live && setReduced(v)).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const ECG_PATH = 'M0 22 H120 L132 22 L140 8 L150 32 L160 4 L170 26 L178 22 H320';
/** The path's length in its own units (the segments summed), the length the dash is drawn over. */
const ECG_LENGTH = 400;

/** The board's ECG line: drawn once in 1.4 s after a 300 ms wait, not at all (shown complete) when motion is reduced. */
function EcgLine() {
  const { c } = useScreenUi();
  const reduced = useReducedMotion();
  const offset = useRef(new Animated.Value(ECG_LENGTH)).current;
  useEffect(() => {
    if (reduced) {
      offset.setValue(0);
      return;
    }
    offset.setValue(ECG_LENGTH);
    Animated.timing(offset, { toValue: 0, duration: 1400, delay: 300, useNativeDriver: false }).start();
  }, [reduced, offset]);
  return (
    <Svg width="100%" height={34} viewBox="0 0 320 34" preserveAspectRatio="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <AnimatedPath d={ECG_PATH} fill="none" stroke={c.avatar.ring} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[ECG_LENGTH, ECG_LENGTH]} strokeDashoffset={offset} />
    </Svg>
  );
}

/** The greeting card: time-of-day greeting, the name when the profile has one, the Noon Dot and the ECG line. */
export function GreetingCard({ name }: { name: string | null }) {
  const { theme, c, tr } = useScreenUi();
  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 12 ? 'home.greetingMorning' : 'home.greetingEvening';
  return (
    // the dark board's greeting is a blue wash of the surface, not the coral one
    <Card tint={theme === 'dark' ? undefined : SERVICE_ICONS.health.tone} padding="lg" theme={theme}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          {name ? (
            <>
              <Txt size={13} color={c.text.secondary}>{greeting}</Txt>
              <Txt accessibilityRole="header" weight="bold" size={24} numberOfLines={2}>{name}</Txt>
            </>
          ) : (
            <Txt accessibilityRole="header" weight="bold" size={24}>{greeting}</Txt>
          )}
        </View>
        <NabdLogo size={36} variant="text" theme={theme} pulse label={tr('common.appName')} />
      </View>
      <EcgLine />
    </Card>
  );
}

/** One slim banner: some of the day's data did not load (or none did). Retry reloads it. */
export function LoadBanner({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  const { c } = useScreenUi();
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: c.status.warning.bg, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14, gap: 4 }}>
      <Plain weight="medium" size={13.5} color={c.status.warning.fg}>{message}</Plain>
      <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
        <Plain weight="bold" size={13.5} color={c.status.warning.fg}>{retryLabel}</Plain>
      </Pressable>
    </View>
  );
}

/** The health reminder: the next dose (or that today's doses are done). Violet soft card, the drop on a solid chip. */
export function ReminderCard({ label, title, subtitle, onPress }: { label: string; title: string; subtitle?: string; onPress: () => void }) {
  const { theme, c } = useScreenUi();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, title, subtitle].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => ({ borderRadius: 22, backgroundColor: c.service.violet.bg, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <FIcon icon="drop" tone="violet" chip="solid" size={44} theme={theme} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt weight="medium" size={11.5} color={c.service.violet.fg}>{label}</Txt>
        <Plain weight="bold" size={14.5} numberOfLines={2}>{title}</Plain>
        {subtitle ? <Plain size={12} color={c.text.secondary}>{subtitle}</Plain> : null}
      </View>
      <Chevron color={c.text.secondary} />
    </Pressable>
  );
}

export interface HomeService {
  service: ServiceName;
  label: string;
  route: string;
}

/** The service grid: the ServiceTile of the handoff service map, three across (Home keeps its 440 phone column on a tablet). */
export function ServiceGrid({ items }: { items: HomeService[] }) {
  const { theme, tr } = useScreenUi();
  const cols = 3;
  const rows: HomeService[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  return (
    <View style={{ gap: 10 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 10 }}>
          {Array.from({ length: cols }).map((_, i) => {
            const item = row[i];
            return (
              <View key={i} style={{ flex: 1 }}>
                {item ? <ServiceTile name={item.service} label={tr(item.label)} theme={theme} onPress={() => router.push(item.route as never)} /> : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** The AI assistant card: violet wash, the sparkle on a solid chip, the "AI" pill, a round chevron. */
export function AiCard({ onPress }: { onPress: () => void }) {
  const { theme, c, tr } = useScreenUi();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tr('home.aiTitle')}, ${tr('home.aiSub')}`}
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <Card tint="violet" padding="md" theme={theme}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <FIcon icon="sparkle" tone="violet" chip="solid" size={56} theme={theme} />
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ alignSelf: 'flex-start', minHeight: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: c.service.violet.bg, justifyContent: 'center' }}>
              <Txt weight="medium" size={11} color={c.service.violet.fg}>{'home.aiBadge'}</Txt>
            </View>
            <Txt weight="bold" size={16.5}>{'home.aiTitle'}</Txt>
            <Txt size={12.5} color={c.text.secondary}>{'home.aiSub'}</Txt>
          </View>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: withAlpha(c.service.violet.fg, 0.14), alignItems: 'center', justifyContent: 'center' }}>
            <Chevron color={c.service.violet.fg} width={2.2} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export interface HomeTool {
  label: string;
  icon: FillIconName;
  tone: ServiceTone;
  route: string;
}

/** The AI tools row: 86 x 100 tiles in a horizontal list that runs to the screen edges. */
export function ToolsRow({ tools }: { tools: HomeTool[] }) {
  const { theme, c, tr } = useScreenUi();
  return (
    <FlatList
      horizontal
      data={tools}
      keyExtractor={(tool) => tool.route}
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -16 }}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr(item.label)}
          onPress={() => router.push(item.route as never)}
          style={({ pressed }) => ({
            width: 86,
            minHeight: 100,
            paddingHorizontal: 6,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: c.bg.surface,
            borderWidth: 1,
            borderColor: c.border.hairline,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <FIcon icon={item.icon} tone={item.tone} chip="none" size={26} theme={theme} />
          <Txt weight="medium" size={11.5} style={{ textAlign: 'center', lineHeight: 15 }}>{item.label}</Txt>
        </Pressable>
      )}
    />
  );
}

/** The "all services" row under the tools. */
export function AllServicesRow({ onPress }: { onPress: () => void }) {
  const { theme, c, tr } = useScreenUi();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tr('common.seeAllServices')}, ${tr('home.servicesSub')}`}
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <Card padding="sm" theme={theme}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <FIcon icon="squares-four" tone={SERVICE_ICONS.nursing.tone} size={44} theme={theme} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt weight="bold" size={15}>{'common.seeAllServices'}</Txt>
            <Txt size={12} color={c.text.secondary}>{'home.servicesSub'}</Txt>
          </View>
          <Chevron color={c.text.secondary} />
        </View>
      </Card>
    </Pressable>
  );
}

export interface UpcomingAppointment {
  id?: string;
  doctorName?: string | null;
  type?: string;
  time?: string;
  /** YYYY-MM-DD, as /home/upcoming-appointment returns it. */
  date?: string;
}

const LOCALE: Record<string, string> = { ar: 'ar', en: 'en', ur: 'ur', hi: 'hi', bn: 'bn', fil: 'fil' };

/** Day number and short month of a YYYY-MM-DD date, in the reader's language; null when the date is not usable. */
function dateParts(date: string | undefined, lang: string): { day: string; month: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '');
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return null;
  try {
    const locale = LOCALE[lang] || 'ar';
    return {
      day: new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' }).format(d),
      month: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(d),
    };
  } catch {
    return null;
  }
}

/** The next appointment: date block, doctor, type and time, and the outlined "details" button. */
export function AppointmentCard({ appointment, onDetails, detailsLabel }: { appointment: UpcomingAppointment; onDetails: () => void; detailsLabel: string }) {
  const { theme, c, lang } = useScreenUi();
  const parts = dateParts(appointment.date, lang);
  const line = [appointment.type, appointment.time].filter(Boolean).join(' · ');
  return (
    <Card padding="sm" theme={theme}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {parts ? (
          <View style={{ width: 56, minHeight: 60, borderRadius: 18, backgroundColor: c.service[SERVICE_ICONS.health.tone].bg, alignItems: 'center', justifyContent: 'center' }}>
            <Plain weight="bold" size={20} color={c.status.danger.fg} style={{ lineHeight: 24 }}>{parts.day}</Plain>
            <Plain size={11} color={c.status.danger.fg} style={{ lineHeight: 14 }}>{parts.month}</Plain>
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          {appointment.doctorName ? <Plain weight="bold" size={15} numberOfLines={2}>{appointment.doctorName}</Plain> : null}
          {line ? <Txt size={12.5} color={c.text.secondary} numberOfLines={2}>{line}</Txt> : null}
        </View>
        <Button label={detailsLabel} variant="outline" size="sm" theme={theme} onPress={onDetails} />
      </View>
    </Card>
  );
}

export interface DayRow {
  key: string;
  service: ServiceName;
  title: string;
  subtitle: string;
  route: string;
}

/** The records already fetched for today (meals and water, vitals, mood, maternity) as rows of one card. */
export function DayRecords({ title, rows }: { title: string; rows: DayRow[] }) {
  const { theme, c } = useScreenUi();
  if (!rows.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <SectionHeader title={title} theme={theme} />
      <Card padding="none" theme={theme}>
        <View style={{ paddingVertical: 4 }}>
          {rows.map((row, i) => {
            const leading = SERVICE_LEADING[row.service];
            return (
              <View key={row.key} style={i < rows.length - 1 ? { borderBottomWidth: 1, borderBottomColor: c.border.subtle } : undefined}>
                <ListItem title={row.title} subtitle={row.subtitle} leading={leading} theme={theme} onPress={() => router.push(row.route as never)} />
              </View>
            );
          })}
        </View>
      </Card>
    </View>
  );
}

const SERVICE_LEADING: Record<string, { icon: FillIconName; tone: ServiceTone }> = {
  nutrition: { icon: 'bowl-food', tone: SERVICE_ICONS.nutrition.tone },
  health: { icon: 'heartbeat', tone: SERVICE_ICONS.health.tone },
  mind: { icon: 'brain', tone: 'violet' },
  maternity: { icon: 'baby', tone: 'pink' },
};

/**
 * The points card: the star on a solid amber chip and what the points are worth (the owner's product rule, up to 10%
 * of an order). The balance is shown only when GET /loyalty/account returned one (`points` is null otherwise).
 */
export function PointsCard({ onPress, points }: { onPress: () => void; points: number | null }) {
  const { theme, c, tr, lang } = useScreenUi();
  const label = points === null ? tr('home.points') : tr('home.pointsBalance').replace('{n}', new Intl.NumberFormat(LOCALE[lang] || 'ar').format(points));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${tr('home.pointsRule')}`}
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <Card tint="amber" padding="sm" theme={theme}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <FIcon icon="star" tone="amber" chip="solid" size={44} theme={theme} />
          <View style={{ flex: 1, gap: 1 }}>
            <Plain size={12} color={c.text.secondary}>{label}</Plain>
            <Txt weight="bold" size={15}>{'home.pointsRule'}</Txt>
          </View>
          <Chevron color={c.text.secondary} />
        </View>
      </Card>
    </Pressable>
  );
}
