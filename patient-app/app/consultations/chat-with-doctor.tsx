// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { resolveColor, darkColors, lightColors } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';
import { router as expRouter, useLocalSearchParams as expSearchParams } from 'expo-router';
import { useSocket } from '../../src/context/SocketContext';
import { pickLocalized } from '../../src/utils/localize';
import { dateLocale } from '@/utils/dates';
import { LocalizedText } from '../../src/components/LocalizedText';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export default function ChatWithDoctorScreen() {
  const { doctorId, appointmentId } = expSearchParams();
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';

  const { socket, onlineUsers, typingUsers, sendTyping, joinThread, leaveThread, isConnected } = useSocket();

  // Real presence: is the doctor's user id currently online? (onlineUsers is a map: userId → bool)
  const docOnline = !!(docData && onlineUsers && onlineUsers[docData.user_id || docData.account_id]);

  const [loading, setLoading] = useState(true);
  const [docData, setDocData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [blocked, setBlocked] = useState('');

  // LJ-06: chat is always per booking — the appointment's booking thread, not a
  // bare direct thread. The doctor is resolved from the booking server-side.
  const [threadId, setThreadId] = useState('');

  useEffect(() => {
    let cancelled = false;
    setBlocked('');
    if (!appointmentId) {
      setDocData(null);
      setMessages([]);
      setLoading(false);
      setBlocked('افتح المحادثة من تفاصيل الاستشارة حتى نربطها بالحجز.');
      return () => { cancelled = true; };
    }

    // 1) Doctor profile is display-only (name, specialty) — the thread is keyed
    //    by the appointment, so no doctor user id is needed to open it.
    if (doctorId) {
      apiFetch(`/care/doctors/${doctorId}`)
        .then((res: any) => { if (!cancelled) setDocData(res?.data || res); })
        .catch(() => null);
    }

    // 2) Get-or-create the booking thread for this appointment.
    const appointment = String(appointmentId);
    apiFetch(`/chat/threads/booking`, { method: 'POST', body: JSON.stringify({ booking_kind: 'consultation', booking_id: appointment }) })
      .then((tres: any) => {
        const thread = tres?.data || tres;
        const tid = thread?.id || thread?.thread_id;
        if (!tid || cancelled) return null;
        setThreadId(tid);
        joinThread(tid);
        return apiFetch(`/chat/threads/${tid}/messages`);
      })
      .then((mres: any) => {
        if (!mres || cancelled) return;
        const list = mres?.data || mres || [];
        setMessages(Array.isArray(list) ? list.map((m: any) => ({
          id: m.id || m._id,
          sender: (m.sender_role === 'provider' || m.sender_role === 'doctor') ? 'doc' : 'me',
          text: m.body || m.content || m.text || '',
          time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }) : '',
        })) : []);
      })
      .catch(() => {
        if (!cancelled) setBlocked('تعذر فتح المحادثة. تأكد أن الاستشارة بدأت وأنك طرف فيها.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => {
      cancelled = true;
      setThreadId((current) => { if (current) leaveThread(current); return current; });
    };
  }, [appointmentId, doctorId, isConnected]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (newMsg: any) => {
      if (newMsg.thread_id === threadId) {
        const mine = !(newMsg.sender_role === 'provider' || newMsg.sender_role === 'doctor');
        setMessages(prev => [...prev, {
          id: newMsg.id || String(Date.now()),
          sender: mine ? 'me' : 'doc',
          text: newMsg.body || newMsg.content || '',
          time: new Date().toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }),
        }]);
      }
    };
    
    socket.on('chat:message', handleNewMessage);
    return () => {
      socket.off('chat:message', handleNewMessage);
    };
  }, [socket, threadId]);

  const handleTyping = (text: string) => {
    setMsg(text);
    if (threadId) sendTyping(threadId);
  };

  const send = async () => {
    const text = msg.trim();
    if (!text) return;
    if (!threadId) {
      showLocalizedAlert('تعذر الإرسال', 'قناة المحادثة غير جاهزة بعد. حاول بعد لحظات.');
      return;
    }
    const tempId = `tmp-${Date.now()}`;
    const newMsg = { id: tempId, sender: 'me', text, time: new Date().toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }), pending: true };
    setMessages(prev => [...prev, newMsg]);
    setMsg('');
    try {
      await apiFetch(`/chat/threads/${threadId}/messages`, { method: 'POST', body: JSON.stringify({ body: text, type: 'text', client_message_id: tempId }) });
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, pending: false } : m));
    } catch {
      // Honest failure — mark the message as failed instead of pretending it sent
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, pending: false, failed: true } : m));
      showLocalizedAlert('فشل إرسال الرسالة', 'لم تصل رسالتك. تحقق من اتصالك ثم أعد المحاولة.');
    }
  };

  if (loading) return <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center' } ]}><ActivityIndicator color={resolveColor('var(--p)')} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg } ]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.s, borderBottomColor: colors.bd, paddingTop: insets.top + 8 } ]}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 8 }}>
          <TouchableOpacity onPress={() => expRouter.back()} style={styles.iconBtn}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 22 }}>arrow_forward</LocalizedText>
          </TouchableOpacity>
          <View style={{ position: 'relative' }}>
            <View style={[styles.docImgPlaceholder, { backgroundColor: resolveColor('var(--ps)') } ]}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 24 }}>person</LocalizedText>
            </View>
            {docOnline && (
              <View style={[styles.onlineDot, { backgroundColor: resolveColor('var(--gr)'), borderColor: colors.s }]} />
            )}
          </View>
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <LocalizedText style={{ fontSize: 13, fontWeight: '700', color: colors.n }}>{pickLocalized(docData?.name_ar, docData?.name_en) || docData?.name || ''}</LocalizedText>
            <LocalizedText style={{ fontSize: 9, color: docOnline ? resolveColor('var(--gr)') : colors.t3 }}>{docOnline ? 'متصل الآن' : (docData?.specialty || '')}</LocalizedText>
          </View>
        </View>
      </View>

      {!!blocked && (
        <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 14, paddingVertical: 10 }}>
          <LocalizedText style={{ fontSize: 11, color: '#92400E', textAlign: isRTL ? 'right' : 'left' }}>{blocked}</LocalizedText>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.chatArea}>

        {messages.length === 0 && !blocked ? (
          <LocalizedText style={{ fontSize: 11, color: colors.t3, textAlign: 'center', marginTop: 24 }}>
            لا توجد رسائل بعد. ابدأ المحادثة حول هذه الاستشارة.
          </LocalizedText>
        ) : messages.map((m: any) => m.sender === 'doc' ? (
          <View key={m.id} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, marginBottom: 12 }}>
            <View style={[styles.chatAvatar, { backgroundColor: resolveColor('var(--ps)') } ]}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 20 }}>person</LocalizedText>
            </View>
            <View style={[styles.docBubble, { backgroundColor: colors.s, borderColor: colors.bd, borderTopLeftRadius: isRTL ? 4 : 14, borderTopRightRadius: isRTL ? 14 : 4 } ]}>
              <LocalizedText style={{ fontSize: 12, color: colors.n, lineHeight: 18, textAlign: isRTL ? 'right' : 'left' }}>{m.text}</LocalizedText>
              <LocalizedText style={{ fontSize: 8, color: colors.t3, textAlign: isRTL ? 'left' : 'right', marginTop: 4 }}>{m.time}</LocalizedText>
            </View>
          </View>
        ) : (
          <View key={m.id} style={{ flexDirection: isRTL ? 'row' : 'row-reverse', marginBottom: 12, opacity: m.pending ? 0.6 : 1 }}>
            <View style={[styles.myBubble, { backgroundColor: m.failed ? '#B91C1C' : resolveColor('var(--p)'), borderTopRightRadius: isRTL ? 4 : 14, borderTopLeftRadius: isRTL ? 14 : 4 } ]}>
              <LocalizedText style={{ fontSize: 12, color: '#fff', lineHeight: 18, textAlign: isRTL ? 'right' : 'left' }}>{m.text}</LocalizedText>
              <LocalizedText style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', textAlign: isRTL ? 'right' : 'left', marginTop: 4 }}>
                {m.failed ? 'فشل الإرسال' : m.pending ? 'جاري الإرسال...' : m.time}
              </LocalizedText>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputArea, { backgroundColor: colors.s, borderTopColor: colors.bd, paddingBottom: Math.max(insets.bottom, 12) } ]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg, color: colors.n, textAlign: isRTL ? 'right' : 'left' }]}
          placeholder="اكتب رسالة..."
          placeholderTextColor={colors.t3}
          value={msg}
          editable={!blocked}
          onChangeText={handleTyping}
          onSubmitEditing={send}
        />
        <TouchableOpacity disabled={!!blocked} style={[styles.micBtn, { backgroundColor: resolveColor('var(--p)'), opacity: blocked ? 0.5 : 1 }]} onPress={send}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 21 }}>{msg ? 'send' : 'mic'}</LocalizedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1.5, zIndex: 55 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  docImgPlaceholder: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  onlineDot: { position: 'absolute', bottom: 0, left: 0, width: 11, height: 11, borderRadius: 5.5, borderWidth: 2 },
  actionBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },
  chatArea: { padding: 14, paddingBottom: 20 },
  chatAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  docBubble: { borderWidth: 1.5, borderRadius: 14, padding: 11, maxWidth: '75%' },
  myBubble: { borderRadius: 14, padding: 11, maxWidth: '75%' },
  inputArea: { borderTopWidth: 1.5, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  attachBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, height: 40, fontSize: 12 },
  micBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }
});
