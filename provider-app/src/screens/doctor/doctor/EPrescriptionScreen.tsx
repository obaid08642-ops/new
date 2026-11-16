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
 PromotionsDashboard, CreateCampaignScreen, 
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights, AiMedicalCopilot,
 SmartOutboundReferralNetwork
} from '../../shared/BlueprintScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens } from '../../../theme/tokens';
import { styles } from './_shared';
import { fmtDate } from '../../../utils/dates';

export function EPrescriptionScreen({ apt, onBack }:
 { apt: any; onBack: () => void }) {
 const { theme } = useTheme();
 const { lang, t: tt } = useLang();
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

 const templateDrugs = (items: unknown): Drug[] => (Array.isArray(items) ? items : []).map((d: any, i: number) => typeof d === 'string'
   ? { id: `t-${i}`, name: d, dose: '', freq: '', duration: '', notes: '' }
   : { id: String(d.id || `t-${i}`), name: d.name || '', dose: d.dose || '', freq: d.freq || '', duration: d.duration || '', notes: d.notes || '' });

 async function loadTemplates() {
   setTemplatesLoading(true);
   try {
     const res = await client.get('/provider/ops/doctor/templates');
     const list = Array.isArray(res?.data) ? res.data : [];
     setTemplates(list.map((t: any) => ({
       id: String(t.id),
       titleAr: t.name, titleEn: t.name,
       drugs: templateDrugs(t.items),
     })));
   } catch {
     show(tt('erx.b54539d5'), 'error');
   } finally {
     setTemplatesLoading(false);
   }
 }
 // Applying a template is recorded on the server (POST .../templates/:id/use counts the use, which orders the list)
 // and the form is filled from the template the server returns, so the success message follows a real response.
 const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);
 async function applyTemplate(id: string) {
   setApplyingTemplate(id);
   try {
     const res = await client.post(`/provider/ops/doctor/templates/${encodeURIComponent(id)}/use`, {});
     const items = templateDrugs(res?.data?.items);
     if (!items.length) {
       show(tt('erx.072abc38'), 'error');
       return;
     }
     setDrugs(items);
     setShowTemplates(false);
     show(tt('erx.a2b011f0'), 'success');
   } catch (err: any) {
     show(err?.response?.data?.message || (tt('erx.c48b2cdd')), 'error');
   } finally {
     setApplyingTemplate(null);
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
 // "Ongoing" is not a number of days, which the server requires: it is not offered
 const DURS_AR = ['3 أيام','5 أيام','7 أيام','10 أيام','أسبوعين','شهر'];
 const DURS_EN = ['3 days','5 days','7 days','10 days','2 weeks','1 month'];

 const handleSavePrescription = async () => {
  const patientId = apt?.patient_id || apt?.raw?.patient_id;
  const appointmentId = apt?.id || apt?.raw?.id;
  if (!patientId || !appointmentId) {
    show(tt('erx.887955de'), 'error');
    return;
  }
  if (!drugNotes.trim() || drugs.length === 0) {
    show(tt('erx.b4f0488e'), 'error');
    return;
  }
  if (drugs.some(d => !d.name.trim() || !d.dose.trim() || !(durationDays(d.duration) > 0))) {
    show(tt('erx.98abbdc2'), 'error');
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
    duration_days: durationDays(d.duration),
    instructions: `${d.freq}. ${d.notes}`.trim()
  }; }),
  labs: [],
  radiology: []
  };
  await client.post('/prescriptions/create', payload);
  show(tt('erx.89083f12'), 'success');
  onBack();
  } catch (err) {
  const raw = String((err as { response?: { data?: { message?: unknown } } })?.response?.data?.message || '');
  // server rule: only an IN_PROGRESS appointment of this doctor accepts a prescription
  show(/in-progress appointment/i.test(raw)
    ? (tt('erx.ce3f22cf'))
    : (raw || (tt('erx.33d8c561'))), 'error');
  } finally {
  setLoading(false);
  }
  };

 return (
 <NScroll>
 <NHeader title={tt('erx.09baafb0')} onBack={onBack} />

 {/* Patient info */}
 <NCard style={{ marginBottom: SP.xl, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <NAvatar name={apt?.patient ?? 'مريض'} size={44} />
 <View>
 <Text style={{ fontWeight: FW.bold, color: theme.text }}>{apt?.patient ?? '—'}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{fmtDate(new Date(), AR)}</Text>
 </View>
 </NCard>

 {/* Template Actions */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xl }}>
 <TouchableOpacity onPress={() => { loadTemplates(); setShowTemplates(true); }} style={{ flex: 1, backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
 <Text style={{ color: theme.primary, fontWeight: FW.bold, fontSize: FS.sm }}> {tt('erx.e9ef1b2c')}</Text>
 </TouchableOpacity>
 <TouchableOpacity onPress={() => { if(drugs.length === 0) { show(tt('erx.bf3bbcf2'), 'error'); return; } setShowSaveTemplateSheet(true); }} style={{ flex: 1, backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
 <Text style={{ color: theme.success, fontWeight: FW.bold, fontSize: FS.sm }}> {tt('erx.8e5e577e')}</Text>
 </TouchableOpacity>
 </View>

 {/* Drug interaction check — real rules engine */}
 {drugs.length >= 2 && (
 <NCard style={{ marginBottom: SP.xl, backgroundColor: theme.warnBg }}>
 <TouchableOpacity onPress={async () => {
   try {
     const res = await client.post('/ai/drug-interactions', { drugs: drugs.map((d) => d.name) });
     const hits = res?.data?.interactions || [];
     if (!hits.length) { show(tt('erx.e8189000'), 'success'); return; }
     show((tt('erx.d14d8815')) + hits.map((h: any) => h.note_ar || h.note || h.severity).join('؛ '), 'warning');
   } catch {
     show(tt('erx.a375caa7'), 'error');
   }
 }}>
 <Text style={{ fontSize: FS.sm, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
 {tt('erx.bc3a88fa')}
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
 <Text style={{ color: theme.danger, fontSize: FS.sm }}> {tt('erx.6c1218f6')}</Text>
 </TouchableOpacity>
 </View>

 <NInput label={tt('erx.edffda1a')} placeholder={tt('erx.3a8d0534')}
 value={drug.dose} onChange={v => updateDrug(drug.id, { dose: v })} icon="" />

 {/* Frequency */}
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.sm,
 textAlign: AR ? 'right' : 'left' }}>{tt('erx.0b9a86ba')}</Text>
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection: 'row', gap: SP.sm, marginBottom: SP.md }}>
 {(AR ? FREQS_AR : FREQS_EN).map(f => (
 <TouchableOpacity key={f} onPress={() => updateDrug(drug.id, { freq: f })}
 style={[styles.freqChip, {
 backgroundColor: drug.freq === f ? theme.primary : theme.surface2,
 borderColor: drug.freq === f ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: drug.freq === f ? '#FFF' : theme.text, fontSize: FS.xs }}>{f}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>

 {/* Duration */}
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.sm,
 textAlign: AR ? 'right' : 'left' }}>{tt('erx.504cba55')}</Text>
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection: 'row', gap: SP.sm }}>
 {(AR ? DURS_AR : DURS_EN).map(d => (
 <TouchableOpacity key={d} onPress={() => updateDrug(drug.id, { duration: d })}
 style={[styles.freqChip, {
 backgroundColor: drug.duration === d ? theme.info : theme.surface2,
 borderColor: drug.duration === d ? theme.info : theme.border,
 }]}>
 <Text style={{ color: drug.duration === d ? '#FFF' : theme.text, fontSize: FS.xs }}>{d}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>
 </NCard>
 ))}

 {/* Add drug button */}
 <NBtn label={tt('erx.3f4e986e')} variant="outline"
 onPress={() => setDrugSearch(true)} style={{ marginBottom: SP.lg }} />

 {/* General notes */}
 <NInput label={tt('erx.4e95ecf8')}
 placeholder={tt('erx.3f325afc')}
 value={drugNotes} onChange={setDrugNotes} multi lines={3} icon="" />

 {/* Needs-review issue 1115: the "send to" options had no action; POST /prescriptions/create already delivers the prescription to the patient. */}

 <NBtn label={tt('erx.a87594d0')}
 disabled={drugs.length === 0}
 loading={loading}
 onPress={handleSavePrescription} />

 {/* Drug search sheet */}
 <NSheet visible={showDrugSearch} onClose={() => setDrugSearch(false)}
 title={tt('erx.fc58c203')} height={500}>
 <NSearch value={search} onChange={setSearch} placeholder={tt('erx.859aa24c')} />
 <View style={{ marginTop: SP.md }}>
 {/* Custom Medication Entry */}
 {search.trim().length > 0 && (
 <TouchableOpacity onPress={() => addDrug(search.trim())}
 style={[styles.drugRow, { borderBottomColor: theme.border, backgroundColor: theme.primaryLight, marginBottom: SP.sm }]}>
 <Text style={{ fontSize: 18 }}>✍️</Text>
 <Text style={{ flex: 1, color: theme.primary, fontSize: FS.md, fontWeight: FW.bold }}>
 {tt('tph.638f95bd', { p1: String(search.trim()) })}
 </Text>
 <Text style={{ color: theme.primary }}>+ {tt('erx.49d91d0a')}</Text>
 </TouchableOpacity>
 )}
 {filtered.slice(0, 15).map(d => (
 <TouchableOpacity key={d.id} onPress={() => addDrug(d.name)}
 style={[styles.drugRow, { borderBottomColor: theme.border }]}>
 <Text style={{ fontSize: 18 }}>💊</Text>
 <Text style={{ flex: 1, color: theme.text, fontSize: FS.md }}>{d.name}</Text>
 <Text style={{ color: theme.primary }}>+ {tt('erx.49d91d0a')}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </NSheet>

 {/* Load Template Sheet */}
 <NSheet visible={showTemplates} onClose={() => setShowTemplates(false)} title={tt('erx.2336da27')} height={400}>
 <View style={{ padding: SP.md }}>
 {templatesLoading ? <ActivityIndicator color={theme.primary} /> : null}
 {templates.map(t => (
 <View key={t.id} style={{ padding: SP.md, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <TouchableOpacity style={{ flex: 1 }} disabled={applyingTemplate !== null} onPress={() => applyTemplate(t.id)}>
 <Text style={{ color: theme.text, fontSize: FS.md, fontWeight: FW.bold }}>{AR ? t.titleAr : t.titleEn}</Text>
 <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{t.drugs.length} {AR ? 'أدوية' : 'drugs'}</Text>
 </TouchableOpacity>
 <TouchableOpacity onPress={async () => {
   try {
     await client.delete(`/provider/ops/doctor/templates/${t.id}`);
     setTemplates((prev) => prev.filter((x) => x.id !== t.id));
   } catch {
     show(tt('erx.54ce0938'), 'error');
   }
 }} style={{ padding: SP.sm }}>
 <Text style={{ color: theme.danger, fontSize: FS.sm }}>{tt('erx.2257cab6')}</Text>
 </TouchableOpacity>
 </View>
 ))}
 </View>
 </NSheet>

 {/* Save Template Sheet */}
 <NSheet visible={showSaveTemplateSheet} onClose={() => setShowSaveTemplateSheet(false)} title={tt('erx.c49a61a3')} height={300}>
 <View style={{ padding: SP.md }}>
 <NInput label={tt('erx.ee1f3a13')} value={templateName} onChange={setTemplateName} placeholder={tt('erx.1e45621c')} />
 <NBtn label={tt('erx.89af874d')} onPress={async () => {
 if (!templateName.trim()) { show(tt('erx.521f0881'), 'error'); return; }
 try {
   await client.post('/provider/ops/doctor/templates', { name: templateName.trim(), items: drugs.map((d) => ({ name: d.name, dose: d.dose, freq: d.freq, duration: d.duration, notes: d.notes })) });
   setShowSaveTemplateSheet(false);
   setTemplateName('');
   show(tt('erx.964ef73e'), 'success');
   loadTemplates();
 } catch (err: any) {
   show(err?.response?.data?.message || (tt('erx.4b6d7deb')), 'error');
 }
 }} />
 </View>
 </NSheet>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// DIGITAL SICK LEAVE SCREEN

/** The number of days a duration chip means ("10 days" 10, "2 weeks" 14, "1 month" 30, "أسبوعين" 14, "شهر" 30); 0 when it is not a number of days. */
export function durationDays(label: string): number {
  const t = String(label || '').trim().toLowerCase();
  if (t === 'أسبوعين') return 14;
  if (t === 'شهر') return 30;
  const m = /^(\d+)\s*(day|days|week|weeks|month|months|يوم|أيام|ايام|أسبوع|أسابيع|شهر|أشهر)?/.exec(t);
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = m[2] || 'days';
  return /week|أسبوع|أسابيع/.test(unit) ? n * 7 : /month|شهر|أشهر/.test(unit) ? n * 30 : n;
}
