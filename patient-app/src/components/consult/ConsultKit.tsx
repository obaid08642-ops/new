import React from 'react';
import { Animated, FlatList, Modal as RNModal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppHeader, Card, EmptyState, ErrorState, FIcon, OfflineState, Screen, SERVICE_ICONS, StickyFooter, type AppHeaderAction, type FillIconName, type ServiceTone } from '../../../../packages/ui-native/src';
import { COLUMN, step as scale, tint, useScreenUi } from '../screen/ScreenKit';
import { Glyph } from '../pharmacy/PharmacyKit';
import { dateLocaleFor } from '../../utils/dates';

/**
 * What the consultation screens share (Batch 2, slice 2-app): the screen frame with its header and sticky footer, the
 * loading / error / offline / empty gate, a titled section, a label-value row, the visit-mode pill, the appointment
 * card (board Appointments) and the date and time formatters. A screen holds no colour, no font size and no sentence.
 */

/** The consultations' own service tone (the service map of the handoff). */
export const CONSULT_TONE: ServiceTone = SERVICE_ICONS.consult.tone;

/** The pharmacy's service tone (medicines, prescriptions) and the nursing tone, named by the service map, never by colour. */
export const RX_TONE: ServiceTone = SERVICE_ICONS.pharmacy.tone;
export const CARE_TONE: ServiceTone = SERVICE_ICONS.nursing.tone;

export type VisitMode = 'clinic' | 'home' | 'online';

/** Board Consult: clinic is blue (hospital), home is mint (house), online is violet (video). */
export const MODE_LOOK: Record<VisitMode, { icon: FillIconName; tone: ServiceTone }> = {
  clinic: { icon: 'hospital', tone: 'blue' },
  home: { icon: 'house', tone: 'mint' },
  online: { icon: 'video-camera', tone: 'violet' },
};

/** The server's visit-mode words (and the app's older ones) as one of the three the boards draw; null when unknown. */
export function visitMode(raw: unknown): VisitMode | null {
  const v = String(raw ?? '').toLowerCase();
  if (v === 'video' || v === 'online' || v === 'virtual' || v === 'teleconsult') return 'online';
  if (v === 'home' || v === 'home_visit' || v === 'homevisit') return 'home';
  if (v === 'clinic' || v === 'in_person' || v === 'in-person' || v === 'inperson' || v === 'hospital') return 'clinic';
  return null;
}

/** The board's share glyph (DoctorFull header): an up arrow out of a tray, 20 px, the header's stroke. */
export function ShareGlyph({ size = 20 }: { size?: number }) {
  const { c } = useScreenUi();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c.icon.primary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 15V3 M7 8l5-5 5 5 M5 13v7h14v-7" />
    </Svg>
  );
}

/** The row chevron: points the way the reader goes forward (right in LTR, left in RTL), in the header's own stroke. */
export function Chevron({ size = 18, back = false }: { size?: number; back?: boolean }) {
  const { c, isRTL } = useScreenUi();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c.icon.secondary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no">
      <Path d={isRTL === back ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} />
    </Svg>
  );
}

/** The glyph and tone of a specialty (board Consult's specialty chips), found from the name the server sent. */
const SPEC_LOOK: Array<[RegExp, FillIconName, ServiceTone]> = [
  [/أسنان|dent|tooth/i, 'tooth', 'mint'],
  [/جلد|derma|skin/i, 'hand-heart', 'pink'],
  [/عيون|عين|eye|ophth/i, 'eye', CARE_TONE],
  [/قلب|cardio|heart/i, 'heart', RX_TONE],
  [/أطفال|طفل|pediat|child/i, 'baby', 'amber'],
  [/عظام|ortho|bone/i, 'bone', 'violet'],
  [/نساء|ولادة|gyn|obst|matern/i, 'baby-carriage', 'pink'],
  [/نفس|psych|mental/i, 'brain', 'violet'],
];
export function specialtyLook(name: unknown): { icon: FillIconName; tone: ServiceTone } {
  const text = String(name ?? '');
  const hit = SPEC_LOOK.find(([re]) => re.test(text));
  return hit ? { icon: hit[1], tone: hit[2] } : { icon: 'stethoscope', tone: 'blue' };
}

