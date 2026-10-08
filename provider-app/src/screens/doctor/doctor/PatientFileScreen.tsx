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
 SmartOutboundReferralNetwork, SosDispatchScreen, GpsRouterScreen
} from '../../shared/BlueprintScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens } from '../../../theme/tokens';
import { styles } from './_shared';

// ══════════════════════════════════════════════════════════════════════════════
// PATIENT FILE SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function PatientFileScreen({ patient, onBack }:
 { patient: any; onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [activeSection, setActive] = useState('overview');

 // Client CRM States — persisted via provider CRM + blacklist endpoints
 const patientId = String(patient?.patient_id || patient?.id || '');
 const [isVip, setIsVip] = useState(patient?.insurance?.includes('VIP') || false);
 const [isBlocked, setIsBlocked] = useState(false);
 const [isFavorite, setIsFavorite] = useState(false);
 const [customTags, setCustomTags] = useState<string[]>([]);
 const [newTag, setNewTag] = useState('');
 const [crmNotes, setCrmNotes] = useState<Array<{ id: string; date: string; text: string }>>([]);
 const [newNote, setNewNote] = useState('');

 useEffect(() => {
   if (!patientId) return;
   client.get(`/provider/ops/doctor/patient-crm/${encodeURIComponent(patientId)}`).then((res) => {
     const d = res?.data?.data || res?.data || {};
     if (Array.isArray(d.tags)) setCustomTags(d.tags.filter((t: any) => typeof t === 'string'));
     if (Array.isArray(d.notes)) setCrmNotes(d.notes);
     if (typeof d.vip === 'boolean') setIsVip(d.vip);
     if (typeof d.favorite === 'boolean') setIsFavorite(d.favorite);
   }).catch(() => {});
   client.get('/provider/ops/doctor/blacklist').then((res) => {
     const list = Array.isArray(res?.data) ? res.data : [];
     if (list.some((b: any) => String(b.patient_id || b.patientId || b.id) === patientId)) setIsBlocked(true);
   }).catch(() => {});
 }, [patientId]);

 const sections = [
 { k:'overview', ar:'نظرة عامة', en:'Overview' },
 { k:'crm', ar:'إدارة العميل (CRM)', en:'Client CRM' },
 { k:'visits', ar:'الزيارات', en:'Visits' },
 { k:'rx', ar:'الوصفات', en:'Rx' },
 { k:'labs', ar:'التحاليل', en:'Labs' },
 { k:'allergies',ar:'الحساسية', en:'Allergies' },
 ];

 async function persistCrm(patch: any) {
   if (!patientId) return;
   try {
     await client.put(`/provider/ops/doctor/patient-crm/${encodeURIComponent(patientId)}`, patch);
   } catch {
     show(AR ? 'تعذر حفظ بيانات العميل' : 'Could not save client data', 'error');
   }
 }

 const handleAddTag = () => {
 if (!newTag.trim()) return;
 if (customTags.includes(newTag.trim())) {
 show(AR ? 'الوسم مضاف بالفعل' : 'Tag already exists', 'warning');
 return;
 }
 const next = [...customTags, newTag.trim()];
 setCustomTags(next);
 setNewTag('');
 persistCrm({ tags: next });
 show(AR ? 'تم إضافة الوسم' : 'Tag added successfully', 'success');
 };

 const handleRemoveTag = (tag: string) => {
 const next = customTags.filter(t => t !== tag);
 setCustomTags(next);
 persistCrm({ tags: next });
 show(AR ? 'تم حذف الوسم' : 'Tag removed', 'info');
 };

 const handleAddNote = () => {
 if (!newNote.trim()) return;
 const dateStr = new Date().toISOString().split('T')[0];
 const next = [{ id: Date.now().toString(), date: dateStr, text: newNote.trim() }, ...crmNotes];
 setCrmNotes(next);
 setNewNote('');
 persistCrm({ notes: next });
 show(AR ? 'تم حفظ ملاحظة CRM' : 'CRM Note saved', 'success');
 };

 const handleToggleVip = (val: boolean) => {
 setIsVip(val);
 persistCrm({ vip: val });
 show(val ? (AR ? 'تم ترقية المريض إلى VIP ' : 'Patient upgraded to VIP ') : (AR ? 'تم إلغاء حالة VIP' : 'VIP status removed'), 'success');
 };

 const handleToggleFavorite = (val: boolean) => {
 setIsFavorite(val);
 persistCrm({ favorite: val });
 show(val ? (AR ? 'تم الإضافة للمفضلة ' : 'Added to favorites ') : (AR ? 'تم الإزالة من المفضلة' : 'Removed from favorites'), 'success');
 };

 const handleToggleBlocked = async (val: boolean) => {
 if (!patientId) { show(AR ? 'معرف المريض مفقود' : 'Patient identifier is missing', 'error'); return; }
 try {
   if (val) await client.post(`/provider/ops/doctor/blacklist/${encodeURIComponent(patientId)}`, { reason: 'provider_blocked' });
   else await client.delete(`/provider/ops/doctor/blacklist/${encodeURIComponent(patientId)}`);
   setIsBlocked(val);
   show(val ? (AR ? 'تم إدراج المريض في الحظر ' : 'Patient added to blocklist ') : (AR ? 'تم إلغاء الحظر' : 'Patient unblocked'), 'warning');
 } catch {
   show(AR ? 'تعذر تحديث الحظر' : 'Could not update block status', 'error');
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? ' ملف المريض' : ' Patient File'} onBack={onBack} />

 {/* Patient info */}
 <NCard style={{ marginBottom: SP.xl }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.lg, alignItems: 'center' }}>
 <NAvatar name={patient?.patient ?? 'مريض'} size={60} />
 <View style={{ flex: 1 }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.xs }}>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>{patient?.patient ?? (AR ? 'مريض' : 'Patient')}</Text>
 {isFavorite && <Text style={{ fontSize: FS.xl }}></Text>}
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {[patient?.age ? `${patient.age} ${AR ? 'سنة' : 'yrs'}` : '', patient?.gender || '', patient?.blood_type ? `${AR ? 'فصيلة الدم: ' : 'Blood: '}${patient.blood_type}` : ''].filter(Boolean).join(' | ') || '—'}
 </Text>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm, marginTop: SP.xs }}>
 {patient?.insurance ? <NBadge label={patient.insurance} variant="primary" size="xs" /> : null}
 {patient?.chronic ? <NBadge label={`${AR ? 'مزمن: ' : 'Chronic: '}${patient.chronic}`} variant="warning" size="xs" /> : null}
 {isVip && <NBadge label="VIP " variant="success" size="xs" />}
 {isBlocked && <NBadge label={AR ? 'محظور ' : 'Blocked '} variant="danger" size="xs" />}
 </View>
 </View>
 </View>
 </NCard>

 {/* Sections */}
 <ScrollView horizontal showsHorizontalScrollIndicator={false}
 contentContainerStyle={{ gap: SP.sm, paddingBottom: SP.sm, marginBottom: SP.xl }}>
 {sections.map(sec => (
 <TouchableOpacity key={sec.k} onPress={() => setActive(sec.k)}
 style={[styles.secTab, {
 backgroundColor: activeSection === sec.k ? theme.primary : theme.surface2,
 borderColor: activeSection === sec.k ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: activeSection === sec.k ? '#FFF' : theme.text, fontSize: FS.sm, fontWeight: FW.semi }}>
 {AR ? sec.ar : sec.en}
 </Text>
 </TouchableOpacity>
 ))}
 </ScrollView>

 {/* Content by section */}
 {activeSection === 'overview' && (
 <View style={{ gap: SP.md }}>
 {[
 { ar:'أمراض مزمنة', en:'Chronic Conditions', val:'سكري النوع 2، ضغط الدم' },
 { ar:'الأدوية الحالية', en:'Current Medications', val:'Metformin 500mg، Lisinopril 10mg' },
 { ar:'الحساسية', en:'Allergies', val:'بنسيلين (Penicillin)' },
 { ar:'آخر زيارة', en:'Last Visit', val:'2025-03-15' },
 { ar:'عدد الزيارات', en:'Total Visits', val:'12 زيارة' },
 ].map((row, i) => (
 <NCard key={i} style={{ padding: SP.lg }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? row.ar : row.en}</Text>
 <Text style={{ fontSize: FS.md, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>{row.val}</Text>
 </NCard>
 ))}
 </View>
 )}

 {activeSection === 'crm' && (
 <View style={{ gap: SP.xl }}>
 {/* Toggles */}
 <NCard style={{ gap: SP.lg }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 ️ {AR ? 'حالة العميل والتصنيفات' : 'Client Status & Category'}
 </Text>
 <NToggle
 label={AR ? 'علامة عميل VIP ' : 'VIP Client Badge '}
 sub={AR ? 'تمييز المريض ببطاقة عميل خاص في النظام' : 'Highlight patient as high-priority VIP'}
 value={isVip}
 onChange={handleToggleVip}
 />
 <NDivider style={{ marginVertical: SP.xs }} />
 <NToggle
 label={AR ? 'إضافة للمفضلة ' : 'Add to Favorites '}
 sub={AR ? 'إظهار نجمة بجانب المريض لسهولة الوصول' : 'Show star badge for quick identification'}
 value={isFavorite}
 onChange={handleToggleFavorite}
 />
 <NDivider style={{ marginVertical: SP.xs }} />
 <NToggle
 label={AR ? 'حظر هذا المريض ' : 'Block this Patient '}
 sub={AR ? 'منع المريض من إرسال طلبات حجز جديدة إليك' : 'Prevent patient from booking future slots with you'}
 value={isBlocked}
 onChange={handleToggleBlocked}
 />
 </NCard>

 {/* Block Warning Card */}
 {isBlocked && (
 <NCard style={{ backgroundColor: theme.dangerBg, borderColor: theme.danger }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <Text style={{ fontSize: 24 }}></Text>
 <Text style={{ flex: 1, fontSize: FS.sm, color: theme.danger, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'المريض محظور حالياً ولا يمكنه تقديم طلب استشارة أو كشف لديك.'
 : 'Patient is currently blocked and cannot send you consultation requests.'}
 </Text>
 </View>
 </NCard>
 )}

 {/* Custom CRM Tags */}
 <NCard style={{ gap: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 ️ {AR ? 'الأوسمة والوسوم المخصصة' : 'Custom CRM Tags'}
 </Text>
 
 {/* Tags List */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.xs, marginVertical: SP.xs }}>
 {customTags.map((tag, idx) => (
 <TouchableOpacity
 key={idx}
 onPress={() => handleRemoveTag(tag)}
 style={{
 flexDirection: AR ? 'row-reverse' : 'row',
 alignItems: 'center',
 backgroundColor: theme.primaryLight,
 paddingHorizontal: SP.md,
 paddingVertical: 4,
 borderRadius: R.full,
 gap: 4
 }}
 >
 <Text style={{ color: theme.primary, fontSize: FS.xs, fontWeight: FW.bold }}>{tag}</Text>
 <Text style={{ color: theme.primary, fontSize: 10 }}>×</Text>
 </TouchableOpacity>
 ))}
 {customTags.length === 0 && (
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 {AR ? 'لا توجد وسوم مخصصة حالياً.' : 'No custom tags applied.'}
 </Text>
 )}
 </View>

 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <View style={{ flex: 1 }}>
 <NInput
 placeholder={AR ? 'أضف وسماً (مثال: متعاون، مدخن)' : 'Add tag (e.g. Cooperative, Smoker)'}
 value={newTag}
 onChange={setNewTag}
 />
 </View>
 <TouchableOpacity
 onPress={handleAddTag}
 style={{
 backgroundColor: theme.primary,
 width: 44,
 height: 44,
 borderRadius: R.md,
 alignItems: 'center',
 justifyContent: 'center'
 }}
 >
 <Text style={{ color: '#FFF', fontSize: 24, fontWeight: FW.bold }}>+</Text>
 </TouchableOpacity>
 </View>
 </NCard>

 {/* Provider Private Notes */}
 <NCard style={{ gap: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'ملاحظات العيادة الخاصة' : 'Private CRM Clinic Notes'}
 </Text>

 <NInput
 placeholder={AR ? 'اكتب ملاحظة خاصة عن المريض (سرية ولن تظهر له)...' : 'Write a private note (confidential, hidden from patient)...'}
 value={newNote}
 onChange={setNewNote}
 multi
 lines={3}
 />
 <NBtn
 label={AR ? 'حفظ الملاحظة' : 'Save Note'}
 onPress={handleAddNote}
 disabled={!newNote.trim()}
 />

 <NDivider style={{ marginVertical: SP.sm }} />

 <View style={{ gap: SP.md }}>
 {crmNotes.map(note => (
 <View
 key={note.id}
 style={{
 backgroundColor: theme.surface2,
 padding: SP.md,
 borderRadius: R.md,
 borderLeftWidth: AR ? 0 : 3,
 borderRightWidth: AR ? 3 : 0,
 borderColor: theme.primary
 }}
 >
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 4 }}>
 <Text style={{ fontSize: 10, color: theme.textSub }}>{note.date}</Text>
 <Text style={{ fontSize: 10, color: theme.primary, fontWeight: FW.bold }}>{AR ? 'طبيب' : 'Doctor'}</Text>
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', lineHeight: 18 }}>
 {note.text}
 </Text>
 </View>
 ))}
 </View>
 </NCard>
 </View>
 )}

 {activeSection === 'visits' && (
 <View>
 {[
 { date:'2025-03-15', type:'video', diagnosis:'ضغط دم مرتفع', doctor:'د. محمد' },
 { date:'2025-01-20', type:'clinic', diagnosis:'فحص روتيني سكري', doctor:'د. محمد' },
 { date:'2024-11-05', type:'home', diagnosis:'التهاب مجاري بولية', doctor:'د. محمد' },
 ].map((visit, i) => (
 <NCard key={i} style={{ marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.xs, color: theme.primary }}>{visit.date}</Text>
 <Text style={{ fontSize: FS.md, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left', marginVertical: SP.xs }}>{visit.diagnosis}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 {visit.type === 'video' ? '' : visit.type === 'clinic' ? '' : ''} {visit.doctor}
 </Text>
 </NCard>
 ))}
 </View>
 )}
 </NScroll>
 </View>
 );
}
