import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AppHeader, Button, EmptyState, ErrorState, OfflineState, Screen, StickyFooter } from '../../../packages/ui-native/src';
import { Notice, PHARMACY_TONE, goBack } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch, newIdempotencyKey } from '../../src/utils/api';
import { dateLocaleFor } from '../../src/utils/dates';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';

/**
 * Substitute negotiation chat — no board (chat screens keep their layout; owner 2026-10-04): the tokens, the font and
 * the shared components only. It is the chat of an order: when a pharmacy cannot fill a line it suggests a substitute
 * here (GET /pharmacy/chat/threads?order_id=, GET .../threads/:id/messages). The patient writes
 * (POST .../messages) and accepts, rejects or asks to remove the item (POST .../accept-substitute/:msgId, /reject,
 * /remove-item); none of this changes a price or a payment, a new final price comes from the pharmacy. Opened without
 * an order id (the hub and product links) there is no chat to show, and the screen says so and points to the orders.
 */

type Thread = { id: string; order_id?: string; order_item_id?: string; status?: string; resolution?: string };
type Message = { id: string; text?: string; sender_role?: string; createdAt?: string; substitute_offer?: { name?: string; sku?: string; price?: number; notes?: string } };
type Problem = 'send' | 'decision' | 'blocked' | 'length' | null;

const MAX_LENGTH = 1000;
const RESOLUTIONS = ['accepted', 'rejected', 'removed'];

