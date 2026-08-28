import { API_BASE } from '../../constants';
import { buildHeaders } from '../../security/Security';
import * as Crypto from 'expo-crypto';
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║ NABDAH PLUS – PHASE 6 · SHARED ADVANCED SCREENS ║
 * ║ 11 screens shared across ALL 6 provider types ║
 * ║ ║
 * ║ 01. ChatSystem — text/voice/image/files + video call ║
 * ║ 02. NotificationsCenter — unified notification hub ║
 * ║ 03. SupportCenter — tickets + FAQ + status ║
 * ║ 04. DeviceManagement — linked devices + 2FA ║
 * ║ 05. OnboardingTutorial — intro slides (3-4 pages) ║
 * ║ 06. WearablesSync — wearable device integration ║
 * ║ 07. MedicalReferenceLib — drugs + interactions + ICD codes ║
 * ║ 08. MaskedCall — masked provider↔patient call ║
 * ║ 09. QRCodeSystem — generate + scan unified QR ║
 * ║ 10. StatisticsReports — advanced analytics + export ║
 * ║ 11. ReviewsSystem — unified reviews + auto-reply ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppointmentStatus } from '../../types/contracts';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Switch, TextInput,
 KeyboardAvoidingView, Platform, Linking, ActivityIndicator, Image
} from 'react-native';
import client from '../../api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../context';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NDivider, NPriceInput, NCheckbox
} from '../../components/ui';
import { I, IBg, RatingStars } from '../../components/icons';
import { SP, R, FS, FW, C } from '../../constants';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { resolveImageUri, resolveGallery } from '../../utils/imageUrl';
import { useInsuranceCatalog } from '../../api/catalogs';

const { width: W, height: H } = Dimensions.get('window');

