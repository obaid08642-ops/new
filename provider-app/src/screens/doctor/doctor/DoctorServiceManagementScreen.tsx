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
import { MODE_MAP } from './AvailabilityPulseScreen';

export function DoctorServiceManagementScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [loading, setLoading] = useState(true);
 const [services, setServices] = useState<any[]>([]);

 const [showAddSheet, setShowAddSheet] = useState(false);
 const [newTitleAr, setNewTitleAr] = useState('');
 const [newTitleEn, setNewTitleEn] = useState('');
 const [newPrice, setNewPrice] = useState('');
 const [newDuration, setNewDuration] = useState('30');
 const [newDescAr, setNewDescAr] = useState('');
 const [newDescEn, setNewDescEn] = useState('');

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
 show(AR ? 'فشل تحميل الخدمات والأسعار من السيرفر' : 'Failed to load services and prices from server', 'error');
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
 show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
 fetchServices();
 } catch (e) {
 show(AR ? 'فشل تحديث حالة الخدمة' : 'Failed to update service status', 'error');
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
 show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
 fetchServices();
 } catch (e) {
 show(AR ? 'فشل تحديث التغطية' : 'Failed to update coverage', 'error');
 }
 };

 const handleAddService = async () => {
 if (!newPrice) {
 show(AR ? 'يرجى إدخال السعر' : 'Please enter price', 'error');
 return;
 }
 try {
 const rawType = newTitleEn.toLowerCase().includes('video') ? 'video'
 : newTitleEn.toLowerCase().includes('voice') || newTitleEn.toLowerCase().includes('audio') ? 'voice'
 : newTitleEn.toLowerCase().includes('clinic') ? 'clinic'
 : newTitleEn.toLowerCase().includes('home') ? 'home'
 : 'chat';
 
 const payload = {
 consultation_type: rawType,
 specialty: 'General Medicine',
 price: parseFloat(newPrice) || 0,
 duration_minutes: parseInt(newDuration) || 30,
 available: true
 };
 
 await client.post('/provider/capabilities/doctor-sessions', payload);
 fetchServices();
 setShowAddSheet(false);
 setNewTitleAr('');
 setNewTitleEn('');
 setNewPrice('');
 setNewDuration('30');
 show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
 } catch (e) {
 show(AR ? 'فشل إضافة الخدمة' : 'Failed to add service', 'error');
 }
 };

 const handleDeleteService = async (id: string) => {
 try {
 await client.delete(`/provider/capabilities/doctor-sessions/${id}`);
 fetchServices();
 show(AR ? 'تم الإرسال — يُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
 } catch (e) {
 show(AR ? 'فشل حذف الخدمة' : 'Failed to delete service', 'error');
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
 show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
 } catch (e) {
 show(AR ? 'فشل حفظ التعديلات' : 'Failed to save changes', 'error');
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? ' إدارة الخدمات والأسعار' : ' Service Management'} onBack={onBack} />
 {loading ? (
 <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: SP.xxl }} />
 ) : (
 <ScrollView contentContainerStyle={{ padding: SP.xl, paddingBottom: 100 }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.textSub }}>
 {AR ? 'الخدمات المتاحة' : 'Available Services'}
 </Text>
 <TouchableOpacity onPress={() => setShowAddSheet(true)} style={{ backgroundColor: theme.primary, paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.md }}>
 <Text style={{ color: '#FFF', fontWeight: FW.bold }}> {AR ? 'إضافة خدمة' : 'Add Service'}</Text>
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
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'تُغطى بالتأمين' : 'Covered by insurance'}</Text>
 </TouchableOpacity>
 
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
 {AR ? s.descAr : s.descEn}
 </Text>
 
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.text, fontWeight: FW.bold }}>
  {s.price} {AR ? 'ريال' : 'SAR'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>
 ⏱️ {s.duration} {AR ? 'دقيقة' : 'min'}
 </Text>
 </View>
 
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
 <TouchableOpacity onPress={() => openEdit(s)} style={{ padding: SP.xs }}>
 <Text style={{ color: theme.primary, fontSize: FS.sm }}>️ {AR ? 'تعديل' : 'Edit'}</Text>
 </TouchableOpacity>
 <TouchableOpacity onPress={() => handleDeleteService(s.id)} style={{ padding: SP.xs }}>
 <Text style={{ color: theme.danger, fontSize: FS.sm }}>️ {AR ? 'حذف' : 'Delete'}</Text>
 </TouchableOpacity>
 </View>
 </View>
 </NCard>
 ))}
 </ScrollView>
 )}

 {/* Edit Sheet */}
 <NSheet visible={!!editingService} onClose={() => setEditingService(null)} title={AR ? '️ تعديل الخدمة' : '️ Edit Service'} height={380}>
 <View style={{ padding: SP.md }}>
 <NPriceInput label={AR ? 'سعر الخدمة (SAR)' : 'Service Price (SAR)'} value={editPrice} onChange={setEditPrice} />
 <NInput label={AR ? 'مدة الخدمة بالدقائق' : 'Service Duration (min)'} kbType="numeric" value={editDuration} onChange={setEditDuration} />
 <NBtn label={AR ? ' حفظ' : ' Save'} onPress={saveEdit} style={{ marginTop: SP.md }} />
 </View>
 </NSheet>

 {/* Add Service Sheet */}
 <NSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} title={AR ? ' إضافة خدمة جديدة' : ' Add Custom Service'} height={580}>
 <ScrollView contentContainerStyle={{ padding: SP.md }}>
 <NInput label={AR ? 'اسم الخدمة (عربي)' : 'Service Name (Arabic)'} value={newTitleAr} onChange={setNewTitleAr} required />
 <NInput label={AR ? 'اسم الخدمة (إنجليزي)' : 'Service Name (English)'} value={newTitleEn} onChange={setNewTitleEn} required />
 <NPriceInput label={AR ? 'سعر الخدمة (SAR)' : 'Service Price (SAR)'} value={newPrice} onChange={setNewPrice} required />
 <NInput label={AR ? 'المدة بالدقائق' : 'Duration (min)'} kbType="numeric" value={newDuration} onChange={setNewDuration} />
 <NInput label={AR ? 'الوصف (عربي)' : 'Description (Arabic)'} value={newDescAr} onChange={setNewDescAr} multi />
 <NInput label={AR ? 'الوصف (إنجليزي)' : 'Description (English)'} value={newDescEn} onChange={setNewDescEn} multi />
 <NBtn label={AR ? ' إضافة الخدمة' : ' Add Service'} onPress={handleAddService} style={{ marginTop: SP.md }} />
 </ScrollView>
 </NSheet>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// STATISTICS & REPORTS SCREEN
