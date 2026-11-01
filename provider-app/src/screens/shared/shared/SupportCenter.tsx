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

import { asTickets, asFaqs, faqText, serverMessage, type SupportTicket, type SupportFaq } from './supportTickets';

export function SupportCenter({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang, t } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [tab, setTab] = useState<'tickets' | 'faq' | 'new'>('tickets');
 const [subject, setSubject] = useState(''); const [body, setBody] = useState(''); const [loading, setLoading] = useState(false);

 // The provider's own requests and the FAQs the admin wrote: both from the server (they were hard-coded sample tickets and FAQ text).
 const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
 const [faqs, setFaqs] = useState<SupportFaq[] | null>(null);
 const [loadFailed, setLoadFailed] = useState(false);
 const loadSupport = useCallback(() => {
   setLoadFailed(false);
   client.get('/support/tickets').then((r: any) => setTickets(asTickets(r?.data))).catch(() => { setTickets([]); setLoadFailed(true); });
   client.get('/support/faqs').then((r: any) => setFaqs(asFaqs(r?.data))).catch(() => setFaqs([]));
 }, []);
 useEffect(() => { loadSupport(); }, [loadSupport]);

 const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

 return (
 <NScroll>
 <NHeader title={t('support.title')} onBack={onBack} />

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

 {tab === 'tickets' && (tickets === null ? <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} /> : (
   <>
   {loadFailed && <NEmpty title={t('support.loadFailed')} actionLabel={t('common.retry')} onAction={loadSupport} />}
   {!loadFailed && tickets.length === 0 && <NEmpty title={AR ? 'لا توجد تذاكر بعد' : 'No tickets yet'} />}
   {tickets.map(ticket => (
 <NCard key={ticket.id} style={{ marginBottom: SP.md }}
 accent={ticket.status === 'open' ? tokens.warning : ticket.status === 'in_progress' ? tokens.info : tokens.success}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
 <Text style={{ flex: 1, fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{ticket.subject}</Text>
 <NBadge label={ticket.status === 'open' ? (AR ? 'مفتوحة' : 'Open') : ticket.status === 'in_progress' ? (AR ? 'قيد المعالجة' : 'In Progress') : (AR ? 'محلولة' : 'Resolved')}
 variant={ticket.status === 'open' ? 'warning' : ticket.status === 'in_progress' ? 'primary' : 'success'} size="xs" />
 </View>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{ticket.tracking_id ? `${ticket.tracking_id} | ` : ''}{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString(AR ? 'ar-SA-u-ca-gregory' : 'en-GB') : ''}</Text>
 </NCard>
   ))}
   </>
 ))}

 {tab === 'faq' && faqs !== null && faqs.length === 0 && <NEmpty title={AR ? 'لا توجد أسئلة شائعة بعد' : 'No FAQs yet'} />}
 {tab === 'faq' && (faqs || []).map((faq, i) => (
 <NCard key={faq.id} style={{ marginBottom: SP.sm }}>
 <TouchableOpacity onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
 style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <I name={expandedFaq === i ? 'close' : 'plus'} size={16} color={theme.primary} />
 <Text style={{ flex: 1, fontSize: FS.md, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{faqText(faq, AR).q}</Text>
 </TouchableOpacity>
 {expandedFaq === i && (
 <Text style={{ fontSize: FS.sm, color: theme.textSub, lineHeight: 22, marginTop: SP.md, textAlign: AR ? 'right' : 'left', paddingHorizontal: SP.xl }}>
 {faqText(faq, AR).a}
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
      await client.post('/support/tickets', { subject: subject.trim(), message: body.trim() });
     show(AR ? 'تم إرسال التذكرة — سنرد خلال 24 ساعة' : 'Ticket submitted — reply within 24h', 'success');
     setSubject('');
     setBody('');
     setTab('tickets');
     loadSupport();
   } catch (e: any) {
     show(serverMessage(e, AR ? 'تعذر إرسال التذكرة' : 'Could not submit the ticket'), 'error');
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
