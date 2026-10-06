import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSelector } from 'react-redux';

import { ApptCard, ConsultList, useConsultFormat } from '../../src/components/consult/ConsultKit';
import { useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { callAgainParams } from '../../src/utils/callAgain';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';

/**
 * Call history — board Appointments' card (canvas/Appointments.dc.html) for the calls of GET /calls/history (paged,
 * 20 a page). Each card says whether the call was outgoing or incoming, how it ended, when, and for how long; the
 * button calls again through the video-call screen with the call's appointment (no appointment, no button).
 */

interface CallSession {
  id: string;
  appointment_id?: string;
  caller_id: string;
  callee_id: string;
  call_type: 'voice' | 'video' | 'group';
  status: 'pending' | 'active' | 'ended' | 'missed' | 'rejected';
  duration_seconds?: number;
  createdAt: string;
}

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

function look(status: string, isCaller: boolean): { key: string; tone: Tone } {
  switch (status) {
    case 'ended':
      return { key: 'consult.calls.ended', tone: 'success' };
    case 'rejected':
      return { key: isCaller ? 'consult.calls.rejectedByOther' : 'consult.calls.rejected', tone: 'danger' };
    case 'missed':
      return { key: isCaller ? 'consult.calls.noAnswer' : 'consult.calls.missed', tone: 'danger' };
    case 'active':
      return { key: 'consult.calls.active', tone: 'info' };
    default:
      return { key: 'consult.calls.pending', tone: 'warning' };
  }
}

export default function CallHistoryScreen() {
  const { c, k } = useScreenUi();
  const { dateTime, num } = useConsultFormat();
  const me = useSelector((state: { auth?: { user?: { id?: string } } }) => state.auth?.user)?.id;

  const [calls, setCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaded = useRef<CallSession[]>([]);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);

  const fetchHistory = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      if (pageNum === 1 && !isRefresh) setLoading(true);
      // The server answers { data: [...], total, page, total_pages } (older builds sent `calls`).
      const data = await apiFetch<{ data?: CallSession[]; calls?: CallSession[]; total?: number }>(`/calls/history?page=${pageNum}&limit=20`);
      const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data?.calls) ? data.calls : null;
      if (data && rows) {
        const next = isRefresh || pageNum === 1 ? rows : [...loaded.current, ...rows];
        loaded.current = next;
        setCalls(next);
        setHasMore(next.length < (data.total ?? 0));
      }
      setFailed(null);
    } catch (err) {
      logError('consultations:call-history', err);
      setFailed((await isOffline()) ? 'offline' : 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchHistory(1);
  }, [fetchHistory]);

  const refresh = () => {
    setRefreshing(true);
    setPage(1);
    void fetchHistory(1, true);
  };

  const more = () => {
    if (!loading && hasMore) {
      const next = page + 1;
      setPage(next);
      void fetchHistory(next);
    }
  };

  const duration = (sec?: number): string => {
    if (!sec) return '';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m === 0 ? k('consult.calls.durationS', { s: num(s) }) : k('consult.calls.durationMS', { m: num(m), s: num(s) });
  };

  return (
    <ConsultList
      testID="call-history-screen"
      title={k('consult.calls.title')}
      data={calls}
      status={loading ? 'loading' : failed && calls.length === 0 ? failed : 'ready'}
      onRetry={() => void fetchHistory(1)}
      onRefresh={refresh}
      refreshing={refreshing}
      onEndReached={more}
      listFooter={hasMore && calls.length > 0 ? <View style={{ paddingVertical: 16 }}><ActivityIndicator color={c.text.secondary} accessibilityLabel={k('consult.loading')} /></View> : null}
      empty={{ icon: 'headset', title: k('consult.calls.empty'), body: k('consult.calls.emptyBody') }}
      keyExtractor={(item) => item.id}
      renderItem={(item) => {
        const isCaller = item.caller_id === me;
        const st = look(item.status, isCaller);
        const again = callAgainParams(item);
        const line = [dateTime(item.createdAt), item.status === 'ended' ? duration(item.duration_seconds) : ''].filter(Boolean).join(' · ');
        return (
          <ApptCard
            icon={{ name: item.call_type === 'video' ? 'video-camera' : 'headset', tone: item.call_type === 'video' ? 'violet' : 'blue' }}
            title={k(isCaller ? 'consult.calls.outgoing' : 'consult.calls.incoming')}
            subtitle={line}
            status={{ label: k(st.key), tone: st.tone }}
            actions={again ? [{ label: k('consult.calls.callAgain'), tone: 'ink', flex: true, onPress: () => router.push({ pathname: '/consultations/video-call', params: again } as unknown as Href) }] : []}
          />
        );
      }}
    />
  );
}
