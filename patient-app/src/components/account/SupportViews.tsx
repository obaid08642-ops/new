import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Card, EmptyState } from '../../../../packages/ui-native/src';
import { Gate, StatusTag, useConsultFormat } from '../consult/ConsultKit';
import { ChatThread, type ChatMessage } from '../family/ChatThread';
import { Notice, rowsOf, useRemote } from '../health/HealthKit';
import { Glyph } from '../pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { AccountScreen } from './AccountKit';

/**
 * Support (flow screens, merge map section 8): the chat with the support team (GET and POST /support/chat; a photo is uploaded with
 * POST /media/upload and sent as a link) on the chat template, and the list of my requests (GET /support/requests/mine). Nothing is
 * answered by the app: no greeting, no "typing" and no reply is drawn that the server did not send.
 */

const HELP = '/settings/help' as Href;
const QUICK = ['cancelBooking', 'orderProblem', 'refund', 'insurance', 'complaint'] as const;

interface ChatRow { id?: string | number; from?: string; text?: string; time?: string; isBot?: boolean }

export function SupportChatView() {
  const { k } = useScreenUi();
  const { clock } = useConsultFormat();
  const [rows, setRows] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const thread = useRemote(async () => rowsOf<ChatRow>(await apiFetch('/support/chat')), [], 'support:chat');

  useEffect(() => {
    if (!thread.data) return;
    setRows(thread.data.filter((row) => row.text).map((row, i) => ({ id: String(row.id ?? `s${i}`), text: String(row.text), time: row.time, mine: row.from === 'user' || row.isBot === false })));
  }, [thread.data]);

  const send = async (text: string) => {
    const body = text.trim();
    if (!body || sending) return;
    const mine: ChatMessage = { id: `m${Date.now()}`, text: body, time: clock(Date.now()), mine: true };
    setFailed(null);
    setRows((current) => [...current, mine]);
    setDraft('');
    setSending(true);
    try {
      const answer = (await apiFetch('/support/chat', { method: 'POST', body: JSON.stringify({ message: body }) })) as { reply?: string } | null;
      if (answer?.reply) setRows((current) => [...current, { id: `a${Date.now()}`, text: answer.reply as string, time: clock(Date.now()), mine: false }]);
    } catch (e) {
      logError('support:chat-send', e);
      // The message was not delivered: it leaves the thread and goes back into the composer for another try.
      setRows((current) => current.filter((row) => row.id !== mine.id));
      setDraft(body);
      setFailed(k('support.chat.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  const attach = async () => {
    setAttaching(true);
    setFailed(null);
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFailed(k('support.chat.photoPermission'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const form = new FormData();
      form.append('file', { uri: asset.uri, name: asset.fileName || 'attachment.jpg', type: asset.mimeType || 'image/jpeg' } as unknown as Blob);
      form.append('folder', 'support');
      const upload = (await apiFetch('/media/upload', { method: 'POST', body: form })) as { url?: string; data?: { url?: string } } | null;
      const url = upload?.url || upload?.data?.url;
      if (url) await send(k('support.chat.attachment', { url }));
    } catch (e) {
      logError('support:chat-attach', e);
      setFailed(k('support.chat.attachFailed'));
    } finally {
      setAttaching(false);
    }
  };

  return (
    <ChatThread
      title={k('support.chat.title')}
      subtitle={k('support.chat.subtitle')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(HELP))}
      status={thread.status}
      onRetry={() => void thread.reload()}
      messages={rows}
      empty={{ title: k('support.chat.emptyTitle'), body: k('support.chat.emptyBody') }}
      composer={{ value: draft, onChange: setDraft, onSend: () => void send(draft), sending, placeholder: k('support.chat.placeholder'), sendLabel: k('support.chat.send') }}
      quickReplies={QUICK.map((code) => ({ label: k(`support.chat.quick.${code}`), onPress: () => void send(k(`support.chat.quick.${code}`)) }))}
      attach={{ label: k('support.chat.photo'), onPress: () => void attach(), busy: attaching }}
      notice={failed ? <Notice tone="danger" text={failed} /> : undefined}
      testID="support-chat-screen"
    />
  );
}

interface TicketRow { id: string; subject?: string; status?: string; lastUpdate?: string; date?: string }

/** `/support/ticket`: my support requests. A request opens the chat; "New" starts a message to support. */
export function SupportTicketsView() {
  const { k, theme, t, c, flow } = useScreenUi();
  const list = useRemote(async () => rowsOf<TicketRow>(await apiFetch('/support/requests/mine')), [], 'support:tickets');
  const rows = list.data ?? [];
  const chat = () => router.push('/support/chat' as Href);
  return (
    <AccountScreen
      title={k('support.tickets.title')}
      fallback={HELP}
      actions={[{ key: 'new', label: k('support.tickets.new'), icon: <Glyph name="plus" size={20} color={c.icon.primary} />, onPress: chat }]}
      testID="support-tickets-screen"
    >
      <Gate status={list.status} errorTitle={k('support.tickets.loadError')} onRetry={() => void list.reload()}>
        {rows.length === 0 ? (
          <EmptyState icon="headset" tone="mint" title={k('support.tickets.empty')} body={k('support.tickets.emptyBody')} actionLabel={k('support.tickets.new')} onAction={chat} theme={theme} />
        ) : (
          rows.map((row) => (
            <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={[row.subject, row.status, row.date].filter(Boolean).join(', ')} onPress={chat} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })} testID={`ticket-${row.id}`}>
              <Card padding="sm" theme={theme}>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{row.subject || `‎#${String(row.id).slice(-6)}‎`}</Text>
                      <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary, ...flow }}>{`‎#${String(row.id).slice(-6)}‎`}</Text>
                    </View>
                    {row.status ? <StatusTag label={row.status} tone="info" /> : null}
                  </View>
                  {row.date || row.lastUpdate ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                      {row.date ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{row.date}</Text> : <View />}
                      {row.lastUpdate ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, flexShrink: 1, ...flow }}>{k('support.tickets.updated', { when: row.lastUpdate })}</Text> : null}
                    </View>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </Gate>
    </AccountScreen>
  );
}