/** Back, or the consultations hub when there is nothing to go back to (a deep link, a notification). */
export function goBack(fallback: Href = '/(tabs)/consultations' as Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/** Dates, times and amounts in the language's own format (Intl, Latin digits as the rest of the app). */
export function useConsultFormat() {
  const { lang, num, money } = useScreenUi();
  const locale = dateLocaleFor(lang);
  /** A calendar date from an ISO string, a Date or a timestamp; '' when it cannot be read. */
  const date = (value: unknown, long = false): string => {
    if (value === null || value === undefined || value === '') return '';
    const d = value instanceof Date ? value : new Date(value as string | number);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(locale, { year: 'numeric', month: long ? 'long' : 'short', day: 'numeric', ...(long ? { weekday: 'long' } : {}), numberingSystem: 'latn' });
  };
  const dayMonth = (value: unknown): { day: string; month: string } | null => {
    if (value === null || value === undefined || value === '') return null;
    const d = value instanceof Date ? value : new Date(value as string | number);
    if (Number.isNaN(d.getTime())) return null;
    return { day: num(d.getDate(), { useGrouping: false }), month: d.toLocaleDateString(locale, { month: 'short', numberingSystem: 'latn' }) };
  };
  /** A time of day from "HH:mm" (or "HH:mm:ss"); the text as sent when it is not a time. */
  const time = (value: unknown): string => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ''));
    if (!m) return String(value ?? '');
    const d = new Date(2000, 0, 1, Number(m[1]), Number(m[2]));
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' });
  };
  /** A timestamp as date and time. */
  const dateTime = (value: unknown): string => {
    const d = new Date(value as string | number);
    if (value === null || value === undefined || Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' });
  };
  /** A time of day from an ISO instant or a timestamp. */
  const clock = (value: unknown): string => {
    const d = new Date(value as string | number);
    return value === null || value === undefined || Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' });
  };
  return { date, dayMonth, time, dateTime, clock, num, money };
}

/**
 * The frame of every consultation screen: the board header (round back button, centred title, optional actions), the
 * 440 column on wide screens, an optional sticky footer for the page's one action, pull-to-refresh and a scroll.
 */
export function ConsultScreen({
  title,
  onBack,
  actions,
  footer,
  onRefresh,
  refreshing = false,
  scroll = true,
  gap = 16,
  testID,
  children,
}: {
  title: string;
  onBack?: () => void;
  actions?: AppHeaderAction[];
  footer?: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
  gap?: number;
  testID?: string;
  children: React.ReactNode;
}) {
  const { theme, c, dir, k } = useScreenUi();
  const header = (
    <View style={COLUMN}>
      <AppHeader title={title} onBack={onBack ?? (() => goBack())} backLabel={k('consult.back')} actions={actions} theme={theme} direction={dir} />
    </View>
  );
  const foot = footer ? (
    <StickyFooter theme={theme} direction={dir}>
      <View style={{ ...COLUMN, gap: 8 }}>{footer}</View>
    </StickyFooter>
  ) : undefined;
  return (
    <Screen
      theme={theme}
      direction={dir}
      header={header}
      footer={foot}
      scroll={scroll}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.text.primary} /> : undefined}
      testID={testID}
    >
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap }}>{children}</View>
    </Screen>
  );
}

export type GateStatus = 'loading' | 'error' | 'offline' | 'missing' | 'ready';

/**
 * Loading, failure, offline and not-found of a screen's data in the shared states of the design system. `ready`
 * renders the children. The screen decides which status it is in (it already does: it owns the call).
 */
