import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AppointmentStatus } from '../../../types/contracts';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Platform, Modal, TextInput,
 RefreshControl, Switch, ActivityIndicator, KeyboardAvoidingView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NSkeleton, NOnlineToggle,
 NBottomNav, NDivider, NPriceInput, NProfileImageUploader
} from '../../../components/ui';
import { I, IBg } from '../../../components/icons';
import { SP, R, FS, FW, API_BASE } from '../../../constants';
import { buildHeaders, Vault, SK } from '../../../security/Security';
import client from '../../../api/client';
import { useServicesCatalog, getInsuranceCatalog, useSpecialtiesCatalog } from '../../../api/catalogs';
import { VideoCallRoom } from '../../shared/VideoCallRoom';
import { InsuranceRequestsScreen } from '../../shared/InsuranceRequestsScreen';
import { WithdrawalWorkflow, MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, GlobalSystemSettings, ChatSystem, MediaConfigScreen } from '../../shared/SharedScreens';
import { DoctorStatsRow } from '../components/DoctorStatsRow';
import { DoctorUrgentRequests } from '../components/DoctorUrgentRequests';
import { DoctorQueueList } from '../components/DoctorQueueList';
import { FacilityInvitationsScreen } from '../FacilityInvitationsScreen';
import {
 PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights, AiMedicalCopilot,
 SmartOutboundReferralNetwork, SosDispatchScreen, GpsRouterScreen
} from '../../shared/BlueprintScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens } from '../../../theme/tokens';
import { styles } from './_shared';

