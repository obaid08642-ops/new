import React, { useState } from 'react';
import { router, type Href } from 'expo-router';

import { Segmented } from '../../../packages/ui-native/src';
import { ApptCard, ConsultList, appointmentStatus, useConsultFormat, visitMode, type VisitMode } from '../../src/components/consult/ConsultKit';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { useScreenUi } from '../../src/components/screen/ScreenKit';
import { useConsultations } from '../../src/context/ConsultationsContext';
import { statusCode, statusIs } from '../../src/utils/statusCase';

/**
 * My appointments — board Appointments (canvas/Appointments.dc.html). The list is what GET /care/appointments returns
 * (through ConsultationsContext); the tabs split it by the server's status, and each card offers what that mode and
 * status allow: the waiting room (online), the clinic's place (clinic), the visit tracking (home), edit or cancel, and
 * "book again" for a finished visit with a known doctor.
 */

const UPCOMING = ['confirmed', 'pending'];
const PAST = ['completed', 'cancelled'];

export default function AppointmentsScreen() {
  const { theme, c, k } = useScreenUi();
  const { date, dayMonth, time, money } = useConsultFormat();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const { appointments, isLoading, error, fetchAppointments } = useConsultations();
  const [refreshing, setRefreshing] = useState(false);

  const rows = appointments.filter((a) => statusIs(a.status, tab === 'upcoming' ? UPCOMING : PAST));

  const refresh = async () => {
    setRefreshing(true);
    await fetchAppointments(true);
    setRefreshing(false);
  };

  const open = (id: string, pathname: string) => router.push({ pathname, params: { appointmentId: id } } as unknown as Href);

  const primary = (id: string, mode: VisitMode | null) => {
    if (mode === 'online') return { label: k('consult.appt.waitingRoom'), onPress: () => open(id, '/consultations/virtual-waiting-room'), flex: true };
    if (mode === 'home') return { label: k('consult.appt.trackVisit'), onPress: () => open(id, '/consultations/home-visit-tracking'), tone: 'ink' as const, flex: true };
    if (mode === 'clinic') return { label: k('consult.appt.directions'), onPress: () => router.push({ pathname: '/consultations/booking-status', params: { appointmentId: id, state: 'confirmed', view: 'location' } } as unknown as Href), tone: 'ink' as const, flex: true };
    return null;
  };

  return (
    <ConsultList
      testID="appointments-screen"
      title={k('consult.appt.title')}
      actions={[{ key: 'book', label: k('consult.appt.bookNew'), icon: <Glyph name="plus" size={20} color={c.icon.primary} />, onPress: () => router.push('/(tabs)/consultations' as Href) }]}
      top={
        <Segmented
          label={k('consult.appt.title')}
          value={tab}
          onChange={(v) => setTab(v === 'past' ? 'past' : 'upcoming')}
          options={[
            { value: 'upcoming', label: k('consult.appt.upcoming') },
            { value: 'past', label: k('consult.appt.past') },
          ]}
          theme={theme}
          testID="appointments-tabs"
        />
      }
      data={rows}
      status={isLoading ? 'loading' : error ? 'error' : 'ready'}
      onRetry={() => void fetchAppointments()}
      onRefresh={() => void refresh()}
      refreshing={refreshing}
      empty={{
        icon: 'calendar-dots',
        title: k(tab === 'upcoming' ? 'consult.appt.emptyUpcoming' : 'consult.appt.emptyPast'),
        body: k('consult.appt.emptyBody'),
        actionLabel: tab === 'upcoming' ? k('consult.appt.bookNow') : undefined,
        onAction: () => router.push('/(tabs)/consultations' as Href),
      }}
      keyExtractor={(a) => String(a.id)}
      renderItem={(a) => {
        const mode = visitMode(a.type);
        const st = appointmentStatus(a.status);
        const status = statusCode(a.status);
        const actions = [];
        if (status === 'confirmed') {
          const p = primary(String(a.id), mode);
          if (p) actions.push(p);
          actions.push({ label: k('consult.appt.editCancel'), onPress: () => open(String(a.id), '/consultations/cancel-reschedule'), tone: 'outline' as const });
        } else if (status === 'completed' && a.docId) {
          actions.push({ label: k('consult.appt.bookAgain'), onPress: () => router.push({ pathname: '/consultations/book/[id]', params: { id: a.docId } } as unknown as Href), tone: 'outline' as const, flex: true });
        }
        const price = Number(a.price) > 0 ? `${money(Number(a.price))} ${k('consult.currency')}` : '';
        return (
          <ApptCard
            day={dayMonth(a.at)}
            title={a.docName || k('consult.doctorFallback')}
            subtitle={[a.spec, a.time ? time(a.time) : date(a.at), price].filter(Boolean).join(' · ')}
            mode={mode}
            status={{ label: k(st.key), tone: st.tone }}
            actions={actions}
            onPress={() => open(String(a.id), '/consultations/appointment-detail')}
          />
        );
      }}
    />
  );
}
