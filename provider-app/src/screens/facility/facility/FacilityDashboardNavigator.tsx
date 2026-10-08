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
import { MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderProfileEditor, WithdrawalWorkflow, ProviderHomeStats, GlobalSystemSettings } from '../../shared/SharedScreens';
import { NotificationsCenterScreen, TechnicalSupportTicketsScreen, SecurityManagementScreen } from '../../shared/RealScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens } from '../../../theme/tokens';
import { FacilityHomeTab } from './FacilityHomeTab';
import { FacilityOrdersTab } from './FacilityOrdersTab';
import { FacilitySettingsScreen } from './FacilitySettingsScreen';
import { SubAccountsScreen } from './SubAccountsScreen';
import { DepartmentManagementScreen } from './DepartmentManagementScreen';
import { ShiftManagementScreen } from './ShiftManagementScreen';
import { BedManagementScreen } from './BedManagementScreen';
import { QRCheckinScreen } from './QRCheckinScreen';
import { InsuranceClaimsHubScreen } from './InsuranceClaimsHubScreen';
import { StaffAttendanceScreen } from './StaffAttendanceScreen';
import { SurgeryScheduleScreen } from './SurgeryScheduleScreen';
import { CredentialingScreen } from './CredentialingScreen';
import { HospitalDispatchScreen } from './HospitalDispatchScreen';
import { FacilityOrderDetail } from './FacilityOrderDetail';

const Stack = createNativeStackNavigator();

