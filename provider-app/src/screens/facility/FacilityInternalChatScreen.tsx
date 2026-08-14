import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NScroll } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';

export function FacilityInternalChatScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    client.get('/chat/channels')
      .then(res => setChannels(res.data || []))
      .catch(() => setChannels([]));
  }, [AR]);

  useEffect(() => {
    if (activeChat) {
      client.get(`/chat/messages/${activeChat}`)
        .then(res => setMessages(res.data || []))
        .catch(() => setMessages([]));
    }
  }, [activeChat, AR]);

  const handleSend = async () => {
    if (!inputText.trim() || !activeChat) return;
    try {
      await client.post(`/chat/messages/${activeChat}`, { text: inputText });
      setMessages([...messages, { id: 'm-' + Date.now(), sender: AR ? 'أنت' : 'You', text: inputText, time: 'الآن', isMe: true }]);
      setInputText('');
    } catch (e) {
      show(AR ? 'تعذر إرسال الرسالة' : 'Failed to send', 'error');
    }
  };

  if (activeChat) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <NHeader title={channels.find(c => c.id === activeChat)?.name || (AR ? 'محادثة' : 'Chat')} onBack={() => setActiveChat(null)} />
        <NScroll pad>
          {messages.map(msg => (
            <View key={msg.id} style={{ 
              alignSelf: msg.isMe ? 'flex-end' : 'flex-start',
              backgroundColor: msg.isMe ? theme.primary : theme.surface2,
              padding: SP.md, borderRadius: R.md, marginBottom: SP.sm, maxWidth: '80%'
            }}>
              {!msg.isMe && <Text style={{ fontSize: FS.xs, fontWeight: FW.bold, color: theme.textSub, marginBottom: 4, textAlign: AR ? 'right' : 'left' }}>{msg.sender}</Text>}
              <Text style={{ fontSize: FS.sm, color: msg.isMe ? '#FFF' : theme.text, textAlign: AR ? 'right' : 'left' }}>{msg.text}</Text>
              <Text style={{ fontSize: 10, color: msg.isMe ? 'rgba(255,255,255,0.7)' : theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>{msg.time}</Text>
            </View>
          ))}
        </NScroll>
        <View style={{ padding: SP.md, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
          <TextInput 
            style={{ flex: 1, backgroundColor: theme.bg, borderRadius: R.full, paddingHorizontal: SP.lg, paddingVertical: SP.sm, color: theme.text, textAlign: AR ? 'right' : 'left' }}
            placeholder={AR ? 'اكتب رسالتك...' : 'Type a message...'}
            placeholderTextColor={theme.textSub}
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity onPress={handleSend} style={{ width: 60, height: 44, borderRadius: R.full, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFF', fontWeight: FW.bold }}>{AR ? 'إرسال' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'التواصل الداخلي' : 'Internal Chat'} onBack={onBack} />
      
      <NScroll pad>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.lg, textAlign: AR ? 'right' : 'left' }}>
          {AR ? 'قنوات التواصل المباشر' : 'Live Channels'}
        </Text>

        {channels.map(ch => (
          <TouchableOpacity key={ch.id} onPress={() => setActiveChat(ch.id)}>
            <NCard style={{ marginBottom: SP.md, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
              <View style={{ width: 50, height: 50, borderRadius: R.full, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>💬</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{ch.name}</Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }} numberOfLines={1}>{ch.lastMessage}</Text>
              </View>
              {ch.unread > 0 && (
                <View style={{ backgroundColor: theme.danger, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: FW.bold }}>{ch.unread}</Text>
                </View>
              )}
            </NCard>
          </TouchableOpacity>
        ))}
      </NScroll>
    </View>
  );
}
