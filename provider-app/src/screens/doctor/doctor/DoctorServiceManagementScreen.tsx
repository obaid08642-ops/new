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
import { SP, R, FS, FW, API_BASE, C } from '../../../constants';
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
import { tokens, withAlpha } from '../../../theme/tokens';
import { MODE_MAP } from './AvailabilityPulseScreen';

export function DoctorServiceManagementScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang, t: tt } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [loading, setLoading] = useState(true);
 const [services, setServices] = useState<any[]>([]);
 // the doctor's own specialty: the server keys a session by type + specialty, so a hard-coded one made duplicates and wrong rows
 const [mySpecialty, setMySpecialty] = useState('');
 useEffect(() => { client.get('/provider/profile').then((r: any) => setMySpecialty(String(r?.data?.specialty || r?.data?.profile?.specialty || ''))).catch(() => undefined); }, []);

 const [showAddSheet, setShowAddSheet] = useState(false);
 // The server identifies a doctor session by consultation_type (+ specialty), so the add form picks the type
 // instead of taking free-text names and descriptions that the server has no field for.
 const [newType, setNewType] = useState<string>('video');
 const [newPrice, setNewPrice] = useState('');
 const [newDuration, setNewDuration] = useState('30');

 const [editingService, setEditingService] = useState<any | null>(null);
 const [editPrice, setEditPrice] = useState('');
 const [editDuration, setEditDuration] = useState('');

 const fetchServices = async () => {
 try {
 const res = await client.get('/provider/capabilities/doctor-sessions');
 const parsed = (res.data || []).map((item: any) => {
 const mode = item.consultation_type;
 const modeInfo = MODE_MAP[mode] || {
 nameAr: item.specialty || 'خدمة مخصصة',
 nameEn: item.specialty || 'Custom Service',
 descAr: 'خدمة مخصصة للطبيب',
 descEn: 'Custom service'
 };
 return {
 id: item.id || item._id,
 consultation_type: item.consultation_type,
 specialty: item.specialty,
 nameAr: modeInfo.nameAr,
 nameEn: modeInfo.nameEn,
 descAr: modeInfo.descAr,
 descEn: modeInfo.descEn,
 price: item.price,
 duration: item.duration_minutes,
 active: item.available,
 insurance_covered: item.insurance_covered === true,
 };
 });
 setServices(parsed);
 } catch (e) {
 // Silent log skip
 show(tt('dsm.3621f9ea'), 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchServices();
 }, []);

 const toggleService = async (id: string, currentActive: boolean) => {
 try {
 const srv = services.find(s => s.id === id);
 if (!srv) return;
 
 const payload = {
 consultation_type: srv.consultation_type,
 specialty: srv.specialty || 'General Medicine',
 price: srv.price,
 duration_minutes: srv.duration,
 available: !currentActive
 };
 
 await client.post('/provider/capabilities/doctor-sessions', payload);
 show(tt('dsm.14f4e375'), 'success');
 fetchServices();
 } catch (e) {
 show(tt('dsm.f06fd0b7'), 'error');
 }
 };

 const toggleCoverage = async (id: string, current: boolean) => {
 try {
 const srv = services.find(s => s.id === id);
 if (!srv) return;
 await client.post('/provider/capabilities/doctor-sessions', {
 consultation_type: srv.consultation_type,
 specialty: srv.specialty || 'General Medicine',
 price: srv.price,
 duration_minutes: srv.duration,
 available: srv.active,
 insurance_covered: !current,
 });
 show(tt('dsm.14f4e375'), 'success');
 fetchServices();
 } catch (e) {
 show(tt('dsm.5460c20f'), 'error');
 }
 };

 const handleAddService = async () => {
 if (!newPrice) {
 show(tt('dsm.d27c8396'), 'error');
 return;
 }
 try {
 const payload = {
 consultation_type: newType,
 specialty: mySpecialty || 'General Medicine',
 price: parseFloat(newPrice) || 0,
 duration_minutes: parseInt(newDuration) || 30,
 available: true
 };
 
 await client.post('/provider/capabilities/doctor-sessions', payload);
 fetchServices();
 setShowAddSheet(false);
 setNewType('video');
 setNewPrice('');
 setNewDuration('30');
 show(tt('dsm.14f4e375'), 'success');
 } catch (e) {
 show(tt('dsm.27956a66'), 'error');
 }
 };

 const handleDeleteService = async (id: string) => {
 try {
 await client.delete(`/provider/capabilities/doctor-sessions/${id}`);
 fetchServices();
 show(tt('dsm.67225376'), 'success');
 } catch (e) {
 show(tt('dsm.9fbb2638'), 'error');
 }
 };

 const openEdit = (srv: any) => {
 setEditingService(srv);
 setEditPrice(String(srv.price));
 setEditDuration(String(srv.duration));
 };

 const saveEdit = async () => {
 if (!editingService) return;
 try {
 const payload = {
 consultation_type: editingService.consultation_type,
 specialty: editingService.specialty || 'General Medicine',
 price: parseFloat(editPrice) || 0,
 duration_minutes: parseInt(editDuration) || 30,
 available: editingService.active
 };
 
 await client.post('/provider/capabilities/doctor-sessions', payload);
 fetchServices();
 setEditingService(null);
 show(tt('dsm.14f4e375'), 'success');
 } catch (e) {
 show(tt('dsm.befad914'), 'error');
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={tt('dsm.3bce72fe')} onBack={onBack} />
 {loading ? (
 <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: SP.xxl }} />
 ) : (
 <ScrollView contentContainerStyle={{ padding: SP.xl, paddingBottom: 100 }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.textSub }}>
 {tt('dsm.17e55c37')}
 </Text>
 <TouchableOpacity onPress={() => setShowAddSheet(true)} style={{ backgroundColor: theme.primary, paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.md }}>
 <Text style={{ color: C.white, fontWeight: FW.bold }}> {tt('dsm.bde592da')}</Text>
 </TouchableOpacity>
 </View>

 {services.map(s => (
 <NCard key={s.id} style={{ marginBottom: SP.lg, borderColor: s.active ? theme.primary : theme.border }} accent={s.active ? theme.primary : undefined}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>
 {AR ? s.nameAr : s.nameEn}
 </Text>
 <Switch value={s.active} onValueChange={() => toggleService(s.id, s.active)} trackColor={{ true: theme.primary }} />
 </View>

 <TouchableOpacity onPress={() => toggleCoverage(s.id, !!s.insurance_covered)} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.sm }}>
 <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: s.insurance_covered ? theme.success : theme.border, backgroundColor: s.insurance_covered ? theme.success : 'transparent' }} />
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{tt('dsm.4d476192')}</Text>
 </TouchableOpacity>
 
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
 {AR ? s.descAr : s.descEn}
 </Text>
 
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.text, fontWeight: FW.bold }}>
  {s.price} {tt('dsm.0e39e6ca')}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>
 ⏱️ {s.duration} {AR ? 'دقيقة' : 'min'}
 </Text>
 </View>
 
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
 <TouchableOpacity onPress={() => openEdit(s)} style={{ padding: SP.xs }}>
 <Text style={{ color: theme.primary, fontSize: FS.sm }}>️ {tt('dsm.4cbb34bf')}</Text>
 </TouchableOpacity>
 <TouchableOpacity onPress={() => handleDeleteService(s.id)} style={{ padding: SP.xs }}>
 <Text style={{ color: theme.danger, fontSize: FS.sm }}>️ {tt('dsm.2257cab6')}</Text>
 </TouchableOpacity>
 </View>
 </View>
 </NCard>
 ))}
 </ScrollView>
 )}

 {/* Edit Sheet */}
 <NSheet visible={!!editingService} onClose={() => setEditingService(null)} title={tt('dsm.a2728c0f')} height={380}>
 <View style={{ padding: SP.md }}>
 <NPriceInput label={tt('dsm.a7e4e600')} value={editPrice} onChange={setEditPrice} />
 <NInput label={tt('dsm.575476c2')} kbType="numeric" value={editDuration} onChange={setEditDuration} />
 <NBtn label={tt('dsm.89af874d')} onPress={saveEdit} style={{ marginTop: SP.md }} />
 </View>
 </NSheet>

 {/* Add Service Sheet */}
 <NSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} title={tt('dsm.2fe9c69c')} height={520}>
 <ScrollView contentContainerStyle={{ padding: SP.md }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{tt('dsm.10a92ce6')}</Text>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.md }}>
 {Object.keys(MODE_MAP).map(k => (
 <TouchableOpacity key={k} accessibilityRole="button" accessibilityState={{ selected: newType === k }} onPress={() => setNewType(k)}
 style={{ paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1, borderColor: newType === k ? theme.primary : theme.border, backgroundColor: newType === k ? withAlpha(theme.primary, 0.12) : theme.surface }}>
 <Text style={{ color: newType === k ? theme.primary : theme.text, fontSize: FS.sm }}>{AR ? MODE_MAP[k].nameAr : MODE_MAP[k].nameEn}</Text>
 </TouchableOpacity>
 ))}
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>{AR ? MODE_MAP[newType]?.descAr : MODE_MAP[newType]?.descEn}</Text>
 <NPriceInput label={tt('dsm.a7e4e600')} value={newPrice} onChange={setNewPrice} required />
 <NInput label={tt('dsm.06c5caaa')} kbType="numeric" value={newDuration} onChange={setNewDuration} />
 <NBtn label={tt('dsm.ea48e8cf')} onPress={handleAddService} style={{ marginTop: SP.md }} />
 </ScrollView>
 </NSheet>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// STATISTICS & REPORTS SCREEN