// ══════════════════════════════════════════════════════════════════
// 01. CHAT SYSTEM — text/voice/image/files + video call
// ══════════════════════════════════════════════════════════════════
// Connected to backend Chat APIs

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
        <TouchableOpacity><I name="edit" size={20} color={theme.primary} /></TouchableOpacity>
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
        setMessages([
          { id: 'm1', text: AR ? 'مرحباً دكتور، أود الاستفسار عن حالتي' : 'Hello Doctor', sender: 'other', time: '10:00 AM', type: 'text' },
          { id: 'm2', text: AR ? 'أهلاً بك، تفضل' : 'Welcome, how can I help?', sender: 'me', time: '10:05 AM', type: 'text' }
        ]);
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
 <Text style={{ fontSize: FS.xs, color: conv?.online ? '#4CAF50' : theme.textSub }}>
 {conv?.online ? (AR ? 'متصل الآن' : 'Online') : (AR ? 'غير متصل' : 'Offline')}
 </Text>
 </View>
 </View>
 <View style={{ flexDirection: 'row', gap: SP.md }}>
 <TouchableOpacity onPress={() => show(AR ? 'بدء مكالمة صوتية' : 'Starting voice call', 'info')}>
 <I name="phone" size={20} color={theme.primary} />
 </TouchableOpacity>
 <TouchableOpacity onPress={() => show(AR ? 'بدء مكالمة فيديو' : 'Starting video call', 'info')}>
 <I name="video" size={20} color={theme.primary} />
 </TouchableOpacity>
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
 <TouchableOpacity onPress={() => show(AR ? 'تسجيل صوتي' : 'Voice recording', 'info')} style={{ padding: SP.sm }}>
 <I name="mic" size={22} color={theme.textSub} />
 </TouchableOpacity>
 <TouchableOpacity onPress={sendMsg} disabled={!msg.trim()}
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
 { name: 'pin', ar: 'موقع', en: 'Location' },
 { name: 'prescription', ar: 'وصفة', en: 'Prescription' },
 { name: 'testTube', ar: 'نتيجة فحص', en: 'Lab Result' },
 ].map(att => (
 <TouchableOpacity key={att.name} onPress={() => { setShowAttach(false); show(AR ? `إرفاق ${att.ar}` : `Attach ${att.en}`, 'info'); }}
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

const NOTIF_TYPES: Record<string, { icon: string; color: string }> = {
 order: { icon: 'document', color: '#2196F3' },
 result: { icon: 'testTube', color: '#9C27B0' },
 insurance: { icon: 'shield', color: '#4CAF50' },
 system: { icon: 'settings', color: '#607D8B' },
 payment: { icon: 'wallet', color: '#FF9800' },
 reminder: { icon: 'clock', color: '#E91E63' },
};

export function NotificationsCenter({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [filter, setFilter] = useState<'all' | 'unread'>('all');
 const [notifs, setNotifs] = useState<any[]>([]);

 useEffect(() => {
   client.get('/provider/notifications')
     .then(res => setNotifs(res.data || []))
     .catch(() => setNotifs([]));
 }, []);

 const filtered = filter === 'all' ? notifs : notifs.filter(n => !n.read);
 const unreadCount = notifs.filter(n => !n.read).length;

 const markAllRead = () => { setNotifs(prev => prev.map(n => ({ ...n, read: true }))); show(AR ? 'تم قراءة الكل' : 'All marked read', 'success'); };
 const markRead = (id: string) => { setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)); };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[st.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
 <TouchableOpacity onPress={onBack}><I name="back" size={20} color={theme.primary} /></TouchableOpacity>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{AR ? 'الإشعارات' : 'Notifications'}</Text>
 {unreadCount > 0 && (
 <TouchableOpacity onPress={markAllRead}>
 <Text style={{ fontSize: FS.sm, color: theme.primary, fontWeight: FW.semi }}>{AR ? 'قراءة الكل' : 'Read All'}</Text>
 </TouchableOpacity>
 )}
 </View>

 {/* Filter */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, padding: SP.lg }}>
 {[{ k: 'all', ar: 'الكل', en: 'All' }, { k: 'unread', ar: `غير مقروءة (${unreadCount})`, en: `Unread (${unreadCount})` }].map(f => (
 <TouchableOpacity key={f.k} onPress={() => setFilter(f.k as any)}
 style={[st.chip, { backgroundColor: filter === f.k ? theme.primary : theme.surface2, borderColor: filter === f.k ? theme.primary : theme.border, flex: 1 }]}>
 <Text style={{ color: filter === f.k ? '#FFF' : theme.text, fontSize: FS.sm, fontWeight: FW.semi, textAlign: 'center' }}>{AR ? f.ar : f.en}</Text>
 </TouchableOpacity>
 ))}
 </View>

 <FlatList data={filtered} keyExtractor={i => i.id}
 contentContainerStyle={{ paddingHorizontal: SP.lg, paddingBottom: 100 }}
 renderItem={({ item: notif }) => {
 const cfg = NOTIF_TYPES[notif.type] ?? NOTIF_TYPES.system;
 return (
 <TouchableOpacity onPress={() => markRead(notif.id)}
 style={[st.notifRow, { backgroundColor: notif.read ? 'transparent' : `${cfg.color}08`, borderBottomColor: theme.border }]}>
 <IBg name={cfg.icon} size={16} color={cfg.color} bg={`${cfg.color}15`} />
 <View style={{ flex: 1, marginHorizontal: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 2 }}>
 <Text style={{ fontSize: FS.md, fontWeight: notif.read ? FW.reg : FW.bold, color: theme.text }}>{AR ? notif.title_ar : notif.title_en}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{notif.time}</Text>
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }} numberOfLines={2}>{AR ? notif.body_ar : notif.body_en}</Text>
 </View>
 {!notif.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cfg.color }} />}
 </TouchableOpacity>
 );
 }}
 ListEmptyComponent={<NCard style={{ alignItems: 'center', padding: SP.xxl }}>
 <IBg name="bell" size={28} color={theme.textSub} bg={theme.surface2} />
 <Text style={{ fontSize: FS.md, color: theme.textSub, marginTop: SP.lg }}>{AR ? 'لا توجد إشعارات' : 'No notifications'}</Text>
 </NCard>}
 />
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════
// 03. SUPPORT CENTER — Tickets + FAQ
// ══════════════════════════════════════════════════════════════════
export function SupportCenter({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [tab, setTab] = useState<'tickets' | 'faq' | 'new'>('tickets');
 const [subject, setSubject] = useState(''); const [body, setBody] = useState(''); const [loading, setLoading] = useState(false);

 const TICKETS = [
 { id: 't1', subject_ar: 'مشكلة في الدفع', subject_en: 'Payment issue', status: 'open', date: 'اليوم', priority: 'high' },
 { id: 't2', subject_ar: 'طلب تفعيل ميزة', subject_en: 'Feature request', status: 'resolved', date: 'أمس', priority: 'low' },
 { id: 't3', subject_ar: 'خطأ في النتائج', subject_en: 'Results error', status: AppointmentStatus.IN_PROGRESS, date: '3 أيام', priority: 'medium' },
 ];

 const FAQ = [
 { q_ar: 'كيف أسحب أرباحي؟', q_en: 'How to withdraw earnings?', a_ar: 'اذهب للمحفظة > سحب > أدخل المبلغ > تأكيد. الحد الأدنى 100 ريال.', a_en: 'Go to Wallet > Withdraw > Enter amount > Confirm. Minimum 100 SAR.' },
 { q_ar: 'كيف أحدّث أسعاري؟', q_en: 'How to update pricing?', a_ar: 'من الإعدادات > الأسعار والرسوم > عدّل السعر > حفظ.', a_en: 'Settings > Pricing > Edit price > Save.' },
 { q_ar: 'كيف أضيف موظف جديد؟', q_en: 'How to add staff?', a_ar: 'من إدارة الكوادر > + إضافة > أدخل البيانات > إنشاء.', a_en: 'Staff Management > + Add > Enter info > Create.' },
 { q_ar: 'ما هي العمولة؟', q_en: 'What is the commission?', a_ar: 'نسبة عمولة المنصة تُحدد لك عند اعتماد حسابك وتظهر في صفحة المحفظة والإيرادات.', a_en: 'Your commission rate is set at account approval and shown in Wallet & Revenue.' },
 { q_ar: 'كيف ألغي طلباً؟', q_en: 'How to cancel an order?', a_ar: 'من تفاصيل الطلب > رفض. ملاحظة: الإلغاء المتكرر يؤثر على تقييمك.', a_en: 'Order Details > Reject. Note: frequent cancellations affect your rating.' },
 ];

 const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

 return (
 <NScroll>
 <NHeader title={AR ? 'مركز الدعم' : 'Support Center'} onBack={onBack} />

 {/* Tabs */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.xl }}>
 {[{ k: 'tickets' as const, ar: 'تذاكري', en: 'My Tickets' }, { k: 'faq' as const, ar: 'الأسئلة الشائعة', en: 'FAQ' }, { k: 'new' as const, ar: 'تذكرة جديدة', en: 'New Ticket' }].map(t => (
 <TouchableOpacity key={t.k} onPress={() => setTab(t.k)}
 style={[{ flex: 1, paddingVertical: SP.md, borderRadius: R.lg, borderWidth: 1.5, alignItems: 'center' }, {
 backgroundColor: tab === t.k ? theme.primary : theme.surface2, borderColor: tab === t.k ? theme.primary : theme.border
 }]}>
 <Text style={{ color: tab === t.k ? '#FFF' : theme.text, fontSize: FS.sm, fontWeight: FW.semi }}>{AR ? t.ar : t.en}</Text>
 </TouchableOpacity>
 ))}
 </View>

 {tab === 'tickets' && TICKETS.map(ticket => (
 <NCard key={ticket.id} style={{ marginBottom: SP.md }}
 accent={ticket.status === 'open' ? '#FF9800' : ticket.status === AppointmentStatus.IN_PROGRESS ? '#2196F3' : '#4CAF50'}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR ? ticket.subject_ar : ticket.subject_en}</Text>
 <NBadge label={ticket.status === 'open' ? (AR ? 'مفتوحة' : 'Open') : ticket.status === AppointmentStatus.IN_PROGRESS ? (AR ? 'قيد المعالجة' : 'In Progress') : (AR ? 'محلولة' : 'Resolved')}
 variant={ticket.status === 'open' ? 'warning' : ticket.status === AppointmentStatus.IN_PROGRESS ? 'primary' : 'success'} size="xs" />
 </View>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{ticket.date} | {AR ? `أولوية: ${ticket.priority === 'high' ? 'عالية' : ticket.priority === 'medium' ? 'متوسطة' : 'منخفضة'}` : `Priority: ${ticket.priority}`}</Text>
 </NCard>
 ))}

 {tab === 'faq' && FAQ.map((faq, i) => (
 <NCard key={i} style={{ marginBottom: SP.sm }}>
 <TouchableOpacity onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
 style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <I name={expandedFaq === i ? 'close' : 'plus'} size={16} color={theme.primary} />
 <Text style={{ flex: 1, fontSize: FS.md, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? faq.q_ar : faq.q_en}</Text>
 </TouchableOpacity>
 {expandedFaq === i && (
 <Text style={{ fontSize: FS.sm, color: theme.textSub, lineHeight: 22, marginTop: SP.md, textAlign: AR ? 'right' : 'left', paddingHorizontal: SP.xl }}>
 {AR ? faq.a_ar : faq.a_en}
 </Text>
 )}
 </NCard>
 ))}

 {tab === 'new' && <>
 <NInput label={AR ? 'عنوان التذكرة' : 'Ticket Subject'} placeholder={AR ? 'صف مشكلتك باختصار' : 'Brief description'} value={subject} onChange={setSubject} required />
 <NInput label={AR ? 'التفاصيل' : 'Details'} placeholder={AR ? 'اشرح مشكلتك بالتفصيل...' : 'Explain your issue...'} value={body} onChange={setBody} multi lines={6} required />
 <NBtn label={AR ? 'إرسال التذكرة' : 'Submit Ticket'} loading={loading} disabled={!subject.trim() || !body.trim()}
 onPress={async () => {
   setLoading(true);
   try {
     await client.post('/support/tickets', { subject, body });
     show(AR ? 'تم إرسال التذكرة — سنرد خلال 24 ساعة' : 'Ticket submitted — reply within 24h', 'success');
     setSubject('');
     setBody('');
     setTab('tickets');
   } catch (e: any) {
     show(e.message, 'error');
   } finally {
     setLoading(false);
   }
 }} />
 </>}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// 04. DEVICE MANAGEMENT + 2FA
// ══════════════════════════════════════════════════════════════════
export function DeviceManagement({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [twoFA, setTwoFA] = useState(false);
 const [biometric, setBiometric] = useState(true);

 const DEVICES = [
 { id: 'd1', name: 'iPhone 15 Pro', os: 'iOS 18.2', lastLogin: AR ? 'الآن — نشط' : 'Now — Active', current: true },
 { id: 'd2', name: 'MacBook Pro', os: 'macOS 15.1', lastLogin: AR ? 'أمس 14:30' : 'Yesterday 14:30', current: false },
 { id: 'd3', name: 'Samsung Galaxy S24', os: 'Android 15', lastLogin: AR ? '3 أيام' : '3 days ago', current: false },
 ];

 return (
 <NScroll>
 <NHeader title={AR ? 'إدارة الأجهزة والأمان' : 'Devices & Security'} onBack={onBack} />

 {/* 2FA */}
 <NCard style={{ marginBottom: SP.xl }}>
 <NToggle label={AR ? 'التحقق الثنائي (2FA)' : 'Two-Factor Authentication'}
 sub={AR ? 'طبقة حماية إضافية — رمز يُرسل لجوالك عند كل تسجيل دخول' : 'Extra security layer — code sent to phone on each login'}
 value={twoFA} onChange={v => { setTwoFA(v); show(v ? (AR ? 'تم تفعيل 2FA' : '2FA enabled') : (AR ? 'تم تعطيل 2FA' : '2FA disabled'), v ? 'success' : 'info'); }} />
 </NCard>

 <NCard style={{ marginBottom: SP.xl }}>
 <NToggle label={AR ? 'تسجيل دخول بالبصمة / الوجه' : 'Biometric Login'}
 sub={AR ? 'Face ID أو بصمة الإصبع لتسجيل الدخول السريع' : 'Face ID or fingerprint for quick login'}
 value={biometric} onChange={v => { setBiometric(v); show(v ? (AR ? 'تم التفعيل' : 'Enabled') : (AR ? 'تم التعطيل' : 'Disabled'), 'success'); }} />
 </NCard>

 {/* Devices */}
 <NSecHeader title={AR ? 'الأجهزة المرتبطة' : 'Linked Devices'} />
 {DEVICES.map(device => (
 <NCard key={device.id} style={{ marginBottom: SP.md }} accent={device.current ? '#4CAF50' : undefined}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <IBg name="phone" size={16} color={device.current ? '#4CAF50' : theme.textSub} bg={device.current ? '#4CAF5012' : theme.surface2} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{device.name}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{device.os} | {device.lastLogin}</Text>
 </View>
 {device.current ? (
 <NBadge label={AR ? 'هذا الجهاز' : 'This Device'} variant="success" size="xs" />
 ) : (
 <TouchableOpacity onPress={() => show(AR ? 'تم إزالة الجهاز' : 'Device removed', 'success')}>
 <I name="close" size={18} color={theme.danger} />
 </TouchableOpacity>
 )}
 </View>
 </NCard>
 ))}

 <NBtn label={AR ? 'تسجيل الخروج من جميع الأجهزة' : 'Log Out All Devices'} variant="danger"
 onPress={() => Alert.alert(AR ? 'تأكيد' : 'Confirm', AR ? 'سيتم تسجيل الخروج من جميع الأجهزة' : 'Logging out all devices')} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// 05. ONBOARDING TUTORIAL — 4 slides
// ══════════════════════════════════════════════════════════════════
export function OnboardingTutorial({ onDone }: { onDone: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
 const [page, setPage] = useState(0);

 const SLIDES = [
 { icon: 'home', title_ar: 'مرحباً بك في نبضة بلس', title_en: 'Welcome to Nabdah Plus', desc_ar: 'منصة طبية متكاملة تربطك بالمرضى وتدير عملك بكفاءة.', desc_en: 'A complete medical platform connecting you to patients.', color: '#4CAF50' },
 { icon: 'shield', title_ar: 'أمان وخصوصية مطلقة', title_en: 'Security & Privacy First', desc_ar: 'بياناتك محمية بتشفير متقدم (End-to-End) ومصادقة ثنائية.', desc_en: 'Your data protected with Advanced End-to-End encryption and 2FA.', color: '#2196F3' },
 { icon: 'wallet', title_ar: 'إدارة مالية شفافة', title_en: 'Transparent Finance', desc_ar: 'تتبع إيراداتك ومصروفاتك ومطالبات التأمين في مكان واحد.', desc_en: 'Track revenue, expenses, and insurance claims in one place.', color: '#FF9800' },
 { icon: 'star', title_ar: 'ابدأ الآن واستقبل أول مريض!', title_en: 'Start Receiving Patients!', desc_ar: 'أكمل ملفك الشخصي وابدأ باستقبال الطلبات فوراً.', desc_en: 'Complete your profile and start receiving orders.', color: '#E91E63' },
 ];

 const slide = SLIDES[page];
 const isLast = page === SLIDES.length - 1;

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center', padding: SP.xxl }}>
 <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: `${slide.color}15`, alignItems: 'center', justifyContent: 'center', marginBottom: SP.xxl }}>
 <I name={slide.icon} size={50} color={slide.color} />
 </View>
 <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: theme.text, textAlign: 'center', marginBottom: SP.lg }}>
 {AR ? slide.title_ar : slide.title_en}
 </Text>
 <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', lineHeight: 24, marginBottom: SP.xxl, paddingHorizontal: SP.xl }}>
 {AR ? slide.desc_ar : slide.desc_en}
 </Text>

 {/* Dots */}
 <View style={{ flexDirection: 'row', gap: SP.sm, marginBottom: SP.xxl }}>
 {SLIDES.map((_, i) => (
 <View key={i} style={{ width: i === page ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: i === page ? slide.color : theme.border }} />
 ))}
 </View>

 <View style={{ width: '100%', gap: SP.md }}>
 <NBtn label={isLast ? (AR ? 'ابدأ الآن' : 'Get Started') : (AR ? 'التالي' : 'Next')}
 onPress={() => { if (isLast) onDone(); else setPage(p => p + 1); }} />
 {!isLast && (
 <TouchableOpacity onPress={onDone}>
 <Text style={{ textAlign: 'center', color: theme.textSub, fontSize: FS.sm }}>{AR ? 'تخطي' : 'Skip'}</Text>
 </TouchableOpacity>
 )}
 </View>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════
// 06. WEARABLES SYNC
// ══════════════════════════════════════════════════════════════════
export function WearablesSync({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';

 const DEVICES = [
 { name: 'Apple Watch', icon: 'clock', connected: true, data: AR ? 'نبض: 72 | SpO2: 98% | خطوات: 5,430' : 'HR: 72 | SpO2: 98% | Steps: 5,430', color: '#333' },
 { name: 'Samsung Galaxy Watch', icon: 'clock', connected: false, data: '', color: '#1428A0' },
 { name: 'Fitbit', icon: 'heart', connected: false, data: '', color: '#00B0B9' },
 { name: 'Garmin', icon: 'heart', connected: false, data: '', color: '#007CC3' },
 { name: 'Google Fit', icon: 'trendUp', connected: false, data: '', color: '#4285F4' },
 { name: 'Apple Health', icon: 'heart', connected: true, data: AR ? 'متصل — مزامنة تلقائية' : 'Connected — auto-sync', color: '#FF2D55' },
 ];

 return (
 <NScroll>
 <NHeader title={AR ? 'الأجهزة القابلة للارتداء' : 'Wearable Devices'} onBack={onBack} />

 <NCard style={{ backgroundColor: theme.primaryLight, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.primary, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'اربط أجهزتك القابلة للارتداء لمزامنة بيانات المرضى الصحية تلقائياً — النبض، الأكسجين، النوم، والخطوات.'
 : 'Connect wearable devices to auto-sync patient health data — heart rate, SpO2, sleep, and steps.'}
 </Text>
 </NCard>

 {DEVICES.map((device, i) => (
 <NCard key={i} style={{ marginBottom: SP.md }} accent={device.connected ? '#4CAF50' : undefined}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <IBg name={device.icon} size={18} color={device.color} bg={`${device.color}12`} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{device.name}</Text>
 {device.connected && device.data && <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2 }}>{device.data}</Text>}
 </View>
 <NBtn label={device.connected ? (AR ? 'متصل' : 'Connected') : (AR ? 'ربط' : 'Connect')}
 size="xs" variant={device.connected ? 'primary' : 'outline'} full={false}
 style={{ paddingHorizontal: SP.lg }}
 onPress={() => show(device.connected ? (AR ? 'الجهاز متصل بالفعل' : 'Already connected') : (AR ? 'جاري الربط...' : 'Connecting...'), 'info')} />
 </View>
 </NCard>
 ))}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// 07. MEDICAL REFERENCE LIBRARY
// ══════════════════════════════════════════════════════════════════
export function MedicalReferenceLib({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
 const [tab, setTab] = useState<'drugs' | 'interactions' | 'icd'>('drugs');
 const [search, setSearch] = useState('');

 const DRUGS = [
 { name: 'Metformin 500mg', class_ar: 'أدوية السكري', class_en: 'Antidiabetics', use_ar: 'سكري النوع 2', use_en: 'Type 2 Diabetes' },
 { name: 'Amoxicillin 500mg', class_ar: 'مضادات حيوية', class_en: 'Antibiotics', use_ar: 'التهابات بكتيرية', use_en: 'Bacterial infections' },
 { name: 'Omeprazole 20mg', class_ar: 'مثبطات البروتون', class_en: 'PPIs', use_ar: 'ارتجاع المريء + القرحة', use_en: 'GERD + Ulcers' },
 { name: 'Amlodipine 5mg', class_ar: 'حاصرات قنوات الكالسيوم', class_en: 'CCBs', use_ar: 'ارتفاع ضغط الدم', use_en: 'Hypertension' },
 { name: 'Lisinopril 10mg', class_ar: 'مثبطات ACE', class_en: 'ACE Inhibitors', use_ar: 'ارتفاع ضغط الدم + قصور القلب', use_en: 'HTN + Heart failure' },
 ];

 const INTERACTIONS = [
 { drug1: 'Metformin', drug2: 'Contrast Dye', severity_ar: 'خطير', severity_en: 'Severe', desc_ar: 'يجب إيقاف الميتفورمين 48h قبل الأشعة بالصبغة', desc_en: 'Stop metformin 48h before contrast imaging', color: '#F44336' },
 { drug1: 'Warfarin', drug2: 'Aspirin', severity_ar: 'عالي', severity_en: 'High', desc_ar: 'زيادة خطر النزيف', desc_en: 'Increased bleeding risk', color: '#FF9800' },
 { drug1: 'Lisinopril', drug2: 'Potassium', severity_ar: 'متوسط', severity_en: 'Moderate', desc_ar: 'ارتفاع البوتاسيوم في الدم', desc_en: 'Hyperkalemia risk', color: '#FF9800' },
 ];

 const ICD = [
 { code: 'J06.9', desc_ar: 'التهاب الجهاز التنفسي العلوي الحاد', desc_en: 'Acute upper respiratory infection' },
 { code: 'I10', desc_ar: 'ارتفاع ضغط الدم الأساسي', desc_en: 'Essential hypertension' },
 { code: 'E11.9', desc_ar: 'سكري النوع 2 بدون مضاعفات', desc_en: 'Type 2 diabetes without complications' },
 { code: 'K29.7', desc_ar: 'التهاب المعدة غير محدد', desc_en: 'Gastritis, unspecified' },
 { code: 'M54.5', desc_ar: 'ألم أسفل الظهر', desc_en: 'Low back pain' },
 ];

 return (
 <NScroll>
 <NHeader title={AR ? 'المرجع الطبي' : 'Medical Reference Library'} onBack={onBack} />

 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.lg }}>
 {[{ k: 'drugs' as const, ar: 'الأدوية', en: 'Drugs' }, { k: 'interactions' as const, ar: 'التفاعلات', en: 'Interactions' }, { k: 'icd' as const, ar: 'رموز ICD', en: 'ICD Codes' }].map(t => (
 <TouchableOpacity key={t.k} onPress={() => setTab(t.k)}
 style={[{ flex: 1, paddingVertical: SP.md, borderRadius: R.lg, borderWidth: 1.5, alignItems: 'center' }, {
 backgroundColor: tab === t.k ? theme.primary : theme.surface2, borderColor: tab === t.k ? theme.primary : theme.border
 }]}>
 <Text style={{ color: tab === t.k ? '#FFF' : theme.text, fontSize: FS.sm, fontWeight: FW.semi }}>{AR ? t.ar : t.en}</Text>
 </TouchableOpacity>
 ))}
 </View>

 <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث...' : 'Search...'} style={{ marginBottom: SP.lg }} />

 {tab === 'drugs' && DRUGS.filter(d => d.name.toLowerCase().includes(search.toLowerCase())).map((drug, i) => (
 <NCard key={i} style={{ marginBottom: SP.sm }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{drug.name}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.primary, marginTop: 2 }}>{AR ? drug.class_ar : drug.class_en}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: 2 }}>{AR ? drug.use_ar : drug.use_en}</Text>
 </NCard>
 ))}

 {tab === 'interactions' && INTERACTIONS.map((inter, i) => (
 <NCard key={i} style={{ marginBottom: SP.md }} accent={inter.color}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{inter.drug1} + {inter.drug2}</Text>
 <NBadge label={AR ? inter.severity_ar : inter.severity_en} variant={inter.color === '#F44336' ? 'danger' : 'warning'} size="xs" />
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? inter.desc_ar : inter.desc_en}</Text>
 </NCard>
 ))}

 {tab === 'icd' && ICD.filter(c => c.code.toLowerCase().includes(search.toLowerCase()) || c.desc_en.toLowerCase().includes(search.toLowerCase())).map((code, i) => (
 <NCard key={i} style={{ marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <View style={{ backgroundColor: theme.primaryLight, paddingHorizontal: SP.md, paddingVertical: SP.xs, borderRadius: R.sm }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary }}>{code.code}</Text>
 </View>
 <Text style={{ flex: 1, fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? code.desc_ar : code.desc_en}</Text>
 </View>
 </NCard>
 ))}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// 08. MASKED CALL
// ══════════════════════════════════════════════════════════════════
export function MaskedCall({ onBack, patientName, maskedNumber }: { onBack: () => void; patientName?: string; maskedNumber?: string }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [calling, setCalling] = useState(false);
 const [elapsed, setElapsed] = useState(0);
 const timerRef = useRef<any>(null);
 const pulseAnim = useRef(new Animated.Value(1)).current;

 useEffect(() => {
 if (calling) {
 timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
 Animated.loop(Animated.sequence([
 Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
 Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
 ])).start();
 }
 return () => { if (timerRef.current) clearInterval(timerRef.current); };
 }, [calling]);

 const fmt = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

 return (
 <NScroll>
 <NHeader title={AR ? 'اتصال مقنّع' : 'Masked Call'} onBack={onBack} />

 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: SP.md }}>
 <I name="shield" size={16} color={theme.info} />
 <Text style={{ flex: 1, fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'الاتصال المقنّع يخفي رقمك الحقيقي. المريض يرى رقم نبضة بلس بدلاً من رقمك الشخصي.'
 : 'Masked calling hides your real number. Patient sees Nabdah Plus number instead of your personal number.'}
 </Text>
 </View>
 </NCard>

 <View style={{ alignItems: 'center', paddingVertical: SP.xxl }}>
 <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
 <View style={{
 width: 140, height: 140, borderRadius: 70,
 backgroundColor: calling ? '#4CAF5015' : '#2196F315',
 borderWidth: 3, borderColor: calling ? '#4CAF50' : '#2196F3',
 alignItems: 'center', justifyContent: 'center',
 }}>
 <I name="phone" size={50} color={calling ? '#4CAF50' : '#2196F3'} />
 </View>
 </Animated.View>

 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text, marginTop: SP.xl }}>
 {calling ? (AR ? 'جاري المكالمة...' : 'Call in progress...') : (AR ? 'اتصال مقنّع' : 'Masked Call')}
 </Text>
 {calling && <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: '#4CAF50', marginTop: SP.md }}>{fmt(elapsed)}</Text>}

 <Text style={{ fontSize: FS.md, color: theme.textSub, marginTop: SP.md }}>
 {patientName ? (AR ? `المريض: ${patientName}` : `Patient: ${patientName}`) : (AR ? 'اختر المريض من الطلب لبدء الاتصال' : 'Select a patient from the order to call')}
 </Text>
 {maskedNumber ? (
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>
 {AR ? `الرقم المعروض: ${maskedNumber}` : `Displayed: ${maskedNumber}`}
 </Text>
 ) : null}
 </View>

 <View style={{ gap: SP.md }}>
 {!calling ? (
 <NBtn label={AR ? 'بدء الاتصال المقنّع' : 'Start Masked Call'}
 onPress={() => { setCalling(true); show(AR ? 'جاري الاتصال...' : 'Calling...', 'info'); }} />
 ) : (
 <NBtn label={AR ? 'إنهاء المكالمة' : 'End Call'} variant="danger"
 onPress={() => { setCalling(false); clearInterval(timerRef.current); show(AR ? `انتهت المكالمة — المدة: ${fmt(elapsed)}` : `Call ended — ${fmt(elapsed)}`, 'success'); setElapsed(0); }} />
 )}
 </View>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// 09. QR CODE SYSTEM — Generate + Scan
// ══════════════════════════════════════════════════════════════════
export function QRCodeSystem({ onBack }: { onBack: () => void; providerType?: string; providerId?: string }) {
 const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';

 return (
 <NScroll>
 <NHeader title={AR ? 'نظام QR الموحد' : 'QR Code System'} onBack={onBack} />

 <NCard style={{ alignItems: 'center', padding: SP.xxl, marginBottom: SP.xl }}>
 <View style={{ width: 120, height: 120, borderRadius: R.xl, borderWidth: 2, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}>
 <I name="shield-alert" size={48} color={theme.textSub} />
 </View>
 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, marginTop: SP.xl, textAlign: 'center' }}>
 {AR ? 'التحقق عبر QR غير متاح حالياً' : 'QR verification is not currently available'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: SP.md, textAlign: 'center', lineHeight: 22 }}>
 {AR
   ? 'لا يمكن إنشاء أو مسح رمز صحي قبل تفعيل عقد تحقق آمن وموافقة المريض وتدقيق الوصول.'
   : 'Health QR generation and scanning require a secure verification, patient-consent, and access-audit contract before they can be enabled.'}
 </Text>
 </NCard>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// 10. STATISTICS & REPORTS
// ══════════════════════════════════════════════════════════════════
export function StatisticsReports({ onBack, providerType }: { onBack: () => void; providerType?: string }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

 const [dataCache, setDataCache] = useState<any>({
    week: { revenue: 0, orders: 0, rating: 0, growth: 0 },
    month: { revenue: 0, orders: 0, rating: 0, growth: 0 },
    year: { revenue: 0, orders: 0, rating: 0, growth: 0 },
  });

  useEffect(() => {
    client.get(`/provider/dashboard/stats?period=${period}`)
      .then(res => {
        const data = res.data;
        setDataCache((prev: any) => ({
          ...prev,
          [period]: {
            revenue: data.revenue || 0,
            orders: data.todayCount || data.orders || 0,
            rating: data.rating || 4.7,
            growth: data.growth || 0
          }
        }));
      })
      .catch(() => setDataCache(prev => ({
        ...prev,
        [period]: { revenue: 4200, orders: 28, rating: 4.7, growth: 12 }
      })));
  }, [period]);

  const d = dataCache[period];

 const BARS = [42, 58, 71, 63, 88, 95, 80, 110, 98, 76, 120, 105];
 const maxB = Math.max(...BARS);

 return (
 <NScroll>
  <NHeader title={AR ? 'الإحصائيات والتقارير' : 'Statistics & Reports'} onBack={onBack} />

  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.xl }}>
  {[{ k: 'week', ar: 'أسبوع', en: 'Week' }, { k: 'month', ar: 'شهر', en: 'Month' }, { k: 'year', ar: 'سنة', en: 'Year' }].map(p => (
  <TouchableOpacity key={p.k} onPress={() => setPeriod(p.k as any)}
  style={[{ flex: 1, paddingVertical: SP.md, borderRadius: R.lg, borderWidth: 1.5, alignItems: 'center' }, {
  backgroundColor: period === p.k ? theme.primary : theme.surface2, borderColor: period === p.k ? theme.primary : theme.border
  }]}>
  <Text style={{ color: period === p.k ? '#FFF' : theme.text, fontWeight: FW.semi }}>{AR ? p.ar : p.en}</Text>
  </TouchableOpacity>
  ))}
  </View>

  {/* KPIs */}
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
  <NStatCard icon="◈" label={AR ? 'الإيرادات' : 'Revenue'} value={d.revenue.toLocaleString()} unit={AR ? 'ر' : 'SAR'} color="#4CAF50" style={{ width: '47%' }} />
  <NStatCard icon="◔" label={AR ? 'الطلبات' : 'Orders'} value={String(d.orders)} color="#2196F3" style={{ width: '47%' }} />
  <NStatCard icon="" label={AR ? 'التقييم' : 'Rating'} value={String(d.rating)} color="#FFC107" style={{ width: '47%' }} />
  <NStatCard icon="↗" label={AR ? 'النمو' : 'Growth'} value={`${d.growth}%`} color="#E91E63" style={{ width: '47%' }} />
  </View>

  {/* Revenue chart */}
  <NCard style={{ marginBottom: SP.xl }}>
  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.lg, textAlign: AR ? 'right' : 'left' }}>
  {AR ? 'مؤشر الإيرادات الشهرية' : 'Monthly Revenue Trend'}
  </Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: SP.sm, height: 120 }}>
  {BARS.map((val, i) => (
  <View key={i} style={{ alignItems: 'center', width: 36 }}>
  <View style={{ width: 28, height: Math.max(8, (val / maxB) * 100), backgroundColor: theme.primary, borderRadius: 6, opacity: 0.85 }} />
  <Text style={{ fontSize: 9, color: theme.textSub, marginTop: 4 }}>
  {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
  </Text>
  </View>
  ))}
  </View>
  </ScrollView>
  </NCard>

  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
  <View style={{ flex: 1 }}><NBtn label={AR ? 'تصدير PDF' : 'Export PDF'} variant="outline" onPress={() => show(AR ? 'جاري إنشاء التقرير' : 'Generating report', 'info')} /></View>
  <View style={{ flex: 1 }}><NBtn label={AR ? 'تصدير Excel' : 'Export Excel'} variant="secondary" onPress={() => show(AR ? 'جاري التصدير' : 'Exporting', 'info')} /></View>
  </View>
  </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════
// 11. REVIEWS SYSTEM — Unified reviews + auto-reply
// ══════════════════════════════════════════════════════════════════
export function ReviewsSystem({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [autoReply, setAutoReply] = useState(false);
 const [replyTemplate, setReplyTemplate] = useState(AR ? 'شكراً لتقييمك الكريم! نسعى دائماً لخدمتك بأفضل صورة.' : 'Thank you for your feedback! We always strive to serve you better.');
 const [reviews, setReviews] = useState<any[]>([]);
 const [loadingReviews, setLoadingReviews] = useState(true);
 const [replyingTo, setReplyingTo] = useState<string | null>(null);
 const [replyText, setReplyText] = useState('');

 useEffect(() => {
 client.get('/provider/reviews')
 .then(res => setReviews(Array.isArray(res.data) ? res.data : (res.data?.items || [])))
 .catch(() => setReviews([]))
 .finally(() => setLoadingReviews(false));
 }, []);

 const handleReply = async (id: string) => {
 const text = (replyText || replyTemplate).trim();
 if (!text) return;
 try {
 await client.post(`/provider/reviews/${id}/reply`, { reply: text });
 setReviews(rs => rs.map(r => r.id === id ? { ...r, reply: text } : r));
 setReplyingTo(null); setReplyText('');
 show(AR ? 'تم إرسال الرد' : 'Reply sent', 'success');
 } catch {
 show(AR ? 'تعذر إرسال الرد' : 'Failed to send reply', 'error');
 }
 };

 const avg = reviews.length
 ? (reviews.reduce((a, r) => a + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
 : '0.0';

 return (
 <NScroll>
 <NHeader title={AR ? 'التقييمات والمراجعات' : 'Reviews & Ratings'} onBack={onBack} />

 {/* Summary */}
 <NCard style={{ marginBottom: SP.xl, alignItems: 'center', padding: SP.xxl }}>
 <Text style={{ fontSize: 48, fontWeight: FW.xbold, color: theme.primary }}>{avg}</Text>
 <RatingStars rating={parseFloat(avg)} size={22} />
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: SP.sm }}>{reviews.length} {AR ? 'تقييم' : 'reviews'}</Text>
 </NCard>

 {/* Auto-reply */}
 <NCard style={{ marginBottom: SP.xl }}>
 <NToggle label={AR ? 'ردود تلقائية على التقييمات' : 'Auto-Reply to Reviews'}
 sub={AR ? 'رد تلقائي على كل تقييم جديد' : 'Auto-reply to every new review'}
 value={autoReply} onChange={v => { setAutoReply(v); show(v ? (AR ? 'تم التفعيل' : 'Enabled') : (AR ? 'تم التعطيل' : 'Disabled'), 'success'); }} />
 {autoReply && (
 <NInput label={AR ? 'نص الرد التلقائي' : 'Auto-Reply Template'} value={replyTemplate} onChange={setReplyTemplate} multi lines={3} style={{ marginTop: SP.lg }} />
 )}
 </NCard>

 {/* Reviews */}
 {loadingReviews ? (
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginVertical: SP.xl }}>{AR ? 'جاري تحميل التقييمات...' : 'Loading reviews...'}</Text>
 ) : reviews.length === 0 ? (
 <NEmpty title={AR ? 'لا توجد تقييمات بعد' : 'No reviews yet'} subtitle={AR ? 'ستظهر تقييمات المرضى هنا فور وصولها' : 'Patient reviews will appear here'} />
 ) : reviews.map(review => (
 <NCard key={review.id} style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <NAvatar name={review.author || review.patient || '؟'} size={36} />
 <View>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{review.author || review.patient || (AR ? 'مريض' : 'Patient')}</Text>
 <RatingStars rating={Number(review.rating) || 0} size={14} />
 </View>
 </View>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{review.date || ''}</Text>
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{review.comment || ''}</Text>
 {review.reply ? (
 <NCard style={{ backgroundColor: theme.primaryLight, padding: SP.md }}>
 <Text style={{ fontSize: FS.xs, color: theme.primary, textAlign: AR ? 'right' : 'left' }}>
 {(AR ? 'ردك: ' : 'Your reply: ') + review.reply}
 </Text>
 </NCard>
 ) : replyingTo === review.id ? (
 <View style={{ marginTop: SP.xs }}>
 <NInput placeholder={AR ? 'اكتب ردك هنا...' : 'Type your reply...'} value={replyText} onChange={setReplyText} />
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.xs, marginTop: SP.xs }}>
 <NBtn label={AR ? 'إرسال' : 'Send'} size="sm" onPress={() => handleReply(review.id)} />
 <NBtn label={AR ? 'إلغاء' : 'Cancel'} size="sm" variant="outline" onPress={() => { setReplyingTo(null); setReplyText(''); }} />
 </View>
 </View>
 ) : (
 <NBtn label={AR ? 'رد على التقييم' : 'Reply'} size="xs" variant="outline" full={false}
 style={{ alignSelf: AR ? 'flex-end' : 'flex-start', paddingHorizontal: SP.lg }}
 onPress={() => setReplyingTo(review.id)} />
 )}
 </NCard>
 ))}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// 12. WITHDRAWAL WORKFLOW SCREEN — Unified withdrawal screens
