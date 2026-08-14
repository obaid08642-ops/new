// @ts-nocheck
// family/chat.tsx — Family chat (text + voice messages + share reports)
import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  FlatList
} from 'react-native';
import { LocalizedTextInput as TextInput } from '@/components/LocalizedTextInput';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, IconButton } from '../../src/components/ui';

import { apiFetch } from '../../src/utils/api';

interface Message { id: string; text: string; sender: string; time: string; type: 'text' | 'voice' | 'report'; isMe: boolean }

// Messages fetched dynamically

export default function FamilyChatScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [recording, setRecording] = useState(false);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/family/chat/messages');
        setMessages(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  const send = () => {
    if (!msg.trim()) return;
    setMessages(p => [...p, { id: String(Date.now()), text: msg, sender: 'أنت', time: 'الآن', type: 'text', isMe: true }]);
    setMsg('');
  };

  const renderMsg = ({ item }: { item: Message }) => (
    <View style={[st.msgWrap, { alignItems: item.isMe ? 'flex-start' : 'flex-end' } ]}>
      <View style={[st.msgBubble, {
        backgroundColor: item.isMe ? colors.primary : colors.surfaceSecondary,
        borderBottomLeftRadius: item.isMe ? 4 : 18,
        borderBottomRightRadius: item.isMe ? 18 : 4,
      } ]}>
        {item.type === 'voice' ? (
          <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center' }}>
            <Icon name="mic" size={18} color={item.isMe ? '#fff' : colors.primary} />
            <View style={[st.waveform, { backgroundColor: item.isMe ? 'rgba(255,255,255,0.3)' : colors.border }]} />
            <AppText variant="caption" color={item.isMe ? 'rgba(255,255,255,0.8)' : colors.textTertiary}>0:12</AppText>
          </View>
        ) : item.type === 'report' ? (
          <TouchableOpacity onPress={() => router.push('/reports/view-report')} style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center' }}>
            <Icon name="document" size={18} color={item.isMe ? '#fff' : colors.primary} />
            <AppText variant="labelMD" color={item.isMe ? '#fff' : colors.primary}>{item.text}</AppText>
          </TouchableOpacity>
        ) : (
          <AppText variant="bodySM" color={item.isMe ? '#fff' : colors.textPrimary}>{item.text}</AppText>
        )}
        <AppText variant="caption" color={item.isMe ? 'rgba(255,255,255,0.6)' : colors.textTertiary} style={{ marginTop: 4 }}>{item.time}</AppText>
      </View>
    </View>
  );

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
          <IconButton icon="call" onPress={() => router.push('/family/voice-call')} />
          <IconButton icon="video" onPress={() => router.push({ pathname: '/consultations/video-call', params: { mode: 'video' } })} />
        </View>
        <View style={{ alignItems: 'center' }}>
          <AppText variant="h5">محادثة العائلة</AppText>
          <AppText variant="caption" color={colors.textTertiary}>3 أفراد</AppText>
        </View>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <FlatList data={messages} renderItem={renderMsg} keyExtractor={m => m.id} contentContainerStyle={{ padding: 16, gap: 8 }} inverted={false} />

      {/* Input bar */}
      <View style={[st.inputBar, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight } ]}>
        <TouchableOpacity onPress={send} style={[st.sendBtn, { backgroundColor: colors.primary } ]}>
          <Icon name="send" size={20} color="#fff" />
        </TouchableOpacity>
        <TextInput value={msg} onChangeText={setMsg} placeholder="اكتب رسالة..." placeholderTextColor={colors.textTertiary} style={[st.input, { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]} onSubmitEditing={send} />
        <TouchableOpacity onPress={() => router.push('/reports/hub')} style={st.attachBtn}>
          <Icon name="attach" size={22} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setRecording(!recording)} style={[st.attachBtn, recording && { backgroundColor: colors.error + '20' } ]}>
          <Icon name="mic" size={22} color={recording ? colors.error : colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  msgWrap: { width: '100%' },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 18 },
  waveform: { width: 80, height: 4, borderRadius: 2 },
  inputBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, height: 44, fontWeight: '400', fontSize: 14, textAlign: 'right', writingDirection: 'rtl' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  attachBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
