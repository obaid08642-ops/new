import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { AppHeader, Avatar, Button, Screen, StickyFooter } from '../../../packages/ui-native/src';
import { goBack } from '../../src/components/consult/ConsultKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { useSocket } from '../../src/context/SocketContext';
import { apiFetch } from '../../src/utils/api';
import { pickLocalized } from '../../src/utils/localize';
import { dateLocaleFor } from '../../src/utils/dates';

/**
 * Chat with the doctor — no board of its own (owner decision, 2026-10-04): the layout stays (header with the doctor and
 * presence, the messages, the input row), drawn with the tokens, the shared header and the translation files. The thread
 * is the booking's (POST /chat/threads/booking), the history is GET /chat/threads/:id/messages, messages are sent with
 * POST /chat/threads/:id/messages and arrive on the socket. None of that changed.
 */

interface Doc {
  user_id?: string;
  account_id?: string;
  name_ar?: string;
  name_en?: string;
  name?: string;
  specialty?: string;
  photo_url?: string;
}
interface ChatMsg {
  id: string;
  sender: 'me' | 'doc';
  text: string;
  time: string;
  pending?: boolean;
  failed?: boolean;
}
interface ServerMsg {
  id?: string;
  _id?: string;
  thread_id?: string;
  sender_role?: string;
  body?: string;
  content?: string;
  text?: string;
  createdAt?: string;
}

