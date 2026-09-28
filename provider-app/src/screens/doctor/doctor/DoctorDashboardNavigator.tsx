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
import { Stack, VirtualWaitingRoomScreen, styles } from './_shared';
import { RequestTestScreen } from './RequestTestScreen';
import { EPrescriptionScreen } from './EPrescriptionScreen';
import { SickLeaveScreen } from './SickLeaveScreen';
import { MedicalReportScreen } from './MedicalReportScreen';
import { ReferralScreen } from './ReferralScreen';
import { DoctorAvailabilityScreen } from './DoctorAvailabilityScreen';
import { DoctorServiceManagementScreen } from './DoctorServiceManagementScreen';
import { CertificatesConfigScreen, PreVisitChatScreen, InboundMedicalReportsScreen } from './CertificatesConfigScreen';
import { DoctorLocationScreen } from './DoctorLocationScreen';

import { DoctorWalletTab } from './DoctorWalletTab';
import { DoctorSettingsTab } from './DoctorSettingsTab';
import { PatientFileScreen } from './PatientFileScreen';
import { DoctorProfileEditScreen } from './DoctorProfileEditScreen';
import { LiveConsultationScreen } from './LiveConsultationScreen';
import { AppointmentDetailScreen } from './AppointmentDetailScreen';
import { DoctorScheduleTab } from './DoctorScheduleTab';
import { DoctorHomeTab } from './DoctorHomeTab';
export function DoctorDashboardNavigator({ onLogout }: { onLogout: () => void }) {
 const [activeTab, setActiveTab] = useState('home');
 const { lang } = useLang();
 const AR = lang === 'ar';

 const [alarmVisible, setAlarmVisible] = useState(false);

 const tabs = [
 { key: 'home', icon: 'home', label: AR ? 'الرئيسية' : 'Home' },
 { key: 'schedule', icon: 'calendar', label: AR ? 'المواعيد' : 'Schedule' },
 { key: 'chat', icon: 'chat', label: AR ? 'المحادثات' : 'Chats' },
 { key: 'wallet', icon: 'wallet', label: AR ? 'المحفظة' : 'Wallet' },
 { key: 'settings', icon: 'settings', label: AR ? 'الإعدادات' : 'Settings' },
 ];

 return (
   <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false }}>
     <Stack.Screen name="MainTabs">
       {({ navigation }) => {
         const navigateTo = (s: string, param?: any) => {
           if (['home', 'schedule', 'chat', 'wallet', 'settings', 'drugs', 'jobs'].includes(s)) {
             setActiveTab(s);
             return;
           }
           navigation.navigate(s, { param });
         };
         return (
           <View style={{ flex: 1 }}>
             {activeTab === 'home' && <DoctorHomeTab onNavigate={navigateTo} onTriggerAlarm={() => setAlarmVisible(true)} />}
             {activeTab === 'schedule' && <DoctorScheduleTab onNavigate={navigateTo} />}
             {activeTab === 'chat' && <ChatSystem onBack={() => setActiveTab('home')} />}
             {activeTab === 'wallet' && <DoctorWalletTab onNavigate={navigateTo} />}
             {activeTab === 'settings' && <DoctorSettingsTab onLogout={onLogout} onNavigate={navigateTo} />}
             {activeTab === 'drugs' && <MedicalDrugIndexScreen onBack={() => setActiveTab('home')} />}
             {activeTab === 'jobs' && <MedicalJobsScreen onBack={() => setActiveTab('home')} />}
             <NBottomNav tabs={tabs} active={activeTab} onPress={setActiveTab} />
             <LiveOrderAlarmModal
               visible={alarmVisible}
               onAccept={() => { setAlarmVisible(false); navigateTo('sos_dispatch'); }}
               onDecline={() => setAlarmVisible(false)}
             />
           </View>
         );
       }}
     </Stack.Screen>

     <Stack.Screen name="appointment_detail">{({ navigation, route }: any) => <AppointmentDetailScreen apt={route.params?.param} onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="consultation">{({ navigation, route }: any) => <LiveConsultationScreen apt={route.params?.param} onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="prescription">{({ navigation, route }: any) => <EPrescriptionScreen apt={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="sick_leave">{({ navigation, route }: any) => <SickLeaveScreen apt={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="medical_report">{({ navigation, route }: any) => <MedicalReportScreen apt={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="referral">{({ navigation, route }: any) => <ReferralScreen apt={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="request_test">{({ navigation, route }: any) => <RequestTestScreen apt={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="patient_file">{({ navigation, route }: any) => <PatientFileScreen patient={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="withdrawal_workflow">{({ navigation }: any) => <WithdrawalWorkflow onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="revenue_insights">{({ navigation }: any) => <RevenueInsights onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="availability_engine">{({ navigation }: any) => <DoctorAvailabilityScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="service_management">{({ navigation }: any) => <DoctorServiceManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="create_promo">{({ navigation }: any) => <CreateCampaignScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="web_config">{({ navigation }: any) => <ProfileWebConfig onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="subscriptions_ads">{({ navigation }: any) => <SubscriptionsAdsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="affiliate">{({ navigation }: any) => <AffiliatePortal onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="reputation">{({ navigation }: any) => <ReputationHub onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="crm">{({ navigation }: any) => <CrmHub onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="ai_copilot">{({ navigation }: any) => <AiMedicalCopilot onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="outbound_referral">{({ navigation }: any) => <SmartOutboundReferralNetwork onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="sos_dispatch">{({ navigation }: any) => <SosDispatchScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="gps_router">{({ navigation, route }: any) => <GpsRouterScreen patient={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="profile_edit">{({ navigation }: any) => <DoctorProfileEditScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
    <Stack.Screen name="insurance_requests">{({ navigation }: any) => <InsuranceRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="certificates_config">{({ navigation }: any) => <CertificatesConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="media_config">{({ navigation }: any) => <MediaConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="virtual_waiting_room">{({ navigation }: any) => <VirtualWaitingRoomScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="pre_visit_chat">{({ navigation, route }: any) => <PreVisitChatScreen apt={route.params?.param} onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="medical_jobs">{({ navigation }: any) => <MedicalJobsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="drug_index">{({ navigation }: any) => <MedicalDrugIndexScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="facility_invitations">{({ navigation }: any) => <FacilityInvitationsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="location_config">{({ navigation }: any) => <DoctorLocationScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="inbound_reports">{({ navigation }: any) => <InboundMedicalReportsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="video_call">{({ navigation, route }: any) => {
       const appointment = route.params?.param || {};
       const appointmentId = String(appointment.id || appointment.appointment_id || '');
       if (!appointmentId) return <NEmpty title="Unable to start call" sub="The appointment identifier is required." icon="video" />;
       return <VideoCallRoom appointmentId={appointmentId} peerName={appointment.patient || appointment.patient_name} voiceOnly={appointment.service_type === 'audio'} onEnd={() => navigation.goBack()} />;
     }}</Stack.Screen>
   </Stack.Navigator>
 );
}