export default function PharmacistChatScreen() {
  const { theme, t, c, dir, flow, lang, k, num, money } = useScreenUi();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const id = Array.isArray(orderId) ? orderId[0] : orderId;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);
  const [problem, setProblem] = useState<Problem>(null);

  const readMessages = useCallback(async (tid: string) => {
    const response = await apiFetch<{ thread?: Thread; messages?: Message[] }>(`/pharmacy/chat/threads/${tid}/messages`);
    setMessages(Array.isArray(response?.messages) ? response.messages : []);
    setThread(response?.thread ?? null);
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) setLoading(true);
      setFailed(null);
      try {
        const response = await apiFetch<Thread[] | { data?: Thread[] }>(`/pharmacy/chat/threads?order_id=${encodeURIComponent(id)}`);
        const next = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
        setThreads(next);
        const keep = threadId && next.some((x) => x.id === threadId) ? threadId : next[0]?.id || null;
        setThreadId(keep);
        if (keep) await readMessages(keep);
        else {
          setMessages([]);
          setThread(null);
        }
      } catch (e) {
        logError('pharmacy:pharmacist-chat:load', e);
        setFailed((await isOffline()) ? 'offline' : 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, threadId, readMessages],
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per order; a thread change reads its own messages
  }, [id]);

  const act = async (path: string, body: Record<string, unknown> = {}, kind: 'send' | 'decision' = 'decision') => {
    if (!threadId || sending) return false;
    setSending(true);
    setProblem(null);
    try {
      await apiFetch(`/pharmacy/chat/threads/${threadId}${path}`, { method: 'POST', headers: { 'Idempotency-Key': newIdempotencyKey() }, body: JSON.stringify(body) });
      await load(true);
      return true;
    } catch (e) {
      logError('pharmacy:pharmacist-chat:act', e);
      // the backend refuses phone numbers, links and other apps with content_blocked
      setProblem(kind === 'send' && e instanceof Error && e.message.includes('content_blocked') ? 'blocked' : kind);
      return false;
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || body.length > MAX_LENGTH) {
      setProblem('length');
      return;
    }
    if (await act('/messages', { text: body }, 'send')) setText('');
  };

  const selectThread = async (nextId: string) => {
    if (nextId === threadId) return;
    setThreadId(nextId);
    setProblem(null);
    setLoading(true);
    try {
      await readMessages(nextId);
    } catch (e) {
      logError('pharmacy:pharmacist-chat:thread', e);
      setFailed((await isOffline()) ? 'offline' : 'error');
    } finally {
      setLoading(false);
    }
  };

  const header = (
    <View style={COLUMN}>
      <AppHeader title={k('pharmacy.chat.title')} onBack={goBack} backLabel={k('pharmacy.back')} theme={theme} direction={dir} />
    </View>
  );

  if (!id) {
    return (
      <Screen theme={theme} direction={dir} header={header} testID="pharmacist-chat-screen">
        <View style={{ ...COLUMN, flex: 1, justifyContent: 'center', paddingHorizontal: 16 }}>
          <EmptyState icon="chat-circle-text" tone={PHARMACY_TONE} title={k('pharmacy.chat.noOrderTitle')} body={k('pharmacy.chat.noOrderBody')} actionLabel={k('pharmacy.hub.orders')} onAction={() => router.replace('/orders')} theme={theme} />
        </View>
      </Screen>
    );
  }

  const open = thread?.status === 'open';
  const timeOf = (m: Message) => (m.createdAt ? new Date(m.createdAt).toLocaleTimeString(dateLocaleFor(lang), { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' }) : '');

  let empty: React.ReactNode;
  if (loading) {
    empty = (
      <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ height: 64, width: i === 1 ? '70%' : '85%', alignSelf: i === 1 ? 'flex-end' : 'flex-start', borderRadius: 16, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
        ))}
      </View>
    );
  } else if (failed === 'offline') {
    empty = <OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />;
  } else if (failed === 'error') {
    empty = <ErrorState title={k('pharmacy.chat.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />;
  } else {
    empty = <EmptyState icon="chat-circle-text" tone={PHARMACY_TONE} title={k('pharmacy.chat.emptyTitle')} body={k('pharmacy.chat.emptyBody')} theme={theme} />;
  }

  const bubble = (item: Message) => {
    if (item.sender_role === 'system') {
      return <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{item.text}</Text>;
    }
    const mine = item.sender_role === 'patient';
    const fg = mine ? c.action.primary.fg : c.text.primary;
    const soft = mine ? c.action.primary.fg : c.text.secondary;
    const offer = item.substitute_offer;
    const price = Number(offer?.price);
    return (
      <View
        accessible
        accessibilityLabel={`${mine ? k('pharmacy.chat.fromYou') : k('pharmacy.chat.fromPharmacy')}: ${item.text || ''}`}
        style={{
          alignSelf: mine ? 'flex-end' : 'flex-start',
          maxWidth: '88%',
          gap: 8,
          borderRadius: 18,
          padding: 12,
          borderWidth: 1,
          backgroundColor: mine ? c.action.primary.bg : c.bg.surface,
          borderColor: mine ? c.action.primary.bg : c.border.subtle,
        }}
      >
        {item.text ? <Text style={{ ...scale(t, 'label', 'regular'), color: fg, ...flow }}>{item.text}</Text> : null}
        {offer ? (
          <View style={{ gap: 6, borderTopWidth: item.text ? 1 : 0, borderTopColor: mine ? c.action.primary.fg : c.border.subtle, paddingTop: item.text ? 8 : 0 }}>
            <Text style={{ ...scale(t, 'small', 'bold'), color: fg, ...flow }}>{k('pharmacy.chat.substitute', { name: offer.name || offer.sku || '' })}</Text>
            {Number.isFinite(price) && offer.price != null ? (
              <Text style={{ ...scale(t, 'meta', 'regular'), color: soft, ...flow }}>{k('pharmacy.chat.substitutePrice', { price: `${money(price)} ${k('pharmacy.currency')}` })}</Text>
            ) : null}
            {!mine && open ? (
              <View style={{ gap: 6, marginTop: 4 }}>
                <Button label={k('pharmacy.chat.accept')} size="sm" fullWidth disabled={sending} onPress={() => void act(`/accept-substitute/${item.id}`)} theme={theme} />
                <Button label={k('pharmacy.chat.reject')} size="sm" variant="outline" fullWidth disabled={sending} onPress={() => void act('/reject')} theme={theme} />
                <Button label={k('pharmacy.chat.removeItem')} size="sm" variant="outline" fullWidth disabled={sending} onPress={() => void act('/remove-item')} theme={theme} />
              </View>
            ) : null}
          </View>
        ) : null}
        {timeOf(item) ? <Text style={{ ...scale(t, 'micro', 'regular'), color: soft, alignSelf: 'flex-end' }}>{timeOf(item)}</Text> : null}
      </View>
    );
  };

  const problemText = problem === 'send' ? k('pharmacy.chat.sendError') : problem === 'decision' ? k('pharmacy.chat.decisionError') : problem === 'blocked' ? k('pharmacy.chat.blocked') : problem === 'length' ? k('pharmacy.chat.length') : '';

  const footer = threadId ? (
    <StickyFooter theme={theme} direction={dir}>
      <View style={{ ...COLUMN, gap: 8 }}>
        {problem ? <Notice tone="danger" icon="warning" title={problemText} /> : null}
        {open ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              editable={!sending}
              maxLength={MAX_LENGTH}
              multiline
              placeholder={k('pharmacy.chat.placeholder')}
              placeholderTextColor={c.text.secondary}
              accessibilityLabel={k('pharmacy.chat.placeholder')}
              style={{ flex: 1, minWidth: 0, maxHeight: 96, minHeight: 44, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: c.border.subtle, backgroundColor: c.bg.surface, color: c.text.primary, ...scale(t, 'input'), textAlign: dir === 'rtl' ? 'right' : 'left' }}
            />
            <Button label={k('pharmacy.chat.sendShort')} loading={sending} disabled={!text.trim()} onPress={() => void send()} testID="chat-send" theme={theme} />
          </View>
        ) : (
          <Text style={{ ...scale(t, 'label', 'medium'), color: c.text.secondary, textAlign: 'center' }}>
            {thread?.resolution && RESOLUTIONS.includes(thread.resolution) ? k(`pharmacy.chat.resolution.${thread.resolution}`) : k('pharmacy.chat.closed')}
          </Text>
        )}
      </View>
    </StickyFooter>
  ) : undefined;

  return (
    <Screen theme={theme} direction={dir} header={header} footer={footer} keyboard testID="pharmacist-chat-screen">
      {threads.length > 1 ? (
        <View style={{ ...COLUMN, flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
          {threads.map((th, i) => (
            <Pressable
              key={th.id}
              accessibilityRole="button"
              accessibilityState={{ selected: th.id === threadId }}
              accessibilityLabel={k('pharmacy.chat.item', { n: num(i + 1) })}
              onPress={() => void selectThread(th.id)}
              style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: th.id === threadId ? c.text.primary : c.border.subtle, backgroundColor: c.bg.surface, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary }}>{k('pharmacy.chat.item', { n: num(i + 1) })}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <FlatList
        style={{ flex: 1 }}
        data={loading || failed ? [] : messages}
        keyExtractor={(m) => m.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor={c.text.primary} />}
        ListHeaderComponent={threadId && !failed ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, textAlign: 'center', paddingBottom: 12 }}>{k('pharmacy.chat.subtitle')}</Text> : null}
        ListEmptyComponent={<View style={{ flex: 1, justifyContent: 'center' }}>{empty}</View>}
        contentContainerStyle={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 10, flexGrow: 1 }}
        renderItem={({ item }) => bubble(item)}
      />
    </Screen>
  );
}
