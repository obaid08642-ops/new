// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth, useTheme } from '../../context';
import { apiFetch } from '../../utils/api';
import { io, Socket } from 'socket.io-client';

export const PharmacyChatResponder = ({ route, navigation }: any) => {
  const { threadId, patientName } = route.params;
  const { theme } = useTheme();
  const [messages, setMessages] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Connect Socket.IO
    const newSocket = io(process.env.EXPO_PUBLIC_BACKEND_URL || API_BASE.replace('/api/v1', ''), {
      transports: ['websocket'],
    });
    setSocket(newSocket);

    // Fetch history
    apiFetch(`/pharmacy/chat/threads/${threadId}/messages`).then(res => {
      setMessages(res.messages || []);
    });

    newSocket.on('pharmacy:message', (incomingMsg: any) => {
      setMessages(prev => [...prev, incomingMsg]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [threadId]);

  const send = () => {
    if (!msg.trim()) return;
    const newMsg = { id: Date.now(), sender: 'pharm', text: msg, time: 'الآن' };
    setMessages(prev => [...prev, newMsg]);
    if (socket) {
      socket.emit('pharmacy:message:send', newMsg);
    }
    setMsg('');
  };

  const sendInvoice = () => {
    const invoiceMsg = { id: Date.now(), sender: 'pharm', type: 'invoice', text: 'تم إنشاء الفاتورة', time: 'الآن' };
    setMessages(prev => [...prev, invoiceMsg]);
    if (socket) socket.emit('pharmacy:message:send', invoiceMsg);
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{color: theme.primary, fontSize: 18}}>رجوع</Text></TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>محادثة مع: {patientName}</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.sender === 'pharm' ? [styles.myBubble, { backgroundColor: theme.primary }] : [styles.theirBubble, { backgroundColor: theme.surface }]]}>
            <Text style={{ color: item.sender === 'pharm' ? '#fff' : theme.text }}>{item.text}</Text>
            {item.type === 'invoice' && <Text style={{ color: '#fff', fontWeight: 'bold', marginTop: 5 }}>فاتورة مرسلة للعميل 🧾</Text>}
          </View>
        )}
        contentContainerStyle={{ padding: 15 }}
      />

      <View style={[styles.inputArea, { borderTopColor: theme.border }]}>
        <TouchableOpacity onPress={sendInvoice} style={[styles.iconBtn, { backgroundColor: theme.orange }]}>
          <Text style={{color: '#fff'}}>🧾</Text>
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
          placeholder="اكتب ردك..."
          placeholderTextColor={theme.textMuted}
          value={msg}
          onChangeText={setMsg}
          onSubmitEditing={send}
        />
        <TouchableOpacity onPress={send} style={[styles.sendBtn, { backgroundColor: theme.primary }]}>
          <Text style={{color: '#fff'}}>إرسال</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: 'bold', marginLeft: 20 },
  bubble: { padding: 12, borderRadius: 12, marginBottom: 10, maxWidth: '80%' },
  myBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 0 },
  theirBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 0 },
  inputArea: { flexDirection: 'row', padding: 15, borderTopWidth: 1, alignItems: 'center' },
  input: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 15, marginHorizontal: 10 },
  sendBtn: { paddingHorizontal: 20, height: 44, justifyContent: 'center', borderRadius: 22 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22 }
});
