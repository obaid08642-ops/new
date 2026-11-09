import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput } from 'react-native';
import { useTheme, useLang, useAuth, useToast } from '../../context';
import { NBtn, NHeader } from '../../components/ui';
import { SP, R, FS } from '../../constants';
import client from '../../api/client';
import { BOOKING_THREAD_URL, messagesUrl, orderedMessages, sendBody, threadBody, threadIdOf, type BookingChatKind } from './bookingChat';

// The provider talks to the patient of this booking (lab, radiology). Same thread the patient sees on the booking.
export function BookingChatScreen({ kind, order, onBack }: { kind: BookingChatKind; order: any; onBack: () => void }) {
  const { theme } = useTheme();
  const { isRTL, t } = useLang();
  const { user } = useAuth();
  const { show } = useToast();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    const body = threadBody(kind, order);
    if (!body) { setLoading(false); show(t('bookingChat.openFailed'), 'error'); return; }
    (async () => {
      try {
        const res = await client.post(BOOKING_THREAD_URL, body);
        if (alive) setThreadId(threadIdOf(res.data));
      } catch { if (alive) show(t('bookingChat.openFailed'), 'error'); } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [kind, order?.id]);

  useEffect(() => {
    if (!threadId) return;
    let alive = true;
    const load = async () => {
      try { const res = await client.get(messagesUrl(threadId)); if (alive) setMsgs(orderedMessages(res.data)); } catch { /* keep the last messages */ }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, [threadId]);

  const send = async () => {
    const body = sendBody(msg);
    if (!body || !threadId || sending) return;
    setSending(true);
    try {
      await client.post(messagesUrl(threadId), body);
      const res = await client.get(messagesUrl(threadId));
      setMsgs(orderedMessages(res.data));
      setMsg('');
    } catch { show(t('bookingChat.sendFailed'), 'error'); } finally { setSending(false); }
  };

  const align = isRTL ? 'right' : 'left';
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={t('bookingChat.title')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md }}>
        <View style={{ backgroundColor: theme.warnBg, padding: SP.md, borderRadius: R.md, marginBottom: SP.lg }}>
          <Text style={{ color: theme.warn, fontSize: FS.xs, textAlign: 'center' }}>{t('bookingChat.notice')}</Text>
        </View>
        {loading && <Text style={{ color: theme.textSub, textAlign: 'center' }}>{t('bookingChat.loading')}</Text>}
        {!loading && msgs.length === 0 && <Text style={{ color: theme.textSub, textAlign: 'center' }}>{t('bookingChat.empty')}</Text>}
        {msgs.map((m) => {
          const mine = m.sender_id === (user as any)?.id;
          return (
            <View key={m.id || m._id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', backgroundColor: mine ? theme.primary : theme.surface, padding: SP.md, borderRadius: R.md, maxWidth: '80%' }}>
              <Text style={{ color: mine ? theme.textInv : theme.text, textAlign: align }}>{m.body}</Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', padding: SP.lg, borderTopWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: 'center', gap: SP.md }}>
        <TextInput value={msg} onChangeText={setMsg} placeholder={t('bookingChat.placeholder')} accessibilityLabel={t('bookingChat.placeholder')}
          style={{ flex: 1, backgroundColor: theme.bg, padding: SP.md, borderRadius: R.md, color: theme.text, textAlign: align }} placeholderTextColor={theme.textHint} />
        <NBtn label={t('bookingChat.send')} loading={sending} disabled={sending || !msg.trim()} onPress={send} full={false} />
      </View>
    </View>
  );
}