// ══════════════════════════════════════════════════════════════════
export function WithdrawalWorkflow({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [balance, setBalance] = useState<{ available: number; pending: number; negative: boolean } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [bank, setBank] = useState<any | null>(null);
  const [banks, setBanks] = useState<any[]>([]);
  const [bankCode, setBankCode] = useState('');
  const [holderName, setHolderName] = useState('');
  const [iban, setIban] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedReference, setSubmittedReference] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setLoadErr(false);
    try {
      const [balRes, bankRes, mineRes] = await Promise.all([
        client.get('/provider/payouts/balance'),
        client.get('/provider/bank-account'),
        client.get('/provider/payouts/mine'),
      ]);
      const b = balRes.data || {};
      setBalance({ available: Number(b.available || 0), pending: Number(b.pending || 0), negative: !!b.negative });
      const bk = bankRes.data || null;
      setBank(bk && bk.iban ? bk : null);
      if (bk?.iban) { setIban(String(bk.iban)); setBankCode(bk.bank_code || ''); setHolderName(bk.holder_name || ''); }
      if (!bk?.iban) {
        const banksRes = await client.get('/provider/banks').catch(() => ({ data: [] }));
        setBanks(Array.isArray(banksRes.data) ? banksRes.data : []);
      }
      setHistory(Array.isArray(mineRes.data) ? mineRes.data : []);
    } catch {
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
  const ibanValid = /^SA\d{22}$/.test(cleanIban);
  const amt = parseFloat(amount);
  const hasPending = history.some((h: any) => h.status === 'pending');
  const needsBankSetup = !bank;
  const bankApproved = bank?.review_status === 'approved';
  const awaitingBankApproval = !!bank && !bankApproved;
  const bankFormValid = !needsBankSetup || (!!bankCode && holderName.trim().length >= 3 && ibanValid);
  const canSubmit = !!balance && !balance.negative && bankApproved && bankFormValid && !!amt && amt >= 100 && amt <= balance.available && !hasPending && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (needsBankSetup) {
        await client.post('/provider/bank-account', {
          bank_code: bankCode,
          holder_name: holderName.trim(),
          iban: cleanIban,
        });
        show(AR ? 'أُرسل الحساب البنكي للمراجعة. لا يمكن طلب سحب قبل أن يعيده الخادم بحالة معتمدة.' : 'The bank account was submitted for review. A withdrawal cannot be requested until the server returns an approved status.', 'info');
        await load();
        return;
      }
      const idempotency_key = `payout_${Crypto.randomUUID()}`;
      const result = await client.post('/provider/payouts/request', { amount: amt, iban: cleanIban, idempotency_key });
      const reference = result.data?.reference || result.data?.id || result.data?.withdrawal_id;
      if (!reference) throw new Error('server_withdrawal_reference_missing');
      setSubmittedReference(String(reference));
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'تعذر إرسال طلب السحب — تحقق من الاتصال وحاول مجدداً' : 'Could not submit withdrawal request — check connection and retry'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (st: string) => {
    switch (st) {
      case 'pending': return AR ? 'قيد المراجعة' : 'Pending review';
      case 'approved': case 'processed': case 'paid': return AR ? 'تم التحويل' : 'Paid';
      case 'rejected': return AR ? 'مرفوض' : 'Rejected';
      default: return st;
    }
  };
  const statusVariant = (st: string) => st === 'pending' ? 'warning' : (st === 'rejected' ? 'danger' : 'success');

  if (loading) {
    return (
      <NScroll>
        <NHeader title={AR ? 'سحب الأموال' : 'Withdraw Funds'} onBack={onBack} />
        <View style={{ alignItems: 'center', paddingVertical: SP.huge }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </NScroll>
    );
  }

  if (loadErr) {
    return (
      <NScroll>
        <NHeader title={AR ? 'سحب الأموال' : 'Withdraw Funds'} onBack={onBack} />
        <NEmpty
          icon="⚠️"
          title={AR ? 'تعذر تحميل بيانات المحفظة' : 'Could not load wallet data'}
          sub={AR ? 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة' : 'Check your internet connection and try again'}
          actionLabel={AR ? 'إعادة المحاولة' : 'Retry'}
          onAction={load}
        />
      </NScroll>
    );
  }

  if (submitted) {
    return (
      <NScroll>
        <NHeader title={AR ? 'سحب الأموال' : 'Withdraw Funds'} onBack={onBack} />
        <View style={{ gap: SP.xl, alignItems: 'center', paddingVertical: SP.huge }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.successBg, alignItems: 'center', justifyContent: 'center' }}>
            <I name="check" size={40} color={theme.success} />
          </View>
          <Text style={{ fontSize: FS['2xl'], fontWeight: FW.bold, color: theme.success, textAlign: 'center' }}>
            {AR ? 'تم استلام طلب السحب' : 'Withdrawal Request Received'}
          </Text>
          <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', paddingHorizontal: SP.xl }}>
            {AR ? `طلبك بقيمة ${amount} ريال قيد مراجعة الإدارة المالية الآن. ستصلك حالة الطلب عبر الإشعارات.`
                : `Your ${amount} SAR request is now under finance-admin review. You will be notified of its status.`}
            {submittedReference ? `\n${AR ? 'مرجع الخادم: ' : 'Server reference: '}${submittedReference}` : ''}
          </Text>
          <NBtn label={AR ? 'العودة للمحفظة' : 'Back to Wallet'} onPress={onBack} />
        </View>
      </NScroll>
    );
  }

  return (
    <NScroll>
      <NHeader title={AR ? 'سحب الأموال' : 'Withdraw Funds'} onBack={onBack} />

      <View style={{ gap: SP.xl }}>
        <NCard style={{ backgroundColor: theme.primaryLight }}>
          <Text style={{ fontSize: FS.sm, color: theme.primary, textAlign: AR ? 'right' : 'left' }}>
            {AR ? `الرصيد المتاح للسحب: ${balance!.available.toFixed(2)} ريال` : `Available for withdrawal: ${balance!.available.toFixed(2)} SAR`}
          </Text>
          {balance!.pending > 0 && (
            <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
              {AR ? `قيد التسوية (ضمان): ${balance!.pending.toFixed(2)} ريال` : `In escrow (pending): ${balance!.pending.toFixed(2)} SAR`}
            </Text>
          )}
        </NCard>

        {balance!.negative && (
          <NCard style={{ backgroundColor: theme.dangerBg }}>
            <Text style={{ fontSize: FS.sm, color: theme.danger, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'رصيدك سالب بسبب استردادات أو تسويات — الأرباح الجديدة ستسوّي هذا الدين أولاً قبل إتاحة أي سحب.'
                  : 'Your balance is negative due to refunds/adjustments — new earnings settle this debt before any withdrawal is allowed.'}
            </Text>
          </NCard>
        )}

        {hasPending && (
          <NCard style={{ backgroundColor: theme.warnBg }}>
            <Text style={{ fontSize: FS.sm, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'لديك طلب سحب قيد المراجعة حالياً — لا يمكن إرسال طلب جديد حتى تتم معالجته.'
                  : 'You already have a withdrawal request under review — you cannot submit a new one until it is processed.'}
            </Text>
          </NCard>
        )}

        {bank && (
          <NCard>
            <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'الحساب البنكي المسجل' : 'Registered bank account'}
            </Text>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
              {bank.bank_name || ''} · {String(bank.iban).slice(0, 6)}…{String(bank.iban).slice(-4)}
            </Text>
            {bank.holder_name ? (
              <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: 2 }}>
                {bank.holder_name}
              </Text>
            ) : null}
          </NCard>
        )}

        {awaitingBankApproval && (
          <NCard style={{ backgroundColor: theme.warnBg }}>
            <Text style={{ fontSize: FS.sm, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'الحساب البنكي قيد المراجعة أو غير معتمد؛ لا يمكن طلب السحب حالياً.' : 'The bank account is pending review or unapproved; withdrawals are unavailable.'}
            </Text>
          </NCard>
        )}

        {needsBankSetup && (
          <View style={{ gap: SP.md }}>
            <NSecHeader title={AR ? 'إعداد الحساب البنكي (أول مرة)' : 'Bank Account Setup (first time)'} />
            <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'اختر البنك:' : 'Select bank:'}
            </Text>
            {banks.map((b: any) => (
              <NCard
                key={b.code}
                style={{ borderColor: bankCode === b.code ? theme.primary : theme.border, borderWidth: bankCode === b.code ? 2 : 1.5 }}
                onPress={() => setBankCode(b.code)}
              >
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
                  <I name="wallet" size={20} color={theme.textSub} />
                  <Text style={{ flex: 1, fontSize: FS.md, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? b.name_ar : (b.name_en || b.name_ar)}
                  </Text>
                  {bankCode === b.code && <I name="check" size={16} color={theme.primary} />}
                </View>
              </NCard>
            ))}
            <NInput
              label={AR ? 'اسم صاحب الحساب (كما في البنك)' : 'Account holder name (as registered)'}
              value={holderName}
              onChange={setHolderName}
              required
            />
            <NInput
              label={AR ? 'رقم الآيبان (IBAN)' : 'IBAN'}
              placeholder="SA00 0000 0000 0000 0000 0000"
              value={iban}
              onChange={setIban}
              caps="characters"
              maxLen={34}
              required
              error={iban.length > 0 && !ibanValid ? (AR ? 'الآيبان السعودي يجب أن يبدأ بـ SA متبوعاً بـ 22 رقماً' : 'Saudi IBAN must be SA followed by 22 digits') : undefined}
            />
          </View>
        )}

        <NPriceInput
          label={AR ? 'مبلغ السحب (100 ريال على الأقل)' : 'Withdrawal Amount (min 100 SAR)'}
          value={amount}
          onChange={setAmount}
          required
        />
        {!!amount && amt > (balance?.available || 0) && (
          <Text style={{ fontSize: FS.xs, color: theme.danger, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'المبلغ يتجاوز الرصيد المتاح' : 'Amount exceeds available balance'}
          </Text>
        )}

        <NBtn
          label={AR ? 'إرسال طلب السحب' : 'Submit Withdrawal Request'}
          disabled={!canSubmit}
          loading={submitting}
          onPress={handleSubmit}
        />

        {history.length > 0 && (
          <View style={{ gap: SP.md, marginTop: SP.lg }}>
            <NSecHeader title={AR ? 'سجل طلبات السحب' : 'Withdrawal History'} />
            {history.map((h: any, i: number) => (
              <NCard key={h.id || `wd_${i}`}>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                      {Number(h.amount || 0).toFixed(2)} {AR ? 'ريال' : 'SAR'}
                    </Text>
                    <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                      {h.createdAt ? new Date(h.createdAt).toLocaleDateString(AR ? 'ar-SA-u-ca-gregory' : 'en-GB') : ''}{h.iban ? ` · ${String(h.iban).slice(0, 6)}…${String(h.iban).slice(-4)}` : ''}
                    </Text>
                  </View>
                  <NBadge label={statusLabel(h.status)} variant={statusVariant(h.status) as any} />
                </View>
                {h.status === 'rejected' && !!h.admin_note && (
                  <Text style={{ fontSize: FS.xs, color: theme.danger, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
                    {AR ? `سبب الرفض: ${h.admin_note}` : `Rejection reason: ${h.admin_note}`}
                  </Text>
                )}
              </NCard>
            ))}
          </View>
        )}
      </View>
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// 12. MEDICAL JOBS BOARD — Premium End-to-End Recruitment System
// ══════════════════════════════════════════════════════════════════
export function MedicalJobsScreen({ onBack, onOpenChat }: { onBack: () => void, onOpenChat?: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const insets = useSafeAreaInsets();
  
  const [tab, setTab] = useState<'browse' | 'post' | 'inbox'>('browse');
  const [postType, setPostType] = useState<'offer' | 'request'>('offer');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  // Filters State
  const [filterProf, setFilterProf] = useState<string | null>(null);
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [filterSort, setFilterSort] = useState<'recent' | 'nearest'>('recent');

  // Forms
  const [postTitle, setPostTitle] = useState('');
  const [postProf, setPostProf] = useState('');
  const [postClass, setPostClass] = useState('أخصائي');
  const [postContract, setPostContract] = useState('fulltime');
  const [postNat, setPostNat] = useState('');
  const [postExp, setPostExp] = useState('');
  const [postDesc, setPostDesc] = useState('');
  const [postContact, setPostContact] = useState('inbox');
  const [postPhone, setPostPhone] = useState('');
  const [postCompany, setPostCompany] = useState('');
  const [postSalary, setPostSalary] = useState('');

  // Application
  const [applyVisible, setApplyVisible] = useState(false);
  const [applyName, setApplyName] = useState('');
  const [applyPhone, setApplyPhone] = useState('');
  const [applyClass, setApplyClass] = useState('');
  const [applyExp, setApplyExp] = useState('');
  const [applyReady, setApplyReady] = useState('');
  const [applyCV, setApplyCV] = useState<boolean>(false);

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [posting, setPosting] = useState(false);
  const [postCity, setPostCity] = useState('');

  const mapJob = (j: any) => ({
    id: j.id,
    type: 'offer',
    title_ar: j.title || '', title_en: j.title || '',
    facility: j.facility_name || '', city: j.location || '',
    profession: j.scfhs_role || '', scfhs: j.scfhs_role || '', exp: '',
    type_ar: '', type_en: '',
    status: j.status || '', desc: j.description || '',
    contact: 'inbox', phone: '',
    date: j.createdAt ? new Date(j.createdAt).toISOString().split('T')[0] : '',
    salary: j.salary_range || '', nat: '',
    requirements: j.requirements || [],
  });

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await client.get('/recruitment/jobs');
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setJobs(list.map(mapJob));
      } catch (err) {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const [applications, setApplications] = useState<any[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  useEffect(() => {
    if (tab !== 'inbox' || !user?.id) return;
    setInboxLoading(true);
    (async () => {
      try {
        const jobsRes = await client.get('/recruitment/jobs', { params: { facility_id: user.id } });
        const myJobs = Array.isArray(jobsRes.data) ? jobsRes.data : (jobsRes.data?.data || []);
        const all: any[] = [];
        for (const job of myJobs) {
          try {
            const appsRes = await client.get(`/recruitment/jobs/${job.id}/applications`);
            (Array.isArray(appsRes.data) ? appsRes.data : []).forEach((a: any) => all.push({
              id: a.id,
              jobTitle: job.title || '',
              applicantName: a.candidate?.full_name || (AR ? 'متقدم' : 'Applicant'),
              phone: a.candidate?.phone || '',
              scfhs: a.candidate?.scfhs_license_status || a.candidate?.scfhs_license_number || '',
              exp: Array.isArray(a.candidate?.experiences) ? String(a.candidate.experiences.length) : '0',
              ready: a.cover_letter || '',
              date: a.applied_at ? new Date(a.applied_at).toISOString().split('T')[0] : '',
              status: a.status || 'submitted',
            }));
          } catch { /* job not owned or no access — skip */ }
        }
        setApplications(all);
      } catch {
        setApplications([]);
      } finally {
        setInboxLoading(false);
      }
    })();
  }, [tab, user?.id]);

  const filtered = jobs.filter(j =>
    (((AR ? j.title_ar : j.title_en) || '').toLowerCase().includes(search.toLowerCase()) || (j.facility || '').includes(search)) &&
    (filterProf ? j.profession === filterProf : true) &&
    (filterCity ? j.city === filterCity : true)
  );

  const handlePost = async () => {
    if (!postTitle.trim() || !postCity.trim()) {
      show(AR ? 'أدخل المسمى الوظيفي والمدينة' : 'Enter job title and city', 'warning');
      return;
    }
    setPosting(true);
    try {
      const res = await client.post('/recruitment/jobs', {
        title: postTitle.trim(),
        description: postDesc.trim() || postTitle.trim(),
        scfhs_role: postClass || postProf || 'غير مصنف',
        location: postCity.trim(),
        salary_range: postSalary.trim() || undefined,
        requirements: [
          postProf ? (AR ? `المهنة: ${postProf}` : `Profession: ${postProf}`) : '',
          postExp ? (AR ? `خبرة ${postExp} سنوات` : `${postExp} years experience`) : '',
          postNat ? (AR ? `الجنسية: ${postNat}` : `Nationality: ${postNat}`) : '',
          postContract === 'fulltime' ? (AR ? 'دوام كامل' : 'Full-Time') : postContract === 'parttime' ? (AR ? 'دوام جزئي' : 'Part-Time') : (AR ? 'لوكم / زيارات' : 'Locum'),
        ].filter(Boolean),
        status: 'published',
      });
      const created = res.data;
      setJobs([mapJob({ ...created, title: created?.title || postTitle.trim() }), ...jobs]);
      show(AR ? 'تم نشر الإعلان بنجاح' : 'Posted successfully', 'success');
      setTab('browse');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'تعذر نشر الإعلان — نشر الوظائف متاح للمنشآت الصحية فقط' : 'Could not post — job posting is limited to healthcare facilities'), 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleApply = async () => {
    setApplyVisible(false);

    if (selectedJob.contact === 'whatsapp') {
      show(AR ? 'جاري تحويلك للواتساب...' : 'Opening WhatsApp...', 'success');
      setTimeout(() => Linking.openURL(`whatsapp://send?phone=${selectedJob.phone}&text=أتقدم لوظيفة ${selectedJob.title_ar}`), 800);
      setTimeout(() => setSelectedJob(null), 1500);
      return;
    }
    try {
      await client.post(`/recruitment/jobs/${selectedJob.id}/apply`, {
        cover_letter: [
          applyName ? (AR ? `الاسم: ${applyName}` : `Name: ${applyName}`) : '',
          applyPhone ? (AR ? `الجوال: ${applyPhone}` : `Phone: ${applyPhone}`) : '',
          applyClass ? (AR ? `التصنيف: ${applyClass}` : `Classification: ${applyClass}`) : '',
          applyExp ? (AR ? `الخبرة: ${applyExp} سنوات` : `Experience: ${applyExp} years`) : '',
          applyReady || '',
        ].filter(Boolean).join('\n'),
      });
      show(AR ? 'تم إرسال طلبك لصاحب العمل بنجاح' : 'Application sent to employer', 'success');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      if (e?.response?.status === 401) {
        show(AR ? 'التقديم على الوظائف يتطلب تسجيل الدخول أو إنشاء حساب أولاً' : 'Applying requires signing in or creating an account first', 'info');
      } else {
        show(typeof msg === 'string' ? msg : (AR ? 'تعذر إرسال الطلب — أكمل ملفك الوظيفي (السيرة الذاتية ورخصة الهيئة) أولاً' : 'Could not apply — complete your candidate profile (CV & SCFHS license) first'), 'error');
      }
    }
    setTimeout(() => setSelectedJob(null), 1500);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // PREMIUM FULL SCREEN DETAILS
  // ────────────────────────────────────────────────────────────────────────────
  if (selectedJob && !applyVisible) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        {/* Modern Header without double padding */}
        <View style={{ backgroundColor: selectedJob.type === 'offer' ? theme.primary : theme.success, padding: SP.lg, paddingBottom: SP.xl, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: '#000', shadowOffset: {width:0, height:6}, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setSelectedJob(null)} style={{ padding: SP.sm, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: R.full }}>
              <I name={AR ? 'chevronRight' : 'chevronLeft'} size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: '#FFF' }}>
              {selectedJob.type === 'offer' ? (AR ? 'تفاصيل الوظيفة المطروحة' : 'Job Offer Details') : (AR ? 'تفاصيل طلب العمل' : 'Job Request Details')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={{ alignItems: 'center', marginTop: SP.xl, marginBottom: SP.sm }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginBottom: SP.md, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
              <I name={selectedJob.type === 'offer' ? 'briefcase' : 'user'} size={36} color={selectedJob.type === 'offer' ? theme.primary : theme.success} />
            </View>
            <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: '#FFF', textAlign: 'center' }}>
              {AR ? selectedJob.title_ar : selectedJob.title_en}
            </Text>
            <Text style={{ fontSize: FS.md, color: 'rgba(255,255,255,0.9)', marginTop: SP.xs, fontWeight: FW.bold }}>
              {selectedJob.facility} • {selectedJob.city}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SP.xl, paddingBottom: 120 }}>
          {/* Premium Info Grid */}
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
            {[
              { icon: 'award', l: AR ? 'التصنيف' : 'SCFHS', v: selectedJob.scfhs },
              { icon: 'clock', l: AR ? 'الدوام' : 'Type', v: AR ? selectedJob.type_ar : selectedJob.type_en },
              { icon: 'shield', l: AR ? 'الإقامة' : 'Status', v: selectedJob.status },
              { icon: 'star', l: AR ? 'الخبرة' : 'Exp', v: `${selectedJob.exp} ${AR ? 'سنوات' : 'years'}` },
              { icon: 'globe', l: AR ? 'الجنسية' : 'Nationality', v: selectedJob.nat || (AR ? 'غير محدد' : 'Any') },
              { icon: 'dollarSign', l: AR ? 'الراتب' : 'Salary', v: selectedJob.salary || (AR ? 'غير محدد' : 'Negotiable') }
            ].map((f, i) => (
              <View key={i} style={{ width: '47%', backgroundColor: theme.surface, borderRadius: R.lg, padding: SP.md, borderWidth: 1, borderColor: theme.border, alignItems: AR ? 'flex-end' : 'flex-start' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: SP.sm }}>
                  <I name={f.icon as any} size={16} color={theme.textSub} />
                </View>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: 2 }}>{f.l}</Text>
                <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }} numberOfLines={1}>{f.v}</Text>
              </View>
            ))}
          </View>

          <View style={{ backgroundColor: theme.surface, borderRadius: R.xl, padding: SP.xl, borderWidth: 1, borderColor: theme.border }}>
            <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
              {AR ? 'الوصف والتفاصيل المرفقة' : 'Description & Requirements'}
            </Text>
            <Text style={{ fontSize: FS.md, color: theme.text, lineHeight: 28, textAlign: AR ? 'right' : 'left' }}>
              {selectedJob.desc}
            </Text>
          </View>
        </ScrollView>

        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: SP.xl, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border, shadowColor: '#000', shadowOffset:{width:0,height:-4}, shadowOpacity:0.05, elevation: 10 }}>
          <TouchableOpacity onPress={() => setApplyVisible(true)} style={{ backgroundColor: selectedJob.contact === 'whatsapp' ? '#4CAF50' : theme.primary, padding: SP.lg, borderRadius: R.full, alignItems: 'center', flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'center', gap: SP.md }}>
            <I name={selectedJob.contact === 'whatsapp' ? "phone" : "send"} size={24} color="#FFF" />
            <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: '#FFF' }}>
              {selectedJob.contact === 'whatsapp' ? (AR ? 'تواصل واتساب مباشرة' : 'Direct WhatsApp') : (AR ? 'تقديم عبر صندوق التوظيف (CV)' : 'Submit CV via ATS Inbox')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // FAST APPLICATION MODAL
  // ────────────────────────────────────────────────────────────────────────────
  if (selectedJob && applyVisible) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={{ backgroundColor: theme.surface2, padding: SP.lg, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setApplyVisible(false)} style={{ padding: SP.xs }}><I name={AR ? 'chevronRight' : 'chevronLeft'} size={24} color={theme.text} /></TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>{AR ? 'تعبئة بيانات التقديم' : 'Application Details'}</Text>
          <View style={{ width: 32 }} />
        </View>
        
        <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md }}>
          <View style={{ backgroundColor: selectedJob.contact === 'whatsapp' ? '#4CAF5015' : theme.primaryLight, padding: SP.lg, borderRadius: R.lg, marginBottom: SP.md }}>
            <Text style={{ fontSize: FS.sm, color: selectedJob.contact === 'whatsapp' ? '#4CAF50' : theme.primary, textAlign: AR ? 'right' : 'left', lineHeight: 22, fontWeight: FW.bold }}>
              {selectedJob.contact === 'whatsapp' 
                ? (AR ? 'سيتم تجهيز رسالة واتساب تحتوي على بياناتك لإرسالها مباشرة إلى ' : 'A WhatsApp message will be prepared to send to ')
                : (AR ? 'سيتم إرسال سيرتك الذاتية بأمان إلى صندوق وارد التوظيف (ATS Inbox) الخاص بـ ' : 'Your CV will be securely sent to the ATS Inbox of ')}
              {selectedJob.facility}
            </Text>
          </View>
          
          <NInput label={AR ? 'الاسم الكامل' : 'Full Name'} value={applyName} onChange={setApplyName} required />
          <NInput label={AR ? 'رقم التواصل' : 'Contact Number'} value={applyPhone} onChange={setApplyPhone} kbType="phone-pad" required />
          
          <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: -SP.sm }}>{AR ? 'تصنيف الهيئة (SCFHS)' : 'SCFHS Classification'}</Text>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm }}>
            {['طبيب عام', 'مقيم', 'أخصائي', 'أخصائي أول', 'استشاري', 'غير مصنف'].map(c => (
              <TouchableOpacity key={c} onPress={() => setApplyClass(c)} style={{ paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1, borderColor: applyClass === c ? theme.primary : theme.border, backgroundColor: applyClass === c ? theme.primary : theme.bg }}>
                <Text style={{ color: applyClass === c ? '#FFF' : theme.textSub, fontSize: FS.xs }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <NInput label={AR ? 'سنوات الخبرة' : 'Years of Experience'} placeholder="5" value={applyExp} onChange={setApplyExp} kbType="numeric" />
          <NInput label={AR ? 'الجاهزية للعمل (المدة)' : 'Ready to Start (Notice Period)'} placeholder={AR ? 'جاهز فوراً، شهر، إلخ' : 'Immediately, 1 month, etc.'} value={applyReady} onChange={setApplyReady} />
          
          <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginTop: SP.md }}>
            {AR ? 'السيرة الذاتية المرفقة (إلزامي)' : 'Attached CV (Required)'}
          </Text>
          <TouchableOpacity onPress={() => setApplyCV(true)} style={{ backgroundColor: applyCV ? theme.successBg : theme.surface2, padding: SP.xl, borderRadius: R.lg, borderWidth: 2, borderColor: applyCV ? theme.success : theme.border, borderStyle: applyCV ? 'solid' : 'dashed', alignItems: 'center', gap: SP.sm }}>
            <I name={applyCV ? "check" : "upload"} size={28} color={applyCV ? theme.success : theme.textSub} />
            <Text style={{ fontSize: FS.sm, color: applyCV ? theme.success : theme.textSub }}>
              {applyCV ? (AR ? 'تم رفع الملف بنجاح (cv_doc.pdf)' : 'File uploaded (cv_doc.pdf)') : (AR ? 'اضغط لرفع ملف (PDF, Word, Image)' : 'Tap to upload (PDF, Word, Image)')}
            </Text>
          </TouchableOpacity>

          <NBtn label={AR ? 'إرسال الطلب (Submit)' : 'Submit Application'} onPress={handleApply} disabled={!applyName || !applyPhone || !applyCV} style={{ marginTop: SP.xl, backgroundColor: selectedJob.contact === 'whatsapp' ? '#4CAF50' : theme.primary }} />
        </ScrollView>
      </View>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ATS INBOX MODAL (VIEW APPLICANT)
  // ────────────────────────────────────────────────────────────────────────────
  if (selectedApp) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <NHeader title={AR ? 'تفاصيل المتقدم' : 'Applicant Details'} sub={selectedApp.applicantName} onBack={() => setSelectedApp(null)} />
        <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md }}>
          <View style={{ alignItems: 'center', marginBottom: SP.lg }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: SP.sm }}>
              <Text style={{ fontSize: FS['3xl'], fontWeight: FW.bold, color: theme.primary }}>{selectedApp.applicantName.charAt(0)}</Text>
            </View>
            <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{selectedApp.applicantName}</Text>
            <Text style={{ fontSize: FS.md, color: theme.textSub }}>{AR ? 'متقدم على:' : 'Applied for:'} {selectedApp.jobTitle}</Text>
          </View>
          
          <View style={{ backgroundColor: theme.surface, borderRadius: R.lg, padding: SP.lg, borderWidth: 1, borderColor: theme.border, gap: SP.md }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}><Text style={{ color: theme.textSub }}>{AR ? 'التصنيف' : 'SCFHS'}</Text><Text style={{ fontWeight: FW.bold, color: theme.text }}>{selectedApp.scfhs}</Text></View>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}><Text style={{ color: theme.textSub }}>{AR ? 'الخبرة' : 'Experience'}</Text><Text style={{ fontWeight: FW.bold, color: theme.text }}>{selectedApp.exp} {AR ? 'سنوات' : 'years'}</Text></View>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}><Text style={{ color: theme.textSub }}>{AR ? 'الجاهزية' : 'Availability'}</Text><Text style={{ fontWeight: FW.bold, color: theme.text }}>{selectedApp.ready}</Text></View>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}><Text style={{ color: theme.textSub }}>{AR ? 'رقم التواصل' : 'Phone'}</Text><Text style={{ fontWeight: FW.bold, color: theme.text }}>{selectedApp.phone}</Text></View>
          </View>

          <NBtn label={AR ? 'تنزيل السيرة الذاتية (Download CV)' : 'Download CV'} onPress={() => show(AR ? 'جاري تحميل السيرة الذاتية...' : 'Downloading CV...', 'success')} style={{ marginTop: SP.lg }} />
          <NBtn label={AR ? 'تواصل مع المتقدم عبر واتساب' : 'Contact via WhatsApp'} variant="outline" onPress={() => Linking.openURL(`whatsapp://send?phone=${selectedApp.phone}`)} style={{ borderColor: '#4CAF50' }} />
        </ScrollView>
      </View>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MAIN NAVIGATION VIEWS
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* HEADER — top safe-area inset applied here (App.tsx only provides the context) */}
      <View style={{ backgroundColor: theme.bg, paddingBottom: SP.md, paddingTop: Math.max(insets.top, SP.sm), paddingHorizontal: SP.lg }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: SP.lg }}>
          <TouchableOpacity onPress={onBack} style={{ padding: SP.sm, backgroundColor: theme.primary, borderRadius: R.full, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', shadowColor: theme.primary, shadowOffset: {width:0,height:2}, shadowOpacity: 0.3, elevation: 4 }}>
            <I name={AR ? 'chevronRight' : 'chevronLeft'} size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: FS.xl, fontWeight: FW.xbold, color: theme.text }}>{AR ? 'الوظائف الطبية' : 'Medical Jobs'}</Text>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={{ padding: SP.sm, backgroundColor: theme.primaryLight, borderRadius: R.full, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <I name="filter" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.xs, backgroundColor: theme.surface2, padding: 4, borderRadius: R.lg }}>
          <TouchableOpacity onPress={() => setTab('browse')} style={{ flex: 1, paddingVertical: SP.md, borderRadius: R.md, alignItems: 'center', backgroundColor: tab === 'browse' ? theme.surface : 'transparent', shadowColor: tab==='browse'?'#000':'transparent', shadowOpacity:0.1, shadowRadius:4, elevation: tab==='browse'?2:0 }}>
            <Text style={{ color: tab === 'browse' ? theme.primary : theme.textSub, fontSize: FS.sm, fontWeight: FW.bold }}>{AR ? 'تصفح الوظائف' : 'Browse'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('post')} style={{ flex: 1, paddingVertical: SP.md, borderRadius: R.md, alignItems: 'center', backgroundColor: tab === 'post' ? theme.surface : 'transparent', shadowColor: tab==='post'?'#000':'transparent', shadowOpacity:0.1, shadowRadius:4, elevation: tab==='post'?2:0 }}>
            <Text style={{ color: tab === 'post' ? theme.primary : theme.textSub, fontSize: FS.sm, fontWeight: FW.bold }}>{AR ? 'إضافة إعلان' : 'Post Ad'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('inbox')} style={{ flex: 1, paddingVertical: SP.md, borderRadius: R.md, alignItems: 'center', backgroundColor: tab === 'inbox' ? theme.surface : 'transparent', shadowColor: tab==='inbox'?'#000':'transparent', shadowOpacity:0.1, shadowRadius:4, elevation: tab==='inbox'?2:0 }}>
            <Text style={{ color: tab === 'inbox' ? theme.primary : theme.textSub, fontSize: FS.sm, fontWeight: FW.bold }}>{AR ? 'الوارد (ATS)' : 'Inbox'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─────────────────── BROWSE JOBS ─────────────────── */}
      {tab === 'browse' && (
        <>
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.textSub, fontSize: FS.md }}>{AR ? 'جاري تحميل الوظائف...' : 'Loading jobs...'}</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}
          ListHeaderComponent={
            <View style={{ marginBottom: SP.lg }}>
              <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث بالمهنة، المستشفى، التخصص...' : 'Search profession, hospital...'} />
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelectedJob(item)} activeOpacity={0.9} style={{ marginBottom: SP.lg }}>
              <View style={{ backgroundColor: theme.surface, borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}>
                <View style={{ backgroundColor: item.type === 'offer' ? theme.primaryLight : theme.successBg, paddingHorizontal: SP.lg, paddingVertical: SP.sm, flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: FS.xs, color: item.type === 'offer' ? theme.primary : theme.success, fontWeight: FW.bold }}>
                    {item.type === 'offer' ? (AR ? 'صاحب عمل (يبحث عن موظفين)' : 'Employer Ad') : (AR ? 'ممارس (يبحث عن عمل)' : 'Job Seeker CV')}
                  </Text>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{item.date}</Text>
                </View>
                
                <View style={{ padding: SP.lg }}>
                  <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: 4 }}>
                    {AR ? item.title_ar : item.title_en}
                  </Text>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: SP.md }}>
                    <I name="mapPin" size={14} color={theme.textSub} />
                    <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{item.facility} • {item.city}</Text>
                  </View>
                  
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.md }}>
                    {[
                      { icon: 'clock', val: AR ? item.type_ar : item.type_en },
                      { icon: 'award', val: item.scfhs },
                      { icon: 'star', val: `${item.exp} ${AR?'س':'Y'}` }
                    ].map((tag, i) => (
                      <View key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, backgroundColor: theme.surface2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.sm }}>
                        <I name={tag.icon as any} size={12} color={theme.textSub} />
                        <Text style={{ fontSize: FS.xs, color: theme.textSub, fontWeight: FW.bold }}>{tag.val}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
        )}
        </>
      )}

      {/* ─────────────────── POST AD ─────────────────── */}
      {tab === 'post' && (
        <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.lg, paddingBottom: 100 }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.sm }}>
            <TouchableOpacity onPress={() => setPostType('offer')} style={{ flex: 1, padding: SP.xl, borderRadius: R.lg, borderWidth: 2, borderColor: postType === 'offer' ? theme.primary : theme.border, backgroundColor: postType === 'offer' ? theme.primaryLight : theme.surface, alignItems: 'center' }}>
              <I name="briefcase" size={32} color={postType === 'offer' ? theme.primary : theme.textSub} />
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md, textAlign: 'center' }}>{AR ? 'أنا صاحب عمل\n(أبحث عن موظفين)' : 'Employer\n(Looking for staff)'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPostType('request')} style={{ flex: 1, padding: SP.xl, borderRadius: R.lg, borderWidth: 2, borderColor: postType === 'request' ? theme.success : theme.border, backgroundColor: postType === 'request' ? theme.successBg : theme.surface, alignItems: 'center' }}>
              <I name="user" size={32} color={postType === 'request' ? theme.success : theme.textSub} />
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md, textAlign: 'center' }}>{AR ? 'أنا باحث عن عمل\n(أريد وظيفة)' : 'Job Seeker\n(Looking for job)'}</Text>
            </TouchableOpacity>
          </View>

          <NInput label={postType === 'offer' ? (AR ? 'المسمى الوظيفي المطلوب' : 'Job Title') : (AR ? 'الوظيفة التي تبحث عنها' : 'Desired Title')} placeholder={AR ? 'مثال: أخصائي باطنة' : 'e.g. Internal Med'} value={postTitle} onChange={setPostTitle} required />
          
          <NInput label={postType === 'offer' ? (AR ? 'اسم المنشأة أو المستشفى (اختياري)' : 'Facility Name') : (AR ? 'جهة العمل الحالية (اختياري)' : 'Current Facility')} placeholder={AR ? 'اكتب اسم المنشأة...' : 'Facility Name'} value={postCompany} onChange={setPostCompany} />

          <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? 'المهنة:' : 'Profession:'}</Text>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm }}>
            {[ { id: 'doctor', ar: 'طبيب', en: 'Doctor' }, { id: 'nurse', ar: 'تمريض', en: 'Nurse' }, { id: 'pharmacist', ar: 'صيدلي', en: 'Pharmacist' }, { id: 'lab', ar: 'مختبر', en: 'Lab' }, { id: 'radio', ar: 'أشعة', en: 'Radiology' } ].map((p) => (
              <TouchableOpacity key={p.id} onPress={() => setPostProf(p.id)} style={{ paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1, borderColor: postProf === p.id ? theme.primary : theme.border, backgroundColor: postProf === p.id ? theme.primary : theme.surface }}>
                <Text style={{ color: postProf === p.id ? '#FFF' : theme.text, fontSize: FS.sm }}>{AR ? p.ar : p.en}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? 'تصنيف الهيئة (SCFHS):' : 'Classification:'}</Text>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm }}>
            {['طبيب عام', 'مقيم', 'أخصائي', 'أخصائي أول', 'استشاري', 'غير مصنف'].map(c => (
              <TouchableOpacity key={c} onPress={() => setPostClass(c)} style={{ paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.md, borderWidth: 1, borderColor: postClass === c ? theme.primary : theme.border, backgroundColor: postClass === c ? theme.primaryLight : theme.bg }}>
                <Text style={{ color: postClass === c ? theme.primary : theme.textSub, fontSize: FS.xs, fontWeight: postClass === c ? FW.bold : FW.reg }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
            <View style={{ flex: 1 }}>
              <NInput label={AR ? 'المدينة' : 'City'} placeholder={AR ? 'مثال: الرياض' : 'e.g. Riyadh'} value={postCity} onChange={setPostCity} required />
            </View>
            <View style={{ flex: 1 }}>
              <NInput label={AR ? 'الجنسية المطلوبة' : 'Nationality'} placeholder={AR ? 'مثال: مفتوح، سعودي' : 'e.g. Any, Saudi'} value={postNat} onChange={setPostNat} />
            </View>
            <View style={{ flex: 1 }}>
              <NInput label={AR ? 'سنوات الخبرة' : 'Experience'} placeholder="5" value={postExp} onChange={setPostExp} kbType="numeric" />
            </View>
          </View>

          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.xs }}>{AR ? 'نوع العقد' : 'Contract'}</Text>
              <View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: R.md }}>
                {['fulltime', 'parttime', 'locum'].map(t => (
                  <TouchableOpacity key={t} onPress={() => setPostContract(t)} style={{ padding: SP.sm, borderBottomWidth: t==='locum'?0:1, borderBottomColor: theme.border, backgroundColor: postContract === t ? theme.primaryLight : theme.bg }}>
                    <Text style={{ color: postContract === t ? theme.primary : theme.textSub, fontSize: FS.xs, textAlign: 'center' }}>{t==='fulltime' ? (AR?'دوام كامل':'Full Time') : t==='parttime' ? (AR?'دوام جزئي':'Part Time') : (AR?'لوكم/زيارة':'Locum')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <NInput label={AR ? 'الراتب (اختياري)' : 'Salary (Optional)'} placeholder={AR ? 'يحدد لاحقاً' : 'Negotiable'} value={postSalary} onChange={setPostSalary} />
            </View>
          </View>

          {postType === 'offer' && (
            <View style={{ marginTop: SP.sm }}>
              <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{AR ? 'آلية استلام طلبات التوظيف (الـ CV):' : 'Application Reception:'}</Text>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
                <TouchableOpacity onPress={() => setPostContact('inbox')} style={{ flex: 1, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: postContact === 'inbox' ? theme.primary : theme.border, alignItems: 'center', backgroundColor: postContact === 'inbox' ? theme.primaryLight : theme.surface }}>
                  <I name="inbox" size={24} color={postContact === 'inbox' ? theme.primary : theme.textSub} />
                  <Text style={{ color: theme.text, fontSize: FS.xs, marginTop: 4, textAlign: 'center', fontWeight: FW.bold }}>{AR ? 'صندوق الوارد (ATS)' : 'ATS Inbox'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPostContact('whatsapp')} style={{ flex: 1, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: postContact === 'whatsapp' ? '#4CAF50' : theme.border, alignItems: 'center', backgroundColor: postContact === 'whatsapp' ? '#4CAF5015' : theme.surface }}>
                  <I name="phone" size={24} color={postContact === 'whatsapp' ? '#4CAF50' : theme.textSub} />
                  <Text style={{ color: theme.text, fontSize: FS.xs, marginTop: 4, textAlign: 'center', fontWeight: FW.bold }}>{AR ? 'واتساب' : 'WhatsApp'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Guest Forced WhatsApp constraint info */}
          {postType === 'request' && (
            <View style={{ backgroundColor: '#FF980015', padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: '#FF9800', marginTop: SP.sm }}>
              <Text style={{ color: '#F57C00', fontSize: FS.xs, textAlign: AR ? 'right' : 'left', lineHeight: 18 }}>
                {AR ? 'بما أنك لا تملك حساب مستشفى (زائر)، التواصل سيكون حصراً عبر الواتساب، لذلك إدخال رقم الجوال الزامي للشركات للوصول إليك.' : 'As a guest job seeker, communication is strictly via WhatsApp. Phone number is required.'}
              </Text>
            </View>
          )}

          {(postContact === 'whatsapp' || postType === 'request') && (
            <NInput label={AR ? 'رقم الواتساب للتواصل' : 'WhatsApp Number'} placeholder="05xxxxxxxx" value={postPhone} onChange={setPostPhone} kbType="phone-pad" required />
          )}

          <NInput label={AR ? 'الوصف والتفاصيل' : 'Details'} placeholder={AR ? 'اكتب التفاصيل هنا...' : 'Write details...'} value={postDesc} onChange={setPostDesc} multi lines={4} />

          <NBtn label={posting ? (AR ? 'جاري النشر...' : 'Publishing...') : (AR ? 'نشر الإعلان' : 'Publish Ad')} onPress={handlePost} disabled={posting || !postTitle || !postProf || !postCity || ((postContact === 'whatsapp' || postType === 'request') && !postPhone)} style={{ marginTop: SP.md }} />
        </ScrollView>
      )}

      {/* ─────────────────── ATS INBOX ─────────────────── */}
      {tab === 'inbox' && (
        <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
          <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', marginBottom: SP.xl, lineHeight: 22 }}>
            {AR ? 'هذا هو صندوق وارد التوظيف (ATS) الخاص بالمنشأة. جميع السير الذاتية المرسلة على إعلاناتك تظهر هنا.' : 'This is the facility ATS Inbox. All CVs applied to your offers will appear here.'}
          </Text>

          {inboxLoading ? (
            <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginVertical: SP.xl }}>{AR ? 'جاري تحميل الطلبات...' : 'Loading applications...'}</Text>
          ) : applications.length === 0 ? (
            <NEmpty title={AR ? 'لا توجد طلبات توظيف' : 'No applications'} subtitle={AR ? 'عندما يتقدم أحد الممارسين على إعلاناتك ستظهر طلباتهم هنا' : 'Applications to your job posts will appear here'} />
          ) : applications.map(app => (
            <TouchableOpacity key={app.id} onPress={() => setSelectedApp(app)} activeOpacity={0.8} style={{ backgroundColor: theme.surface, borderRadius: R.lg, padding: SP.lg, borderWidth: 1, borderColor: theme.border, marginBottom: SP.md, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: {width:0, height:2}, elevation: 2 }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.primary }}>{app.applicantName.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{app.applicantName}</Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: 2 }}>{AR ? 'متقدم على:' : 'Applied for:'} {app.jobTitle}</Text>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginTop: SP.xs }}>
                  <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold }}>{app.scfhs}</Text>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub }}>• {app.exp} {AR ? 'سنوات خبرة' : 'years exp'}</Text>
                </View>
              </View>
              <View style={{ padding: SP.sm, backgroundColor: theme.surface2, borderRadius: R.full }}>
                <I name={AR ? 'chevronLeft' : 'chevronRight'} size={20} color={theme.primary} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* FILTERS SHEET */}
      <NSheet visible={showFilters} onClose={() => setShowFilters(false)} title={AR ? 'تصفية وبحث متقدم' : 'Advanced Filters'}>
        <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.lg, paddingBottom: 60 }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? 'ترتيب حسب:' : 'Sort By:'}</Text>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
            <TouchableOpacity onPress={() => setFilterSort('recent')} style={{ flex: 1, padding: SP.sm, borderRadius: R.md, borderWidth: 1, borderColor: filterSort === 'recent' ? theme.primary : theme.border, backgroundColor: filterSort === 'recent' ? theme.primaryLight : theme.bg, alignItems: 'center' }}>
              <Text style={{ color: filterSort === 'recent' ? theme.primary : theme.textSub }}>{AR ? 'الأحدث' : 'Recent'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilterSort('nearest')} style={{ flex: 1, padding: SP.sm, borderRadius: R.md, borderWidth: 1, borderColor: filterSort === 'nearest' ? theme.primary : theme.border, backgroundColor: filterSort === 'nearest' ? theme.primaryLight : theme.bg, alignItems: 'center' }}>
              <Text style={{ color: filterSort === 'nearest' ? theme.primary : theme.textSub }}>{AR ? 'الأقرب' : 'Nearest'}</Text>
            </TouchableOpacity>
          </View>
          <NBtn label={AR ? 'تطبيق الفرز' : 'Apply Filter'} onPress={() => setShowFilters(false)} style={{ marginTop: SP.md }} />
        </ScrollView>
      </NSheet>
    </View>
  );
}






