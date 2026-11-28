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
import {
 PromotionsDashboard, CreateCampaignScreen, 
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights
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
 const { lang, t: tt } = useLang();
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
 show(tt('asa.1f48acfb'), 'warning');
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
 show(tt('tpm.d993865b', { p1: String(msg) }), 'error');
 } finally {
 setLoading(false);
 }
 };

 if (createdCreds) {
 return (
 <NScroll>
 <NHeader title={tt('asa.576dee2e')} onBack={onBack} />
 
 <View style={{ padding: SP.xl, alignItems: 'center' }}>
 <View style={{
 width: '100%', padding: SP.xl, borderRadius: R.xl,
 backgroundColor: theme.surface3, borderWidth: 2, borderColor: theme.primary,
 marginBottom: SP.xl
 }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: SP.md, marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary }}> {tt('asa.d71022b1')}</Text>
 <NBadge label={AR ? createdCreds.role : createdCreds.roleEn} variant="primary" size="sm" />
 </View>

 <View style={{ alignItems: 'center', marginVertical: SP.md }}>
 <NAvatar name={createdCreds.name} size={70} />
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text, marginTop: SP.md }}>{createdCreds.name}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2 }}>{createdCreds.email} · {createdCreds.phone}</Text>
 </View>

 <View style={{ backgroundColor: theme.surface, borderRadius: R.lg, padding: SP.md, borderWidth: 1, borderColor: theme.border, marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.xs }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{tt('asa.subIdLabel')}</Text>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>{createdCreds.subId}</Text>
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{tt('asa.e44e30e0')}</Text>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.danger }}>{createdCreds.tempPass}</Text>
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{tt('asa.c1b44697')}</Text>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: createdCreds.loginAvailable ? theme.success : theme.warn }}>{createdCreds.loginAvailable ? (tt('asa.57333f67')) : (tt('asa.3b911e58'))}</Text>
 </View>
 </View>

 <View style={{ alignItems: 'center', marginTop: SP.md, padding: SP.md, borderWidth: 1, borderColor: theme.border, borderRadius: R.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center' }}>
 {tt('asa.61477aa4')}
 </Text>
 </View>

 <View style={{ width: '100%', gap: SP.md }}>
 <NBtn label={tt('asa.2b48d77f')} variant="outline" onPress={onBack} />
 </View>
 </View>
 </View>
 </NScroll>
 );
 }

 return (
 <NScroll>
 <NHeader title={tt('asa.e4d1a8dc')} onBack={onBack} />

 {/* Role Selection */}
 <NSecHeader title={tt('asa.2a6cca5b')} />
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
  {tt('asa.roleInfo', { role: AR ? selectedRole.ar : selectedRole.en })}
 </Text>
 </NCard>

 <NInput
 label={tt('asa.8262001b')}
 placeholder={tt('asa.5238c2fa')}
 value={name} onChange={setName} icon="" required caps="words"
 /> <NInput
 label={tt('asa.7cee214f')}
 value={nameAr} onChange={setNameAr} icon=""
 />
 <NInput
 label={tt('asa.a2ac7c9e')}
 value={nameEn} onChange={setNameEn} icon=""
 />
 <NInput
 label={tt('asa.199d563f')}
 value={legalName} onChange={setLegalName} icon=""
 />
 <NInput
 label={tt('asa.8605844e')}
 placeholder="doctor@hospital.com"
 value={email} onChange={v => setEmail(v.toLowerCase())} icon="" required kbType="email-address"
 />
 <NPhoneInput label={tt('asa.098e976b')} value={phone} onChange={setPhone} required />

 {selectedRole.needsSpec && (
 <View style={{ marginBottom: SP.lg }}>
 <Text style={[s.inputLabel, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>
 {tt('asa.a6bee258')}
 </Text>
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection: 'row', gap: SP.sm }}>
 {specialties.slice(0, 12).map(sp => (
 <TouchableOpacity key={sp.id} onPress={() => setSpec(sp.id)}
 style={[s.chipBtn, {
 backgroundColor: spec === sp.id ? theme.primary : theme.surface2,
 borderColor: spec === sp.id ? theme.primary : theme.border,
 }]}>
 {hasIcon(sp.icon) ? <I name={sp.icon} size={14} color={spec === sp.id ? '#FFF' : theme.textSub} /> : null}
 <Text style={{ color: spec === sp.id ? '#FFF' : theme.text, fontSize: FS.xs }}>
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
 label={tt('asa.baee5ca2')}
 placeholder="123456" value={scfhs} onChange={setScfhs}
 icon="" kbType="numeric" maxLen={8}
 />
 )}

 <NCard style={{ backgroundColor: theme.warnBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.warn, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
  {tt('asa.25694a5b')}
 </Text>
 </NCard>

 <NBtn
 label={tt('asa.2986f577')}
 onPress={handleSubmit} loading={loading}
 />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// DEPARTMENT MANAGEMENT
