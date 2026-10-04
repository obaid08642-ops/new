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
 accent={ticket.status === 'open' ? tokens.warning : ticket.status === AppointmentStatus.IN_PROGRESS ? tokens.info : tokens.success}>
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
      await client.post('/support/tickets', { subject, message: body });
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
// 11. REVIEWS SYSTEM — Unified reviews + auto-reply
