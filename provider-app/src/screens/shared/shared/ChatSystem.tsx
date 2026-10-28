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
import { mapThreads, mapMessages } from '../../../utils/chatMap';
import { useUploadsEnabled } from '../../../hooks/useUploadsEnabled';
import { UploadsUnavailable } from '../../../components/UploadsUnavailable';
import { announceScan } from '../../../components/ScanStatusBadge';
import { scanStateOfRequestError, scanOfStored } from '../../../utils/scanRegistry';
import { scanStateOfUpload } from '../../../utils/scanStatus';

export function ChatSystem({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const me = String((user as { id?: string } | null)?.id || '');
  const [loadErr, setLoadErr] = useState(false);

  const fetchChats = useCallback(async () => {
    setLoading(true); setLoadErr(false);
    try {
      // GET /chat/threads answers { threads, total }
      const res = await client.get('/chat/threads');
      setConversations(mapThreads(res.data, me, AR));
    } catch {
      // not "no conversations": the list could not be read
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }, [me, AR]);
  useEffect(() => { void fetchChats(); }, [fetchChats]);

  if (activeChat) {
    return <ChatRoom conv={activeChat} onBack={() => setActiveChat(null)} />;
  }

  const filtered = conversations.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.lastMsg || '').toLowerCase().includes(search.toLowerCase())
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
      ) : loadErr ? (
        <NEmpty title={AR ? 'تعذر تحميل المحادثات' : 'Could not load conversations'} sub={AR ? 'تحقق من الاتصال ثم أعد المحاولة.' : 'Check your connection and try again.'} actionLabel={AR ? 'إعادة المحاولة' : 'Retry'} onAction={() => { void fetchChats(); }} />
      ) : filtered.length === 0 ? (
        <NEmpty title={AR ? 'لا توجد محادثات' : 'No conversations yet'} sub={AR ? 'تظهر هنا محادثات الحجوزات مع المرضى.' : 'Conversations with patients for your bookings appear here.'} />
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
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>{conv.unread}</Text>
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
  const uploadsOn = useUploadsEnabled();
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAttach, setShowAttach] = useState(false);
  const [callType, setCallType] = useState<'audio'|'video'|null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const { user } = useAuth();
  const me = String((user as { id?: string } | null)?.id || '');
  const [loadErr, setLoadErr] = useState(false);
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // GET /chat/threads/:id/messages answers { messages (newest first), has_more }
      const res = await client.get(`/chat/threads/${conv.id}/messages`);
      setMessages(mapMessages(res.data, me, AR));
      setLoadErr(false);
    } catch {
      if (!silent) setLoadErr(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [conv.id, me, AR]);

  useEffect(() => {
    void loadMessages();
    const timer = setInterval(() => { void loadMessages(true); }, 8000);
    return () => clearInterval(timer);
  }, [loadMessages]);

  // The server's own refusal ("the follow-up window ended", "the doctor closed this chat") is the message to show.
  const sendErrorText = (e: unknown): string => {
    const err = e as { response?: { data?: { message?: unknown } }; message?: unknown } | null;
    const m = err?.response?.data?.message ?? err?.message;
    return typeof m === 'string' && m ? m : (AR ? 'تعذر إرسال الرسالة' : 'Could not send the message');
  };

  const sendMsg = async () => {
    const txt = msg.trim();
    if (!txt || sending) return;
    setSending(true);
    try {
      await client.post(`/chat/threads/${conv.id}/messages`, { type: 'text', body: txt, client_message_id: `prov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
      setMsg('');
      await loadMessages(true);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      // keep the typed text: nothing was sent
      show(sendErrorText(e), 'error');
    } finally {
      setSending(false);
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
      // same route the patient app uses: the file goes to the media store for this thread, the message carries its id
      const form = new FormData();
      form.append('file', { uri, name, type: mime } as unknown as Blob);
      form.append('purpose', 'chat');
      form.append('thread_id', conv.id);
      const up = await client.post('/media/upload', form);
      const mediaId = up?.data?.id;
      if (!mediaId) { show(AR ? 'تعذر رفع المرفق' : 'Could not upload attachment', 'error'); return; }
      await client.post(`/chat/threads/${conv.id}/messages`, {
        type: mime.startsWith('image/') ? 'image' : 'file', body: name, media_ids: [mediaId], attachment_mime: mime, attachment_name: name,
        client_message_id: `prov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
      await loadMessages(true);
      // UPLOAD_SCAN=defer: the file is sent; the other side opens it once it has passed its scan
      announceScan(show, lang, scanStateOfUpload(up?.data));
    } catch (e) {
      if (scanStateOfRequestError(e) === 'rejected') { announceScan(show, lang, 'rejected'); return; }
      show(sendErrorText(e), 'error');
    }
  };

 return (
 <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }}
 behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
 {/* Header */}
 <View style={[st.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row' }]}>
 <TouchableOpacity onPress={onBack} style={{ padding: SP.xs }}><I name="back" size={20} color={theme.primary} /></TouchableOpacity>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, flex: 1 }}>
 <NAvatar name={conv?.name ?? '—'} size={40} />
 <View>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{conv?.name ?? '—'}</Text>
 </View>
 </View>

 </View>

 {/* Messages */}
 <ScrollView ref={scrollRef} contentContainerStyle={{ padding: SP.lg, paddingBottom: SP.xxl }}
 showsVerticalScrollIndicator={false}>
 {loadErr && <NEmpty title={AR ? 'تعذر تحميل الرسائل' : 'Could not load the messages'} actionLabel={AR ? 'إعادة المحاولة' : 'Retry'} onAction={() => { void loadMessages(); }} />}
 {!loading && !loadErr && messages.length === 0 && <Text style={{ color: theme.textSub, textAlign: 'center' }}>{AR ? 'لا رسائل بعد' : 'No messages yet'}</Text>}
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
 <Text style={{ fontSize: FS.md, color: isMe ? '#FFF' : theme.text, lineHeight: 22, textAlign: AR ? 'right' : 'left' }}>
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
 {uploadsOn ? (
<TouchableOpacity onPress={() => setShowAttach(true)} style={{ padding: SP.sm }}>
 <I name="plus" size={22} color={theme.primary} />
 </TouchableOpacity>
) : null}
 <TextInput
 style={[st.chatInput, { backgroundColor: theme.surface2, color: theme.text, textAlign: AR ? 'right' : 'left' }]}
 placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'}
 placeholderTextColor={theme.textSub}
 value={msg} onChangeText={setMsg}
 multiline maxLength={2000}
 />

 <TouchableOpacity testID="chat-send" onPress={sendMsg} disabled={!msg.trim() || sending}
 style={[st.sendBtn, { backgroundColor: msg.trim() ? theme.primary : theme.surface2 }]}>
 <I name="forward" size={18} color={msg.trim() ? '#FFF' : theme.textSub} />
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