export default function ChatWithDoctorScreen() {
  const { doctorId, appointmentId } = useLocalSearchParams();
  const { theme, t, c, flow, lang, dir, k } = useScreenUi();
  const locale = dateLocaleFor(lang);
  const stamp = (at?: string | number | Date) => new Date(at ?? Date.now()).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' });

  const { socket, onlineUsers, sendTyping, joinThread, leaveThread, isConnected } = useSocket();

  const [docData, setDocData] = useState<Doc | null>(null);
  // Real presence: is the doctor's user id currently online? (onlineUsers is a map: userId → bool)
  const docOnline = !!(docData && onlineUsers && onlineUsers[docData.user_id || docData.account_id || '']);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [msg, setMsg] = useState('');
  const [blocked, setBlocked] = useState('');
  const scroller = useRef<ScrollView>(null);

  // LJ-06: chat is always per booking — the appointment's booking thread, not a
  // bare direct thread. The doctor is resolved from the booking server-side.
  const [threadId, setThreadId] = useState('');

  useEffect(() => {
    let cancelled = false;
    setBlocked('');
    if (!appointmentId) {
      setDocData(null);
      setMessages([]);
      setBlocked(k('consult.chat.openFromDetail'));
      return () => {
        cancelled = true;
      };
    }

    // 1) Doctor profile is display-only (name, specialty) — the thread is keyed
    //    by the appointment, so no doctor user id is needed to open it.
    if (doctorId) {
      apiFetch<Doc & { data?: Doc }>(`/care/doctors/${doctorId}`)
        .then((res) => {
          if (!cancelled) setDocData(res?.data || res);
        })
        .catch(() => null);
    }

    // 2) Get-or-create the booking thread for this appointment.
    const appointment = String(appointmentId);
    apiFetch<{ data?: { id?: string; thread_id?: string }; id?: string; thread_id?: string }>(`/chat/threads/booking`, { method: 'POST', body: JSON.stringify({ booking_kind: 'consultation', booking_id: appointment }) })
      .then((tres) => {
        const thread = tres?.data || tres;
        const tid = thread?.id || thread?.thread_id;
        if (!tid || cancelled) return null;
        setThreadId(tid);
        joinThread(tid);
        return apiFetch<{ data?: ServerMsg[] } | ServerMsg[]>(`/chat/threads/${tid}/messages`);
      })
      .then((mres) => {
        if (!mres || cancelled) return;
        const list = (Array.isArray(mres) ? mres : mres?.data) || [];
        setMessages(
          Array.isArray(list)
            ? list.map((m) => ({
                id: String(m.id || m._id),
                sender: m.sender_role === 'provider' || m.sender_role === 'doctor' ? 'doc' : 'me',
                text: m.body || m.content || m.text || '',
                time: m.createdAt ? stamp(m.createdAt) : '',
              }))
            : [],
        );
      })
      .catch(() => {
        if (!cancelled) setBlocked(k('consult.chat.openFailed'));
      });

    return () => {
      cancelled = true;
      setThreadId((current) => {
        if (current) leaveThread(current);
        return current;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, doctorId, isConnected]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (newMsg: ServerMsg) => {
      if (newMsg.thread_id === threadId) {
        const mine = !(newMsg.sender_role === 'provider' || newMsg.sender_role === 'doctor');
        setMessages((prev) => [...prev, { id: newMsg.id || String(Date.now()), sender: mine ? 'me' : 'doc', text: newMsg.body || newMsg.content || '', time: stamp() }]);
      }
    };
    socket.on('chat:message', handleNewMessage);
    return () => {
      socket.off('chat:message', handleNewMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, threadId]);

  const handleTyping = (text: string) => {
    setMsg(text);
    if (threadId) sendTyping(threadId);
  };

  const send = async () => {
    const text = msg.trim();
    if (!text) return;
    if (!threadId) {
      showLocalizedAlert(k('consult.chat.sendFailedTitle'), k('consult.chat.notReady'));
      return;
    }
    const tempId = `tmp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, sender: 'me', text, time: stamp(), pending: true }]);
    setMsg('');
    try {
      await apiFetch(`/chat/threads/${threadId}/messages`, { method: 'POST', body: JSON.stringify({ body: text, type: 'text', client_message_id: tempId }) });
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false } : m)));
    } catch {
      // Honest failure — mark the message as failed instead of pretending it sent
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
      showLocalizedAlert(k('consult.chat.failedTitle'), k('consult.chat.failedBody'));
    }
  };

  const name = pickLocalized(docData?.name_ar, docData?.name_en) || docData?.name || '';

  const header = (
    <View style={COLUMN}>
      <AppHeader title={name || k('consult.chat.title')} onBack={() => goBack()} backLabel={k('consult.back')} theme={theme} direction={dir} />
    </View>
  );
  const footer = (
    <StickyFooter theme={theme} direction={dir}>
      <View style={{ ...COLUMN, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextInput
          accessibilityLabel={k('consult.chat.placeholder')}
          style={{ flex: 1, minHeight: 44, borderRadius: 22, paddingHorizontal: 16, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, color: c.text.primary, ...scale(t, 'small', 'regular'), textAlign: flow.textAlign, writingDirection: dir }}
          placeholder={k('consult.chat.placeholder')}
          placeholderTextColor={c.text.tertiary}
          value={msg}
          editable={!blocked}
          onChangeText={handleTyping}
          onSubmitEditing={() => void send()}
          returnKeyType="send"
        />
        <Button label={k('consult.chat.send')} size="md" disabled={Boolean(blocked) || !msg.trim()} onPress={() => void send()} theme={theme} testID="chat-send" />
      </View>
    </StickyFooter>
  );

  return (
    <Screen theme={theme} direction={dir} header={header} footer={footer} keyboard testID="chat-screen">
      <View style={{ ...COLUMN, flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 8 }}>
          <Avatar name={name} src={docData?.photo_url} size="md" status={docOnline ? 'online' : 'none'} theme={theme} />
          <Text style={{ ...scale(t, 'meta', 'regular'), color: docOnline ? c.status.success.fg : c.text.secondary, ...flow }}>{docOnline ? k('consult.chat.online') : docData?.specialty || ''}</Text>
        </View>
        {blocked ? (
          <View accessibilityRole="alert" style={{ marginHorizontal: 16, padding: 12, borderRadius: 16, backgroundColor: c.status.warning.bg }}>
            <Text style={{ ...scale(t, 'meta', 'regular'), color: c.status.warning.fg, ...flow }}>{blocked}</Text>
          </View>
        ) : null}
        <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {messages.length === 0 && !blocked ? (
            <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.tertiary, textAlign: 'center', marginTop: 24 }}>{k('consult.chat.empty')}</Text>
          ) : (
            messages.map((m) => {
              const mine = m.sender === 'me';
              return (
                <View key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start', opacity: m.pending ? 0.6 : 1 }}>
                  <View style={{ maxWidth: '78%', borderRadius: 18, padding: 12, backgroundColor: m.failed ? c.action.danger.bg : mine ? c.action.primary.bg : c.bg.surface, borderWidth: mine ? 0 : 1, borderColor: c.border.hairline }}>
                    <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 20, color: m.failed ? c.action.danger.fg : mine ? c.action.primary.fg : c.text.primary, ...flow }}>{m.text}</Text>
                    <Text style={{ ...scale(t, 'micro', 'regular'), color: m.failed ? c.action.danger.fg : mine ? c.action.primary.fg : c.text.tertiary, marginTop: 4, ...flow }}>{m.failed ? k('consult.chat.failed') : m.pending ? k('consult.chat.sending') : m.time}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}
