import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useConsultFormat, goBack, type GateStatus } from '../consult/ConsultKit';
import { rowsOf } from '../health/HealthKit';
import { useScreenUi } from '../screen/ScreenKit';
import { isOffline } from '../../utils/isOffline';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { ChatThread, type ChatMessage } from './ChatThread';
import { FAMILY_HUB } from './FamilyKit';

/**
 * The family chat (merge map row D, `/family/chat`, decision 3: no call button): GET /family/chat/messages (polled every
 * 5 s while the screen is open), POST /family/chat/messages, GET /users/me/profile (who "me" is) and GET /family/members
 * (the count under the title). The old /health/family-chat redirects here.
 */

interface Row { id: string; text?: string; sender_id?: string; sender_name?: string; created_at?: string }

export function FamilyChatView() {
  const { k } = useScreenUi();
  const fmt = useConsultFormat();
  const [status, setStatus] = useState<GateStatus>('loading');
  const [rows, setRows] = useState<Row[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const meRef = useRef<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setStatus('loading');
    try {
      setRows(rowsOf<Row>(await apiFetch('/family/chat/messages')));
      setStatus('ready');
    } catch (e) {
      logError('family:chat', e);
      // A failed background poll keeps what is on screen; a failed first load shows the state.
      if (!silent) setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const profile = (await apiFetch('/users/me/profile')) as { user_id?: string } | null;
        meRef.current = profile?.user_id ?? null;
        setMyId(meRef.current);
      } catch (e) {
        logError('family:chat:profile', e);
      }
      try {
        setCount(rowsOf(await apiFetch('/family/members')).length);
      } catch (e) {
        logError('family:chat:members', e);
      }
      await load();
    })();
  }, [load]);

  // New messages arrive while the screen is open.
  useEffect(() => {
    const timer = setInterval(() => void load(true), 5000);
    return () => clearInterval(timer);
  }, [load]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      const res = (await apiFetch('/family/chat/messages', { method: 'POST', body: JSON.stringify({ text }) })) as { id?: string; created_at?: string; data?: { id?: string; created_at?: string } } | null;
      const saved = res?.data ?? res;
      setRows((current) => [...current, { id: saved?.id ?? String(Date.now()), text, sender_id: myId ?? undefined, created_at: saved?.created_at ?? new Date().toISOString() }]);
    } catch (e) {
      logError('family:chat:send', e);
      setDraft(text); // the message is kept for another try
    } finally {
      setSending(false);
    }
  };

  const messages: ChatMessage[] = rows.map((r) => {
    const mine = myId !== null && r.sender_id === myId;
    return { id: r.id, text: r.text ?? '', sender: mine ? undefined : r.sender_name || k('family.chat.member'), time: fmt.clock(r.created_at), mine };
  });

  return (
    <ChatThread
      title={k('family.chat.title')}
      subtitle={count !== null ? k('family.chat.count', { n: count }) : undefined}
      onBack={() => goBack(FAMILY_HUB)}
      status={status}
      onRetry={() => void load()}
      messages={messages}
      empty={{ title: k('family.chat.emptyTitle'), body: k('family.chat.emptyBody') }}
      composer={{ value: draft, onChange: setDraft, onSend: () => void send(), sending, placeholder: k('family.chat.placeholder'), sendLabel: k('family.chat.send') }}
      testID="family-chat"
    />
  );
}
