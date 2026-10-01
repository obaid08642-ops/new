import { API_BASE } from '../../../constants';
import { buildHeaders } from '../../../security/Security';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppointmentStatus } from '../../../types/contracts';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Switch, TextInput,
 KeyboardAvoidingView, Platform, Linking, ActivityIndicator, Image
} from 'react-native';
import client from '../../../api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NDivider, NPriceInput, NCheckbox
} from '../../../components/ui';
import { I, IBg, RatingStars } from '../../../components/icons';
import { SP, R, FS, FW, C } from '../../../constants';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { resolveImageUri, resolveGallery } from '../../../utils/imageUrl';
import { useInsuranceCatalog } from '../../../api/catalogs';
import { SK, Vault } from '../../../security/Security';
import { tokens, withAlpha } from '../../../theme/tokens';
import { st } from './MedicalDrugIndexScreen';

export function ChatSystem({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);
      try {
        const res = await client.get('/chats/threads');
        const list = Array.isArray(res.data) ? res.data : (res.data?.threads || []);
        setConversations(list.map((t: any) => ({
          id: t.id,
          name: t.name || t.booking_kind || '—',
          lastMsg: t.last_message || '',
          lastAt: t.last_message_at || null,
          raw: t,
        })));
      } catch (err) {
        // API unavailable — show empty state (no demo data in production)
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  if (activeChat) {
    return <ChatRoom conv={activeChat} onBack={() => setActiveChat(null)} />;
  }

  const filtered = conversations.filter(c =>
    (c.name || '').includes(search) || (c.lastMsg || '').includes(search)
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[st.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onBack}><I name="back" size={20} color={theme.primary} /></TouchableOpacity>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{AR ? 'المحادثات' : 'Messages'}</Text>
      </View>

      <View style={{ paddingHorizontal: SP.lg, paddingVertical: SP.md }}>
        <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث في المحادثات...' : 'Search conversations...'} />
      </View>

      {loading ? (
        <View style={{ padding: SP.xl, alignItems: 'center' }}>
          <Text style={{ color: theme.textSub }}>{AR ? 'جاري التحميل...' : 'Loading...'}</Text>
        </View>
      ) : (
        <FlatList data={filtered} keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: SP.lg, paddingBottom: 100 }}
          renderItem={({ item: conv }) => (
            <TouchableOpacity onPress={() => setActiveChat(conv)}
              style={[st.chatRow, { borderBottomColor: theme.border }]}>
              <View style={{ position: 'relative' }}>
                <NAvatar name={conv.name} size={50} online={conv.online} />
              </View>
              <View style={{ flex: 1, marginHorizontal: SP.md }}>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ fontSize: FS.md, fontWeight: conv.unread > 0 ? FW.bold : FW.reg, color: theme.text }}>{conv.name}</Text>
                  <Text style={{ fontSize: FS.xs, color: conv.unread > 0 ? theme.primary : theme.textSub }}>{conv.time}</Text>
                </View>
                <Text style={{ fontSize: FS.sm, color: conv.unread > 0 ? theme.text : theme.textSub, textAlign: AR ? 'right' : 'left' }} numberOfLines={1}>
                  {conv.lastMsg}
                </Text>
              </View>
              {conv.unread > 0 && (
                <View style={[st.unreadBadge, { backgroundColor: theme.primary }]}>
                  <Text style={{ color: 'var(--nabd-bg.surface-light)', fontSize: 10, fontWeight: '700' }}>{conv.unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function ChatRoom({ conv, onBack }: { conv: any; onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAttach, setShowAttach] = useState(false);
  const [callType, setCallType] = useState<'audio'|'video'|null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const fetchMsgs = async () => {
      setLoading(true);
      try {
        const res = await client.get(`/chats/${conv.id}/messages`);
        setMessages(res.data || []);
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMsgs();
  }, [conv.id, AR]);

  const sendMsg = async () => {
    if (!msg.trim()) return;
    const newMsg = { id: Date.now().toString(), text: msg, sender: 'me', time: 'الآن', type: 'text' };
    setMessages(prev => [...prev, newMsg]);
    const txt = msg;
    setMsg('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      await client.post(`/chats/${conv.id}/messages`, { text: txt });
    } catch {
      // optimistic UI send
    }
  };

  const attachFile = async (kind: string) => {
    setShowAttach(false);
    try {
      let uri: string | null = null;
      let mime = 'image/jpeg';
      let name = 'attachment';
      if (kind === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { show(AR ? 'صلاحية الكاميرا مطلوبة' : 'Camera permission required', 'error'); return; }
        const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
        if (res.canceled) return;
        uri = res.assets[0].uri; mime = 'image/jpeg'; name = 'photo.jpg';
      } else {
        const res = await DocumentPicker.getDocumentAsync({ type: kind === 'document' ? '*/*' : 'image/*', copyToCacheDirectory: true });
        if (res.canceled) return;
        uri = res.assets[0].uri; mime = res.assets[0].mimeType || mime; name = res.assets[0].name || name;
      }
      if (!uri) return;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const up = await client.post('/storage/upload', { data_base64: base64, mime, original_name: name });
      const url = up?.data?.url || up?.data?.id;
      if (!url) { show(AR ? 'تعذر رفع المرفق' : 'Could not upload attachment', 'error'); return; }
      const newMsg = { id: Date.now().toString(), text: url, sender: 'me', time: 'الآن', type: 'file' };
      setMessages(prev => [...prev, newMsg]);
      await client.post(`/chats/${conv.id}/messages`, { text: url }).catch(() => null);
    } catch {
      show(AR ? 'تعذر إرفاق الملف' : 'Could not attach file', 'error');
    }
  };

 return (
 <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }}
 behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
 {/* Header */}
 <View style={[st.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row' }]}>
 <TouchableOpacity onPress={onBack} style={{ padding: SP.xs }}><I name="back" size={20} color={theme.primary} /></TouchableOpacity>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, flex: 1 }}>
 <NAvatar name={conv?.name ?? '—'} size={40} online={conv?.online} />
 <View>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{conv?.name ?? '—'}</Text>
 <Text style={{ fontSize: FS.xs, color: conv?.online ? tokens.success : theme.textSub }}>
 {conv?.online ? (AR ? 'متصل الآن' : 'Online') : (AR ? 'غير متصل' : 'Offline')}
 </Text>
 </View>
 </View>

 </View>

 {/* Messages */}
 <ScrollView ref={scrollRef} contentContainerStyle={{ padding: SP.lg, paddingBottom: SP.xxl }}
 showsVerticalScrollIndicator={false}>
 {messages.map(m => {
 const isMe = m.sender === 'me';
 return (
 <View key={m.id} style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: SP.md }}>
 {m.type === 'image' ? (
 <View style={[st.imgBubble, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
 <I name="camera" size={30} color={theme.textSub} />
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: SP.xs }}>{AR ? 'صورة مرفقة' : 'Attached image'}</Text>
 </View>
 ) : (
 <View style={[st.msgBubble, {
 backgroundColor: isMe ? theme.primary : theme.surface2,
 borderBottomRightRadius: isMe ? 4 : R.xl,
 borderBottomLeftRadius: isMe ? R.xl : 4,
 }]}>
 <Text style={{ fontSize: FS.md, color: isMe ? 'var(--nabd-bg.surface-light)' : theme.text, lineHeight: 22, textAlign: AR ? 'right' : 'left' }}>
 {m.text}
 </Text>
 </View>
 )}
 <Text style={{ fontSize: 10, color: theme.textSub, marginTop: 2 }}>{m.time}</Text>
 </View>
 );
 })}
 </ScrollView>

 {/* Input bar */}
 <View style={[st.inputBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
 <TouchableOpacity onPress={() => setShowAttach(true)} style={{ padding: SP.sm }}>
 <I name="plus" size={22} color={theme.primary} />
 </TouchableOpacity>
 <TextInput
 style={[st.chatInput, { backgroundColor: theme.surface2, color: theme.text, textAlign: AR ? 'right' : 'left' }]}
 placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'}
 placeholderTextColor={theme.textSub}
 value={msg} onChangeText={setMsg}
 multiline maxLength={2000}
 />

 <TouchableOpacity onPress={sendMsg} disabled={!msg.trim()}
 style={[st.sendBtn, { backgroundColor: msg.trim() ? theme.primary : theme.surface2 }]}>
 <I name="forward" size={18} color={msg.trim() ? 'var(--nabd-bg.surface-light)' : theme.textSub} />
 </TouchableOpacity>
 </View>

 {/* Attachment sheet */}
 <NSheet visible={showAttach} onClose={() => setShowAttach(false)} title={AR ? 'إرفاق' : 'Attach'} height={280}>
 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.xl, justifyContent: 'center' }}>
 {[
 { name: 'camera', ar: 'كاميرا', en: 'Camera' },
 { name: 'upload', ar: 'صورة', en: 'Photo' },
 { name: 'document', ar: 'ملف', en: 'File' },
 ].map(att => (
 <TouchableOpacity key={att.name} onPress={() => attachFile(att.name)}
 style={{ alignItems: 'center', width: 70 }}>
 <IBg name={att.name} size={22} color={theme.primary} bg={theme.primaryLight} />
 <Text style={{ fontSize: FS.xs, color: theme.text, marginTop: SP.xs }}>{AR ? att.ar : att.en}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </NSheet>
 </KeyboardAvoidingView>
 );
}

// ══════════════════════════════════════════════════════════════════
// Connected to backend Notification APIs

export const NOTIF_TYPES: Record<string, { icon: string; color: string }> = {
 order: { icon: 'document', color: tokens.info },
 result: { icon: 'testTube', color: tokens.purple },
 insurance: { icon: 'shield', color: tokens.success },
 system: { icon: 'settings', color: tokens.textSecondary },
 payment: { icon: 'wallet', color: tokens.warning },
 reminder: { icon: 'clock', color: tokens.pink },
};

