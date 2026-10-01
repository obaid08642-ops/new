import * as Crypto from 'expo-crypto';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Platform, Switch,
 RefreshControl, ActivityIndicator, Modal
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import {
 NBtn, NCard, NInput, NPhoneInput, NStatCard, NAvatar,
 NBadge, NHeader, NScroll, NSheet, NSearch, NToggle,
 NSettingsRow, NSecHeader, NConfirm, NEmpty, NSkeleton,
 NOnlineToggle, NBottomNav, NDivider, NPriceInput, NRadio
} from '../../../components/ui';
import { I, hasIcon } from '../../../components/icons';
import { SP, R, FS, FW, C } from '../../../constants';
import { useSpecialtiesCatalog } from '../../../api/catalogs';
import { Validate, Vault } from '../../../security/Security';
import client from '../../../api/client';
import { s } from './_shared';
import { InsuranceRequestsScreen } from '../../shared/InsuranceRequestsScreen';
import { EPrescriptionScreen } from '../../doctor/DoctorDashboard';
import { FleetScreen } from '../../shared/FleetScreen';
import {
 PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights,
 SosDispatchScreen, GpsRouterScreen
} from '../../shared/BlueprintScreens';
import { FacilityProfileConfigScreen } from '../FacilityProfileConfigScreen';
import { FacilityInvitationScreen } from '../FacilityInvitationScreen';
import { FacilityResourcesScreen } from '../FacilityResourcesScreen';
import { FacilityLeaveRequestsScreen } from '../FacilityLeaveRequestsScreen';
import { FacilityUnifiedCalendarScreen } from '../FacilityUnifiedCalendarScreen';
import { FacilityInternalChatScreen } from '../FacilityInternalChatScreen';
import { FacilityAuditLogScreen } from '../FacilityAuditLogScreen';
import { FacilityAnnouncementsScreen } from '../FacilityAnnouncementsScreen';
import { FacilityPatientTrackerScreen } from '../FacilityPatientTrackerScreen';
import { DischargeSummaryScreen } from '../DischargeSummaryScreen';
import { MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderHomeStats, GlobalSystemSettings } from '../../shared/SharedScreens';
import { NotificationsCenterScreen, TechnicalSupportTicketsScreen, SecurityManagementScreen } from '../../shared/RealScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens } from '../../../theme/tokens';

