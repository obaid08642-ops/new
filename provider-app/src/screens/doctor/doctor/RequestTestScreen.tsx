import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AppointmentStatus } from '../../../types/contracts';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Platform, Modal, TextInput,
 RefreshControl, Switch, ActivityIndicator, KeyboardAvoidingView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio } from 'expo-av';
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

import { PatientFileScreen } from './PatientFileScreen';
import { DoctorWalletTab } from './DoctorWalletTab';
import { DoctorSettingsTab } from './DoctorSettingsTab';
export function RequestTestScreen({ apt, onBack }:
 { apt: any; onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [type, setType] = useState<'lab'|'radiology'|'nursing'>(apt?.initialType || 'lab');
 const [selected, setSelected] = useState<string[]>([]);
 const [notes, setNotes] = useState('');

 const items = useServicesCatalog(type);

 const toggle = (id: string) => {
 setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
 };

 return (
 <NScroll>
 <NHeader title={AR ? '🩺 طلب خدمات طبية' : '🩺 Request Medical Services'} onBack={onBack} />

 {/* Type toggle */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.xl }}>
 {[{ k:'lab', ar:' تحاليل', en:' Lab Tests' }, { k:'radiology', ar:' أشعة', en:' Radiology' }, { k:'nursing', ar:' تمريض', en:' Nursing' }].map(t => (
 <TouchableOpacity key={t.k} onPress={() => { setType(t.k as any); setSelected([]); }}
 style={[{ flex:1, paddingVertical:SP.md, borderRadius:R.lg, borderWidth:1.5, alignItems:'center' }, {
 backgroundColor: type===t.k ? theme.primary : theme.surface2,
 borderColor: type===t.k ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: type===t.k ? '#FFF' : theme.text, fontWeight: FW.semi, fontSize: FS.sm }}>
 {AR ? t.ar : t.en}
 </Text>
 </TouchableOpacity>
 ))}
 </View>

 {selected.length > 0 && (
 <NCard style={{ backgroundColor: theme.successBg, marginBottom: SP.lg }}>
 <Text style={{ color: theme.success, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>
 {selected.length} {AR ? 'بنود مختارة' : 'items selected'}
 </Text>
 </NCard>
 )}

 {items.map((item: any) => (
 <TouchableOpacity key={item.id} onPress={() => toggle(item.id)}>
 <NCard style={{ marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <View style={[styles.insureCheck, {
 backgroundColor: selected.includes(item.id) ? theme.primary : 'transparent',
 borderColor: selected.includes(item.id) ? theme.primary : theme.border,
 }]}>
 {selected.includes(item.id) && <Text style={{ color:'#FFF',fontSize:11,fontWeight:'700' }}></Text>}
 </View>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, color: theme.text, fontWeight: FW.med,
 textAlign: AR ? 'right' : 'left' }}>{AR ? item.ar : item.en}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2 }}>
 ⏱ {item.hours} {AR ? 'ساعة' : 'hr'}{item.fasting ? ` · ${AR?'صيام مطلوب':'Fasting required'}` : ''}
 </Text>
 </View>
 </View>
 </NCard>
 </TouchableOpacity>
 ))}

 <View style={{ height: SP.xl }} />
 <NInput label={AR ? 'تعليمات إضافية' : 'Additional Instructions'}
 value={notes} onChange={setNotes} multi lines={3} icon="" />

 <NBtn label={AR ? ' إرسال الطلب' : ' Send Request'}
 disabled={selected.length === 0}
 onPress={async () => { 
 try {
      const patientId = apt?.patient_id;
      if (!patientId) {
        show(AR ? 'لا يمكن إرسال الطلب دون مريض مرتبط بالاستشارة' : 'Cannot request services without a linked patient', 'error');
        return;
      }
      const endpoint = type === 'lab' ? '/labs/bookings' : type === 'radiology' ? '/radiology/bookings' : '/home-care/bookings';
      await client.post(endpoint, {
        items: selected,
        notes: notes,
        patient_id: patientId
      });
 show(AR?`تم إرسال طلب ${selected.length} فحص `:`${selected.length} test(s) requested `,'success'); 
 onBack(); 
 } catch(e) {
 show(AR?'حدث خطأ أثناء إرسال الطلب':'Failed to submit request','error');
 }
 }} />
 </NScroll>
 );
}
