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
import { _styles } from './_shared';

export function AiMedicalCopilot({ onBack }: { onBack: () => void }) {
 const insets = useSafeAreaInsets();
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [soap, setSoap] = useState({ s: '', o: '', a: '', p: '' });
 const [loading, setLoading] = useState(false);
 const [aiSuggestion, setAiSuggestion] = useState('');
 const [aiLoading, setAiLoading] = useState(false);
 const [patients, setPatients] = useState<any[]>([]);
 const [selectedPatient, setSelectedPatient] = useState<any>(null);

 useEffect(() => {
   // Real active patients from the doctor's queue — the note must belong to a real patient.
   client.get('/provider/jobs/queue?status=active')
     .then(r => {
       const rows = Array.isArray(r.data) ? r.data : (r.data?.items || []);
       setPatients(rows);
     })
     .catch(() => setPatients([]));
 }, []);

 const askCopilot = async () => {
   const notes = [soap.s, soap.o].filter(Boolean).join('\n');
   if (!notes.trim()) {
     show(AR ? 'اكتب الشكوى والعلامات أولاً ليقترح المساعد' : 'Enter subjective/objective notes first', 'error');
     return;
   }
   setAiLoading(true);
   try {
     const r = await client.post('/ai/copilot/suggest', { notes });
     setAiSuggestion(r.data?.suggestion || r.data?.response || '');
   } catch {
     show(AR ? 'تعذر الحصول على اقتراح AI حالياً' : 'AI suggestion unavailable right now', 'error');
   } finally { setAiLoading(false); }
 };

 const submitSoap = async () => {
   const note = [
     soap.s && `S: ${soap.s}`,
     soap.o && `O: ${soap.o}`,
     soap.a && `A: ${soap.a}`,
     soap.p && `P: ${soap.p}`,
   ].filter(Boolean).join('\n');
   if (!note.trim()) {
     show(AR ? 'اكتب الملاحظة السريرية أولاً' : 'Write the clinical note first', 'error');
     return;
   }
   const patientId = selectedPatient?.patient_id || selectedPatient?.patientId || selectedPatient?.patient?.id;
   if (!patientId) {
     show(AR ? 'اختر المريض الذي تخصه الملاحظة' : 'Select the patient this note belongs to', 'error');
     return;
   }
   // F26: nursing progress notes live at /nursing/notes (booking-bound server-side).
   const bookingId = selectedPatient?.booking_id || selectedPatient?.bookingId || selectedPatient?.visit_id || selectedPatient?.appointment_id;
   if (!bookingId) {
     show(AR ? 'اختر زيارة/حجزاً لتوثيق الملاحظة عليه' : 'Select a visit/booking for this note', 'error');
     return;
   }
   setLoading(true);
   try {
     await client.post('/nursing/notes', { patient_id: patientId, booking_id: bookingId, note });
     show(AR ? 'تم حفظ التقرير الطبي بنجاح' : 'Clinical SOAP note saved', 'success');
     onBack();
   } catch (err: any) {
     show(err?.response?.data?.message || (AR ? 'فشل الحفظ' : 'Failed to save'), 'error');
   } finally {
     setLoading(false);
   }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[_styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
 <TouchableOpacity onPress={onBack}><I name="back" size={20} color={theme.primary} /></TouchableOpacity>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}> {AR ? 'السجل الطبي ومساعد AI' : 'EMR & AI Copilot'}</Text>
 <View style={{ width: 20 }} />
 </View>

 <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SP.xl, gap: SP.xl }}>
 {aiSuggestion ? (
 <NCard style={{ backgroundColor: theme.surface2, borderColor: theme.primary, borderWidth: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
  {AR?'تحليل AI مقترح:':'AI Suggested Analysis:'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', lineHeight: 22 }}>{aiSuggestion}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textHint, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'إخلاء مسؤولية: اقتراح AI مساعد فقط — القرار السريري النهائي للطبيب.' : 'Disclaimer: AI suggestion is advisory only — final clinical decision rests with the physician.'}
 </Text>
 </NCard>
 ) : (
 <NBtn label={aiLoading ? (AR ? 'جارٍ تحليل الملاحظات…' : 'Analyzing notes…') : (AR ? ' اقتراح AI بناءً على الملاحظات' : ' Get AI suggestion from notes')} variant="outline" onPress={askCopilot} loading={aiLoading} />
 )}

 {/* Patient selector — the note must attach to a real patient */}
 <View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'المريض (من قائمة العمل النشطة)' : 'Patient (from your active queue)'}
 </Text>
 {patients.length === 0 ? (
 <Text style={{ fontSize: FS.xs, color: theme.textHint, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'لا يوجد مرضى نشطون حالياً في قائمتك.' : 'No active patients in your queue right now.'}
 </Text>
 ) : (
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
 {patients.map((p: any, i: number) => {
 const pid = p.patient_id || p.patientId || p.patient?.id || i;
 const name = p.patient || p.patient_name || p.patient?.full_name || `#${pid}`;
 const sel = selectedPatient && (selectedPatient.patient_id || selectedPatient.patientId || selectedPatient.patient?.id) === (p.patient_id || p.patientId || p.patient?.id);
 return (
 <TouchableOpacity key={pid} onPress={() => setSelectedPatient(p)}
 style={{ paddingHorizontal: SP.md, paddingVertical: 8, borderRadius: R.full, borderWidth: 1.5,
 backgroundColor: sel ? theme.primary : theme.surface2, borderColor: sel ? theme.primary : theme.border }}>
 <Text style={{ color: sel ? '#FFF' : theme.text, fontSize: FS.sm }}>{name}</Text>
 </TouchableOpacity>
 );
 })}
 </View>
 </ScrollView>
 )}
 </View>

 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'ملاحظات SOAP السريرية' : 'Clinical SOAP Notes'}
 </Text>

 <View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>S - Subjective</Text>
 <TextInput style={{ backgroundColor: theme.surface, color: theme.text, padding: SP.md, borderRadius: R.md, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left' }} multiline placeholder={AR ? "شكوى المريض..." : "Patient complaint..."} placeholderTextColor={theme.textSub} value={soap.s} onChangeText={t => setSoap({...soap, s: t})} />
 </View>

 <View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>O - Objective</Text>
 <TextInput style={{ backgroundColor: theme.surface, color: theme.text, padding: SP.md, borderRadius: R.md, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left' }} multiline placeholder={AR ? "العلامات الحيوية..." : "Vitals, observations..."} placeholderTextColor={theme.textSub} value={soap.o} onChangeText={t => setSoap({...soap, o: t})} />
 </View>
 
 <View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>A - Assessment</Text>
 <TextInput style={{ backgroundColor: theme.surface, color: theme.text, padding: SP.md, borderRadius: R.md, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left' }} multiline placeholder={AR ? "التشخيص المبدئي..." : "Initial diagnosis..."} placeholderTextColor={theme.textSub} value={soap.a} onChangeText={t => setSoap({...soap, a: t})} />
 </View>

 <View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>P - Plan</Text>
 <TextInput style={{ backgroundColor: theme.surface, color: theme.text, padding: SP.md, borderRadius: R.md, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left' }} multiline placeholder={AR ? "الخطة العلاجية..." : "Treatment plan..."} placeholderTextColor={theme.textSub} value={soap.p} onChangeText={t => setSoap({...soap, p: t})} />
 </View>

 <NBtn label={AR ? ' حفظ السجل الطبي' : ' Save EMR Entry'} onPress={submitSoap} loading={loading} />
 </ScrollView>
 </View>
 );
}

// 3.2 SMART OUTBOUND REFERRAL NETWORK
