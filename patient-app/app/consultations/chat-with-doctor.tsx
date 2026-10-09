import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
interface ChatMsg {
  id: string;
  sender: 'me' | 'doc';
  text: string;
  time: string;
  kind?: 'text' | 'image' | 'file' | 'voice';
  mediaId?: string;
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
  type?: string;
  media_ids?: string[];
  createdAt?: string;
}
interface Thread {
  id?: string;
  thread_id?: string;
  is_active?: boolean;
}

const kindOf = (type?: string): ChatMsg['kind'] => (type === 'image' || type === 'file' || type === 'voice' ? type : 'text');

export default function ChatWithDoctorScreen() {
  const { doctorId, appointmentId } = useLocalSearchParams();
  const { theme, t, c, flow, lang, dir, k, num } = useScreenUi();
  const locale = dateLocaleFor(lang);
  const stamp = (at?: string | number | Date) => new Date(at ?? Date.now()).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' });

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
  const scroller = useRef<ScrollView>(null);

  // LJ-06: chat is always per booking — the appointment's booking thread, not a
  // bare direct thread. The doctor is resolved from the booking server-side.
  const [threadId, setThreadId] = useState('');

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
        setMessages(
          Array.isArray(list)
            ? list.map((m) => ({
                id: String(m.id || m._id),
                sender: m.sender_role === 'provider' || m.sender_role === 'doctor' ? 'doc' : 'me',
                text: m.body || m.content || m.text || '',
                time: m.createdAt ? stamp(m.createdAt) : '',
                kind: kindOf(m.type),
                mediaId: m.media_ids?.[0],
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
        setMessages((prev) => [...prev, { id: newMsg.id || String(Date.now()), sender: mine ? 'me' : 'doc', text: newMsg.body || newMsg.content || '', time: stamp(), kind: kindOf(newMsg.type), mediaId: newMsg.media_ids?.[0] }]);
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

  const post = async (body: Record<string, unknown>, tempId: string) => {
    await apiFetch(`/chat/threads/${threadId}/messages`, { method: 'POST', body: JSON.stringify({ ...body, client_message_id: tempId }) });
    setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false } : m)));
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
      await post({ body: text, type: 'text' }, tempId);
    } catch (e) {
      // Honest failure — mark the message as failed instead of pretending it sent
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
      if (!closedByServer(e)) showLocalizedAlert(k('consult.chat.failedTitle'), k('consult.chat.failedBody'));
    }
  };

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
      setAttaching(true);
      const tempId = `tmp-${Date.now()}`;
      setMessages((prev) => [...prev, { id: tempId, sender: 'me', text: asset.name, time: stamp(), kind, pending: true }]);
      try {
        const form = new FormData();
        form.append('file', { uri: asset.uri, name: asset.name, type: asset.mime } as unknown as Blob);
        form.append('purpose', 'chat');
        form.append('thread_id', threadId);
        const up = await apiFetch<{ id?: string }>('/media/upload', { method: 'POST', body: form });
        if (!up?.id) throw new Error('upload_failed');
        await post({ body: asset.name, type: kind, media_ids: [up.id], attachment_mime: asset.mime, attachment_name: asset.name, ...(asset.size ? { attachment_size: asset.size } : {}) }, tempId);
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, mediaId: up.id } : m)));
      } catch (e) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
        if (!closedByServer(e)) showLocalizedAlert(k('consult.chat.attachFailedTitle'), k('consult.chat.attachFailedBody'));
      }
    } catch (e) {
      logError('consultations:chat:attach', e);
      showLocalizedAlert(k('consult.chat.attachFailedTitle'), k('consult.chat.attachFailedBody'));
    } finally {
      setAttaching(false);
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
