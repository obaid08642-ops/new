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
import { MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderHomeStats, GlobalSystemSettings } from '../../shared/SharedScreens';
import { NotificationsCenterScreen, TechnicalSupportTicketsScreen, SecurityManagementScreen } from '../../shared/RealScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens } from '../../../theme/tokens';

export function FacilityOrderDetail({ order, onBack, onNavigate }: any) {
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [acting, setActing] = useState(false);
  const kind = order?.kind || order?.type || 'appointment';

  const act = async (action: 'accept' | 'reject') => {
    if (!order?.id) { show(tt('rrbf.2d7d0734'), 'error'); return; }
    setActing(true);
    try {
      await client.post(`/provider/jobs/${kind}/${order.id}/${action}`);
      show(action === 'accept' ? (tt('rrbf.e5f46e5e')) : (tt('rrbf.d2642fc6')), action === 'accept' ? 'success' : 'info');
      onBack();
    } catch (err: any) {
      show(err?.response?.data?.message || (tt('rrbf.600a802b')), 'error');
    } finally { setActing(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('rrbf.42b7afff')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg }}>
        <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{order?.patient_name || tt('labdash.c8b7f288')}</Text>
        <Text style={{ color: theme.textSub, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>{order?.title_ar || order?.svc || order?.service_name || tt('rrbf.serviceFallback')}{order?.tracking_id ? ` · ${order.tracking_id}` : ''}{order?.total ? ` · ${order.total} ${tt('labdash.0e39e6ca')}` : ''}</Text>

        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.xl }}>
          <NBtn label={tt('rrbf.9429cefa')} loading={acting} onPress={() => act('reject')} style={{ flex: 1, backgroundColor: theme.danger }} />
          <NBtn label={tt('rrbf.79ec9f5b')} loading={acting} onPress={() => act('accept')} style={{ flex: 1, backgroundColor: theme.success }} />
        </View>
      </ScrollView>
    </View>
  );
}

