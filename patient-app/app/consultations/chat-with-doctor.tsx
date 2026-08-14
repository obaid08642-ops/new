// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { resolveColor, darkColors, lightColors } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';
import { router as expRouter, useLocalSearchParams as expSearchParams } from 'expo-router';
import { useSocket } from '../../src/context/SocketContext';

export default function ChatWithDoctorScreen() {
  const { doctorId } = expSearchParams();
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';

  const { socket, onlineUsers, typingUsers, sendTyping, joinThread, leaveThread, isConnected } = useSocket();

  const [loading, setLoading] = useState(true);
  const [docData, setDocData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  const threadId = doctorId ? `doc_${doctorId}` : '';

  useEffect(() => {
    if (doctorId) {
      apiFetch(`/care/doctors/${doctorId}`)
        .then((res: any) => { setDocData(res?.data || res); setLoading(false); })
        .catch(() => { setDocData(null); setLoading(false); });
      
      apiFetch(`/chat/history/${doctorId}`)
        .then((res: any) => setMessages(res?.data || []))
        .catch(() => setMessages([]));
        
      if (threadId) {
        joinThread(threadId);
      }
    } else {
      setDocData(null);
      setMessages([]);
      setLoading(false);
    }
    
    return () => {
      if (threadId) leaveThread(threadId);
    };
  }, [doctorId, isConnected]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (newMsg: any) => {
      if (newMsg.thread_id === threadId) {
        setMessages(prev => [...prev, { id: newMsg.id, sender: 'doc', text: newMsg.content, time: 'الآن' }]);
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

  const send = () => {
    if (!msg.trim()) return;
    const newMsg = { id: Date.now(), sender: 'me', text: msg, time: 'الآن' };
    setMessages([...messages, newMsg]);
    setMsg('');
    if (doctorId) {
      apiFetch(`/chat/send`, { method: 'POST', body: JSON.stringify({ doctorId, text: newMsg.text }) }).catch(() => {});
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
            <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 22 }}>arrow_forward</Text>
          </TouchableOpacity>
          <View style={{ position: 'relative' }}>
            <View style={[styles.docImgPlaceholder, { backgroundColor: resolveColor('var(--ps)') } ]}>
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 24 }}>person</Text>
            </View>
            <View style={[styles.onlineDot, { backgroundColor: resolveColor('var(--gr)'), borderColor: colors.s }]} />
          </View>
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.n }}>{docData?.name}</Text>
            <Text style={{ fontSize: 9, color: resolveColor('var(--gr)') }}>متصل الآن</Text>
          </View>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: resolveColor('var(--ps)') }]} onPress={() => expRouter.push('/consultations/video-call')}>
            <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 20 }}>call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: resolveColor('var(--ps)') }]} onPress={() => expRouter.push('/consultations/video-call')}>
            <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 20 }}>videocam</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.chatArea}>
        <Text style={{ textAlign: 'center', fontSize: 9, color: colors.t3, marginVertical: 4 }}>اليوم</Text>

        {messages.map((m: any) => m.sender === 'doc' ? (
          <View key={m.id} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, marginBottom: 12 }}>
            <View style={[styles.chatAvatar, { backgroundColor: resolveColor('var(--ps)') } ]}>
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 20 }}>person</Text>
            </View>
            <View style={[styles.docBubble, { backgroundColor: colors.s, borderColor: colors.bd, borderTopLeftRadius: isRTL ? 4 : 14, borderTopRightRadius: isRTL ? 14 : 4 } ]}>
              <Text style={{ fontSize: 12, color: colors.n, lineHeight: 18, textAlign: isRTL ? 'right' : 'left' }}>{m.text}</Text>
              <Text style={{ fontSize: 8, color: colors.t3, textAlign: isRTL ? 'left' : 'right', marginTop: 4 }}>{m.time}</Text>
            </View>
          </View>
        ) : (
          <View key={m.id} style={{ flexDirection: isRTL ? 'row' : 'row-reverse', marginBottom: 12 }}>
            <View style={[styles.myBubble, { backgroundColor: resolveColor('var(--p)'), borderTopRightRadius: isRTL ? 4 : 14, borderTopLeftRadius: isRTL ? 14 : 4 } ]}>
              <Text style={{ fontSize: 12, color: '#fff', lineHeight: 18, textAlign: isRTL ? 'right' : 'left' }}>{m.text}</Text>
              <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', textAlign: isRTL ? 'right' : 'left', marginTop: 4 }}>{m.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputArea, { backgroundColor: colors.s, borderTopColor: colors.bd, paddingBottom: Math.max(insets.bottom, 12) } ]}>
        <TouchableOpacity style={styles.attachBtn}>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 22 }}>add_circle</Text>
        </TouchableOpacity>
        <TextInput 
          style={[styles.input, { backgroundColor: colors.bg, color: colors.n, textAlign: isRTL ? 'right' : 'left' }]}
          placeholder="اكتب رسالة..."
          placeholderTextColor={colors.t3}
          value={msg}
          onChangeText={handleTyping}
          onSubmitEditing={send}
        />
        <TouchableOpacity style={[styles.micBtn, { backgroundColor: resolveColor('var(--p)') }]} onPress={send}>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 21 }}>{msg ? 'send' : 'mic'}</Text>
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