export function Gate({
  status,
  onRetry,
  missingTitle,
  missingBody,
  errorTitle,
  children,
}: {
  status: GateStatus;
  onRetry: () => void;
  missingTitle?: string;
  missingBody?: string;
  errorTitle?: string;
  children: React.ReactNode;
}) {
  const { theme, c, k } = useScreenUi();
  if (status === 'ready') return <>{children}</>;
  if (status === 'loading') {
    return (
      <View accessibilityLabel={k('consult.loading')} accessibilityState={{ busy: true }} style={{ gap: 16 }}>
        <View style={{ height: 120, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
        <View style={{ height: 160, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
      </View>
    );
  }
  const center = { flexGrow: 1, justifyContent: 'center' as const, paddingVertical: 24 };
  if (status === 'missing') {
    return (
      <View style={center}>
        <EmptyState icon="calendar-dots" tone={CONSULT_TONE} title={missingTitle ?? k('consult.missing.title')} body={missingBody ?? k('consult.missing.body')} actionLabel={k('consult.myAppointments')} onAction={() => router.replace('/consultations/appointments' as Href)} theme={theme} />
      </View>
    );
  }
  if (status === 'offline') {
    return (
      <View style={center}>
        <OfflineState title={k('consult.offline.title')} body={k('consult.offline.body')} retryLabel={k('consult.retry')} onRetry={onRetry} theme={theme} />
      </View>
    );
  }
  return (
    <View style={center}>
      <ErrorState title={errorTitle ?? k('consult.error.title')} body={k('consult.error.body')} retryLabel={k('consult.retry')} onRetry={onRetry} theme={theme} />
    </View>
  );
}

/** A titled block of a screen (board h2: 18 bold) with an optional text action at the end. */
export function Section({ title, actionLabel, onAction, children }: { title?: string; actionLabel?: string; onAction?: () => void; children: React.ReactNode }) {
  const { t, c, flow } = useScreenUi();
  return (
    <View style={{ gap: 10 }}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, flexShrink: 1, ...flow }}>{title}</Text>
          {actionLabel ? (
            <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.link }}>{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** A label and its value on one row (detail pages): the value wraps and starts where the label ends. */
export function InfoRow({ label, value, strong = false, last = false }: { label: string; value: string; strong?: boolean; last?: boolean }) {
  const { t, c, flow } = useScreenUi();
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border.hairline }}>
      <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, flexShrink: 0, maxWidth: '45%', ...flow }}>{label}</Text>
      <Text style={{ ...scale(t, strong ? 'bodyStrong' : 'small', strong ? 'bold' : 'medium'), color: c.text.primary, flex: 1, minWidth: 0, ...flow }}>{value}</Text>
    </View>
  );
}

