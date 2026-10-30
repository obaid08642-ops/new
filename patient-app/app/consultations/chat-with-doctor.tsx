import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Linking, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { AppHeader, Avatar, Button, Screen, StickyFooter } from '../../../packages/ui-native/src';
import { goBack, visitMode, type VisitMode } from '../../src/components/consult/ConsultKit';
import { openFollowUp } from '../../src/components/consult/AppointmentSections';
import { composerRules, followUpTarget, parseThreadPermissions, windowBanner, type ThreadPermissions } from '../../src/components/consult/chatPermissions';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { useSocket } from '../../src/context/SocketContext';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';
import { addIncoming, applyState, confirmSent, fromServer, type ChatMsg, type ServerMsg, type StateEvent } from '../../src/chat/chatState';
import { enqueue, flush, forThread, remove, type OutboxItem } from '../../src/chat/outbox';
import { pickLocalized } from '../../src/utils/localize';
import { dateLocaleFor } from '../../src/utils/dates';

/**
 * Chat with the doctor — no board of its own (owner decision, 2026-10-04): the layout stays (header with the doctor and
 * presence, the messages, the input row), drawn with the tokens, the shared header and the translation files. Decision 24:
 * the thread exists only inside a booking (opened from the appointment page or a notification about it). The thread is the
 * booking's (POST /chat/threads/booking), the history is GET /chat/threads/:id/messages, messages are sent with
 * POST /chat/threads/:id/messages and arrive on the socket. What the composer offers follows the booking type read from
 * GET /care/appointments/:id: an online consultation has text, photo, file and the call; a clinic or home visit has text,
 * photo and file, no call. Photos and files are uploaded through POST /media/upload (purpose chat) and sent as media_ids.
 * Whether the conversation is still open is the server's: a closed thread (is_active false) or a refused send (403 with the
 * server's reason) turns the composer into a read-only note with the follow-up button. The screen never counts hours.
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
interface Thread {
  id?: string;
  thread_id?: string;
  is_active?: boolean;
}

// expo-audio is native: the recorder loads only when a thread allows voice notes
const VoiceNoteButton = React.lazy(() => import('../../src/components/consult/VoiceNoteButton').then((m) => ({ default: m.VoiceNoteButton })));

const newClientId = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default function ChatWithDoctorScreen() {
  const { doctorId, appointmentId } = useLocalSearchParams();
  const { theme, t, c, flow, lang, dir, k, num } = useScreenUi();
  const locale = dateLocaleFor(lang);
  const stamp = (at?: string | number | Date) => new Date(at ?? Date.now()).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' });

  const myId = useSelector((state: { auth: { user: { id?: string } | null } }) => state.auth.user?.id);
  const { socket, onlineUsers, sendTyping, joinThread, leaveThread, isConnected } = useSocket();

  const [docData, setDocData] = useState<Doc | null>(null);
  // Real presence: is the doctor's user id currently online? (onlineUsers is a map: userId → bool)
  const docOnline = !!(docData && onlineUsers && onlineUsers[docData.user_id || docData.account_id || '']);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [msg, setMsg] = useState('');
  const [blocked, setBlocked] = useState('');
  const [mode, setMode] = useState<VisitMode | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [attaching, setAttaching] = useState(false);
  // GET /chat/threads/:id/permissions: the server's rules for this thread (decision 24); null until it answers or if it fails.
  const [perms, setPerms] = useState<ThreadPermissions | null>(null);
  const scroller = useRef<ScrollViewInstance>(null);

  // LJ-06: chat is always per booking — the appointment's booking thread, not a
  // bare direct thread. The doctor is resolved from the booking server-side.
  const [threadId, setThreadId] = useState('');
  const threadRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    setBlocked('');
    setReadOnly(false);
    setPerms(null);
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

    // 1b) The booking type decides the composer (decision 24).
    apiFetch<{ service_type?: string; consultation_type?: string }>(`/care/appointments/${encodeURIComponent(String(appointmentId))}`)
      .then((appt) => {
        if (!cancelled) setMode(visitMode(appt?.service_type || appt?.consultation_type));
      })
      .catch((e) => logError('consultations:chat:appointment', e));

    // 2) Get-or-create the booking thread for this appointment.
    const appointment = String(appointmentId);
    apiFetch<{ data?: Thread } & Thread>(`/chat/threads/booking`, { method: 'POST', body: JSON.stringify({ booking_kind: 'consultation', booking_id: appointment }) })
      .then((tres) => {
        const thread = tres?.data || tres;
        const tid = thread?.id || thread?.thread_id;
        if (!tid || cancelled) return null;
        if (thread?.is_active === false) setReadOnly(true);
        setThreadId(tid);
        threadRef.current = tid;
        joinThread(tid);
        apiFetch<unknown>(`/chat/threads/${encodeURIComponent(tid)}/permissions`)
          .then((p) => {
            const parsed = parseThreadPermissions(p);
            if (!cancelled && parsed) setPerms(parsed);
          })
          .catch((e) => logError('consultations:chat:permissions', e));
        return apiFetch<{ data?: ServerMsg[] } | ServerMsg[]>(`/chat/threads/${tid}/messages`);
      })
      .then((mres) => {
        if (!mres || cancelled) return;
        const list = (Array.isArray(mres) ? mres : mres?.data) || [];
        const loaded = Array.isArray(list) ? list.map((m) => fromServer(m, myId, stamp)) : [];
        // messages written offline that the server does not have yet stay visible as queued
        void forThread(String(threadRef.current)).then((queued) => {
          if (cancelled) return;
          const known = new Set(loaded.map((m) => m.clientId).filter(Boolean));
          const extra: ChatMsg[] = queued
            .filter((q) => !known.has(q.clientId))
            .map((q) => ({ id: q.clientId, clientId: q.clientId, sender: 'me' as const, text: q.type === 'voice' ? '' : q.body, time: stamp(q.createdAt), at: q.createdAt, kind: q.type, queued: true }));
          setMessages([...loaded, ...extra]);
        });
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
      if (newMsg.thread_id !== threadId) return;
      const incoming = fromServer({ ...newMsg, id: newMsg.id || newMsg.msg_id }, myId, stamp);
      setMessages((prev) => addIncoming(prev, incoming));
    };
    const handleState = (ev: StateEvent) => {
      if (ev.thread_id === threadId) setMessages((prev) => applyState(prev, ev, myId));
    };
    socket.on('chat:message', handleNewMessage);
    socket.on('chat:state', handleState);
    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:state', handleState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, threadId]);

  const handleTyping = (text: string) => {
    setMsg(text);
    if (threadId) sendTyping(threadId);
  };

  /** A 403 from the server on a send means the conversation is closed: the server's reason is shown, the composer closes. */
  const closedByServer = (e: unknown) => {
    const text = String(e instanceof Error ? e.message : '');
    if (!text.startsWith('AUTH_ERROR_403')) return false;
    setReadOnly(true);
    if (threadId) {
      apiFetch<unknown>(`/chat/threads/${encodeURIComponent(threadId)}/permissions`)
        .then((p) => setPerms(parseThreadPermissions(p)))
        .catch((e) => logError('consultations:chat:permissions', e));
    }
    setBlocked(text.replace(/^AUTH_ERROR_403:\s*/, ''));
    return true;
  };

  /** One attempt to deliver a queued item: upload the file if it has one, then post with the item's client id (the server keeps one message per id). */
  const deliver = async (item: OutboxItem) => {
    let payload: Record<string, unknown> = { body: item.body, type: item.type };
    if (item.asset) {
      const form = new FormData();
      form.append('file', { uri: item.asset.uri, name: item.asset.name, type: item.asset.mime } as unknown as Blob);
      form.append('purpose', 'chat');
      form.append('thread_id', item.threadId);
      const up = await apiFetch<{ id?: string }>('/media/upload', { method: 'POST', body: form });
      if (!up?.id) throw new Error('upload_failed');
      payload = {
        body: item.type === 'voice' ? '' : item.asset.name,
        type: item.type,
        media_ids: [up.id],
        attachment_mime: item.asset.mime,
        attachment_name: item.asset.name,
        ...(item.asset.size ? { attachment_size: item.asset.size } : {}),
        ...(item.durationSeconds ? { duration_seconds: item.durationSeconds } : {}),
      };
    }
    const res = await apiFetch<{ id?: string; data?: { id?: string } }>(`/chat/threads/${item.threadId}/messages`, { method: 'POST', body: JSON.stringify({ ...payload, client_message_id: item.clientId }) });
    setMessages((prev) => confirmSent(prev, item.clientId, (res?.data || res)?.id));
  };

  /** A failed send: no connection keeps it queued for later; a closed conversation drops it; anything else shows Retry. */
  const sendFailed = (item: OutboxItem, e: unknown) => {
    const offline = e instanceof Error && e.message === 'OFFLINE_ERROR';
    if (offline) {
      setMessages((prev) => prev.map((m) => (m.clientId === item.clientId ? { ...m, pending: false, failed: false, queued: true } : m)));
      return;
    }
    const closed = closedByServer(e);
    if (closed) void remove(item.clientId);
    setMessages((prev) => prev.map((m) => (m.clientId === item.clientId ? { ...m, pending: false, queued: false, failed: true } : m)));
    if (!closed) {
      const media = item.type !== 'text';
      showLocalizedAlert(k(media ? 'consult.chat.attachFailedTitle' : 'consult.chat.failedTitle'), k(media ? 'consult.chat.attachFailedBody' : 'consult.chat.failedBody'));
    }
  };

  const submit = async (item: OutboxItem) => {
    setMessages((prev) => [...prev, { id: item.clientId, clientId: item.clientId, sender: 'me', text: item.type === 'voice' ? '' : item.asset?.name ?? item.body, time: stamp(item.createdAt), at: item.createdAt, kind: item.type, pending: true }]);
    await enqueue(item);
    try {
      await deliver(item);
      await remove(item.clientId);
    } catch (e) {
      sendFailed(item, e);
    }
  };

  const send = async () => {
    const text = msg.trim();
    if (!text) return;
    if (!threadId) {
      showLocalizedAlert(k('consult.chat.sendFailedTitle'), k('consult.chat.notReady'));
      return;
    }
    setMsg('');
    await submit({ clientId: newClientId(), threadId, type: 'text', body: text, createdAt: Date.now(), attempts: 0 });
  };

  /** Sends a picked or recorded file as a message that carries the media id. */
  const sendAsset = async (asset: { uri: string; name: string; mime: string; size?: number }, kind: 'image' | 'file' | 'voice', durationSeconds?: number) => {
    if (!threadId) {
      showLocalizedAlert(k('consult.chat.sendFailedTitle'), k('consult.chat.notReady'));
      return;
    }
    setAttaching(true);
    try {
      await submit({ clientId: newClientId(), threadId, type: kind, body: '', asset, durationSeconds, createdAt: Date.now(), attempts: 0 });
    } finally {
      setAttaching(false);
    }
  };

  /** Tap on a failed message: the same item goes out again with the same client id, so the server never stores it twice. */
  const retry = async (clientId: string) => {
    const item = (await forThread(threadId)).find((i) => i.clientId === clientId);
    if (!item) return;
    setMessages((prev) => prev.map((m) => (m.clientId === clientId ? { ...m, pending: true, failed: false, queued: false } : m)));
    try {
      await deliver(item);
      await remove(clientId);
    } catch (e) {
      sendFailed(item, e);
    }
  };

  // the connection is back (or the thread just opened): queued messages go out in the order they were written
  useEffect(() => {
    if (!threadId || !isConnected) return;
    void flush(threadId, deliver, sendFailed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, isConnected]);

  /** Photo or file: pick, upload to the media store for this thread, then send it as a message that carries the media id. */
  const attach = async (kind: 'image' | 'file') => {
    if (!threadId) {
      showLocalizedAlert(k('consult.chat.sendFailedTitle'), k('consult.chat.notReady'));
      return;
    }
    try {
      let asset: { uri: string; name: string; mime: string; size?: number } | null = null;
      if (kind === 'image') {
        const ImagePicker = await import('expo-image-picker');
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showLocalizedAlert(k('consult.chat.attachFailedTitle'), k('consult.chat.photoPermission'));
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
        const picked = result.canceled ? null : result.assets?.[0];
        if (picked) asset = { uri: picked.uri, name: picked.fileName || 'photo.jpg', mime: picked.mimeType || 'image/jpeg', size: picked.fileSize };
      } else {
        const DocumentPicker = await import('expo-document-picker');
        const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: ['application/pdf', 'image/*'] });
        const picked = result.canceled ? null : result.assets?.[0];
        if (picked) asset = { uri: picked.uri, name: picked.name || 'file.pdf', mime: picked.mimeType || 'application/pdf', size: picked.size };
      }
      if (!asset) return;
      await sendAsset(asset, kind);
    } catch (e) {
      logError('consultations:chat:attach', e);
      showLocalizedAlert(k('consult.chat.attachFailedTitle'), k('consult.chat.attachFailedBody'));
    }
  };

  /** Opens an attachment through the short-lived link the server gives for that media id. */
  const openMedia = async (mediaId: string) => {
    try {
      const res = await apiFetch<{ url?: string }>(`/media/${encodeURIComponent(mediaId)}/url`);
      if (res?.url) await Linking.openURL(res.url);
      else throw new Error('no_url');
    } catch {
      showLocalizedAlert(k('consult.chat.attachFailedTitle'), k('consult.chat.openAttachmentFailed'));
    }
  };

  const name = pickLocalized(docData?.name_ar, docData?.name_en) || docData?.name || '';
  const doctorRef = String(doctorId || '');
  const apptRef = String(appointmentId || '');
  const rules = composerRules(perms, mode === 'online');
  const isReadOnly = readOnly || rules.readOnly;
  const followUp = followUpTarget(perms, doctorRef, apptRef);
  const banner = windowBanner(perms);
  const emergencyHref = `tel:${perms?.emergencyLine ?? '997'}`;

  const header = (
    <View style={COLUMN}>
      <AppHeader title={name || k('consult.chat.title')} onBack={() => goBack()} backLabel={k('consult.back')} theme={theme} direction={dir} />
    </View>
  );
  const iconBtn = (label: string, icon: 'image' | 'file-text' | 'headset', onPress: () => void, testID: string) => (
    <Button label={label} variant="outline" size="sm" startIcon={icon} disabled={attaching || Boolean(blocked && !readOnly)} onPress={onPress} theme={theme} testID={testID} />
  );
  const footer = (
    <StickyFooter theme={theme} direction={dir}>
      <View style={{ ...COLUMN, gap: 8 }}>
        {isReadOnly ? (
          <>
            <Text accessibilityRole="alert" style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.chat.readOnly')}</Text>
            {followUp ? <Button label={k('consult.rx.followUp')} size="md" fullWidth startIcon="calendar-dots" onPress={() => openFollowUp(followUp.doctorId, followUp.appointmentId)} theme={theme} testID="chat-follow-up" /> : null}
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {rules.canAttach ? iconBtn(k('consult.chat.photo'), 'image', () => void attach('image'), 'chat-attach-image') : null}
              {rules.canAttach ? iconBtn(k('consult.chat.file'), 'file-text', () => void attach('file'), 'chat-attach-file') : null}
              {rules.canVoice ? (
                <React.Suspense fallback={null}>
                <VoiceNoteButton
                  disabled={attaching || Boolean(blocked && !readOnly)}
                  startLabel={k('consult.chat.voiceRecord')}
                  stopLabel={k('consult.chat.voiceStop')}
                  onRecorded={(file) => void sendAsset({ uri: file.uri, name: file.name, mime: file.mime }, 'voice', file.durationSeconds)}
                  onDenied={() => showLocalizedAlert(k('consult.chat.attachFailedTitle'), k('consult.chat.voicePermission'))}
                  onError={() => showLocalizedAlert(k('consult.chat.attachFailedTitle'), k('consult.chat.attachFailedBody'))}
                  theme={theme}
                  testID="chat-voice"
                />
                </React.Suspense>
              ) : null}
              {rules.canCall ? iconBtn(k('consult.chat.callDoctor'), 'headset', () => router.push({ pathname: '/consultations/virtual-waiting-room', params: { appointmentId: apptRef } } as unknown as Href), 'chat-call') : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                accessibilityLabel={k('consult.chat.placeholder')}
                style={{ flex: 1, minHeight: 44, borderRadius: 22, paddingHorizontal: 16, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, color: c.text.primary, ...scale(t, 'small', 'regular'), textAlign: flow.textAlign, writingDirection: dir }}
                placeholder={k('consult.chat.placeholder')}
                placeholderTextColor={c.text.tertiary}
                value={msg}
                editable={!blocked && rules.canType}
                onChangeText={handleTyping}
                onSubmitEditing={() => void send()}
                returnKeyType="send"
              />
              <Button label={k('consult.chat.send')} size="md" disabled={Boolean(blocked) || !rules.canType || !msg.trim()} onPress={() => void send()} theme={theme} testID="chat-send" />
            </View>
          </>
        )}
      </View>
    </StickyFooter>
  );

  const attachmentLabel = (kind?: ChatMsg['kind']) => k(kind === 'image' ? 'consult.chat.photo' : kind === 'voice' ? 'consult.chat.voice' : 'consult.chat.file');

  return (
    <Screen theme={theme} direction={dir} header={header} footer={footer} keyboard testID="chat-screen">
      <View style={{ ...COLUMN, flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 8 }}>
          <Avatar name={name} src={docData?.photo_url} size="md" status={docOnline ? 'online' : 'none'} theme={theme} />
          <Text style={{ ...scale(t, 'meta', 'regular'), color: docOnline ? c.status.success.fg : c.text.secondary, ...flow }}>{docOnline ? k('consult.chat.online') : docData?.specialty || ''}</Text>
        </View>
        {/* Decision 24: every thread says what to do in an emergency, with a tap-to-call link */}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={k('consult.chat.emergencyCall')}
          onPress={() => void Linking.openURL(emergencyHref)}
          testID="chat-emergency"
          style={{ minHeight: 44, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: c.status.info.bg, justifyContent: 'center' }}
        >
          <Text style={{ ...scale(t, 'meta', 'bold'), color: c.status.info.fg, ...flow }}>{k('consult.chat.emergency')}</Text>
        </Pressable>
        {banner ? (
          <Text accessibilityRole="summary" testID="chat-window-banner" style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, marginHorizontal: 16, marginBottom: 8, ...flow }}>
            {k(banner.statusKey)}
            {banner.remaining ? ` · ${k(banner.remaining.key, { count: num(banner.remaining.count) })}` : ''}
          </Text>
        ) : null}
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
              const fg = m.failed ? c.action.danger.fg : mine ? c.action.primary.fg : c.text.primary;
              return (
                <View key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start', opacity: m.pending ? 0.6 : 1 }}>
                  <View style={{ maxWidth: '78%', borderRadius: 18, padding: 12, backgroundColor: m.failed ? c.action.danger.bg : mine ? c.action.primary.bg : c.bg.surface, borderWidth: mine ? 0 : 1, borderColor: c.border.hairline }}>
                    {m.kind && m.kind !== 'text' ? (
                      <Pressable accessibilityRole="button" accessibilityLabel={`${attachmentLabel(m.kind)} ${m.text}`.trim()} disabled={!m.mediaId} onPress={() => m.mediaId && void openMedia(m.mediaId)} style={{ minHeight: 44, justifyContent: 'center' }}>
                        <Text style={{ ...scale(t, 'small', 'bold'), color: fg, ...flow }}>{attachmentLabel(m.kind)}</Text>
                        {m.text ? <Text style={{ ...scale(t, 'meta', 'regular'), color: fg, ...flow }}>{m.text}</Text> : null}
                      </Pressable>
                    ) : (
                      <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 20, color: fg, ...flow }}>{m.text}</Text>
                    )}
                    <Text style={{ ...scale(t, 'micro', 'regular'), color: m.failed ? c.action.danger.fg : mine ? c.action.primary.fg : c.text.tertiary, marginTop: 4, ...flow }}>{m.failed ? k('consult.chat.failed') : m.queued ? k('consult.chat.queued') : m.pending ? k('consult.chat.sending') : mine && m.tick ? `${m.time} · ${k(`consult.chat.tick.${m.tick}`)}` : m.time}</Text>
                    {m.failed && m.clientId ? <Pressable accessibilityRole="button" accessibilityLabel={k('consult.chat.retry')} onPress={() => void retry(m.clientId as string)} testID={`chat-retry-${m.clientId}`} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ ...scale(t, 'meta', 'bold'), color: fg, ...flow }}>{k('consult.chat.retry')}</Text></Pressable> : null}
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
