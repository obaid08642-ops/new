import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { EmptyState, FIcon, Input, type FillIconName, type ServiceTone } from '../../../../packages/ui-native/src';
import { CARE_TONE, Gate, useConsultFormat } from '../consult/ConsultKit';
import { HealthTabs, Panel, Row, SheetForm, rowsOf, useRemote } from '../health/HealthKit';
import { Glyph } from '../pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { showLocalizedAlert } from '../LocalizedAlert';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { buildFamilyCalendarPayload, parseFamilyCalendarEvents, type FamilyCalendarEventType } from '../../utils/family-calendar-contract';
import { CORAL_TONE, FamilyScreen, type FamilyMember } from './FamilyKit';

/**
 * The shared family calendar (merge map row C, `/family/calendar`): the events of the group and the form to add one.
 * GET /family/calendar, GET /family/members, POST /family/calendar/event, DELETE /family/calendar/event/:id. The old
 * /family/shared-calendar and /health/family-calendar redirect here.
 */

const TYPES = ['appointment', 'reminder', 'medication', 'lab'] as const;
const TYPE_LOOK: Record<string, { icon: FillIconName; tone: ServiceTone }> = {
  appointment: { icon: 'stethoscope', tone: CARE_TONE },
  medication: { icon: 'pill', tone: 'mint' },
  lab: { icon: 'test-tube', tone: 'violet' },
  reminder: { icon: 'bell', tone: 'amber' },
  order: { icon: 'package', tone: 'peach' },
};

interface CalendarEvent { id: string; title?: string; type?: string; event_date?: string; time?: string; member?: string; can_delete?: boolean }

export function FamilyCalendarView() {
  const { k, theme, t, c, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const data = useRemote(async () => {
    const [calendar, members] = await Promise.all([apiFetch('/family/calendar'), apiFetch('/family/members')]);
    return { events: parseFamilyCalendarEvents(calendar) as unknown as CalendarEvent[], members: rowsOf<FamilyMember>(members) };
  }, [], 'family:calendar');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [type, setType] = useState<FamilyCalendarEventType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const events = data.data?.events ?? [];
  const members = data.data?.members ?? [];

  const openForm = () => {
    setTitle('');
    setEventDate('');
    setMemberId(null);
    setType(null);
    setError(null);
    setOpen(true);
  };

  const submit = async () => {
    let payload: ReturnType<typeof buildFamilyCalendarPayload>;
    try {
      payload = buildFamilyCalendarPayload({ title, eventDate, memberUserId: memberId, type });
    } catch {
      setError(k('family.calendar.invalid'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/family/calendar/event', { method: 'POST', body: JSON.stringify(payload) });
      setOpen(false);
      await data.reload(true);
    } catch (e) {
      logError('family:calendar', e);
      setError(k('family.calendar.addFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = (event: CalendarEvent) => {
    showLocalizedAlert(k('family.calendar.deleteTitle'), k('family.calendar.deleteBody'), [
      { text: k('family.perms.cancel'), style: 'cancel' },
      {
        text: k('family.calendar.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/family/calendar/event/${event.id}`, { method: 'DELETE' });
            await data.reload(true);
          } catch (e) {
            logError('family:calendar', e);
            showLocalizedAlert(k('family.calendar.deleteFailed'), k('family.calendar.tryAgain'));
          }
        },
      },
    ]);
  };

  return (
    <FamilyScreen
      title={k('family.calendar.title')}
      actions={[{ key: 'add', label: k('family.calendar.add'), icon: <Glyph name="plus" size={20} color={c.icon.primary} />, onPress: openForm }]}
      testID="family-calendar"
    >
      <Gate status={data.status} onRetry={() => void data.reload()}>
        {events.length === 0 ? (
          <EmptyState icon="calendar-dots" tone={CORAL_TONE} title={k('family.calendar.emptyTitle')} body={k('family.calendar.emptyBody')} actionLabel={k('family.calendar.add')} onAction={openForm} theme={theme} />
        ) : (
          <Panel testID="family-events">
            {events.map((e, i) => {
              const look = TYPE_LOOK[String(e.type)] ?? TYPE_LOOK.reminder;
              return (
                <Row
                  key={e.id}
                  icon={look.icon}
                  tone={look.tone}
                  title={e.title ?? ''}
                  subtitle={[fmt.date(e.event_date, true), fmt.time(e.time)].filter(Boolean).join(' · ')}
                  caption={e.member}
                  trailing={e.can_delete === true ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={k('family.calendar.delete')} onPress={() => remove(e)} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} testID={`event-delete-${e.id}`}>
                      <FIcon icon="trash" tone="ink" size={20} chip="none" theme={theme} />
                    </Pressable>
                  ) : undefined}
                  last={i === events.length - 1}
                  testID={`event-${e.id}`}
                />
              );
            })}
          </Panel>
        )}
      </Gate>

      <SheetForm open={open} title={k('family.calendar.newTitle')} onClose={() => setOpen(false)} onSave={() => void submit()} saving={saving} error={error} saveLabel={k('family.calendar.save')} testID="event-sheet">
        <Input label={k('family.calendar.eventTitle')} value={title} onChange={setTitle} theme={theme} />
        <Input label={k('family.calendar.eventDate')} hint={k('family.calendar.dateHint')} value={eventDate} onChange={setEventDate} theme={theme} />
        <Text style={{ ...scale(t, 'meta', 'medium'), color: c.text.secondary, ...flow }}>{k('family.calendar.member')}</Text>
        <HealthTabs tabs={members.map((m) => ({ key: m.user_id, label: m.display_name || m.user_id }))} value={memberId ?? ''} onChange={setMemberId} testID="event-members" />
        <Text style={{ ...scale(t, 'meta', 'medium'), color: c.text.secondary, ...flow }}>{k('family.calendar.eventType')}</Text>
        <HealthTabs tabs={TYPES.map((key) => ({ key, label: k(`family.calendar.type.${key}`) }))} value={type ?? ''} onChange={(key) => setType(key === '' ? null : key)} testID="event-types" />
      </SheetForm>
    </FamilyScreen>
  );
}