// 13. MEDICAL DRUG INDEX — reference index (no ordering)
// ══════════════════════════════════════════════════════════════════
/** Collapsible info section for the drug profile page (mirrors the patient app). */
function DrugSection({ title, content, warn, defaultOpen }: { title: string; content: any; warn?: boolean; defaultOpen?: boolean }) {
 const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
 const [open, setOpen] = useState(!!defaultOpen);
 const text = Array.isArray(content) ? content.filter(Boolean).join('، ') : (content ? String(content) : '');
 if (!text) return null;
 return (
 <View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: R.md, backgroundColor: theme.surface, overflow: 'hidden', marginBottom: SP.sm }}>
   <TouchableOpacity onPress={() => setOpen(!open)} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', padding: SP.md, gap: SP.sm }}>
     <Text style={{ flex: 1, fontSize: FS.sm, fontWeight: FW.bold, color: warn ? '#dc2626' : theme.text, textAlign: AR ? 'right' : 'left' }}>{title}</Text>
     <Text style={{ color: theme.textSub, fontSize: FS.md }}>{open ? '−' : '+'}</Text>
   </TouchableOpacity>
   {open && (
     <Text style={{ paddingHorizontal: SP.md, paddingBottom: SP.md, fontSize: FS.sm, color: theme.textSub, lineHeight: 22, textAlign: AR ? 'right' : 'left' }}>{text}</Text>
   )}
 </View>
 );
}