/** The service-tone tag of a visit mode (board Consult / Appointments): glyph and label, 26 tall, wraps in any language. */
export function ModePill({ mode }: { mode: VisitMode }) {
  const { t, c, k } = useScreenUi();
  const look = MODE_LOOK[mode];
  const tone = c.service[look.tone];
  return (
    <View style={{ alignSelf: 'flex-start', minHeight: 26, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 13, backgroundColor: tone.bg, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Glyph name={look.icon} size={13} color={tone.fg} />
      <Text style={{ ...scale(t, 'tag', 'bold'), color: tone.fg, flexShrink: 1 }}>{k(`consult.mode.${mode}`)}</Text>
    </View>
  );
}

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** An appointment's server status as its label key and status tone. */
export function appointmentStatus(raw: unknown): { key: string; tone: StatusTone } {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'confirmed' || s === 'scheduled' || s === 'accepted') return { key: 'consult.status.confirmed', tone: 'info' };
  if (s === 'completed' || s === 'done') return { key: 'consult.status.completed', tone: 'success' };
  if (s === 'cancelled' || s === 'canceled' || s === 'rejected') return { key: 'consult.status.cancelled', tone: 'danger' };
  if (s === 'pending' || s === 'requested' || s === 'awaiting_payment') return { key: 'consult.status.pending', tone: 'warning' };
  if (s === 'in_progress' || s === 'checked_in' || s === 'ongoing' || s === 'active') return { key: 'consult.status.inProgress', tone: 'info' };
  if (s === 'no_show' || s === 'missed') return { key: 'consult.status.missed', tone: 'neutral' };
  if (s === 'rescheduled') return { key: 'consult.status.rescheduled', tone: 'warning' };
  return { key: 'consult.status.other', tone: 'neutral' };
}

/** A short status label in the status tokens (a pill, 24 tall). */
export function StatusTag({ label, tone }: { label: string; tone: StatusTone }) {
  const { t, c } = useScreenUi();
  const look = c.status[tone];
  return (
    <View style={{ alignSelf: 'flex-start', minHeight: 24, paddingHorizontal: 9, paddingVertical: 2, borderRadius: 12, backgroundColor: look.bg, justifyContent: 'center' }}>
      <Text style={{ ...scale(t, 'tag', 'bold'), color: look.fg }}>{label}</Text>
    </View>
  );
}

/** A filled or outlined action of a card (board Appointments: 46 tall, radius 15). `ink` is the dark one. */
export function CardAction({ label, onPress, tone = 'primary', flex = false, testID }: { label: string; onPress: () => void; tone?: 'primary' | 'ink' | 'outline'; flex?: boolean; testID?: string }) {
  const { t, c } = useScreenUi();
  const bg = tone === 'primary' ? c.action.primary.bg : tone === 'ink' ? c.action.selected.bg : 'transparent';
  const fg = tone === 'primary' ? c.action.primary.fg : tone === 'ink' ? c.action.selected.fg : c.text.primary;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 46,
        minWidth: 44,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 15,
        backgroundColor: bg,
        borderWidth: tone === 'outline' ? 1.5 : 0,
        borderColor: c.border.strong,
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: flex ? 1 : 0,
        flexShrink: 1,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ ...scale(t, 'small', 'bold'), color: fg, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export interface ApptCardProps {
  /** The calendar day and month tile (board: coral-soft square); omitted when the server sent no date. */
  day?: { day: string; month: string } | null;
  /** A glyph tile in place of the date tile (the call history). */
  icon?: { name: FillIconName; tone: ServiceTone } | null;
  title: string;
  /** Specialty, time, price: already formatted and joined. */
  subtitle?: string;
  mode?: VisitMode | null;
  status?: { label: string; tone: StatusTone } | null;
  actions?: Array<{ label: string; onPress: () => void; tone?: 'primary' | 'ink' | 'outline'; flex?: boolean }>;
  onPress?: () => void;
  testID?: string;
}

/** The board's appointment card (Appointments, also the call history): date tile, title, line, mode, status and actions. */
export function ApptCard({ day, icon, title, subtitle, mode, status, actions, onPress, testID }: ApptCardProps) {
  const { theme, t, c, flow } = useScreenUi();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {day ? (
        <View style={{ width: 58, minHeight: 62, borderRadius: 18, backgroundColor: c.service.coral.bg, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }}>
          <Text style={{ ...scale(t, 'h3'), color: c.service.coral.fg }}>{day.day}</Text>
          <Text style={{ ...scale(t, 'tag', 'regular'), color: c.service.coral.fg }}>{day.month}</Text>
        </View>
      ) : icon ? (
        <FIcon icon={icon.name} tone={icon.tone} size={48} theme={theme} />
      ) : null}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{title}</Text>
        {subtitle ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{subtitle}</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {mode ? <ModePill mode={mode} /> : null}
          {status ? <StatusTag label={status.label} tone={status.tone} /> : null}
        </View>
      </View>
    </View>
  );
  return (
    <Card theme={theme} padding="sm" testID={testID}>
      {onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, minHeight: 44 })}>
          {body}
        </Pressable>
      ) : (
        body
      )}
      {actions && actions.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {actions.map((a) => (
            <CardAction key={a.label} label={a.label} onPress={a.onPress} tone={a.tone} flex={a.flex} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/**
 * The result template (booking placed, status of a request): a round status glyph, a title and a line, centred. The
 * glyph and its tone come from the status tokens; `children` is drawn under it (a card, the actions).
 */
export function ResultHero({ icon, tone = 'success', title, body, pop, children }: { icon: FillIconName; tone?: StatusTone; title: string; body?: string; pop?: Animated.Value; children?: React.ReactNode }) {
  const { t, c } = useScreenUi();
  const look = c.status[tone];
  return (
    <View accessibilityRole="summary" style={{ alignItems: 'center', gap: 12, paddingTop: 24, paddingBottom: 8 }}>
      <Animated.View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pop ?? 1 }] }}>
        <Glyph name={icon} size={52} color={look.fg} />
      </Animated.View>
      <Text accessibilityRole="header" style={{ ...scale(t, 'h2'), color: c.text.primary, textAlign: 'center' }}>{title}</Text>
      {body ? <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, textAlign: 'center' }}>{body}</Text> : null}
      {children}
    </View>
  );
}

/** A blocking dialog (insurance co-pay lock): a scrim, a surface card with a glyph, a title, a line and the actions. */
export function Dialog({ open, icon, title, body, children }: { open: boolean; icon: FillIconName; title: string; body: string; children: React.ReactNode }) {
  const { theme, t, c } = useScreenUi();
  return (
    <RNModal visible={open} transparent animationType="fade" onRequestClose={() => undefined}>
      <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: tint(c.bg.inverse, 0.6), justifyContent: 'center', padding: 20 }}>
        <Card theme={theme} elevation="raised">
          <View style={{ alignItems: 'center', gap: 10 }}>
            <FIcon icon={icon} tone="blue" size={56} theme={theme} />
            <Text accessibilityRole="header" style={{ ...scale(t, 'h3'), color: c.text.primary, textAlign: 'center' }}>{title}</Text>
            <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, textAlign: 'center' }}>{body}</Text>
            <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 8 }}>{children}</View>
          </View>
        </Card>
      </View>
    </RNModal>
  );
}