export function AddSubAccountScreen({ onBack, preRole }: { onBack: () => void; preRole?: string }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const specialties = useSpecialtiesCatalog();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [role, setRole] = useState(preRole ?? 'doctor');
 const [name, setName] = useState('');
 const [nameAr, setNameAr] = useState('');
 const [nameEn, setNameEn] = useState('');
 const [legalName, setLegalName] = useState('');
 const [email, setEmail] = useState('');
 const [phone, setPhone] = useState('');
 const [spec, setSpec] = useState('');
 const [scfhs, setScfhs] = useState('');
 const [loading, setLoading] = useState(false);
 const [createdCreds, setCreatedCreds] = useState<any | null>(null);

 const ROLES = [
 { id:'doctor', ar:'طبيب', en:'Doctor', icon:'', needsSpec:true, needsScfhs:true, login:true },
 { id:'insurance', ar:'منسق تأمين', en:'Insurance Coordinator',icon:'',needsSpec:false,needsScfhs:false, login:false},
 { id:'reception', ar:'استقبال', en:'Receptionist', icon:'', needsSpec:false, needsScfhs:false },
 { id:'nurse', ar:'ممرض/ممرضة', en:'Nurse', icon:'', needsSpec:false, needsScfhs:true, login:true },
 { id:'lab', ar:'محلل مختبر', en:'Lab Technician',icon:'', needsSpec:false, needsScfhs:true, login:true },
 { id:'pharmacist', ar:'صيدلي', en:'Pharmacist', icon:'', needsSpec:false, needsScfhs:true, login:true },
 { id:'radiologist', ar:'أخصائي أشعة', en:'Radiologist', icon:'', needsSpec:false, needsScfhs:true, login:true },
 ];

 const selectedRole = ROLES.find(r => r.id === role)!;

 const handleSubmit = async () => {
 if (!name.trim() || !email.trim() || !Validate.phone(phone)) {
 show(AR ? 'يرجى ملء جميع الحقول المطلوبة بشكل صحيح' : 'Fill all required fields correctly', 'warning');
 return;
 }
 setLoading(true);
 // Crypto-strength temporary password (was TempPass# + 4 Math.random digits: 9000 guesses).
 const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
 const tempPass = `Np#${Array.from(Crypto.getRandomBytes(12), (b) => ALPHA[b % ALPHA.length]).join('')}7a`;
 try {
 const response = await client.post('/hospital/staff', {
 full_name: name,
 name_ar: nameAr.trim() || undefined,
 name_en: nameEn.trim() || undefined,
 legal_name: legalName.trim() || undefined,
 phone: phone,
 email: email,
 password: tempPass,
 staff_role: role,
 department: spec || 'General',
 scfhs: scfhs.trim() || undefined,
 permissions: ['read', 'write'],
 });
 const created = response?.data ?? response;
 setCreatedCreds({
 name,
 email,
 phone,
 role: selectedRole.ar,
 roleEn: selectedRole.en,
 subId: (created as any)?.staff?.id || (created as any)?.staff?._id || created?.id,
 tempPass,
 loginAvailable: (created as any)?.login_available !== false,
 });
 show(AR ? ` تم إنشاء الحساب الفرعي بنجاح` : ` Sub-account created successfully`, 'success');
 } catch (err: any) {
 const msg = err.response?.data?.message || err.message;
 show(AR ? `فشل إنشاء الحساب الفرعي: ${msg}` : `Failed to create sub-account: ${msg}`, 'error');
 } finally {
 setLoading(false);
 }
 };

 if (createdCreds) {
 return (
 <NScroll>
 <NHeader title={AR?' بطاقة الحساب الفرعي':' Sub-Account Credential Card'} onBack={onBack} />
 
 <View style={{ padding: SP.xl, alignItems: 'center' }}>
 <View style={{
 width: '100%', padding: SP.xl, borderRadius: R.xl,
 backgroundColor: theme.surface3, borderWidth: 2, borderColor: theme.primary,
 marginBottom: SP.xl
 }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: SP.md, marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary }}> {AR ? 'مستشفى نبضة الطبي' : 'Nabdah Medical Hospital'}</Text>
 <NBadge label={AR ? createdCreds.role : createdCreds.roleEn} variant="primary" size="sm" />
 </View>

 <View style={{ alignItems: 'center', marginVertical: SP.md }}>
 <NAvatar name={createdCreds.name} size={70} />
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text, marginTop: SP.md }}>{createdCreds.name}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2 }}>{createdCreds.email} · {createdCreds.phone}</Text>
 </View>

 <View style={{ backgroundColor: theme.surface, borderRadius: R.lg, padding: SP.md, borderWidth: 1, borderColor: theme.border, marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.xs }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{AR ? 'Sub-ID:' : 'Sub-ID:'}</Text>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>{createdCreds.subId}</Text>
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{AR ? 'كلمة المرور المؤقتة:' : 'Temp Password:'}</Text>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.danger }}>{createdCreds.tempPass}</Text>
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{AR ? 'الدخول للتطبيق:' : 'App login:'}</Text>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: createdCreds.loginAvailable ? theme.success : theme.warn }}>{createdCreds.loginAvailable ? (AR ? 'متاح — نفس الداشبورد الكامل' : 'Available — full dashboard') : (AR ? 'غير متاح لهذا الدور بعد' : 'Not available for this role yet')}</Text>
 </View>
 </View>

 <View style={{ alignItems: 'center', marginTop: SP.md, padding: SP.md, borderWidth: 1, borderColor: theme.border, borderRadius: R.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center' }}>
 {AR ? 'رمز QR والحفظ والمشاركة غير متاحة حتى اعتماد عقد تحقق ومشاركة آمن.' : 'QR, save and sharing are unavailable until a verified sharing contract is approved.'}
 </Text>
 </View>

 <View style={{ width: '100%', gap: SP.md }}>
 <NBtn label={AR ? 'تم' : 'Done'} variant="outline" onPress={onBack} />
 </View>
 </View>
 </View>
 </NScroll>
 );
 }

 return (
 <NScroll>
 <NHeader title={AR ? ' إضافة حساب فرعي' : ' Add Sub-Account'} onBack={onBack} />

 {/* Role Selection */}
 <NSecHeader title={AR ? 'نوع الحساب' : 'Account Type'} />
 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
 {ROLES.map(r => (
 <TouchableOpacity key={r.id} onPress={() => setRole(r.id)}
 style={[s.rolePillBtn, {
 backgroundColor: role === r.id ? theme.primaryLight : theme.surface2,
 borderColor: role === r.id ? theme.primary : theme.border,
 }]}>
 <Text style={{ fontSize: 20 }}>{r.icon}</Text>
 <Text style={{ fontSize: FS.sm, color: role === r.id ? theme.primary : theme.text,
 fontWeight: role === r.id ? FW.bold : FW.reg }}>
 {AR ? r.ar : r.en}
 </Text>
 </TouchableOpacity>
 ))}
 </View>

 {/* Info */}
 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
  {AR
 ? `حساب ${selectedRole.ar}: سيحصل على Sub-ID + كلمة مرور مؤقتة على بريده الإلكتروني. صلاحياته محدودة حسب دوره.`
 : `${selectedRole.en}: Gets Sub-ID + temporary password by email. Permissions limited by role.`}
 </Text>
 </NCard>

 <NInput
 label={AR ? 'الاسم الكامل' : 'Full Name'}
 placeholder={AR ? 'محمد أحمد السعودي' : 'Mohamed Ahmed'}
 value={name} onChange={setName} icon="" required caps="words"
 /> <NInput
 label={AR ? 'الاسم بالعربية (يظهر للمرضى)' : 'Name in Arabic (shown to patients)'}
 value={nameAr} onChange={setNameAr} icon=""
 />
 <NInput
 label={AR ? 'الاسم بالإنجليزية (يظهر للمرضى)' : 'Name in English (shown to patients)'}
 value={nameEn} onChange={setNameEn} icon=""
 />
 <NInput
 label={AR ? 'الاسم القانوني (كما في الهوية/السجل)' : 'Legal name (as in ID/registry)'}
 value={legalName} onChange={setLegalName} icon=""
 />
 <NInput
 label={AR ? 'البريد الإلكتروني' : 'Email'}
 placeholder="doctor@hospital.com"
 value={email} onChange={v => setEmail(v.toLowerCase())} icon="" required kbType="email-address"
 />
 <NPhoneInput label={AR ? 'الجوال' : 'Phone'} value={phone} onChange={setPhone} required />

 {selectedRole.needsSpec && (
 <View style={{ marginBottom: SP.lg }}>
 <Text style={[s.inputLabel, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>
 {AR ? 'التخصص الطبي' : 'Medical Specialty'}
 </Text>
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection: 'row', gap: SP.sm }}>
 {specialties.slice(0, 12).map(sp => (
 <TouchableOpacity key={sp.id} onPress={() => setSpec(sp.id)}
 style={[s.chipBtn, {
 backgroundColor: spec === sp.id ? theme.primary : theme.surface2,
 borderColor: spec === sp.id ? theme.primary : theme.border,
 }]}>
 {hasIcon(sp.icon) ? <I name={sp.icon} size={14} color={spec === sp.id ? 'var(--nabd-bg.surface-light)' : theme.textSub} /> : null}
 <Text style={{ color: spec === sp.id ? 'var(--nabd-bg.surface-light)' : theme.text, fontSize: FS.xs }}>
 {AR ? sp.ar : sp.en}
 </Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>
 </View>
 )}

 {selectedRole.needsScfhs && (
 <NInput
 label={AR ? 'رقم ترخيص SCFHS / الهيئة' : 'SCFHS License Number'}
 placeholder="123456" value={scfhs} onChange={setScfhs}
 icon="" kbType="numeric" maxLen={8}
 />
 )}

 <NCard style={{ backgroundColor: theme.warnBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.warn, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
  {AR
 ? 'سيتم إرسال بيانات الدخول تلقائياً على البريد الإلكتروني وكلمة مرور مؤقتة يجب تغييرها.'
 : 'Login credentials will be auto-sent to email with a temporary password to be changed on first login.'}
 </Text>
 </NCard>

 <NBtn
 label={AR ? ' إنشاء الحساب الفرعي' : ' Create Sub-Account'}
 onPress={handleSubmit} loading={loading}
 />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// DEPARTMENT MANAGEMENT