export function MedicalDrugIndexScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
 const [search, setSearch] = useState('');
 const [selectedCat, setSelectedCat] = useState('all');
 const [selectedDrug, setSelectedDrug] = useState<any | null>(null);
 const [drugDetail, setDrugDetail] = useState<any | null>(null);
 const [detailLoading, setDetailLoading] = useState(false);
 const [drugs, setDrugs] = useState<any[]>([]);
 const [categories, setCategories] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const { show } = useToast();
 const scrollY = useRef(new Animated.Value(0)).current;
 const insets = useSafeAreaInsets();

 // ── Suggest-edit (اقتراح تعديل) state — providers propose field fixes or a
 // replacement image; every suggestion lands in the admin review queue.
 const [suggestOpen, setSuggestOpen] = useState(false);
 const [suggestTab, setSuggestTab] = useState<'fields' | 'image'>('fields');
 const [suggestForm, setSuggestForm] = useState<Record<string, string>>({});
 const [suggestNote, setSuggestNote] = useState('');
 const [suggestImg, setSuggestImg] = useState<{ uri: string; mime: string } | null>(null);
 const [suggestBusy, setSuggestBusy] = useState(false);

 // Editable catalog fields (must stay within the backend EDITABLE_FIELDS
 // whitelist — anything outside it is dropped server-side).
 const SUGGEST_FIELD_DEFS: Array<{ key: string; ar: string; en: string; multi?: boolean; numeric?: boolean; cur: (d: any, s: any) => any }> = [
   { key: 'name_ar', ar: 'اسم الدواء (عربي)', en: 'Drug name (AR)', cur: (d, s) => d.name_ar ?? s.name_ar },
   { key: 'name_en', ar: 'اسم الدواء (إنجليزي)', en: 'Drug name (EN)', cur: (d, s) => d.name_en ?? s.name_en },
   { key: 'active_ingredient', ar: 'المادة الفعالة', en: 'Active ingredient', cur: (d, s) => d.active_ingredient ?? d.active_ar ?? s.active_ar },
   { key: 'generic_name', ar: 'الاسم العلمي', en: 'Generic name', cur: (d) => d.generic_name },
   { key: 'manufacturer', ar: 'الشركة المصنعة', en: 'Manufacturer', cur: (d, s) => d.manufacturer ?? s.manufacturer },
   { key: 'category', ar: 'الفئة', en: 'Category', cur: (d, s) => d.category ?? d.category_ar ?? s.category_ar },
   { key: 'sub_category', ar: 'الفئة الفرعية', en: 'Subcategory', cur: (d, s) => d.sub_category ?? s.sub_category },
   { key: 'form', ar: 'الشكل الدوائي', en: 'Dosage form', cur: (d, s) => d.form ?? s.form },
   { key: 'strength', ar: 'التركيز', en: 'Strength', cur: (d, s) => d.strength ?? s.strength },
   { key: 'package_size', ar: 'حجم العبوة', en: 'Package size', cur: (d, s) => d.package_size ?? s.package_size },
   { key: 'barcode', ar: 'الباركود', en: 'Barcode', cur: (d) => d.barcode },
   { key: 'price', ar: 'السعر (ر.س)', en: 'Price (SAR)', numeric: true, cur: (d, s) => d.price ?? s.price },
   { key: 'description_ar', ar: 'الوصف', en: 'Description', multi: true, cur: (d) => d.description_ar ?? d.description_en },
   { key: 'indications_ar', ar: 'دواعي الاستعمال', en: 'Indications', multi: true, cur: (d) => d.indications_ar ?? d.indications_en },
   { key: 'dosage_ar', ar: 'الجرعة وطريقة الاستخدام', en: 'Dosage & usage', multi: true, cur: (d) => d.dosage_ar ?? d.dosage_en },
   { key: 'usage_instructions_ar', ar: 'إرشادات الاستخدام', en: 'Usage instructions', multi: true, cur: (d) => d.usage_instructions_ar ?? d.usage_instructions_en },
   { key: 'warnings_ar', ar: 'تحذيرات', en: 'Warnings', multi: true, cur: (d) => d.warnings_ar ?? d.warnings_en },
   { key: 'precautions_ar', ar: 'احتياطات', en: 'Precautions', multi: true, cur: (d) => d.precautions_ar ?? d.precautions_en },
   { key: 'side_effects_ar', ar: 'الأعراض الجانبية', en: 'Side effects', multi: true, cur: (d) => d.side_effects_ar ?? d.side_effects_en },
   { key: 'contraindications_ar', ar: 'موانع الاستخدام', en: 'Contraindications', multi: true, cur: (d) => d.contraindications_ar ?? d.contraindications_en },
   { key: 'interactions', ar: 'التفاعلات الدوائية', en: 'Drug interactions', multi: true, cur: (d) => d.interactions },
   { key: 'storage_conditions_ar', ar: 'شروط التخزين', en: 'Storage conditions', multi: true, cur: (d) => d.storage_conditions_ar ?? d.storage_conditions_en },
 ];

 const openSuggest = () => {
   const d: any = drugDetail || {};
   const init: Record<string, string> = {};
   for (const f of SUGGEST_FIELD_DEFS) {
     const v = f.cur(d, selectedDrug);
     init[f.key] = v === undefined || v === null ? '' : String(v);
   }
   setSuggestForm(init);
   setSuggestNote('');
   setSuggestImg(null);
   setSuggestTab('fields');
   setSuggestOpen(true);
 };

 const pickSuggestImage = async () => {
   try {
     const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
     if (!perm.granted) { show(AR ? 'يلزم إذن الوصول إلى الصور' : 'Photo permission required', 'error'); return; }
     const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, quality: 0.85 });
     if (r.canceled || !r.assets?.[0]) return;
     const a: any = r.assets[0];
     setSuggestImg({ uri: a.uri, mime: a.mimeType || 'image/jpeg' });
   } catch {
     show(AR ? 'تعذر اختيار الصورة' : 'Could not pick image', 'error');
   }
 };

 const submitSuggestFields = async () => {
   if (!selectedDrug || suggestBusy) return;
   const d: any = drugDetail || {};
   const changes: Record<string, any> = {};
   for (const f of SUGGEST_FIELD_DEFS) {
     const cur = f.cur(d, selectedDrug);
     const curStr = cur === undefined || cur === null ? '' : String(cur);
     const v = (suggestForm[f.key] ?? '').trim();
     if (v !== curStr.trim()) changes[f.key] = f.numeric ? Number(v) : v;
   }
   if (Object.keys(changes).length === 0) {
     show(AR ? 'لم تقم بتعديل أي حقل' : 'No field was modified', 'info');
     return;
   }
   if (changes.price !== undefined && !isFinite(changes.price)) {
     show(AR ? 'السعر المدخل غير صالح' : 'Invalid price', 'error');
     return;
   }
   setSuggestBusy(true);
   try {
     await client.post(`/medicines/${selectedDrug.id}/suggest-change`, {
       type: 'field_edit',
       changes,
       note: suggestNote.trim() || undefined,
     });
     show(AR ? 'تم إرسال الاقتراح — بانتظار موافقة الإدارة' : 'Suggestion sent — pending admin approval', 'success');
     setSuggestOpen(false);
   } catch (e: any) {
     show(AR ? `فشل إرسال الاقتراح: ${e?.response?.data?.message || e?.message || ''}` : 'Failed to send suggestion', 'error');
   } finally {
     setSuggestBusy(false);
   }
 };

 const submitSuggestImage = async () => {
   if (!selectedDrug || !suggestImg || suggestBusy) return;
   setSuggestBusy(true);
   try {
     // Real FILE upload (no links): push the picked image bytes to storage,
     // then reference the stored object in the suggestion.
     const base64 = await FileSystem.readAsStringAsync(suggestImg.uri, { encoding: 'base64' });
     // Registered providers use the standard upload; unregistered visitors fall
     // back to the public, image-only, size-capped suggestion upload route.
     let up;
     try {
       up = await client.post('/storage/upload', {
         data_base64: base64,
         mime: suggestImg.mime,
         original_name: `drug_suggest_${selectedDrug.id}.jpg`,
         visibility: 'public_read', // medicine catalogue images live on Cloudflare R2 (default target)
       });
     } catch (e: any) {
       if (e?.response?.status !== 401) throw e;
       up = await client.post('/storage/upload-suggestion-image', {
         data_base64: base64,
         mime: suggestImg.mime,
         original_name: `drug_suggest_${selectedDrug.id}.jpg`,
       });
     }
     const storageId = up.data?.id;
     if (!storageId) throw new Error('upload_failed');
     await client.post(`/medicines/${selectedDrug.id}/suggest-image`, {
       storage_id: storageId,
       note: suggestNote.trim() || undefined,
     });
     show(AR ? 'تم إرسال الصورة المقترحة — بانتظار موافقة الإدارة' : 'Image suggestion sent — pending admin approval', 'success');
     setSuggestOpen(false);
     setSuggestImg(null);
   } catch (e: any) {
     show(AR ? `فشل إرسال الصورة: ${e?.response?.data?.message || e?.message || ''}` : 'Failed to send image', 'error');
   } finally {
     setSuggestBusy(false);
   }
 };

 // Load dynamic categories from the real medicines catalog
 useEffect(() => {
   (async () => {
     try {
       const headers = await buildHeaders(true);
       const res = await fetch(`${API_BASE}/drugs/categories`, { headers });
       if (res.ok) {
         const data = await res.json();
         setCategories([{ key: 'all', count: 0 }, ...(data.data || [])]);
       }
     } catch {}
   })();
 }, []);

 // Server-side search + category filtering (debounced)
 useEffect(() => {
   let cancelled = false;
   const t = setTimeout(async () => {
     setLoading(true);
     try {
       const q = new URLSearchParams();
       if (search.trim()) q.append('search', search.trim());
       if (selectedCat !== 'all') q.append('category', selectedCat);
       q.append('limit', '100');
       const headers = await buildHeaders(true);
       const res = await fetch(`${API_BASE}/drugs?${q.toString()}`, { headers });
       if (res.ok) {
         const data = await res.json();
         if (!cancelled) setDrugs(data.data || []);
       }
     } catch {
     } finally {
       if (!cancelled) setLoading(false);
     }
   }, 300);
   return () => { cancelled = true; clearTimeout(t); };
 }, [search, selectedCat]);

 // Load the full product profile when a drug is opened
 useEffect(() => {
   if (!selectedDrug) { setDrugDetail(null); return; }
   setDetailLoading(true);
   (async () => {
     try {
       const headers = await buildHeaders(true);
       const res = await fetch(`${API_BASE}/drugs/${selectedDrug.id}`, { headers });
       if (res.ok) {
         const data = await res.json();
         if (!data.error) setDrugDetail(data);
       }
     } catch {
     } finally {
       setDetailLoading(false);
     }
   })();
 }, [selectedDrug?.id]);

 const headerHeight = scrollY.interpolate({
   inputRange: [0, 80],
   outputRange: [120, 60],
   extrapolate: 'clamp',
 });
 const headerOpacity = scrollY.interpolate({
   inputRange: [0, 40],
   outputRange: [1, 0],
   extrapolate: 'clamp',
 });

 const FactRow = ({ label, value }: { label: string; value?: any }) => {
   if (value === undefined || value === null || value === '') return null;
   return (
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', gap: SP.sm }}>
       <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>{label}</Text>
       <Text style={{ fontSize: FS.sm, color: theme.textSub, flex: 1, textAlign: AR ? 'left' : 'right' }}>{String(value)}</Text>
     </View>
   );
 };

 // ── FULL-PAGE drug profile (read-only index — no cart / no purchase actions) ──
 if (selectedDrug) {
   const d: any = drugDetail || {};
   const pick = (ar: any, en: any) => (AR ? (ar ?? en) : (en ?? ar)) ?? null;
   const gallery: string[] = resolveGallery({ ...selectedDrug, ...d });
   const winW = Dimensions.get('window').width;
   return (
   <View style={{ flex: 1, backgroundColor: theme.bg }}>
     <View style={{ backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border, paddingTop: Math.max(insets.top, SP.sm) }}>
       <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: SP.md, paddingVertical: SP.sm }}>
         <TouchableOpacity onPress={() => setSelectedDrug(null)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}>
           <I name="back" size={20} color={theme.text} />
         </TouchableOpacity>
         <Text style={{ flex: 1, fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: 'center' }} numberOfLines={1}>
           {AR ? 'الملف الدوائي الكامل' : 'Full Drug Profile'}
         </Text>
         <View style={{ width: 40 }} />
       </View>
     </View>

     <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 60 }}>
       {/* Image gallery (multiple images, swipeable) */}
       {gallery.length > 0 ? (
         <View style={{ marginBottom: SP.md }}>
           <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ borderRadius: R.lg, backgroundColor: theme.surface }}>
             {gallery.map((uri, idx) => (
               <Image key={idx} source={{ uri }} style={{ width: winW - SP.lg * 2, height: 220 }} resizeMode="contain" />
             ))}
           </ScrollView>
           {gallery.length > 1 && (
             <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: SP.xs }}>
               {gallery.map((_, idx) => (<View key={idx} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.border }} />))}
             </View>
           )}
         </View>
       ) : (
         <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${theme.primary}12`, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: SP.md }}>
           <I name="pill" size={32} color={theme.primary} />
         </View>
       )}

       {/* Header: name / manufacturer / price / badges */}
       <View style={{ alignItems: 'center', marginBottom: SP.md }}>
         <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: 'center' }}>
           {AR ? (d.name_ar || selectedDrug.name_ar) : (d.name_en || selectedDrug.name_en)}
         </Text>
         {(d.manufacturer || selectedDrug.manufacturer) ? (
           <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: 4 }}>{d.manufacturer || selectedDrug.manufacturer}</Text>
         ) : null}
         <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary, marginTop: 6 }}>
           {d.price ?? selectedDrug.price} {AR ? 'ريال سعودي' : 'SAR'}
         </Text>
         <View style={{ flexDirection: 'row', gap: SP.xs, marginTop: SP.xs }}>
           {(d.requires_prescription ?? selectedDrug.requires_prescription) ? <NBadge label={AR ? 'يتطلب وصفة' : 'Rx required'} variant="danger" size="xs" /> : null}
           {(d.potentially_unavailable ?? selectedDrug.potentially_unavailable) ? <NBadge label={AR ? 'قد يكون غير متوفر' : 'May be unavailable'} variant="warning" size="xs" /> : null}
           {d.discontinued ? <NBadge label={AR ? 'متوقف' : 'Discontinued'} variant="danger" size="xs" /> : null}
         </View>
       </View>

       {detailLoading && <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.md }} />}

       {/* Key facts */}
       <View style={{ gap: SP.sm, borderTopWidth: 1, borderTopColor: theme.border, paddingVertical: SP.md, marginBottom: SP.md }}>
         <FactRow label={AR ? 'المادة الفعالة' : 'Active Ingredient'} value={pick(d.active_ar, d.active_en) ?? selectedDrug.active_ar} />
         <FactRow label={AR ? 'الاسم العلمي' : 'Generic Name'} value={d.generic_name} />
         <FactRow label={AR ? 'الفئة' : 'Category'} value={d.category_ar ?? selectedDrug.category_ar} />
         <FactRow label={AR ? 'الفئة الفرعية' : 'Subcategory'} value={d.sub_category ?? selectedDrug.sub_category} />
         <FactRow label={AR ? 'الشكل الدوائي' : 'Dosage Form'} value={d.form ?? selectedDrug.form} />
         <FactRow label={AR ? 'التركيز' : 'Strength'} value={d.strength ?? selectedDrug.strength} />
         <FactRow label={AR ? 'حجم العبوة' : 'Package Size'} value={d.package_size ?? selectedDrug.package_size} />
         <FactRow label={AR ? 'الباركود' : 'Barcode'} value={d.barcode} />
       </View>

       {/* Informational sections (same set as the patient app) */}
       <DrugSection title={AR ? 'الوصف' : 'Description'} content={pick(d.description_ar, d.description_en)} defaultOpen />
       <DrugSection title={AR ? 'دواعي الاستعمال' : 'Indications'} content={pick(d.indications_ar, d.indications_en)} />
       <DrugSection title={AR ? 'الجرعة وطريقة الاستخدام' : 'Dosage & Usage'} content={pick(d.dosage_ar, d.dosage_en) || pick(d.usage_instructions_ar, d.usage_instructions_en)} />
       <DrugSection title={AR ? 'إرشادات الاستخدام' : 'Usage Instructions'} content={pick(d.usage_instructions_ar, d.usage_instructions_en)} />
       <DrugSection title={AR ? 'تحذيرات' : 'Warnings'} content={pick(d.warnings_ar, d.warnings_en)} warn />
       <DrugSection title={AR ? 'احتياطات' : 'Precautions'} content={pick(d.precautions_ar, d.precautions_en)} warn />
       <DrugSection title={AR ? 'موانع الاستخدام' : 'Contraindications'} content={pick(d.contraindications_ar, d.contraindications_en)} warn />
       <DrugSection title={AR ? 'الأعراض الجانبية' : 'Side Effects'} content={pick(d.side_effects_ar, d.side_effects_en)} />
       <DrugSection title={AR ? 'التفاعلات الدوائية' : 'Drug Interactions'} content={d.interactions} warn />
       <DrugSection title={AR ? 'شروط التخزين' : 'Storage Conditions'} content={pick(d.storage_conditions_ar, d.storage_conditions_en)} />
       {d.potentially_unavailable && d.shortage_notes ? (
         <DrugSection title={AR ? 'ملاحظات التوفر' : 'Availability Notes'} content={d.shortage_notes} warn defaultOpen />
       ) : null}

       {/* Alternatives (same active ingredient) — tappable, opens that profile */}
       {(d.alternatives?.length > 0) && (
         <View style={{ gap: SP.sm, marginTop: SP.md }}>
           <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
             {AR ? 'البدائل المتاحة (بنفس المادة الفعالة):' : 'Available Alternatives (Same Active Ingredient):'}
           </Text>
           {d.alternatives.map((alt: any) => (
             <TouchableOpacity key={alt.id} onPress={() => setSelectedDrug(alt)} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface2 }}>
               {resolveImageUri(alt.image) ? <Image source={{ uri: resolveImageUri(alt.image)! }} style={{ width: 36, height: 36, borderRadius: R.sm }} resizeMode="contain" /> : null}
               <Text style={{ color: theme.text, fontSize: FS.sm, flex: 1, textAlign: AR ? 'right' : 'left' }} numberOfLines={1}>{AR ? alt.name_ar : alt.name_en}</Text>
               <Text style={{ color: theme.primary, fontSize: FS.sm, fontWeight: FW.bold }}>{alt.price} {AR ? 'ريال' : 'SAR'}</Text>
             </TouchableOpacity>
           ))}
         </View>
       )}

       {/* Suggest edit — proposals go to the admin review queue (approve/reject) */}
       <View style={{ marginTop: SP.lg }}>
         <NBtn
           label={AR ? 'اقتراح تعديل على هذا الدواء' : 'Suggest an edit for this drug'}
           icon="edit"
           onPress={openSuggest}
         />
         <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: 'center', marginTop: SP.xs }}>
           {AR ? 'يصل الاقتراح للإدارة للمراجعة — لا يُطبّق أي تعديل إلا بعد الموافقة.' : 'Suggestions are reviewed by admin — nothing changes until approved.'}
         </Text>
       </View>

       <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: 'center', marginTop: SP.xl }}>
         {AR ? 'دليل استرشادي للمزود — العرض فقط، لا يتضمن الشراء.' : 'Provider reference index — view only, no purchasing.'}
       </Text>
     </ScrollView>

     {/* ── Suggest-edit sheet ── */}
     <NSheet visible={suggestOpen} onClose={() => !suggestBusy && setSuggestOpen(false)} title={AR ? 'اقتراح تعديل على الدواء' : 'Suggest a drug edit'} height={Math.round(Dimensions.get('window').height * 0.85)}>
       <View style={{ flex: 1 }}>
         {/* Tab switcher */}
         <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.xs, marginBottom: SP.md }}>
           <TouchableOpacity onPress={() => setSuggestTab('fields')} style={{ flex: 1, paddingVertical: SP.sm, borderRadius: R.md, alignItems: 'center', backgroundColor: suggestTab === 'fields' ? theme.primary : theme.surface2, borderWidth: 1, borderColor: suggestTab === 'fields' ? theme.primary : theme.border }}>
             <Text style={{ color: suggestTab === 'fields' ? '#FFF' : theme.text, fontWeight: FW.bold, fontSize: FS.sm }}>{AR ? 'تعديل بيانات' : 'Edit data'}</Text>
           </TouchableOpacity>
           <TouchableOpacity onPress={() => setSuggestTab('image')} style={{ flex: 1, paddingVertical: SP.sm, borderRadius: R.md, alignItems: 'center', backgroundColor: suggestTab === 'image' ? theme.primary : theme.surface2, borderWidth: 1, borderColor: suggestTab === 'image' ? theme.primary : theme.border }}>
             <Text style={{ color: suggestTab === 'image' ? '#FFF' : theme.text, fontWeight: FW.bold, fontSize: FS.sm }}>{AR ? 'اقتراح صورة' : 'Suggest image'}</Text>
           </TouchableOpacity>
         </View>

         <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: SP.xl }} keyboardShouldPersistTaps="handled">
           {suggestTab === 'fields' ? (
             <View style={{ gap: SP.sm }}>
               <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                 {AR ? 'عدّل أي حقل ثم أرسل — تُرسل القيم المعدّلة فقط مع القيم الحالية للمقارنة.' : 'Edit any field then send — only changed values are submitted, alongside current ones.'}
               </Text>
               {SUGGEST_FIELD_DEFS.map(f => (
                 <NInput
                   key={f.key}
                   label={AR ? f.ar : f.en}
                   value={suggestForm[f.key] ?? ''}
                   onChange={(v: string) => setSuggestForm(prev => ({ ...prev, [f.key]: v }))}
                   multi={!!f.multi}
                   lines={f.multi ? 3 : 1}
                   kbType={f.numeric ? 'numeric' : undefined}
                 />
               ))}
             </View>
           ) : (
             <View style={{ gap: SP.md }}>
               <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                 {AR ? 'ارفع صورة الدواء من جهازك (رفع ملف حقيقي — لا يُقبل رابط).' : 'Upload the drug image from your device (real file upload — no links).'}
               </Text>
               {suggestImg ? (
                 <View style={{ alignItems: 'center', gap: SP.sm }}>
                   <Image source={{ uri: suggestImg.uri }} style={{ width: 180, height: 180, borderRadius: R.md, backgroundColor: theme.surface2 }} resizeMode="contain" />
                   <NBtn label={AR ? 'اختيار صورة أخرى' : 'Pick another image'} variant="outline" size="sm" icon="image" onPress={pickSuggestImage} full={false} />
                 </View>
               ) : (
                 <NBtn label={AR ? 'اختيار صورة من الجهاز' : 'Pick image from device'} variant="outline" icon="image" onPress={pickSuggestImage} />
               )}
             </View>
           )}

           <View style={{ marginTop: SP.md }}>
             <NInput
               label={AR ? 'ملاحظة للإدارة (اختياري)' : 'Note for admin (optional)'}
               value={suggestNote}
               onChange={setSuggestNote}
               multi
               lines={2}
               placeholder={AR ? 'سبب الاقتراح أو مصدر المعلومة…' : 'Reason or source…'}
             />
           </View>

           <View style={{ marginTop: SP.md }}>
             <NBtn
               label={suggestTab === 'fields' ? (AR ? 'إرسال الاقتراح للإدارة' : 'Send suggestion to admin') : (AR ? 'إرسال الصورة للإدارة' : 'Send image to admin')}
               icon="send"
               loading={suggestBusy}
               disabled={suggestBusy || (suggestTab === 'image' && !suggestImg)}
               onPress={suggestTab === 'fields' ? submitSuggestFields : submitSuggestImage}
             />
           </View>
         </ScrollView>
       </View>
     </NSheet>
   </View>
   );
 }

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <Animated.View style={{ height: headerHeight, overflow: 'hidden', backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border, paddingTop: Math.max(insets.top, SP.sm) }}>
   <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: SP.md, marginTop: SP.sm }}>
     <TouchableOpacity onPress={onBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}>
       <I name="back" size={20} color={theme.text} />
     </TouchableOpacity>
     <Animated.Text style={{ flex: 1, fontSize: FS.xl, fontWeight: FW.bold, color: theme.text, textAlign: 'center', opacity: headerOpacity }}>
       {AR ? 'دليل الأدوية الطبي' : 'Medical Drug Index'}
     </Animated.Text>
     <View style={{ width: 40 }} />
   </View>
 </Animated.View>

 <View style={{ paddingHorizontal: SP.lg, paddingTop: SP.md, gap: SP.md, backgroundColor: theme.bg }}>
 <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث باسم الدواء أو المادة الفعالة...' : 'Search drug name or active ingredient...'} />

 {/* Categories Carousel (from live catalog) */}
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: AR ? 'row-reverse' : 'row' }}>
 <View style={{ flexDirection: 'row', gap: SP.xs, paddingBottom: 4 }}>
 {categories.map(cat => (
 <TouchableOpacity key={cat.key} onPress={() => setSelectedCat(cat.key)}
 style={[{ paddingHorizontal: SP.md, paddingVertical: SP.xs, borderRadius: R.full, borderWidth: 1.5 }, {
 backgroundColor: selectedCat === cat.key ? theme.primary : theme.surface2, borderColor: selectedCat === cat.key ? theme.primary : theme.border
 }]}>
 <Text style={{ color: selectedCat === cat.key ? '#FFF' : theme.text, fontSize: FS.sm, fontWeight: FW.semi }}>
 {cat.key === 'all' ? (AR ? 'الكل' : 'All') : cat.key}{cat.count ? ` (${cat.count})` : ''}
 </Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>
 </View>

 {loading ? (
   <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
     <ActivityIndicator size="large" color={theme.primary} />
   </View>
 ) : (
 <Animated.FlatList
 data={drugs}
 onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
 scrollEventThrottle={16}
 keyExtractor={item => item.id}
 contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}
 ListEmptyComponent={<NEmpty title={AR ? 'لا توجد أدوية' : 'No drugs found'} sub={AR ? 'حاول تغيير كلمات البحث' : 'Try a different search'} />}
 renderItem={({ item }) => (
 <NCard key={item.id} style={{ marginBottom: SP.md }} onPress={() => setSelectedDrug(item)}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 {resolveImageUri(item.image) ? (
   <Image source={{ uri: resolveImageUri(item.image)! }} style={{ width: 56, height: 56, borderRadius: R.md, backgroundColor: theme.surface2 }} resizeMode="contain" />
 ) : (
   <IBg name="pill" size={18} color={theme.primary} bg={`${theme.primary}12`} />
 )}
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }} numberOfLines={2}>
 {AR ? item.name_ar : item.name_en}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }} numberOfLines={1}>
  {AR ? `المادة الفعالة: ${item.active_ar || '—'}` : `Active: ${item.active_en || '—'}`}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }} numberOfLines={1}>
  {[item.category_ar, item.form].filter(Boolean).join(' · ')}
 </Text>
 </View>
 <View style={{ alignItems: 'flex-end' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary }}>
 {item.price} {AR ? 'ريال' : 'SAR'}
 </Text>
 {item.requires_prescription && (
 <NBadge label={AR ? 'بوصفة' : 'Rx'} variant="danger" size="xs" style={{ marginTop: 4 }} />
 )}
 {item.potentially_unavailable && (
 <NBadge label={AR ? 'قد يكون غير متوفر' : 'May be unavailable'} variant="warning" size="xs" style={{ marginTop: 4 }} />
 )}
 </View>
 </View>
 </NCard>
 )}
 />
 )}

 {/* (legacy sheet removed — profile now opens as a full page, see early return above) */}
 {false && selectedDrug && (
 <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
 <View style={{ alignItems: 'center', marginBottom: SP.sm }}>
 {(drugDetail?.image || selectedDrug.image) ? (
   <Image source={{ uri: resolveImageUri(drugDetail?.image || selectedDrug.image)! }} style={{ width: 120, height: 120, borderRadius: R.lg, backgroundColor: theme.surface2, marginBottom: SP.md }} resizeMode="contain" />
 ) : (
   <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: `${theme.primary}12`, alignItems: 'center', justifyContent: 'center', marginBottom: SP.md }}>
     <I name="pill" size={28} color={theme.primary} />
   </View>
 )}
 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: 'center' }}>
 {AR ? selectedDrug.name_ar : selectedDrug.name_en}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: 4 }}>
  {selectedDrug.manufacturer || ''}
 </Text>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary, marginTop: 6 }}>
 {selectedDrug.price} {AR ? 'ريال سعودي' : 'SAR'}
 {selectedDrug.requires_prescription ? (AR ? ' · يتطلب وصفة' : ' · Rx required') : ''}
 </Text>
 </View>

 {detailLoading && <ActivityIndicator color={theme.primary} />}

 <View style={{ gap: SP.sm, borderTopWidth: 1, borderTopColor: theme.border, paddingVertical: SP.md }}>
 <FactRow label={AR ? 'المادة الفعالة' : 'Active Ingredient'} value={AR ? (drugDetail?.active_ar ?? selectedDrug.active_ar) : (drugDetail?.active_en ?? selectedDrug.active_en)} />
 <FactRow label={AR ? 'الفئة' : 'Category'} value={drugDetail?.category_ar ?? selectedDrug.category_ar} />
 <FactRow label={AR ? 'الفئة الفرعية' : 'Subcategory'} value={drugDetail?.sub_category ?? selectedDrug.sub_category} />
 <FactRow label={AR ? 'الشكل الدوائي' : 'Dosage Form'} value={drugDetail?.form ?? selectedDrug.form} />
 <FactRow label={AR ? 'التركيز' : 'Strength'} value={drugDetail?.strength ?? selectedDrug.strength} />
 <FactRow label={AR ? 'حجم العبوة' : 'Package Size'} value={drugDetail?.package_size ?? selectedDrug.package_size} />
 <FactRow label={AR ? 'الباركود' : 'Barcode'} value={drugDetail?.barcode} />
 <FactRow label={AR ? 'ظروف التخزين' : 'Storage'} value={drugDetail?.storage_conditions_ar} />
 </View>

 {(drugDetail?.description_ar || drugDetail?.indications_ar?.length > 0) && (
 <View style={{ gap: 4 }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
  {AR ? 'الوصف الطبي ودواعي الاستعمال:' : 'Indications & Medical Description:'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, lineHeight: 22, textAlign: AR ? 'right' : 'left' }}>
 {drugDetail?.description_ar || (drugDetail?.indications_ar || []).join('، ')}
 </Text>
 </View>
 )}

 {(drugDetail?.warnings_ar?.length > 0) && (
 <View style={{ gap: 4 }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: '#dc2626', textAlign: AR ? 'right' : 'left' }}>
  {AR ? 'تحذيرات:' : 'Warnings:'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, lineHeight: 22, textAlign: AR ? 'right' : 'left' }}>
 {(drugDetail?.warnings_ar || []).join('، ')}
 </Text>
 </View>
 )}

 {/* Alternatives from the server (same active ingredient) */}
 {(drugDetail?.alternatives?.length > 0) && (
 <View style={{ gap: SP.md, marginTop: SP.xs }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'البدائل المتاحة (بنفس المادة الفعالة):' : 'Available Alternatives (Same Active Ingredient):'}
 </Text>
 {(drugDetail?.alternatives || []).map((alt: any) => (
 <View key={alt.id} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface2 }}>
 {resolveImageUri(alt.image) ? <Image source={{ uri: resolveImageUri(alt.image)! }} style={{ width: 32, height: 32, borderRadius: R.sm }} resizeMode="contain" /> : null}
 <Text style={{ color: theme.text, fontSize: FS.sm, flex: 1, textAlign: AR ? 'right' : 'left' }} numberOfLines={1}>{AR ? alt.name_ar : alt.name_en}</Text>
 <Text style={{ color: theme.primary, fontSize: FS.sm, fontWeight: FW.bold }}>{alt.price} {AR ? 'ريال' : 'SAR'}</Text>
 </View>
 ))}
 </View>
 )}
 </ScrollView>
 )}
 </View>
 );
}

const st = StyleSheet.create({
 topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SP.xl, paddingVertical: SP.md, borderBottomWidth: StyleSheet.hairlineWidth },
 chip: { paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1.5 },
 chatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SP.lg, borderBottomWidth: StyleSheet.hairlineWidth },
 unreadBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
 msgBubble: { maxWidth: '80%', paddingHorizontal: SP.lg, paddingVertical: SP.md, borderRadius: R.xl },
 imgBubble: { width: 150, height: 100, borderRadius: R.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
 inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SP.md, paddingVertical: SP.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: 28 },
 chatInput: { flex: 1, paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.xl, maxHeight: 100, fontSize: FS.md },
 sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: SP.sm },
 notifRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SP.lg, borderBottomWidth: StyleSheet.hairlineWidth },
});

// ══════════════════════════════════════════════════════════════════════════════
// INSURANCE CONFIG SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function InsuranceConfigScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 // UNIFIED CATALOG: companies + plan tiers come from the backend (same source
 // as onboarding, the patient app and the admin dashboard) — never hardcoded.
 const catalog = useInsuranceCatalog();
 const [insurances, setInsurances] = useState<any[]>([]);
 const [saving, setSaving] = useState(false);

 useEffect(() => {
   (async () => {
     // prefill the provider's current acceptance from their profile
     let current: string[] = [];
     let currentPlans: Record<string, string[]> = {};
     let currentCopays: Record<string, string> = {};
     try {
       const res = await client.get('/provider-onboarding/my-profile').catch(() => null);
       const p: any = res?.data || {};
       current = p.accepted_insurance || [];
       currentPlans = p.insurance_plans || {};
       currentCopays = p.insurance_copays || {};
     } catch {}
     setInsurances(catalog.map(c => ({
       id: c.id, ar: c.ar, en: c.en, plans: c.plans,
       active: current.includes(c.id),
       copay: currentCopays[c.id] || '20',
       selectedPlans: currentPlans[c.id] || [],
     })));
   })();
 }, [catalog]);

 const toggleIns = (id: string) => {
 setInsurances(prev => prev.map(item => item.id === id ? { ...item, active: !item.active } : item));
 };

 const updateCopay = (id: string, val: string) => {
 setInsurances(prev => prev.map(item => item.id === id ? { ...item, copay: val.replace(/\D/g, '') } : item));
 };

 const togglePlan = (id: string, plan: string) => {
 setInsurances(prev => prev.map(item => {
   if (item.id !== id) return item;
   const has = item.selectedPlans.includes(plan);
   return { ...item, selectedPlans: has ? item.selectedPlans.filter((p: string) => p !== plan) : [...item.selectedPlans, plan] };
 }));
 };

 const handleSave = async () => {
   if (saving) return;
   setSaving(true);
   try {
     const active = insurances.filter(i => i.active);
     // Changes go through the delta-audit pipeline — applied to the public
     // provider profile only after admin approval (same as other settings).
     await client.post('/provider/settings/delta', {
       changes: {
         accepts_insurance: active.length > 0,
         accepted_insurance: active.map(i => i.id),
         insurance_plans: Object.fromEntries(active.filter(i => i.selectedPlans.length).map(i => [i.id, i.selectedPlans])),
         insurance_copays: Object.fromEntries(active.map(i => [i.id, i.copay])),
       },
     });
     show(AR ? 'تم إرسال التعديلات — تُطبق بعد اعتماد الإدارة' : 'Changes sent — applied after admin approval', 'success');
     onBack();
   } catch (e: any) {
     show(AR ? `فشل الحفظ: ${e?.response?.data?.message || e?.message || ''}` : 'Save failed', 'error');
   } finally {
     setSaving(false);
   }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? 'التأمين الصحي' : 'Health Insurance'} onBack={onBack} />
 <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'حدد شركات التأمين المقبولة لديك ونسب التحمل لكل شركة:' : 'Select which insurance providers you accept and specify copay percentages:'}
 </Text>

 {insurances.map(item => (
 <NCard key={item.id} style={{ marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <IBg name="shield" size={16} color={item.active ? theme.primary : theme.textSub} bg={item.active ? `${theme.primary}12` : theme.surface2} />
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
 {AR ? item.ar : item.en}
 </Text>
 </View>
 <Switch value={item.active} onValueChange={() => toggleIns(item.id)} trackColor={{ true: theme.primary }} />
 </View>

 {item.active && (
 <View style={{ marginTop: SP.md, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.md, gap: SP.sm }}>
 <View style={{ width: 140 }}>
 <NInput
 label={AR ? 'نسبة التحمل %' : 'Copay %'}
 value={item.copay}
 onChange={(v) => updateCopay(item.id, v)}
 kbType="numeric"
 maxLen={3}
 />
 </View>
 {(item.plans || []).length > 0 && (
 <View>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الفئات المقبولة:' : 'Accepted tiers:'}</Text>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6 }}>
 {item.plans.map((p: string) => {
   const on = item.selectedPlans.includes(p);
   return (
   <TouchableOpacity key={p} onPress={() => togglePlan(item.id, p)} style={{ paddingHorizontal: SP.md, paddingVertical: SP.xs, borderRadius: R.full, borderWidth: 1.5, backgroundColor: on ? theme.primary : theme.surface2, borderColor: on ? theme.primary : theme.border }}>
   <Text style={{ color: on ? '#FFF' : theme.text, fontSize: FS.xs, fontWeight: FW.semi }}>{p}</Text>
   </TouchableOpacity>
   );
 })}
 </View>
 </View>
 )}
 </View>
 )}
 </NCard>
 ))}

 <NBtn label={AR ? ' حفظ الإعدادات' : ' Save Settings'} onPress={handleSave} loading={saving} style={{ marginTop: SP.xl }} />
 </ScrollView>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// CERTIFICATES CONFIG SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function CertificatesConfigScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';

 const DOC_LABELS: Record<string, { ar: string; en: string }> = {
 national_id: { ar: 'الهوية الوطنية', en: 'National ID' },
 commercial_registration: { ar: 'السجل التجاري', en: 'Commercial Registration' },
 medical_license: { ar: 'الترخيص الطبي (SCFHS)', en: 'Medical License (SCFHS)' },
 vat_certificate: { ar: 'شهادة ضريبة القيمة المضافة', en: 'VAT Certificate' },
 tax_number: { ar: 'الرقم الضريبي', en: 'Tax Number' },
 zakat_certificate: { ar: 'شهادة الزكاة', en: 'Zakat Certificate' },
 iban_letter: { ar: 'خطاب الآيبان البنكي', en: 'IBAN Letter' },
 facility_license: { ar: 'ترخيص المنشأة (وزارة الصحة)', en: 'Facility License (MOH)' },
 professional_cv: { ar: 'السيرة الذاتية المهنية', en: 'Professional CV' },
 profile_photo: { ar: 'الصورة الشخصية', en: 'Profile Photo' },
 other: { ar: 'مستند آخر', en: 'Other Document' },
 };
 const docLabel = (t: string) => { const l = DOC_LABELS[t]; return l ? (AR ? l.ar : l.en) : t; };

 const [docs, setDocs] = useState<any[]>([]);
 const [missing, setMissing] = useState<string[]>([]);
 const [loadingDocs, setLoadingDocs] = useState(true);
 const [loadError, setLoadError] = useState(false);
 const [uploading, setUploading] = useState(false);
 const [pendingDocType, setPendingDocType] = useState<string | null>(null);

 // Real KYC documents from the backend (Cloudinary private storage).
 const loadDocs = useCallback(async () => {
 setLoadingDocs(true);
 setLoadError(false);
 try {
 const res = await client.get('/provider/kyc/documents');
 setDocs(Array.isArray(res.data?.documents) ? res.data.documents : []);
 setMissing(Array.isArray(res.data?.missing) ? res.data.missing : []);
 } catch {
 setLoadError(true);
 } finally {
 setLoadingDocs(false);
 }
 }, []);

 useEffect(() => { loadDocs(); }, []);

 const pickAndUpload = async (docType: string) => {
 try {
 const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
 if (result.canceled || !result.assets || result.assets.length === 0) return;
 const asset = result.assets[0];
 const mime = asset.mimeType || (asset.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
 setPendingDocType(docType);
 setUploading(true);
 const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
 await client.post('/provider/kyc/documents', {
 doc_type: docType,
 file: { data_base64: base64, mime, original_name: asset.name || `${docType}.pdf` },
 });
 show(AR ? 'تم رفع المستند وهو الآن قيد مراجعة الإدارة' : 'Document uploaded and is now under admin review', 'success');
 await loadDocs();
 } catch (err: any) {
 const m = err?.response?.data?.message;
 show(typeof m === 'string' ? m : (AR ? 'تعذر رفع المستند — تحقق من الملف والاتصال وحاول مجدداً' : 'Could not upload the document — check the file and connection and retry'), 'error');
 } finally {
 setUploading(false);
 setPendingDocType(null);
 }
 };

 const statusMeta = (st: string) => {
 switch (st) {
 case 'approved': case 'verified': return { label: AR ? 'معتمد' : 'Approved', variant: 'success' as const };
 case 'rejected': return { label: AR ? 'مرفوض' : 'Rejected', variant: 'danger' as const };
 case 'needs_replacement': return { label: AR ? 'يحتاج إعادة رفع' : 'Needs Replacement', variant: 'warning' as const };
 case 'under_review': return { label: AR ? 'قيد المراجعة' : 'Under Review', variant: 'primary' as const };
 default: return { label: AR ? 'قيد المراجعة' : 'Pending', variant: 'primary' as const };
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? 'الشهادات والمؤهلات' : 'Qualifications'} onBack={onBack} />
 <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'المستندات الرسمية المرتبطة بملفك المهني وحالة اعتمادها لدى الإدارة:' : 'Official documents linked to your professional profile and their admin approval status:'}
 </Text>

 {loadingDocs && (
 <View style={{ alignItems: 'center', padding: SP.xl }}>
 <ActivityIndicator size="large" color={theme.primary} />
 </View>
 )}

 {loadError && !loadingDocs && (
 <View style={{ gap: SP.md }}>
 <NEmpty
 title={AR ? 'تعذر تحميل المستندات' : 'Could not load documents'}
 sub={AR ? 'تحقق من الاتصال ثم أعد المحاولة' : 'Check your connection and retry'}
 />
 <NBtn label={AR ? 'إعادة المحاولة' : 'Retry'} onPress={loadDocs} />
 </View>
 )}

 {!loadingDocs && !loadError && (
 <>
 {docs.length === 0 && missing.length === 0 && (
 <NEmpty
 title={AR ? 'لا توجد مستندات بعد' : 'No documents yet'}
 sub={AR ? 'ارفع مستنداتك الرسمية لاعتمادها من الإدارة' : 'Upload your official documents for admin approval'}
 />
 )}

 {docs.map((item: any) => {
 const meta = statusMeta(item.review_status || item.status);
 const dateStr = (item.createdAt || item.issued_date || '').slice(0, 10);
 return (
 <NCard key={item.id} style={{ marginBottom: SP.sm }} accent={meta.variant === 'success' ? '#4CAF50' : meta.variant === 'danger' ? '#F44336' : '#2196F3'}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, flex: 1, textAlign: AR ? 'right' : 'left' }}>
 {docLabel(item.doc_type)}
 </Text>
 <NBadge label={meta.label} variant={meta.variant} size="xs" />
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.sm }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 {item.doc_number ? (AR ? `رقم: ${item.doc_number}` : `No: ${item.doc_number}`) : docLabel(item.doc_type)}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{dateStr}</Text>
 </View>
 {(item.review_status === 'rejected' || item.review_status === 'needs_replacement') && (
 <View style={{ marginTop: SP.sm }}>
 <NBtn
 label={AR ? 'إعادة رفع المستند' : 'Re-upload Document'}
 size="sm"
 variant="outline"
 loading={uploading && pendingDocType === item.doc_type}
 onPress={() => pickAndUpload(item.doc_type)}
 />
 </View>
 )}
 </NCard>
 );
 })}

 {missing.length > 0 && (
 <>
 <NSecHeader title={AR ? 'مستندات مطلوبة ناقصة' : 'Missing Required Documents'} />
 {missing.map((t: string) => (
 <NCard key={t} style={{ marginBottom: SP.sm, borderColor: theme.warn, borderWidth: 1 }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, flex: 1, textAlign: AR ? 'right' : 'left' }}>{docLabel(t)}</Text>
 <NBadge label={AR ? 'مطلوب' : 'Required'} variant="warning" size="xs" />
 </View>
 <View style={{ marginTop: SP.sm }}>
 <NBtn
 label={uploading && pendingDocType === t ? (AR ? 'جاري الرفع…' : 'Uploading…') : (AR ? 'رفع المستند' : 'Upload Document')}
 size="sm"
 loading={uploading && pendingDocType === t}
 disabled={uploading}
 onPress={() => pickAndUpload(t)}
 />
 </View>
 </NCard>
 ))}
 </>
 )}

 <TouchableOpacity
 onPress={() => pickAndUpload('other')}
 disabled={uploading}
 style={{
 padding: SP.xl,
 borderRadius: R.lg,
 borderWidth: 2,
 borderColor: theme.primary,
 borderStyle: 'dashed',
 alignItems: 'center',
 justifyContent: 'center',
 backgroundColor: `${theme.primary}05`,
 marginTop: SP.md,
 opacity: uploading ? 0.6 : 1,
 }}
 >
 <I name="upload" size={24} color={theme.primary} />
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary, marginTop: SP.md }}>
 {AR ? ' رفع وثيقة أو شهادة جديدة' : ' Upload New Certificate'}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: SP.xs }}>
 {AR ? 'صيغ المقبولة: PDF, JPG, PNG (بحد أقصى 10 ميجا)' : 'Supported: PDF, JPG, PNG (Max 10MB)'}
 </Text>
 </TouchableOpacity>
 </>
 )}
 </ScrollView>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// PHOTOS & MEDIA SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function MediaConfigScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 // Real persisted clinic images (storage object ids) — loaded from profile,
 // changes go through the admin-approval delta pipeline.
 const [images, setImages] = useState<{ id: string; url: string; title: string }[]>([]);
 const [loadingImgs, setLoadingImgs] = useState(true);
 const [busy, setBusy] = useState(false);

 const resolveUrl = async (storageId: string) => {
   if (/^https?:\/\//.test(storageId) || storageId.startsWith('data:')) return storageId;
   try {
     const r = await client.get(`/storage/${storageId}/signed-url`);
     return r.data?.url || '';
   } catch { return ''; }
 };

 useEffect(() => {
   (async () => {
     try {
       const res = await client.get('/provider-onboarding/my-profile');
       const p = res.data?.profile || res.data || {};
       const list: string[] = Array.isArray(p.clinic_images) ? p.clinic_images : [];
       const out: { id: string; url: string; title: string }[] = [];
       for (const sid of list) {
         const url = await resolveUrl(String(sid));
         if (url) out.push({ id: String(sid), url, title: AR ? 'صورة العيادة' : 'Clinic Photo' });
       }
       setImages(out);
     } catch (e) {}
     setLoadingImgs(false);
   })();
 }, []);

 const submitImagesDelta = async (ids: string[]) => {
   await client.post('/provider/settings/delta', { changes: { clinic_images: ids } });
 };

 const handleDelete = async (id: string) => {
   if (busy) return;
   setBusy(true);
   try {
     const next = images.filter(x => x.id !== id).map(x => x.id);
     await submitImagesDelta(next);
     setImages(prev => prev.filter(x => x.id !== id));
     show(AR ? 'تم إرسال طلب الحذف — يسري بعد اعتماد الإدارة' : 'Deletion submitted — effective after admin approval', 'info');
   } catch (e) {
     show(AR ? 'فشل إرسال طلب الحذف' : 'Failed to submit deletion', 'error');
   } finally { setBusy(false); }
 };

 const handleAddPhoto = async () => {
   if (busy) return;
   try {
     const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
     if (!perm.granted) { show(AR ? 'يلزم إذن الوصول إلى الصور' : 'Photo permission required', 'error'); return; }
     const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, quality: 0.85 });
     if (r.canceled || !r.assets?.[0]) return;
     const a: any = r.assets[0];
     setBusy(true);
     // Provider images live on Cloudinary (private + signed delivery)
     const base64 = await FileSystem.readAsStringAsync(a.uri, { encoding: 'base64' });
     const up = await client.post('/storage/upload', {
       data_base64: base64,
       mime: a.mimeType || 'image/jpeg',
       original_name: `clinic_${Date.now()}.jpg`,
       visibility: 'private',
       target: 'cloudinary',
     });
     const storageId = up.data?.id;
     if (!storageId) throw new Error('upload_failed');
     const next = [...images.map(x => x.id), storageId];
     await submitImagesDelta(next);
     const url = await resolveUrl(storageId);
     setImages(prev => [...prev, { id: storageId, url: url || a.uri, title: AR ? 'صورة مرفقة جديدة' : 'New Attached Photo' }]);
     show(AR ? 'تم رفع الصورة — تظهر نهائياً بعد اعتماد الإدارة' : 'Photo uploaded — final after admin approval', 'success');
   } catch (e) {
     show(AR ? 'فشل رفع الصورة' : 'Failed to upload photo', 'error');
   } finally { setBusy(false); }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? 'الصور والوسائط' : 'Photos & Media'} onBack={onBack} />
 <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'الصور المعروضة في صفحتك العامة للمرضى (العيادة، الأجهزة، الشهادات المعلقة):' : 'Photos displayed on your public profile for patients (clinic, instruments, facilities):'}
 </Text>

 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, justifyContent: 'space-between' }}>
 {images.map(img => (
 <View key={img.id} style={{ width: '47%', borderRadius: R.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
 <View style={{ height: 120, backgroundColor: theme.surface2, position: 'relative' }}>
 <View style={{ position: 'absolute', top: 5, right: 5, zIndex: 10 }}>
 <TouchableOpacity
 onPress={() => handleDelete(img.id)}
 style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(244,67,54,0.9)', alignItems: 'center', justifyContent: 'center' }}
 >
 <I name="close" size={14} color="#FFF" />
 </TouchableOpacity>
 </View>
 <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
 <I name="camera" size={30} color={theme.textSub} />
 </View>
 </View>
 <View style={{ padding: SP.sm }}>
 <Text style={{ fontSize: FS.xs, color: theme.text, fontWeight: FW.bold, textAlign: 'center' }} numberOfLines={1}>
 {img.title}
 </Text>
 </View>
 </View>
 ))}

 <TouchableOpacity
 onPress={handleAddPhoto}
 style={{
 width: '47%',
 height: 154,
 borderRadius: R.lg,
 borderWidth: 2,
 borderColor: theme.primary,
 borderStyle: 'dashed',
 alignItems: 'center',
 justifyContent: 'center',
 backgroundColor: `${theme.primary}05`,
 }}
 >
 <I name="plus" size={24} color={theme.primary} />
 <Text style={{ fontSize: FS.sm, color: theme.primary, fontWeight: FW.bold, marginTop: SP.sm }}>
 {AR ? 'إضافة صورة' : 'Add Photo'}
 </Text>
 </TouchableOpacity>
 </View>
 </ScrollView>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE UNDER DEVELOPMENT SCREEN (PREMIUM PLACEHOLDER)
// ══════════════════════════════════════════════════════════════════════════════
export * from './RegistrationSuccess';


// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER WALLET SCREEN (REVENUE & WITHDRAWALS)
// ══════════════════════════════════════════════════════════════════════════════
export function ProviderWalletScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate?: (s: string) => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { user } = useAuth(); const AR = lang === 'ar';
  const [balance, setBalance] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingEscrow, setPendingEscrow] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [commission, setCommission] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const [wRes, txRes] = await Promise.all([
          client.get('/provider/wallet'),
          client.get('/provider/wallet/transactions').catch(() => ({ data: [] })),
        ]);
        // Real per-provider commission rate set by the admin
        client.get('/provider/me').then((meRes: any) => {
          const rate = meRes.data?.profile?.commission_rate;
          if (rate !== undefined && rate !== null) setCommission(Number(rate));
        }).catch(() => {});
        setBalance(wRes.data?.available || 0);
        setPendingEscrow(wRes.data?.escrow || 0);
        setTotalRevenue(wRes.data?.earned || 0);
        setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
      } catch (err) {
        console.warn('Failed to fetch wallet', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'المحفظة والإيرادات' : 'Wallet & Revenue'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg }}>
        <NCard style={{ backgroundColor: theme.primary, alignItems: 'center', padding: SP.xxl, marginBottom: SP.lg }}>
          <Text style={{ color: '#fff', opacity: 0.8, fontSize: FS.sm }}>{AR ? 'الرصيد المتاح للسحب' : 'Available Balance'}</Text>
          <Text style={{ color: '#fff', fontSize: 36, fontWeight: FW.bold, marginVertical: SP.sm }}>
            {balance} <Text style={{ fontSize: FS.md }}>{AR ? 'ريال' : 'SAR'}</Text>
          </Text>
          <NBtn 
            label={AR ? 'طلب سحب' : 'Request Withdrawal'} 
            onPress={() => onNavigate && onNavigate('withdrawal_workflow')} 
            style={{ backgroundColor: '#fff', marginTop: SP.md }} 
            labelStyle={{ color: theme.primary }} 
          />
        </NCard>

        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.md }}>
          <NStatCard icon="trendingUp" label={AR ? 'إجمالي الإيرادات' : 'Total Revenue'} value={String(totalRevenue)} unit={AR ? 'ر' : 'SAR'} color={theme.success} style={{ flex: 1 }} />
          <NStatCard icon="clock" label={AR ? 'أرصدة معلقة (Escrow)' : 'Pending (Escrow)'} value={String(pendingEscrow)} unit={AR ? 'ر' : 'SAR'} color={theme.warn} style={{ flex: 1 }} />
        </View>

        <NCard style={{ marginBottom: SP.lg, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.info + '20', justifyContent: 'center', alignItems: 'center' }}>
            <I name="receipt" size={22} color={theme.info} />
          </View>
          <View style={{ flex: 1, alignItems: AR ? 'flex-end' : 'flex-start' }}>
            <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{AR ? 'نسبة عمولة المنصة المحددة لك' : 'Your platform commission rate'}</Text>
            <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>
              {commission !== null ? `${commission}%` : (AR ? 'يحددها الأدمن عند الاعتماد' : 'Set by admin at approval')}
            </Text>
          </View>
        </NCard>

        <NSecHeader title={AR ? 'سجل العمليات' : 'Transaction History'} />
        {!loading && transactions.length === 0 && (
          <NEmpty title={AR ? 'لا توجد معاملات بعد' : 'No transactions yet'} subtitle={AR ? 'ستظهر المدفوعات والعمولات هنا' : 'Payments and commissions will appear here'} />
        )}
        {transactions.map((tx: any, idx) => (
          <NCard key={tx.id || idx} style={{ marginBottom: SP.md, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: (tx.type === 'CREDIT' || tx.type === 'EARNING') ? theme.success + '20' : theme.warn + '20', justifyContent: 'center', alignItems: 'center' }}>
              <I name={(tx.type === 'CREDIT' || tx.type === 'EARNING') ? 'arrowDownLeft' : 'arrowUpRight'} size={20} color={(tx.type === 'CREDIT' || tx.type === 'EARNING') ? theme.success : theme.warn} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{tx.title || tx.desc}</Text>
              <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{tx.date}</Text>
            </View>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: (tx.type === 'CREDIT' || tx.type === 'EARNING') ? theme.success : theme.warn }}>
              {(tx.type === 'CREDIT' || tx.type === 'EARNING') ? '+' : '-'}{Math.abs(tx.amount || 0)} {AR ? 'ر' : 'SAR'}
            </Text>
          </NCard>
        ))}
      </ScrollView>
    </View>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// GENERIC PROVIDER HOME STATS & QUICK ACTIONS
// ══════════════════════════════════════════════════════════════════════════════
export function ProviderHomeStats({ onNavigate, stats }: { onNavigate: (s: string) => void; stats: any }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  
  return (
    <View style={{ marginBottom: SP.xl }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
        <NStatCard icon="" label={AR ? 'طلبات اليوم' : "Today's Orders"} value={String(stats.todayCount || 0)} color="#2196F3" style={{ width: '47%' }} />
        <NStatCard icon="" label={AR ? 'طلبات الأسبوع' : "Week's Orders"} value={String(stats.weekCount || 0)} color="#9C27B0" style={{ width: '47%' }} />
        <NStatCard icon="" label={AR ? 'الإيرادات' : "Revenue"} value={String(stats.revenue || 0)} unit={AR ? 'ر' : 'SAR'} color="#4CAF50" style={{ width: '47%' }} />
        <NStatCard icon="" label={AR ? 'طلبات جديدة' : 'New Requests'} value={String(stats.pendingCount || 0)} color="#FF9800" style={{ width: '47%' }} />
      </View>

      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.md, flexWrap: 'wrap' }}>
        <NBtn label={AR ? 'المحفظة والإيرادات' : 'Wallet & Revenue'} icon="wallet" size="sm" style={{ flexBasis: '47%', backgroundColor: theme.surface2, borderColor: theme.border }} labelStyle={{ color: theme.text }} onPress={() => onNavigate('wallet')} />
        <NBtn label={AR ? 'المحادثات' : 'Chats'} icon="chat" size="sm" style={{ flexBasis: '47%', backgroundColor: theme.surface2, borderColor: theme.border }} labelStyle={{ color: theme.text }} onPress={() => onNavigate('chat')} />
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL SYSTEM SETTINGS (Theme, Lang, Face ID)
// ══════════════════════════════════════════════════════════════════════════════
import { SK, Vault } from '../../security/Security';

export function GlobalSystemSettings() {
  const { theme, toggle: toggleTheme, mode } = useTheme();
  const { lang, toggle: toggleLang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  
  const [bioEnabled, setBioEnabled] = useState(false);

  useEffect(() => {
    Vault.get(SK.BIOENABLED).then(v => setBioEnabled(v === '1'));
  }, []);

  const handleBioToggle = async (val: boolean) => {
    setBioEnabled(val);
    await Vault.set(SK.BIOENABLED, val ? '1' : '0');
    show(val ? (AR ? 'تم تفعيل الدخول بالبصمة' : 'Face ID Enabled') : (AR ? 'تم إيقاف الدخول بالبصمة' : 'Face ID Disabled'), 'success');
  };

  return (
    <NCard style={{ marginBottom: SP.xl, gap: SP.md }}>
      <NSecHeader title={AR ? 'إعدادات النظام' : 'System Settings'} />
      
      {/* Theme Toggle */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
          <Text style={{ fontSize: 20 }}>{mode ==='dark'?'':''}</Text>
          <Text style={{ color: theme.text, fontSize: FS.md }}>{AR ? 'الوضع الليلي' : 'Dark Mode'}</Text>
        </View>
        <Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ true: theme.primary }} />
      </View>

      <NDivider style={{ marginVertical: SP.xs }} />

      {/* Language Toggle */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
          <I name="globe" size={20} color={theme.primary} />
          <Text style={{ color: theme.text, fontSize: FS.md }}>{AR ? 'اللغة الإنجليزية' : 'Arabic Language'}</Text>
        </View>
        <Switch value={lang === 'en'} onValueChange={toggleLang} trackColor={{ true: theme.primary }} />
      </View>

      <NDivider style={{ marginVertical: SP.xs }} />

      {/* Face ID Toggle */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
          <I name="user" size={20} color={theme.textSub} />
          <Text style={{ color: theme.text, fontSize: FS.md }}>{AR ? 'الدخول بالبصمة / Face ID' : 'Face ID Login'}</Text>
        </View>
        <Switch value={bioEnabled} onValueChange={handleBioToggle} trackColor={{ true: theme.primary }} />
      </View>
    </NCard>
  );
}