/** A bottom sheet (the hub's filters and insurance choice): scrim, rounded top, a title row with a close button, scrolling content. */
export function Sheet({ open, title, onClose, onBack, backLabel, closeLabel, children }: { open: boolean; title: string; onClose: () => void; onBack?: () => void; backLabel?: string; closeLabel: string; children: React.ReactNode }) {
  const { t, c, dir } = useScreenUi();
  return (
    <RNModal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: tint(c.bg.inverse, 0.5), justifyContent: 'flex-end' }}>
        <View style={{ maxHeight: '85%', backgroundColor: c.bg.canvas, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, direction: dir }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {onBack ? (
              <Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Chevron back />
              </Pressable>
            ) : null}
            <Text accessibilityRole="header" style={{ ...scale(t, 'h3'), color: c.text.primary, flex: 1 }}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
              <Glyph name="x-circle" size={22} color={c.icon.primary} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>{children}</ScrollView>
        </View>
      </View>
    </RNModal>
  );
}

/** A round glyph tile used for the icon of a detail head or a list row (service-tone soft square). */
export function GlyphTile({ icon, tone = CONSULT_TONE, size = 44 }: { icon: FillIconName; tone?: ServiceTone; size?: number }) {
  const { theme } = useScreenUi();
  return <FIcon icon={icon} tone={tone} size={size} theme={theme} />;
}

/**
 * The list template (appointments, call history, prescriptions, shared reports): the header, an optional top block
 * (a segmented control, a notice), a virtualised list of cards and the shared loading / failure / offline / empty
 * states. The screen keeps its own data call and says which state it is in.
 */
export function ConsultList<T>({
  title,
  onBack,
  actions,
  top,
  data,
  keyExtractor,
  renderItem,
  status,
  onRetry,
  onRefresh,
  refreshing = false,
  footer,
  empty,
  onEndReached,
  listFooter,
  testID,
}: {
  title: string;
  onBack?: () => void;
  actions?: AppHeaderAction[];
  top?: React.ReactNode;
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactElement;
  status: 'loading' | 'error' | 'offline' | 'ready';
  onRetry: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  footer?: React.ReactNode;
  empty: { icon: FillIconName; title: string; body?: string; actionLabel?: string; onAction?: () => void };
  /** The next page of a paged list. */
  onEndReached?: () => void;
  listFooter?: React.ReactElement | null;
  testID?: string;
}) {
  const { theme, c, dir, k } = useScreenUi();
  const header = (
    <View style={COLUMN}>
      <AppHeader title={title} onBack={onBack ?? (() => goBack())} backLabel={k('consult.back')} actions={actions} theme={theme} direction={dir} />
    </View>
  );
  const foot = footer ? (
    <StickyFooter theme={theme} direction={dir}>
      <View style={{ ...COLUMN, gap: 8 }}>{footer}</View>
    </StickyFooter>
  ) : undefined;
  if (status === 'error' || status === 'offline') {
    return (
      <Screen theme={theme} direction={dir} header={header} scroll testID={testID}>
        <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8 }}>
          <Gate status={status} onRetry={onRetry}>{null}</Gate>
        </View>
      </Screen>
    );
  }
  return (
    <Screen theme={theme} direction={dir} header={header} footer={foot} testID={testID}>
      <FlatList
        style={{ flex: 1 }}
        data={status === 'loading' ? [] : data}
        keyExtractor={keyExtractor}
        ListHeaderComponent={top ? <View style={{ paddingBottom: 16 }}>{top}</View> : null}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          status === 'loading' ? (
            <View accessibilityLabel={k('consult.loading')} accessibilityState={{ busy: true }} style={{ gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ height: 120, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
              ))}
            </View>
          ) : (
            <EmptyState icon={empty.icon} tone={CONSULT_TONE} title={empty.title} body={empty.body} actionLabel={empty.actionLabel} onAction={empty.onAction} theme={theme} />
          )
        }
        contentContainerStyle={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.text.primary} /> : undefined}
        initialNumToRender={10}
        windowSize={7}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={listFooter}
        renderItem={({ item, index }) => renderItem(item, index)}
        testID={testID ? `${testID}-list` : undefined}
      />
    </Screen>
  );
}