export function FacilityDashboardNavigator({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('home');
  const { lang } = useLang();
  const AR = lang === 'ar';

  const [wards, setWards] = useState<any[]>([]);
  const [surgeries, setSurgeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { show } = useToast();
  const [alarmVisible, setAlarmVisible] = useState(false);

  const fetchWardsAndSurgeries = async () => {
    setLoading(true);
    try {
      const [wardsRes, surgRes] = await Promise.all([
        client.get('/facility/beds/wards'),
        client.get('/facility/surgeries/schedule')
      ]);
      setWards(wardsRes.data || []);
      setSurgeries(surgRes.data || []);
    } catch (e: any) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWardsAndSurgeries();
  }, []);

  // Branch Selection State — real branches from the hospital module
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  useEffect(() => {
    client.get('/hospital/branches').then(r => {
      const list = (Array.isArray(r.data) ? r.data : r.data?.branches || []).map((b: any) => ({
        id: b.id || b._id,
        name_ar: b.name_ar || b.name || b.name_en,
        name_en: b.name_en || b.name || b.name_ar,
      }));
      setBranches(list);
      if (list.length) setSelectedBranch(prev => prev || list[0].id);
    }).catch(() => setBranches([]));
  }, []);

   const tabs = [
 { key: 'home', icon: 'home', label: AR ? 'الرئيسية' : 'Home' },
 { key: 'orders', icon: 'document', label: AR ? 'الطلبات' : 'Orders' },
 { key: 'jobs', icon: 'profile', label: AR ? 'الوظائف' : 'Jobs' },
 { key: 'drugs', icon: 'activity', label: AR ? 'الأدوية' : 'Drugs' },
 { key: 'settings', icon: 'settings', label: AR ? 'الإعدادات' : 'Settings' },
 ];

  return (
    <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs">
        {({ navigation }) => {
          const go = (s: string, param?: any) => navigation.navigate(s, { param });
          return (
            <View style={{ flex: 1 }}>
              {activeTab === 'home' && <FacilityHomeTab onNavigate={go} wards={wards} onTriggerAlarm={() => setAlarmVisible(true)} branches={branches} selectedBranch={selectedBranch} onSelectBranch={setSelectedBranch} />}
              {activeTab === 'orders' && <FacilityOrdersTab onNavigate={go} surgeries={surgeries} wards={wards} onRefresh={fetchWardsAndSurgeries} />}
              {activeTab === 'jobs' && <MedicalJobsScreen onBack={() => setActiveTab('home')} />}
              {activeTab === 'drugs' && <MedicalDrugIndexScreen onBack={() => setActiveTab('home')} />}
              {activeTab === 'settings' && <FacilitySettingsScreen onLogout={onLogout} onNavigate={go} />}
              <NBottomNav tabs={tabs} active={activeTab} onPress={setActiveTab} />
              <LiveOrderAlarmModal
                visible={alarmVisible}
                onAccept={() => { setAlarmVisible(false); setActiveTab('orders'); }}
                onDecline={() => setAlarmVisible(false)}
              />
            </View>
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="subaccounts">{({ navigation }: any) => <SubAccountsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="add_subaccount">{({ navigation, route }: any) => <FacilityInvitationScreen onBack={() => navigation.goBack()} preRole={route.params?.param} />}</Stack.Screen>
      <Stack.Screen name="departments">{({ navigation }: any) => <DepartmentManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="shifts">{({ navigation }: any) => <ShiftManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="resources">{({ navigation }: any) => <FacilityResourcesScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="leave_requests">{({ navigation }: any) => <FacilityLeaveRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="unified_sched">{({ navigation }: any) => <FacilityUnifiedCalendarScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="beds">{({ navigation }: any) => <BedManagementScreen onBack={() => navigation.goBack()} wards={wards} onRefresh={fetchWardsAndSurgeries} />}</Stack.Screen>
      <Stack.Screen name="qr_checkin">{({ navigation }: any) => <QRCheckinScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="insurance_hub">{({ navigation }: any) => <InsuranceClaimsHubScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="financial">{({ navigation }: any) => <RevenueInsights role="facility" onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="internal_chat">{({ navigation }: any) => <FacilityInternalChatScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="audit_logs">{({ navigation }: any) => <FacilityAuditLogScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="announcements">{({ navigation }: any) => <FacilityAnnouncementsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="patient_tracker">{({ navigation }: any) => <FacilityPatientTrackerScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="prescription">{({ navigation, route }: any) => <EPrescriptionScreen apt={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="discharge_summary">{({ navigation }: any) => <DischargeSummaryScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="attendance">{({ navigation }: any) => <StaffAttendanceScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="surgery_sched">{({ navigation }: any) => <SurgeryScheduleScreen onBack={() => navigation.goBack()} surgeries={surgeries} onRefresh={fetchWardsAndSurgeries} />}</Stack.Screen>
      <Stack.Screen name="credentialing">{({ navigation }: any) => <CredentialingScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="hospital_dispatch">{({ navigation }: any) => <HospitalDispatchScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="facility_info">{({ navigation }: any) => <FacilityProfileConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="auto_reports">{({ navigation }: any) => <RevenueInsights role="facility" onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="notifications">{({ navigation }: any) => <NotificationsCenterScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="support">{({ navigation }: any) => <TechnicalSupportTicketsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="security">{({ navigation }: any) => <SecurityManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="order_detail">{({ navigation, route }: any) => <FacilityOrderDetail order={route.params?.param} onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="withdrawal_workflow">{({ navigation }: any) => <WithdrawalWorkflow onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="create_promo">{({ navigation }: any) => <CreateCampaignScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="web_config">{({ navigation }: any) => <ProviderProfileEditor role="other" onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="subscriptions_ads">{({ navigation }: any) => <SubscriptionsAdsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="affiliate">{({ navigation }: any) => <AffiliatePortal onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="reputation">{({ navigation }: any) => <ReputationHub onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="crm">{({ navigation }: any) => <CrmHub onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="revenue_insights">{({ navigation }: any) => <RevenueInsights role="facility" onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="medical_jobs">{({ navigation }: any) => <MedicalJobsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="drug_index">{({ navigation }: any) => <MedicalDrugIndexScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="insurance_requests">{({ navigation }: any) => <InsuranceRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="certificates_config">{({ navigation }: any) => <CertificatesConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="media_config">{({ navigation }: any) => <MediaConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
    </Stack.Navigator>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOME TAB
