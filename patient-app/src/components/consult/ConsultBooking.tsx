import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar, Card } from '../../../../packages/ui-native/src';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { Glyph } from '../pharmacy/PharmacyKit';
import { dateLocaleFor } from '../../utils/dates';
import { MODE_LOOK, type VisitMode } from './ConsultKit';

/**
 * The pieces of the booking and doctor pages (boards DoctorFull and BookingConfirm): the day strip, the time grid, the
 * visit-type tiles and the doctor line. Shared by the doctor page, the booking step and the reschedule form.
 */

export interface DayItem {
  /** yyyy-mm-dd of the local day, the form the slots endpoint takes. */
  iso: string;
  name: string;
  day: string;
  month: string;
}

/** The next `count` real days from today (today and tomorrow named, the rest by weekday), in the language's format. */
export function useDays(count: number): DayItem[] {
  const { lang, k, num } = useScreenUi();
  return React.useMemo(() => {
    const locale = dateLocaleFor(lang);
    const out: DayItem[] = [];
    for (let i = 0; i < count; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      out.push({
        iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        name: i === 0 ? k('consult.today') : i === 1 ? k('consult.tomorrow') : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d),
        day: num(d.getDate(), { useGrouping: false }),
        month: new Intl.DateTimeFormat(locale, { month: 'short', numberingSystem: 'latn' }).format(d),
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, count]);
}

/** The board's day buttons (DoctorFull): 64 tall, ink when selected; scrolls sideways when there are many. */
export function DayStrip({ days, value, onChange, label }: { days: DayItem[]; value: number; onChange: (index: number) => void; label: string }) {
  const { t, c } = useScreenUi();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" accessibilityLabel={label} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {days.map((d, i) => {
        const on = value === i;
        return (
          <Pressable
            key={d.iso}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${d.name} ${d.day} ${d.month}`}
            onPress={() => onChange(i)}
            style={{ minWidth: 64, minHeight: 64, paddingHorizontal: 10, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: on ? c.action.selected.bg : c.bg.surface, borderWidth: on ? 0 : 1, borderColor: c.border.hairline }}
          >
            <Text style={{ ...scale(t, 'tag', 'regular'), color: on ? c.action.selected.fg : c.text.secondary }}>{d.name}</Text>
            <Text style={{ ...scale(t, 'h4'), color: on ? c.action.selected.fg : c.text.primary }}>{d.day}</Text>
            <Text style={{ ...scale(t, 'micro', 'regular'), color: on ? c.action.selected.fg : c.text.tertiary }}>{d.month}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export interface SlotItem {
  id: string;
  label: string;
  available: boolean;
}

/** The board's time grid (DoctorFull): 44 tall buttons, four to a row, taken ones struck through and disabled, never hidden. */
export function SlotGrid({ slots, value, onChange, loading, emptyText }: { slots: SlotItem[]; value: string | null; onChange: (id: string) => void; loading: boolean; emptyText: string }) {
  const { t, c, k, flow } = useScreenUi();
  if (loading) {
    return <ActivityIndicator accessibilityLabel={k('consult.loading')} color={c.text.secondary} style={{ marginVertical: 18 }} />;
  }
  if (slots.length === 0) {
    return <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, paddingVertical: 14, ...flow, textAlign: 'center' }}>{emptyText}</Text>;
  }
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {slots.map((s) => {
        const on = value === s.id;
        return (
          <Pressable
            key={s.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, disabled: !s.available }}
            accessibilityLabel={s.label}
            disabled={!s.available}
            onPress={() => onChange(s.id)}
            style={{ flexBasis: '22%', flexGrow: 1, minWidth: 72, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.action.primary.bg : c.bg.surface, borderWidth: on ? 0 : 1, borderColor: c.border.hairline, opacity: s.available ? 1 : 0.5 }}
          >
            <Text style={{ ...scale(t, 'small', 'medium'), color: on ? c.action.primary.fg : c.text.primary, textDecorationLine: s.available ? 'none' : 'line-through' }}>{s.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The slots endpoint's reason for an empty day, as the message key of the translation files. */
export function slotsEmptyKey(reason: string | null): string {
  switch (reason) {
    case 'closed':
      return 'consult.slots.closed';
    case 'service_not_supported':
      return 'consult.slots.unsupported';
    case 'error':
      return 'consult.slots.error';
    default:
      return 'consult.slots.none';
  }
}

export interface ModeTile {
  /** What the screen keeps (the server's word: clinic, video, home). */
  id: string;
  mode: VisitMode;
  price: number | null;
}

/** The board's visit-type tiles (DoctorFull "نوع الاستشارة"): glyph, label and the fee of that mode, ink ring when chosen. */
export function ModeTiles({ tiles, value, onChange, label }: { tiles: ModeTile[]; value: string; onChange: (id: string) => void; label: string }) {
  const { t, c, k, money } = useScreenUi();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', gap: 10 }}>
      {tiles.map((m) => {
        const on = value === m.id;
        const look = MODE_LOOK[m.mode];
        const tone = c.service[look.tone];
        return (
          <Pressable
            key={m.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={k(`consult.mode.${m.mode}`)}
            onPress={() => onChange(m.id)}
            style={{ flex: 1, minWidth: 0, minHeight: 44, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center', gap: 8, backgroundColor: c.bg.surface, borderWidth: on ? 2 : 1, borderColor: on ? c.action.selected.bg : c.border.hairline }}
          >
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Glyph name={look.icon} size={22} color={tone.fg} />
            </View>
            <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, textAlign: 'center' }}>{k(`consult.mode.${m.mode}`)}</Text>
            {m.price !== null ? <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.price, textAlign: 'center' }}>{`${money(m.price)} ${k('consult.currency')}`}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** The doctor line of booking pages: photo or initials, name, title and specialty, the rating when there is one. */
export function DoctorHead({ name, line, photo, rating, count }: { name: string; line: string; photo?: string; rating?: number | null; count?: number | null }) {
  const { theme, t, c, flow, k, num } = useScreenUi();
  const shown = rating && rating > 0 ? num(rating, { maximumFractionDigits: 1 }) : '';
  return (
    <Card theme={theme} padding="sm">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={name} src={photo} size="lg" theme={theme} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{name}</Text>
          {line ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{line}</Text> : null}
          {shown ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Glyph name="star" size={14} color={c.icon.ratingStar} />
              <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary }}>{count ? k('consult.ratingCount', { rating: shown, n: num(count) }) : shown}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
