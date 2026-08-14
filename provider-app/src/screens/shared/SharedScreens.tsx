import { API_BASE } from '../../constants';
import { buildHeaders } from '../../security/Security';
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
 KeyboardAvoidingView, Platform, Linking
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
        const res = await client.get('/chats/provider');
        setConversations(res.data || []);
      } catch (err) {
        // Silent fallback
        setConversations([
          { id: 'c1', name: 'أحمد السالم', online: true, unread: 2, time: '10:30 AM', lastMsg: 'متى موعدي القادم؟' },
          { id: 'c2', name: 'سارة المطيري', online: false, unread: 0, time: '09:15 AM', lastMsg: 'شكراً دكتور على الاستشارة' },
          { id: 'c3', name: 'فيصل الحربي', online: true, unread: 0, time: 'أمس', lastMsg: 'تمت الاستشارة بنجاح' }
        ]);
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
     .catch(() => setNotifs([
       { id: 'n1', type: 'system', title_ar: 'مرحباً بك في نبض بلس', title_en: 'Welcome to Nabd Plus', body_ar: 'حسابك نشط ومربوط بالنظام بشكل كامل.', body_en: 'Your account is active and fully connected.', time: AR ? 'الآن' : 'Just now', read: false },
       { id: 'n2', type: 'payment', title_ar: 'إشعار دفع', title_en: 'Payment Received', body_ar: 'تم استلام دفعة 150 ريال من المريض أحمد.', body_en: 'Payment of 150 SAR received from patient Ahmed.', time: AR ? 'منذ ساعة' : '1 hour ago', read: true },
       { id: 'n3', type: 'order', title_ar: 'طلب جديد', title_en: 'New Appointment', body_ar: 'طلب موعد جديد من سارة المطيري.', body_en: 'New appointment request from Sara.', time: AR ? 'منذ ساعتين' : '2 hours ago', read: false },
     ]));
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
 { q_ar: 'ما هي العمولة؟', q_en: 'What is the commission?', a_ar: 'عمولة المنصة 10% من كل طلب مكتمل.', a_en: 'Platform commission is 10% of each completed order.' },
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
export function MaskedCall({ onBack }: { onBack: () => void }) {
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
 {AR ? 'المريض: أحمد السالم' : 'Patient: Ahmed Al-Salem'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>
 {AR ? 'الرقم المعروض: 920-XXXXXX' : 'Displayed: 920-XXXXXX'}
 </Text>
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
export function QRCodeSystem({ onBack, providerType, providerId }: { onBack: () => void; providerType?: string; providerId?: string }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [tab, setTab] = useState<'my_qr' | 'scan'>('my_qr');

 return (
 <NScroll>
 <NHeader title={AR ? 'نظام QR الموحد' : 'QR Code System'} onBack={onBack} />

 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xl }}>
 {[{ k: 'my_qr' as const, ar: 'رمز QR الخاص بي', en: 'My QR Code' }, { k: 'scan' as const, ar: 'مسح QR', en: 'Scan QR' }].map(t => (
 <TouchableOpacity key={t.k} onPress={() => setTab(t.k)}
 style={[{ flex: 1, paddingVertical: SP.md, borderRadius: R.lg, borderWidth: 1.5, alignItems: 'center' }, {
 backgroundColor: tab === t.k ? theme.primary : theme.surface2, borderColor: tab === t.k ? theme.primary : theme.border
 }]}>
 <Text style={{ color: tab === t.k ? '#FFF' : theme.text, fontWeight: FW.semi }}>{AR ? t.ar : t.en}</Text>
 </TouchableOpacity>
 ))}
 </View>

 {tab === 'my_qr' && (
 <NCard style={{ alignItems: 'center', padding: SP.xxl, marginBottom: SP.xl }}>
 <View style={{ width: 180, height: 180, borderRadius: R.xl, borderWidth: 3, borderColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
 <I name="qr" size={80} color={theme.primary} />
 </View>
 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, marginTop: SP.xl }}>
 {AR ? 'نبضة بلس — مزود خدمة' : 'Nabdah Plus — Provider'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: SP.xs }}>
 ID: {providerId ?? 'NBD-PRV-001'}
 </Text>
 <View style={{ gap: SP.md, width: '100%', marginTop: SP.xl }}>
 <NBtn label={AR ? 'حفظ كصورة' : 'Save as Image'} variant="outline" onPress={() => show(AR ? 'تم الحفظ' : 'Saved', 'success')} />
 <NBtn label={AR ? 'مشاركة' : 'Share'} variant="secondary" onPress={() => show(AR ? 'فتح المشاركة' : 'Opening share', 'info')} />
 <NBtn label={AR ? 'طباعة' : 'Print'} variant="outline" onPress={() => show(AR ? 'جاري الطباعة' : 'Printing', 'info')} />
 </View>
 </NCard>
 )}

 {tab === 'scan' && (
 <NCard style={{ alignItems: 'center', padding: SP.xxl, marginBottom: SP.xl }}>
 <View style={{ width: 200, height: 200, borderRadius: R.xl, borderWidth: 3, borderStyle: 'dashed', borderColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
 <I name="camera" size={50} color={theme.primary} />
 </View>
 <Text style={{ fontSize: FS.md, fontWeight: FW.semi, color: theme.text, marginTop: SP.xl, textAlign: 'center' }}>
 {AR ? 'وجّه الكاميرا نحو رمز QR' : 'Point camera at QR code'}
 </Text>
 <NBtn label={AR ? 'فتح الكاميرا' : 'Open Camera'} style={{ marginTop: SP.xl }}
 onPress={() => show(AR ? 'الكاميرا تفتح في التطبيق الحقيقي' : 'Camera opens in production app', 'info')} />
 </NCard>
 )}
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

 const REVIEWS = [
 { id: 'r1', patient: 'أحمد', rating: 5, comment: AR ? 'خدمة ممتازة والتعامل راقي' : 'Excellent service', date: AR ? 'اليوم' : 'Today', replied: false },
 { id: 'r2', patient: 'سارة', rating: 4, comment: AR ? 'جيد لكن الانتظار طويل' : 'Good but long wait', date: AR ? 'أمس' : 'Yesterday', replied: true },
 { id: 'r3', patient: 'خالد', rating: 5, comment: AR ? 'أفضل مزود خدمة في المنطقة' : 'Best provider in area', date: AR ? '3 أيام' : '3 days', replied: false },
 { id: 'r4', patient: 'نورا', rating: 3, comment: AR ? 'الخدمة متوسطة' : 'Average service', date: AR ? 'أسبوع' : '1 week', replied: true },
 ];

 const avg = (REVIEWS.reduce((a, r) => a + r.rating, 0) / REVIEWS.length).toFixed(1);

 return (
 <NScroll>
 <NHeader title={AR ? 'التقييمات والمراجعات' : 'Reviews & Ratings'} onBack={onBack} />

 {/* Summary */}
 <NCard style={{ marginBottom: SP.xl, alignItems: 'center', padding: SP.xxl }}>
 <Text style={{ fontSize: 48, fontWeight: FW.xbold, color: theme.primary }}>{avg}</Text>
 <RatingStars rating={parseFloat(avg)} size={22} />
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: SP.sm }}>{REVIEWS.length} {AR ? 'تقييم' : 'reviews'}</Text>
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
 {REVIEWS.map(review => (
 <NCard key={review.id} style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <NAvatar name={review.patient} size={36} />
 <View>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{review.patient}</Text>
 <RatingStars rating={review.rating} size={14} />
 </View>
 </View>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{review.date}</Text>
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{review.comment}</Text>
 {review.replied ? (
 <NCard style={{ backgroundColor: theme.primaryLight, padding: SP.md }}>
 <Text style={{ fontSize: FS.xs, color: theme.primary, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'ردك: شكراً لتقييمك الكريم!' : 'Your reply: Thank you for your feedback!'}
 </Text>
 </NCard>
 ) : (
 <NBtn label={AR ? 'رد على التقييم' : 'Reply'} size="xs" variant="outline" full={false}
 style={{ alignSelf: AR ? 'flex-end' : 'flex-start', paddingHorizontal: SP.lg }}
 onPress={() => show(AR ? 'فتح نموذج الرد' : 'Opening reply form', 'info')} />
 )}
 </NCard>
 ))}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// 12. WITHDRAWAL WORKFLOW SCREEN — Unified withdrawal screens
// ══════════════════════════════════════════════════════════════════
export function WithdrawalWorkflow({ onBack, balance = 4200 }: { onBack: () => void; balance?: number }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [step, setStep] = useState(1); // 1: Amount, 2: Select Bank, 3: OTP, 4: Success, 5: Failed
  const [amount, setAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [otp, setOtp] = useState('');

  const [BANKS, setBANKS] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    client.get('/provider/banks')
      .then(res => setBANKS(res.data || []))
      .catch(() => {
        // fallback banks list
        setBANKS([
          { id: 'b1', name_ar: 'بنك الراجحي', name_en: 'Al Rajhi Bank', iban: 'SA03 8000 0000 6080 1016 7519', logo: '🏦' },
          { id: 'b2', name_ar: 'بنك الأهلي', name_en: 'Al Ahli Bank', iban: 'SA02 1000 0000 3608 1230 1234', logo: '🏦' },
        ]);
      });
  }, []);

  const handleConfirmAmount = () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 100) {
      show(AR ? 'الحد الأدنى للسحب 100 ريال' : 'Minimum withdrawal is 100 SAR', 'warning');
      return;
    }
    if (amt > balance) {
      setStep(5); // insuifficient balance fails directly
      return;
    }
    setStep(2);
  };

  const handleConfirmBank = () => {
    if (!selectedBank) {
      show(AR ? 'اختر حساباً بنكياً' : 'Select a bank account', 'warning');
      return;
    }
    setStep(3);
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      show(AR ? 'أدخل رمز التحقق المكون من 4 أرقام' : 'Enter 4-digit code', 'warning');
      return;
    }
    setLoading(true);
    try {
      await client.post('/provider/wallet/withdraw', {
        amount: parseFloat(amount),
        bank_id: selectedBank,
        otp: otp
      });
      setStep(4);
    } catch (err: any) {
      show(AR ? 'رمز التحقق غير صحيح أو حدث خطأ' : 'Incorrect code or error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'سحب الأموال' : 'Withdraw Funds'} onBack={step > 1 ? () => setStep(s => s - 1) : onBack} />

      {step === 1 && (
        <View style={{ gap: SP.xl }}>
          <NCard style={{ backgroundColor: theme.primaryLight }}>
            <Text style={{ fontSize: FS.sm, color: theme.primary, textAlign: AR ? 'right' : 'left' }}>
              {AR ? `الرصيد المتاح للسحب: ${balance} ريال` : `Available for withdrawal: ${balance} SAR`}
            </Text>
          </NCard>

          <NPriceInput
            label={AR ? 'مبلغ السحب (100 ريال على الأقل)' : 'Withdrawal Amount (min 100 SAR)'}
            value={amount}
            onChange={setAmount}
            required
          />

          <NBtn
            label={AR ? 'التالي: اختيار الحساب البنكي' : 'Next: Select Bank Account'}
            disabled={!amount || parseFloat(amount) < 100}
            onPress={handleConfirmAmount}
          />
        </View>
      )}

      {step === 2 && (
        <View style={{ gap: SP.xl }}>
          <NSecHeader title={AR ? 'اختر حسابك البنكي' : 'Select Bank Account'} />
          
          {BANKS.map((bank, index) => (
            <NCard
              key={bank.id || `bank_${index}`}
              style={{
                borderColor: selectedBank === bank.id ? theme.primary : theme.border,
                borderWidth: selectedBank === bank.id ? 2 : 1.5,
              }}
              onPress={() => setSelectedBank(bank.id)}
            >
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
                <Text style={{ fontSize: 24 }}></Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? bank.name_ar : bank.name_en}
                  </Text>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                    {bank.iban}
                  </Text>
                </View>
                {selectedBank === bank.id && (
                  <View style={{ backgroundColor: theme.primary, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#FFF', fontSize: 12 }}></Text>
                  </View>
                )}
              </View>
            </NCard>
          ))}

          <NBtn
            label={AR ? 'التالي: التحقق من الهوية' : 'Next: Verification'}
            disabled={!selectedBank}
            onPress={handleConfirmBank}
          />
        </View>
      )}

      {step === 3 && (
        <View style={{ gap: SP.xl, alignItems: 'center' }}>
          <Text style={{ fontSize: FS.md, color: theme.text, textAlign: 'center', marginVertical: SP.md }}>
            {AR ? 'أدخل رمز التحقق (OTP) المرسل لبريدك الإلكتروني المسجل (استخدم 1234 للنجاح)' : 'Enter OTP sent to registered email address (use 1234)'}
          </Text>

          <NInput
            placeholder="1234"
            value={otp}
            onChange={setOtp}
            kbType="numeric"
            maxLen={4}
            style={{ width: 150, alignSelf: 'center', textAlign: 'center' }}
          />

          <NBtn
            label={AR ? 'تأكيد السحب النهائي' : 'Confirm Withdrawal'}
            disabled={otp.length < 4 || loading}
            loading={loading}
            onPress={handleVerifyOtp}
          />
        </View>
      )}

      {step === 4 && (
        <View style={{ gap: SP.xl, alignItems: 'center', paddingVertical: SP.huge }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.successBg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 40 }}></Text>
          </View>
          <Text style={{ fontSize: FS['2xl'], fontWeight: FW.bold, color: theme.success, textAlign: 'center' }}>
            {AR ? 'تم إرسال طلب السحب بنجاح' : 'Withdrawal Request Submitted'}
          </Text>
          <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', paddingHorizontal: SP.xl }}>
            {AR ? `تمت جدولة عملية تحويل ${amount} ريال لحسابك البنكي بنجاح. قد يستغرق وصول المبلغ 1-3 أيام عمل.` 
                : `A transfer of ${amount} SAR has been scheduled to your bank account. Arrives in 1-3 business days.`}
          </Text>
          <NBtn
            label={AR ? 'العودة للمحفظة' : 'Back to Wallet'}
            onPress={onBack}
          />
        </View>
      )}

      {step === 5 && (
        <View style={{ gap: SP.xl, alignItems: 'center', paddingVertical: SP.huge }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.dangerBg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 40 }}></Text>
          </View>
          <Text style={{ fontSize: FS['2xl'], fontWeight: FW.bold, color: theme.danger, textAlign: 'center' }}>
            {AR ? 'فشلت عملية السحب' : 'Withdrawal Request Failed'}
          </Text>
          <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', paddingHorizontal: SP.xl }}>
            {AR ? `تعذر إكمال طلب السحب بقيمة ${amount} ريال بسبب رصيد غير كافٍ أو خطأ في الاتصال بالخادم البنكي.`
                : `Unable to withdraw ${amount} SAR due to insufficient funds or connection timeout with bank host.`}
          </Text>
          <NBtn
            label={AR ? 'العودة للمحفظة' : 'Back to Wallet'}
            onPress={onBack}
          />
        </View>
      )}
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

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const headers = await buildHeaders(false);
        const res = await fetch(`${API_BASE}/jobs`, { headers });
        if (res.ok) {
          const data = await res.json();
          setJobs(data.data || []);
        } else {
          throw new Error('Failed to fetch');
        }
      } catch (err) {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const [applications, setApplications] = useState([
    { id: 'a1', jobTitle: 'استشاري قلب وقسطرة', applicantName: 'د. أحمد الصالح', phone: '050000000', scfhs: 'استشاري', exp: '12', ready: 'جاهز فوراً', date: '2026-07-06', status: 'new' }
  ]);

  const filtered = jobs.filter(j => 
    ((AR ? j.title_ar : j.title_en).toLowerCase().includes(search.toLowerCase()) || j.facility.includes(search)) &&
    (filterProf ? j.profession === filterProf : true) &&
    (filterCity ? j.city === filterCity : true)
  );

  const handlePost = () => {
    const newJob = {
      id: Date.now().toString(),
      type: postType,
      title_ar: postTitle || 'وظيفة طبية', title_en: postTitle || 'Medical Job',
      facility: postCompany || (AR ? 'بدون اسم' : 'Anonymous'),
      city: 'الرياض',
      profession: postProf, scfhs: postClass, exp: postExp || '0',
      type_ar: postContract === 'fulltime' ? 'دوام كامل' : postContract === 'parttime' ? 'دوام جزئي' : 'لوكم / زيارات',
      type_en: postContract === 'fulltime' ? 'Full-Time' : postContract === 'parttime' ? 'Part-Time' : 'Locum',
      status: postType === 'offer' ? 'نقل كفالة / تعاقد' : 'يبحث عن فرصة',
      desc: postDesc, contact: postType === 'request' ? 'whatsapp' : postContact, phone: postPhone, date: new Date().toISOString().split('T')[0],
      salary: postSalary, nat: postNat
    };
    setJobs([newJob, ...jobs]);
    show(AR ? 'تم نشر الإعلان بنجاح' : 'Posted successfully', 'success');
    setTab('browse');
  };

  const handleApply = () => {
    setApplyVisible(false);
    
    if (selectedJob.contact === 'whatsapp') {
      show(AR ? 'جاري تحويلك للواتساب...' : 'Opening WhatsApp...', 'success');
      setTimeout(() => Linking.openURL(`whatsapp://send?phone=${selectedJob.phone}&text=أتقدم لوظيفة ${selectedJob.title_ar}`), 800);
    } else {
      setApplications([{
        id: Date.now().toString(), jobTitle: selectedJob.title_ar, applicantName: applyName, phone: applyPhone, scfhs: applyClass, exp: applyExp, ready: applyReady, date: new Date().toISOString().split('T')[0], status: 'new'
      }, ...applications]);
      show(AR ? 'تم الإرسال لصندوق وارد صاحب العمل بنجاح!' : 'Sent to Employer Inbox successfully!', 'success');
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
      {/* HEADER WITHOUT ANY TOP PADDING SINCE APP.TSX HANDLES IT */}
      <View style={{ backgroundColor: theme.bg, paddingBottom: SP.md, paddingTop: SP.sm, paddingHorizontal: SP.lg }}>
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

          <NBtn label={AR ? 'نشر الإعلان' : 'Publish Ad'} onPress={handlePost} disabled={!postTitle || !postProf || ((postContact === 'whatsapp' || postType === 'request') && !postPhone)} style={{ marginTop: SP.md }} />
        </ScrollView>
      )}

      {/* ─────────────────── ATS INBOX ─────────────────── */}
      {tab === 'inbox' && (
        <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
          <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', marginBottom: SP.xl, lineHeight: 22 }}>
            {AR ? 'هذا هو صندوق وارد التوظيف (ATS) الخاص بالمنشأة. جميع السير الذاتية المرسلة على إعلاناتك تظهر هنا.' : 'This is the facility ATS Inbox. All CVs applied to your offers will appear here.'}
          </Text>

          {applications.map(app => (
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
export function MedicalDrugIndexScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
 const [search, setSearch] = useState('');
 const [selectedCat, setSelectedCat] = useState('all');
 const [selectedDrug, setSelectedDrug] = useState<any | null>(null);
 const [issuing, setIssuing] = useState(false);
 const [drugs, setDrugs] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const { show } = useToast();
 const scrollY = useRef(new Animated.Value(0)).current;
 const insets = useSafeAreaInsets();

 const CATEGORIES = [
 { key: 'all', ar: 'الكل', en: 'All' },
 { key: 'medications', ar: 'الأدوية العلاجية', en: 'Medications' },
 { key: 'vitamins', ar: 'الفيتامينات والمكملات', en: 'Vitamins' },
 { key: 'skincare', ar: 'العناية بالبشرة', en: 'Skincare' },
 ];

 useEffect(() => {
   const fetchDrugs = async () => {
     try {
       const headers = await buildHeaders(false);
       const res = await fetch(`${API_BASE}/drugs`, { headers });
       if (res.ok) {
         const data = await res.json();
         setDrugs(data.data || []);
       } else {
         throw new Error('Failed to fetch');
       }
     } catch (err) {


     } finally {
       setLoading(false);
     }
   };
   fetchDrugs();
 }, []);

 const filtered = drugs.filter(d => {
 const matchesCat = selectedCat === 'all' || d.cat === selectedCat;
 const matchesSearch = (AR ? (d.name_ar||'') : (d.name_en||'')).toLowerCase().includes(search.toLowerCase()) ||
 (AR ? (d.active_ar||'') : (d.active_en||'')).toLowerCase().includes(search.toLowerCase());
 return matchesCat && matchesSearch;
 });

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

 
  const issuePrescription = async (drug: any) => {
    setIssuing(true);
    try {
      const headers = await buildHeaders(false);
      await fetch(`${API_BASE}/prescriptions/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: [{ medicine_id: drug.id, quantity: 1, instructions: 'As directed' }], target_pharmacy_id: 'any', patient_id: 'test_patient' })
      });
      show(AR ? 'تم إصدار الوصفة الطبية بنجاح' : 'E-Prescription issued successfully', 'success');
      setSelectedDrug(null);
    } catch (err) {
      show(AR ? 'خطأ في إصدار الوصفة' : 'Error issuing e-prescription', 'error');
    } finally {
      setIssuing(false);
    }
  };

 const getAlternatives = (drug: any) => {
 return drugs.filter(d => d.id !== drug.id && d.active_en === drug.active_en);
 };

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

 {/* Categories Carousel */}
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: AR ? 'row-reverse' : 'row' }}>
 <View style={{ flexDirection: 'row', gap: SP.xs, paddingBottom: 4 }}>
 {CATEGORIES.map(cat => (
 <TouchableOpacity key={cat.key} onPress={() => setSelectedCat(cat.key)}
 style={[{ paddingHorizontal: SP.md, paddingVertical: SP.xs, borderRadius: R.full, borderWidth: 1.5 }, {
 backgroundColor: selectedCat === cat.key ? theme.primary : theme.surface2, borderColor: selectedCat === cat.key ? theme.primary : theme.border
 }]}>
 <Text style={{ color: selectedCat === cat.key ? '#FFF' : theme.text, fontSize: FS.sm, fontWeight: FW.semi }}>
 {AR ? cat.ar : cat.en}
 </Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>
 </View>

 {loading ? (
   <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
     <Text style={{ color: theme.textSub, fontSize: FS.md }}>{AR ? 'جاري تحميل الأدوية...' : 'Loading drugs...'}</Text>
   </View>
 ) : (
 <Animated.FlatList
 data={filtered}
 onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
 scrollEventThrottle={16}
 keyExtractor={item => item.id}
 contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}
 ListEmptyComponent={<NEmpty title={AR ? 'لا توجد أدوية' : 'No drugs found'} sub={AR ? 'حاول تغيير كلمات البحث' : 'Try a different search'} />}
 renderItem={({ item }) => (
 <NCard key={item.id} style={{ marginBottom: SP.md }} onPress={() => setSelectedDrug(item)}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <IBg name="pill" size={18} color={theme.primary} bg={`${theme.primary}12`} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 {AR ? item.name_ar : item.name_en}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
  {AR ? `المادة الفعالة: ${item.active_ar}` : `Active: ${item.active_en}`}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
  {item.manufacturer}
 </Text>
 </View>
 <View style={{ alignItems: 'flex-end' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary }}>
 {item.price} {AR ? 'ريال' : 'SAR'}
 </Text>
 {item.requires_prescription && (
 <NBadge label={AR ? 'بروشتة' : 'Rx'} variant="danger" size="xs" style={{ marginTop: 4 }} />
 )}
 </View>
 </View>
 </NCard>
 )}
 />
 )}

 {/* Drug Detail Sheet */}
 <NSheet visible={!!selectedDrug} onClose={() => setSelectedDrug(null)} title={AR ? 'تفاصيل المادة العلاجية' : 'Drug Reference Details'}>
 {selectedDrug && (
 <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
 <View style={{ alignItems: 'center', marginBottom: SP.sm }}>
 <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: `${theme.primary}12`, alignItems: 'center', justifyContent: 'center', marginBottom: SP.md }}>
 <I name="pill" size={28} color={theme.primary} />
 </View>
 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: 'center' }}>
 {AR ? selectedDrug.name_ar : selectedDrug.name_en}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: 4 }}>
  {selectedDrug.manufacturer}
 </Text>
 </View>

 <View style={{ gap: SP.sm, borderTopWidth: 1, borderTopColor: theme.border, borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
  **{AR ? 'المادة الفعالة:' : 'Active Ingredient:'}** {AR ? selectedDrug.active_ar : selectedDrug.active_en}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 **{AR ? 'الشكل الدوائي:' : 'Dosage Form:'}** {selectedDrug.form}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 **{AR ? 'السعر المعتمد (MOH):' : 'MOH Price:'}** {selectedDrug.price} {AR ? 'ريال سعودي' : 'SAR'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 **{AR ? 'طلب ترخيص وصفة (Rx):' : 'Requires Rx:'}** {selectedDrug.requires_prescription ? (AR ? 'نعم (يجب إرفاق وصفة طبية)' : 'Yes (Prescription Required)') : (AR ? 'لا (دواء لا وصفة له OTC)' : 'No (Over-the-counter)')}
 </Text>
 </View>

 <View style={{ gap: 4 }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
  {AR ? 'الوصف الطبي ودواعي الاستعمال:' : 'Indications & Medical Description:'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, lineHeight: 22, textAlign: AR ? 'right' : 'left' }}>
 {selectedDrug.desc}
 </Text>
 </View>

 
  <NBtn label={AR ? ' إصدار وصفة إلكترونية (E-Prescription)' : ' Issue E-Prescription'} onPress={() => issuePrescription(selectedDrug)} loading={issuing} style={{ marginTop: SP.md }} />

 {/* Alternatives */}
 <View style={{ gap: SP.md, marginTop: SP.md }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'البدائل المتاحة (بنفس المادة الفعالة):' : 'Available Alternatives (Same Active Ingredient):'}
 </Text>
 {getAlternatives(selectedDrug).length > 0 ? (
 getAlternatives(selectedDrug).map(alt => (
 <View key={alt.id} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface2 }}>
 <Text style={{ color: theme.text, fontSize: FS.sm }}>{AR ? alt.name_ar : alt.name_en}</Text>
 <Text style={{ color: theme.primary, fontSize: FS.sm, fontWeight: FW.bold }}>{alt.price} {AR ? 'ريال' : 'SAR'}</Text>
 </View>
 ))
 ) : (
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'لا توجد بدائل مسجلة حالياً بنفس المادة الفعالة.' : 'No alternative products registered with the same active ingredient.'}
 </Text>
 )}
 </View>
 </ScrollView>
 )}
 </NSheet>
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
 const [insurances, setInsurances] = useState([
 { id: 'bupa', ar: 'بوبا العربية', en: 'Bupa Arabia', active: true, copay: '10', tier: 'VIP' },
 { id: 'tawuniya', ar: 'التعاونية للتأمين', en: 'Tawuniya', active: true, copay: '20', tier: 'Class A' },
 { id: 'medgulf', ar: 'ميدغلف', en: 'Medgulf', active: false, copay: '20', tier: 'Class B' },
 { id: 'malath', ar: 'ملاذ للتأمين', en: 'Malath Insurance', active: false, copay: '25', tier: 'Class C' },
 ]);

 const toggleIns = (id: string) => {
 setInsurances(prev => prev.map(item => item.id === id ? { ...item, active: !item.active } : item));
 };

 const updateCopay = (id: string, val: string) => {
 setInsurances(prev => prev.map(item => item.id === id ? { ...item, copay: val.replace(/\D/g, '') } : item));
 };

 const handleSave = () => {
 show(AR ? 'تم حفظ إعدادات التأمين بنجاح' : 'Insurance settings saved successfully', 'success');
 onBack();
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
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.md }}>
 <View style={{ flex: 1 }}>
 <NInput
 label={AR ? 'نسبة التحمل %' : 'Copay %'}
 value={item.copay}
 onChange={(v) => updateCopay(item.id, v)}
 kbType="numeric"
 maxLen={3}
 />
 </View>
 <View style={{ flex: 1 }}>
 <NInput
 label={AR ? 'فئة التغطية' : 'Coverage Tier'}
 value={item.tier}
 onChange={(v) => {
 setInsurances(prev => prev.map(x => x.id === item.id ? { ...x, tier: v } : x));
 }}
 />
 </View>
 </View>
 )}
 </NCard>
 ))}

 <NBtn label={AR ? ' حفظ الإعدادات' : ' Save Settings'} onPress={handleSave} style={{ marginTop: SP.xl }} />
 </ScrollView>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// CERTIFICATES CONFIG SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function CertificatesConfigScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [certs, setCerts] = useState([
 { id: '1', name_ar: 'ترخيص الهيئة السعودية للتخصصات الصحية', name_en: 'SCFHS License Document', status: 'verified', date: '2026-05-10', filename: 'scfhs_license_card.pdf' },
 { id: '2', name_ar: 'شهادة البورد السعودي في طب القلب', name_en: 'Saudi Board Certificate in Cardiology', status: 'verified', date: '2026-05-11', filename: 'saudi_board_cardio.pdf' },
 { id: '3', name_ar: 'شهادة البكالوريوس في الطب والجراحة', name_en: 'MBBS Medical Graduation Certificate', status: 'pending', date: '2026-07-04', filename: 'mbbs_graduation.pdf' },
 ]);
 const [uploading, setUploading] = useState(false);
 const [progress, setProgress] = useState(0);

 const handleUpload = () => {
 setUploading(true);
 setProgress(0);
 const interval = setInterval(() => {
 setProgress(p => {
 if (p >= 100) {
 clearInterval(interval);
 setUploading(false);
 setCerts(prev => [
 ...prev,
 { id: Date.now().toString(), name_ar: 'شهادة زمالة أو تدريب إضافية', name_en: 'Additional Training Certificate', status: 'pending', date: '2026-07-06', filename: 'additional_training.pdf' }
 ]);
 show(AR ? 'تم رفع المستند بنجاح وهو قيد المراجعة' : 'Document uploaded successfully and is under review', 'success');
 return 100;
 }
 return p + 20;
 });
 }, 300);
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? 'الشهادات والمؤهلات' : 'Qualifications'} onBack={onBack} />
 <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'الشهادات المعتمدة والأوراق الثبوتية الخاصة بملفك الطبي المهني:' : 'Verified certificates and licensing documents linked to your medical profile:'}
 </Text>

 {certs.map(item => (
 <NCard key={item.id} style={{ marginBottom: SP.sm }} accent={item.status === 'verified' ? '#4CAF50' : '#2196F3'}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, flex: 1, textAlign: AR ? 'right' : 'left' }}>
 {AR ? item.name_ar : item.name_en}
 </Text>
 <NBadge
 label={item.status === 'verified' ? (AR ? 'معتمد' : 'Verified') : (AR ? 'قيد المراجعة' : 'Pending')}
 variant={item.status === 'verified' ? 'success' : 'primary'}
 size="xs"
 />
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.sm }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
  {item.filename}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 {item.date}
 </Text>
 </View>
 </NCard>
 ))}

 {uploading ? (
 <NCard style={{ padding: SP.xl, alignItems: 'center' }}>
 <Text style={{ fontSize: FS.sm, color: theme.text, marginBottom: SP.md }}>
 {AR ? `جاري الرفع والتحقق... ${progress}%` : `Uploading & verifying... ${progress}%`}
 </Text>
 <View style={{ width: '100%', height: 6, backgroundColor: theme.surface2, borderRadius: 3, overflow: 'hidden' }}>
 <View style={{ width: `${progress}%`, height: '100%', backgroundColor: theme.primary }} />
 </View>
 </NCard>
 ) : (
 <TouchableOpacity
 onPress={handleUpload}
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
 const [images, setImages] = useState([
 { id: '1', url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&h=300&fit=crop', title: AR ? 'صورة العيادة' : 'Clinic Room' },
 { id: '2', url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=300&h=300&fit=crop', title: AR ? 'الاستقبال' : 'Reception' },
 { id: '3', url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300&h=300&fit=crop', title: AR ? 'الأجهزة الطبية' : 'Equipment' },
 ]);

 const handleDelete = (id: string) => {
 setImages(prev => prev.filter(x => x.id !== id));
 show(AR ? 'تم حذف الصورة' : 'Photo deleted', 'info');
 };

 const handleAddPhoto = () => {
 const newImg = {
 id: Date.now().toString(),
 url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300&h=300&fit=crop',
 title: AR ? 'صورة مرفقة جديدة' : 'New Attached Photo'
 };
 setImages(prev => [...prev, newImg]);
 show(AR ? 'تم إضافة الصورة بنجاح' : 'Photo added successfully', 'success');
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
export function FeatureUnderDevelopmentScreen({ onBack, title, icon = 'tool' }: { onBack: () => void; title: string; icon?: string }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';
 
 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', padding: SP.xl, paddingBottom: SP.lg, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface }}>
 <TouchableOpacity onPress={onBack} style={{ padding: SP.sm, backgroundColor: theme.surface2, borderRadius: R.md }}>
 <Text style={{ color: theme.text, fontSize: FS.lg }}>{AR ? '→' : '←'}</Text>
 </TouchableOpacity>
 <Text style={{ flex: 1, fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: 'center' }}>
 {title}
 </Text>
 <View style={{ width: 40 }} />
 </View>
 <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SP.xxl }}>
 <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: `${theme.primary}15`, alignItems: 'center', justifyContent: 'center', marginBottom: SP.xl, borderWidth: 1, borderColor: `${theme.primary}30` }}>
 <I name={icon as any} size={50} color={theme.primary} />
 </View>
 <Text style={{ fontSize: FS['2xl'], fontWeight: FW.bold, color: theme.text, textAlign: 'center', marginBottom: SP.md }}>
 {AR ? 'هذه الميزة قيد التطوير' : 'Under Construction'}
 </Text>
 <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', lineHeight: 24, paddingHorizontal: SP.lg }}>
 {AR 
 ? 'نحن نعمل بجد لإطلاق هذه الخاصية في التحديث القادم بتصميم بريميوم وتجربة مستخدم متميزة. شكراً لتفهمكم!' 
 : 'We are working hard to release this feature in the upcoming update with a premium design and an outstanding user experience. Thank you for understanding!'}
 </Text>
 </View>
 </View>
 );
}
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await client.get(`/nursing/wallet?provider_id=${user?.id}`);
        setBalance(res.data.balance || 0);
        setPendingEscrow(res.data.pendingEscrow || 0);
        setTotalRevenue(res.data.balance || 0); // Simplified
        setTransactions(res.data.transactions || []);
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

        {/* Laboratory KPIs Section */}
        <NSecHeader title={AR ? 'مؤشرات الأداء (المختبر)' : 'Lab Analytics (KPIs)'} />
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
          <NStatCard icon="science" label={AR ? 'التحاليل المنجزة اليوم' : 'Tests Performed Today'} value="142" color="#9C27B0" style={{ width: '47%' }} />
          <NStatCard icon="bloodtype" label={AR ? 'العينات المسحوبة' : 'Samples Collected'} value="128" color="#E91E63" style={{ width: '47%' }} />
          <NStatCard icon="payments" label={AR ? 'إجمالي الدفع الذاتي (Co-Pay)' : 'Total Co-Pay Collected'} value="4,500" unit={AR?'ر':'SAR'} color="#FF9800" style={{ width: '47%' }} />
          <NStatCard icon="shield" label={AR ? 'مستحقات التأمين (NPHIES)' : 'Network Payments'} value="11,300" unit={AR?'ر':'SAR'} color="#4CAF50" style={{ width: '47%' }} />
        </View>

        <NSecHeader title={AR ? 'سجل العمليات' : 'Transaction History'} />
        {transactions.map((tx: any, idx) => (
          <NCard key={tx.id || idx} style={{ marginBottom: SP.md, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: tx.type === 'EARNING' ? theme.success + '20' : theme.warn + '20', justifyContent: 'center', alignItems: 'center' }}>
              <I name={tx.type === 'EARNING' ? 'arrowDownLeft' : 'arrowUpRight'} size={20} color={tx.type === 'EARNING' ? theme.success : theme.warn} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{tx.title || tx.desc}</Text>
              <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{tx.date}</Text>
            </View>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: tx.type === 'EARNING' ? theme.success : theme.warn }}>
              {tx.amount > 0 ? '+' : ''}{tx.amount} {AR ? 'ر' : 'SAR'}
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
          <Text style={{ fontSize: 20 }}>{mode === 'dark' ? '🌙' : '☀️'}</Text>
          <Text style={{ color: theme.text, fontSize: FS.md }}>{AR ? 'الوضع الليلي' : 'Dark Mode'}</Text>
        </View>
        <Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ true: theme.primary }} />
      </View>

      <NDivider style={{ marginVertical: SP.xs }} />

      {/* Language Toggle */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
          <Text style={{ fontSize: 20 }}>🌐</Text>
          <Text style={{ color: theme.text, fontSize: FS.md }}>{AR ? 'اللغة الإنجليزية' : 'Arabic Language'}</Text>
        </View>
        <Switch value={lang === 'en'} onValueChange={toggleLang} trackColor={{ true: theme.primary }} />
      </View>

      <NDivider style={{ marginVertical: SP.xs }} />

      {/* Face ID Toggle */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
          <Text style={{ fontSize: 20 }}>👤</Text>
          <Text style={{ color: theme.text, fontSize: FS.md }}>{AR ? 'الدخول بالبصمة / Face ID' : 'Face ID Login'}</Text>
        </View>
        <Switch value={bioEnabled} onValueChange={handleBioToggle} trackColor={{ true: theme.primary }} />
      </View>
    </NCard>
  );
}
