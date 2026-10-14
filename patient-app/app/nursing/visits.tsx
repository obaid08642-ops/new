import React, { useCallback, useState } from 'react';
import { router, useFocusEffect, type Href } from 'expo-router';

import { ApptCard, ConsultList, useConsultFormat } from '../../src/components/consult/ConsultKit';
import { nursingStatus } from '../../src/components/nursing/NursingKit';
import { useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { pickLocalized } from '../../src/utils/localize';

type Rec = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');

/** The patient's nursing visits (board Orders): a card per visit with its day, service and state; a tap opens the live tracking. */
export default function NursingVisitsScreen() {
  const { k } = useScreenUi();
  const fmt = useConsultFormat();
  const [visits, setVisits] = useState<Rec[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'offline' | 'ready'>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await apiFetch<unknown>('/nursing/bookings/mine');
      const list = Array.isArray(res) ? res : (res as { data?: unknown } | null)?.data;
      setVisits(Array.isArray(list) ? (list as Rec[]) : []);
      setStatus('ready');
    } catch (err) {
      logError('nursing:visits', err);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ConsultList
      testID="nursing-visits"
      title={k('nur.visits.title')}
      data={visits}
      status={status}
      onRetry={() => void load()}
      onRefresh={() => void load()}
      empty={{ icon: 'first-aid-kit', title: k('nur.visits.empty'), body: k('nur.visits.emptyBody'), actionLabel: k('nur.visits.browse'), onAction: () => router.replace('/(tabs)/nursing' as Href) }}
      keyExtractor={(v, i) => str(v.id) || String(i)}
      renderItem={(v) => {
        // Home nursing: the nurse comes to the patient, as the booking flow opens it (needs-review issue 640).
        const open = (row: Rec) => () => router.push({ pathname: '/nursing/live-tracking', params: { type: 'nurse', bookingId: str(row.id) } } as unknown as Href);
        const st = nursingStatus(v.state);
        const when = fmt.dateTime(v.scheduled_at);
        return (
          <ApptCard
            testID={`nursing-visit-${str(v.id)}`}
            day={fmt.dayMonth(v.scheduled_at)}
            title={pickLocalized(str(v.service_name_ar), str(v.service_name_en)) || k('nur.visits.fallbackTitle')}
            subtitle={when}
            mode="home"
            status={{ label: k(st.key), tone: st.tone }}
            actions={[{ label: k(st.tone === 'success' ? 'nur.visits.details' : 'nur.visits.track'), tone: 'outline', onPress: open(v) }]}
            onPress={open(v)}
          />
        );
      }}
    />
  );
}