export function EPrescriptionScreen({ apt, onBack }:
 { apt: any; onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 interface Drug { id: string; name: string; dose: string; freq: string; duration: string; notes: string; }
 const [drugs, setDrugs] = useState<Drug[]>([]);
 const [search, setSearch] = useState('');
 const [drugNotes, setDrugNotes] = useState('');
 const [showDrugSearch, setDrugSearch] = useState(false);
 const [loading, setLoading] = useState(false);

 const [showTemplates, setShowTemplates] = useState(false);
 const [templates, setTemplates] = useState<any[]>([]);
 const [templatesLoading, setTemplatesLoading] = useState(false);

 async function loadTemplates() {
   setTemplatesLoading(true);
   try {
     const res = await client.get('/provider/ops/doctor/templates');
     const list = Array.isArray(res?.data) ? res.data : [];
     setTemplates(list.map((t: any) => ({
       id: String(t.id),
       titleAr: t.name, titleEn: t.name,
       drugs: (Array.isArray(t.items) ? t.items : []).map((d: any, i: number) => typeof d === 'string'
         ? { id: `t-${i}`, name: d, dose: '', freq: '', duration: '', notes: '' }
         : { id: String(d.id || `t-${i}`), name: d.name || '', dose: d.dose || '', freq: d.freq || '', duration: d.duration || '', notes: d.notes || '' }),
     })));
   } catch {
     show(AR ? 'تعذر تحميل النماذج' : 'Could not load templates', 'error');
   } finally {
     setTemplatesLoading(false);
   }
 }
 const [templateName, setTemplateName] = useState('');
 const [showSaveTemplateSheet, setShowSaveTemplateSheet] = useState(false);

 const [drugDb, setDrugDb] = useState<{name: string, id: string}[]>([]);
 useEffect(() => {
   client.get('/medicines')
     .then(res => {
       const meds = res.data || [];
       setDrugDb(meds.map((m: any) => ({ name: m.name_en || m.name_ar || m.name, id: m.id })));
     })
     .catch(() => {});
 }, []);

 const filtered = drugDb.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

 const addDrug = (name: string) => {
 const d: Drug = { id: Date.now().toString(), name, dose: '', freq: 'مرة/اليوم', duration: '7 أيام', notes: '' };
 setDrugs(prev => [...prev, d]);
 setDrugSearch(false); setSearch('');
 };

 const updateDrug = (id: string, patch: Partial<Drug>) => {
 setDrugs(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
 };

 const removeDrug = (id: string) => setDrugs(prev => prev.filter(d => d.id !== id));

 const FREQS_AR = ['مرة/اليوم','مرتين/اليوم','3 مرات/اليوم','كل 8 ساعات','عند الحاجة'];
 const FREQS_EN = ['Once daily','Twice daily','3x daily','Every 8h','As needed'];
 const DURS_AR = ['3 أيام','5 أيام','7 أيام','10 أيام','أسبوعين','شهر','مستمر'];
 const DURS_EN = ['3 days','5 days','7 days','10 days','2 weeks','1 month','Ongoing'];

 const handleSavePrescription = async () => {
  const patientId = apt?.patient_id || apt?.raw?.patient_id;
  const appointmentId = apt?.id || apt?.raw?.id;
  if (!patientId || !appointmentId) {
    show(AR ? 'معرّف المريض أو الموعد غير متاح؛ لا يمكن إصدار وصفة.' : 'Patient or appointment identifier is unavailable; a prescription cannot be issued.', 'error');
    return;
  }
  if (!drugNotes.trim() || drugs.length === 0) {
    show(AR ? 'أدخل التشخيص وأضف دواءً واحداً على الأقل.' : 'Enter a diagnosis and at least one medicine.', 'error');
    return;
  }
  if (drugs.some(d => !d.name.trim() || !d.dose.trim() || !Number.isFinite(parseInt(d.duration, 10)))) {
    show(AR ? 'أكمل اسم الدواء والجرعة والمدة لكل بند.' : 'Complete medicine name, dose, and duration for every item.', 'error');
    return;
  }
  setLoading(true);
  try {
  const payload = {
  patient_id: patientId,
  appointment_id: appointmentId,
  diagnosis: drugNotes.trim(),
  notes: drugNotes.trim(),
  erx: drugs.map(d => {
    // a drug picked from the approved catalog carries its id; anything typed is recorded as a manual line
    const hit = drugDb.find(m => m.name.trim().toLowerCase() === d.name.trim().toLowerCase());
    return {
    ...(hit ? { medicine_id: hit.id } : { manual_name_en: d.name, manual_name_ar: d.name }),
    dose: d.dose,
    duration_days: parseInt(d.duration, 10),
    instructions: `${d.freq}. ${d.notes}`.trim()
  }; }),
  labs: [],
  radiology: []
  };
  await client.post('/prescriptions/create', payload);
  show(AR ? 'تم إصدار الوصفة الطبية وإرسالها للمريض ' : 'Prescription issued and sent to patient ', 'success');
  onBack();
  } catch (err: any) {
  show(AR ? 'حدث خطأ أثناء إرسال الوصفة' : 'Error sending prescription', 'error');
  } finally {
  setLoading(false);
  }
  };

 return (
 <NScroll>
 <NHeader title={AR ? ' الوصفة الطبية الإلكترونية' : ' E-Prescription'} onBack={onBack} />

 {/* Patient info */}
 <NCard style={{ marginBottom: SP.xl, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <NAvatar name={apt?.patient ?? 'مريض'} size={44} />
 <View>
 <Text style={{ fontWeight: FW.bold, color: theme.text }}>{apt?.patient ?? '—'}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{new Date().toLocaleDateString('ar-SA')}</Text>
 </View>
 </NCard>

 {/* Template Actions */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xl }}>
 <TouchableOpacity onPress={() => { loadTemplates(); setShowTemplates(true); }} style={{ flex: 1, backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
 <Text style={{ color: theme.primary, fontWeight: FW.bold, fontSize: FS.sm }}> {AR ? 'نماذج الوصفات' : 'Prescription Templates'}</Text>
 </TouchableOpacity>
 <TouchableOpacity onPress={() => { if(drugs.length === 0) { show(AR ? 'أضف أدوية أولاً لحفظها كنموذج' : 'Add medications first to save as template', 'error'); return; } setShowSaveTemplateSheet(true); }} style={{ flex: 1, backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
 <Text style={{ color: theme.success, fontWeight: FW.bold, fontSize: FS.sm }}> {AR ? 'حفظ كنموذج' : 'Save as Template'}</Text>
 </TouchableOpacity>
 </View>

 {/* Drug interaction check — real rules engine */}
 {drugs.length >= 2 && (
 <NCard style={{ marginBottom: SP.xl, backgroundColor: theme.warnBg }}>
 <TouchableOpacity onPress={async () => {
   try {
     const res = await client.post('/ai/drug-interactions', { drugs: drugs.map((d) => d.name) });
     const hits = res?.data?.interactions || [];
     if (!hits.length) { show(AR ? 'لا توجد تفاعلات معروفة بين هذه الأدوية' : 'No known interactions between these drugs', 'success'); return; }
     show((AR ? 'تفاعلات مكتشفة: ' : 'Interactions found: ') + hits.map((h: any) => h.note_ar || h.note || h.severity).join('؛ '), 'warning');
   } catch {
     show(AR ? 'تعذر فحص التفاعلات' : 'Could not check interactions', 'error');
   }
 }}>
 <Text style={{ fontSize: FS.sm, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'افحص التفاعلات الدوائية قبل الحفظ' : 'Check drug interactions before saving'}
 </Text>
 </TouchableOpacity>
 </NCard>
 )}

 {/* Added drugs */}
 {drugs.map(drug => (
 <NCard key={drug.id} style={{ marginBottom: SP.md }} accent={theme.primary}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}> {drug.name}</Text>
 <TouchableOpacity onPress={() => removeDrug(drug.id)}>
 <Text style={{ color: theme.danger, fontSize: FS.sm }}> {AR ? 'حذف' : 'Remove'}</Text>
 </TouchableOpacity>
 </View>

 <NInput label={AR ? 'الجرعة' : 'Dosage'} placeholder={AR ? 'مثال: قرص واحد' : 'e.g., 1 tablet'}
 value={drug.dose} onChange={v => updateDrug(drug.id, { dose: v })} icon="" />

 {/* Frequency */}
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.sm,
 textAlign: AR ? 'right' : 'left' }}>{AR ? 'التكرار:' : 'Frequency:'}</Text>
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection: 'row', gap: SP.sm, marginBottom: SP.md }}>
 {(AR ? FREQS_AR : FREQS_EN).map(f => (
 <TouchableOpacity key={f} onPress={() => updateDrug(drug.id, { freq: f })}
 style={[styles.freqChip, {
 backgroundColor: drug.freq === f ? theme.primary : theme.surface2,
 borderColor: drug.freq === f ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: drug.freq === f ? 'var(--nabd-bg.surface-light)' : theme.text, fontSize: FS.xs }}>{f}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>

 {/* Duration */}
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.sm,
 textAlign: AR ? 'right' : 'left' }}>{AR ? 'المدة:' : 'Duration:'}</Text>
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection: 'row', gap: SP.sm }}>
 {(AR ? DURS_AR : DURS_EN).map(d => (
 <TouchableOpacity key={d} onPress={() => updateDrug(drug.id, { duration: d })}
 style={[styles.freqChip, {
 backgroundColor: drug.duration === d ? theme.info : theme.surface2,
 borderColor: drug.duration === d ? theme.info : theme.border,
 }]}>
 <Text style={{ color: drug.duration === d ? 'var(--nabd-bg.surface-light)' : theme.text, fontSize: FS.xs }}>{d}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>
 </NCard>
 ))}

 {/* Add drug button */}
 <NBtn label={AR ? '+ إضافة دواء' : '+ Add Medication'} variant="outline"
 onPress={() => setDrugSearch(true)} style={{ marginBottom: SP.lg }} />

 {/* General notes */}
 <NInput label={AR ? 'تعليمات إضافية للمريض' : 'Additional Patient Instructions'}
 placeholder={AR ? 'مثال: تناول الدواء بعد الأكل، الإكثار من الماء...' : 'e.g., Take with food, drink plenty of water...'}
 value={drugNotes} onChange={setDrugNotes} multi lines={3} icon="" />

 {/* Routing options */}
 <NCard style={{ marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text,
 marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'إرسال الوصفة إلى:' : 'Send Prescription to:'}
 </Text>
 {[
 { icon:'messageSquare', ar:'المريض مباشرة (WhatsApp / SMS)', en:'Patient directly (WhatsApp / SMS)' },
 { icon:'box', ar:'صيدلية في نبض بلس', en:'Pharmacy on Nabd Plus' },
 { icon:'printer', ar:'طباعة PDF', en:'Print / PDF' },
 ...(apt?.insurance && apt.insurance !== 'Cash' ? [{ icon:'shield', ar:'رفع للاعتماد التأميني (Pre-Approval)', en:'Send for Insurance Pre-Approval (TPA)' }] : []),
 ].map((opt, i) => (
 <TouchableOpacity key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md,
 paddingVertical: SP.md, alignItems: 'center',
 borderBottomWidth: i < 2 ? StyleSheet.hairlineWidth : 0, borderBottomColor: theme.border }}>
 <I name={opt.icon} size={20} color={theme.textSub} />
 <Text style={{ flex: 1, color: theme.text, fontSize: FS.md, textAlign: AR ? 'right' : 'left' }}>
 {AR ? opt.ar : opt.en}
 </Text>
 <I name="chevronRight" size={16} color={theme.textSub} />
 </TouchableOpacity>
 ))}
 </NCard>

 <NBtn label={AR ? ' حفظ وإصدار الوصفة' : ' Save & Issue Prescription'}
 disabled={drugs.length === 0}
 loading={loading}
 onPress={handleSavePrescription} />

 {/* Drug search sheet */}
 <NSheet visible={showDrugSearch} onClose={() => setDrugSearch(false)}
 title={AR ? 'البحث عن دواء' : 'Search Medication'} height={500}>
 <NSearch value={search} onChange={setSearch} placeholder={AR ? 'اسم الدواء...' : 'Medication name...'} />
 <View style={{ marginTop: SP.md }}>
 {/* Custom Medication Entry */}
 {search.trim().length > 0 && (
 <TouchableOpacity onPress={() => addDrug(search.trim())}
 style={[styles.drugRow, { borderBottomColor: theme.border, backgroundColor: theme.primaryLight, marginBottom: SP.sm }]}>
 <Text style={{ fontSize: 18 }}>✍️</Text>
 <Text style={{ flex: 1, color: theme.primary, fontSize: FS.md, fontWeight: FW.bold }}>
 {AR ? `إضافة دواء غير مدرج: "${search.trim()}"` : `Add Custom Med: "${search.trim()}"`}
 </Text>
 <Text style={{ color: theme.primary }}>+ {AR ? 'إضافة' : 'Add'}</Text>
 </TouchableOpacity>
 )}
 {filtered.slice(0, 15).map(d => (
 <TouchableOpacity key={d.id} onPress={() => addDrug(d.name)}
 style={[styles.drugRow, { borderBottomColor: theme.border }]}>
 <Text style={{ fontSize: 18 }}>💊</Text>
 <Text style={{ flex: 1, color: theme.text, fontSize: FS.md }}>{d.name}</Text>
 <Text style={{ color: theme.primary }}>+ {AR ? 'إضافة' : 'Add'}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </NSheet>

 {/* Load Template Sheet */}
 <NSheet visible={showTemplates} onClose={() => setShowTemplates(false)} title={AR ? ' اختر نموذج وصفة' : ' Load Prescription Template'} height={400}>
 <View style={{ padding: SP.md }}>
 {templatesLoading ? <ActivityIndicator color={theme.primary} /> : null}
 {templates.map(t => (
 <View key={t.id} style={{ padding: SP.md, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <TouchableOpacity style={{ flex: 1 }} onPress={() => { setDrugs(t.drugs); setShowTemplates(false); show(AR ? 'تم تحميل النموذج' : 'Template loaded successfully', 'success'); }}>
 <Text style={{ color: theme.text, fontSize: FS.md, fontWeight: FW.bold }}>{AR ? t.titleAr : t.titleEn}</Text>
 <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{t.drugs.length} {AR ? 'أدوية' : 'drugs'}</Text>
 </TouchableOpacity>
 <TouchableOpacity onPress={async () => {
   try {
     await client.delete(`/provider/ops/doctor/templates/${t.id}`);
     setTemplates((prev) => prev.filter((x) => x.id !== t.id));
   } catch {
     show(AR ? 'تعذر حذف النموذج' : 'Could not delete template', 'error');
   }
 }} style={{ padding: SP.sm }}>
 <Text style={{ color: theme.danger, fontSize: FS.sm }}>{AR ? 'حذف' : 'Delete'}</Text>
 </TouchableOpacity>
 </View>
 ))}
 </View>
 </NSheet>

 {/* Save Template Sheet */}
 <NSheet visible={showSaveTemplateSheet} onClose={() => setShowSaveTemplateSheet(false)} title={AR ? ' حفظ كنموذج جديد' : ' Save Custom Template'} height={300}>
 <View style={{ padding: SP.md }}>
 <NInput label={AR ? 'اسم النموذج' : 'Template Title'} value={templateName} onChange={setTemplateName} placeholder={AR ? 'مثال: نموذج علاج الربو' : 'e.g., Asthma Treatment'} />
 <NBtn label={AR ? ' حفظ' : ' Save'} onPress={async () => {
 if (!templateName.trim()) { show(AR ? 'يرجى إدخال اسم النموذج' : 'Please enter template title', 'error'); return; }
 try {
   await client.post('/provider/ops/doctor/templates', { name: templateName.trim(), items: drugs.map((d) => ({ name: d.name, dose: d.dose, freq: d.freq, duration: d.duration, notes: d.notes })) });
   setShowSaveTemplateSheet(false);
   setTemplateName('');
   show(AR ? 'تم حفظ النموذج الجديد بنجاح' : 'Template saved successfully', 'success');
   loadTemplates();
 } catch (err: any) {
   show(err?.response?.data?.message || (AR ? 'تعذر حفظ النموذج' : 'Could not save template'), 'error');
 }
 }} />
 </View>
 </NSheet>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// DIGITAL SICK LEAVE SCREEN
