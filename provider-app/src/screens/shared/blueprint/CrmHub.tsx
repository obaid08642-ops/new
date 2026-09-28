import { buildHeaders } from '../../../security/Security';
import { API_BASE } from '../../../constants';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Dimensions, Switch, Platform, Alert, Vibration,
 ActivityIndicator, TextInput, Linking
} from 'react-native';
import { useTheme, useLang, useToast } from '../../../context';
import client from '../../../api/client';
import { useServicesCatalog } from '../../../api/catalogs';
import {
 NBtn, NCard, NInput, NBadge, NHeader, NScroll, NDivider,
 NPriceInput, NToggle, NSearch, NSecHeader, NStatCard, NAvatar,
 NSheet, NEmpty
} from '../../../components/ui';
import { I, IBg } from '../../../components/icons';
import { SP, R, FS, FW, C } from '../../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { H } from './_shared';

export function CrmHub({ onBack, onNavigate }: { onBack: () => void; onNavigate: (s: string) => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 // Real CRM roster — provider's tagged patients from the backend (no demo names).
 const [PATIENTS, setPatients] = useState<{ id: string; name: string; is_vip?: boolean; is_favorite?: boolean; is_blocked?: boolean }[]>([]);
 const [listLoading, setListLoading] = useState(true);
 useEffect(() => {
   client.get('/provider/crm')
     .then(r => setPatients((Array.isArray(r.data) ? r.data : (r.data?.items || [])).map((p: any) => ({
       id: p.patient_id, name: p.name, is_vip: p.is_vip, is_favorite: p.is_favorite, is_blocked: p.is_blocked,
     }))))
     .catch(() => setPatients([]))
     .finally(() => setListLoading(false));
 }, []);

 const [selectedPat, setSelectedPat] = useState<{ id: string; name: string } | null>(null);
 const [crmLoading, setCrmLoading] = useState(false);
 const [isVip, setIsVip] = useState(false);
 const [isFav, setIsFav] = useState(false);
 const [isBlocked, setIsBlocked] = useState(false);
 const [blockReason, setBlockReason] = useState('');
 const [noteText, setNoteText] = useState('');
 const [notesList, setNotesList] = useState<string[]>([]);
 const [saveLoading, setSaveLoading] = useState(false);

 const openPatientCrm = async (pat: typeof PATIENTS[0]) => {
 setSelectedPat(pat);
 setCrmLoading(true);
 try {
 const res = await client.get(`/provider/crm/${pat.id}`);
 setIsVip(Boolean(res.data.vip));
 setIsFav(Boolean(res.data.favorite));
 setIsBlocked(Boolean(res.data.blocked));
 setBlockReason(res.data.blocked_reason || '');
 setNotesList(Array.isArray(res.data.notes) ? res.data.notes.map((note: any) => typeof note === 'string' ? note : note.text).filter(Boolean) : []);
 setNoteText('');
 } catch (e) {
 show(AR ? 'فشل تحميل بيانات العميل' : 'Failed to fetch CRM data', 'error');
 } finally {
 setCrmLoading(false);
 }
 };

 const handleSaveCrm = async () => {
 if (!selectedPat) return;
 setSaveLoading(true);
 try {
 const updatedNotes = [...notesList];
 if (noteText.trim()) {
 updatedNotes.push(noteText.trim());
 }
 await client.put(`/provider/crm/${selectedPat.id}`, {
 vip: isVip,
 favorite: isFav,
 blocked: isBlocked,
 blocked_reason: isBlocked ? blockReason : '',
 notes: updatedNotes.map((text, index) => ({ id: `${selectedPat.id}-${index}`, date: new Date().toISOString().slice(0, 10), text })),
 });
 show(AR ? 'تم حفظ تفاصيل العميل بنجاح' : 'Patient CRM updated successfully', 'success');
 setSelectedPat(null);
 } catch (e) {
 show(AR ? 'فشل حفظ التحديثات' : 'Failed to update CRM data', 'error');
 } finally {
 setSaveLoading(false);
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'ذكاء الأعمال وإدارة العملاء' : 'CRM & Revenue Intelligence'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
 <NStatCard icon="" label={AR ? 'مرضى مسجلون' : 'CRM Patients'} value={String(PATIENTS.length)} color={theme.primary} style={{ flex: 1 }} />
 <NStatCard icon="" label={AR ? 'VIP' : 'VIP'} value={String(PATIENTS.filter(p => p.is_vip).length)} color={theme.info} style={{ flex: 1 }} />
 </View>

 <NSecHeader title={AR ? 'روستر المتابعة الفورية للعملاء' : 'Quick Customer Follow-up'} />
 {listLoading ? (
 <ActivityIndicator color={theme.primary} />
 ) : PATIENTS.length === 0 ? (
 <NCard>
 <Text style={{ color: theme.textSub, textAlign: 'center' }}>
 {AR ? 'لا يوجد مرضى في سجل CRM بعد — عند وضع وسوم على مرضاك من الاستشارات سيظهرون هنا.' : 'No CRM patients yet — patients you tag from consultations will appear here.'}
 </Text>
 </NCard>
 ) : PATIENTS.map((pat) => (
 <NCard key={pat.id} style={{ marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <TouchableOpacity onPress={() => openPatientCrm(pat)} style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center', flex: 1 }}>
 <NAvatar name={pat.name} size={36} />
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{pat.name}</Text>
 </TouchableOpacity>
 <TouchableOpacity onPress={() => openPatientCrm(pat)} 
 style={{ backgroundColor: theme.primaryLight, paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.sm }}>
 <Text style={{ color: theme.primary, fontSize: FS.xs, fontWeight: FW.bold }}>{AR ? 'الملف الطبي' : 'CRM Profile'}</Text>
 </TouchableOpacity>
 </View>
 </NCard>
 ))}

 <NBtn label={AR ? ' تفاصيل الإيرادات والتقارير' : ' Revenue Insights'} onPress={() => onNavigate('revenue_insights')} />
 </View>
 </NScroll>

 <NSheet visible={!!selectedPat} onClose={() => setSelectedPat(null)} title={selectedPat?.name || ''} height={H * 0.75}>
 {crmLoading ? (
 <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} />
 ) : (
 <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.lg }}>
 <NToggle label={AR?' عميل مفضل':' Favorite Patient'} value={isFav} onChange={setIsFav} />
 <NToggle label={AR ? ' عميل VIP متميز' : ' VIP Customer'} value={isVip} onChange={setIsVip} />
 <NToggle label={AR ? ' حظر العميل من الحجز' : ' Block Patient'} value={isBlocked} onChange={setIsBlocked} />
 
 {isBlocked && (
 <NInput label={AR ? 'سبب الحظر' : 'Block Reason'} value={blockReason} onChange={setBlockReason} placeholder={AR ? 'مثال: عدم الحضور المتكرر للمواعيد' : 'e.g. Frequent no-show'} />
 )}

 <NDivider />

 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'ملاحظات الطبيب الخاصة' : 'Private Provider Notes'}
 </Text>

 {notesList.map((note, idx) => (
 <View key={idx} style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: theme.border }}>
 <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{note}</Text>
 </View>
 ))}

 <NInput label={AR ? 'إضافة ملاحظة جديدة' : 'Add New Note'} value={noteText} onChange={setNoteText} placeholder={AR ? 'اكتب ملاحظتك الطبية الخاصة هنا...' : 'Type note...'} multi lines={3} />

 <NBtn label={AR ? ' حفظ التعديلات' : ' Save CRM Settings'} onPress={handleSaveCrm} loading={saveLoading} style={{ marginTop: SP.md }} />
 </ScrollView>
 )}
 </NSheet>
 </View>
 );
}

