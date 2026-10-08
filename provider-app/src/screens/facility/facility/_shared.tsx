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
import { FleetScreen } from '../../shared/FleetScreen';
import {
 PromotionsDashboard, CreateCampaignScreen, 
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

export const { width: W } = Dimensions.get('window');

// F51: the shared style sheet the split screens reference as `s`.
export const s = StyleSheet.create({
 topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SP.xl, paddingVertical: SP.md, borderBottomWidth: StyleSheet.hairlineWidth },
 iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', position: 'relative' },
 iconBtn2: { width: 32, height: 32, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
 notifDot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5 },
 quickAction: { width: 80, alignItems: 'center', justifyContent: 'center', borderRadius: R.xl, borderWidth: 1, padding: SP.md },
 timeTag: { paddingHorizontal: SP.sm, paddingVertical: SP.xs, borderRadius: R.sm, minWidth: 52, alignItems: 'center' },
 chipBtn: { flexDirection: 'row', alignItems: 'center', gap: SP.xs, paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1.5 },
 roleAddBtn: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.lg, borderWidth: 1.5 },
 rolePillBtn: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingHorizontal: SP.lg, paddingVertical: SP.md, borderRadius: R.lg, borderWidth: 1.5 },
 credCard: { flexDirection: 'row', alignItems: 'center', gap: SP.md, padding: SP.md, borderRadius: R.md, borderWidth: 1, marginTop: SP.md },
 qrFrame: { width: 180, height: 180, borderRadius: R.xl, borderWidth: 3, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
 revCard: { borderRadius: R.xxl, padding: SP.xxl, alignItems: 'center', marginBottom: SP.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
 inputLabel: { fontSize: FS.sm, fontWeight: FW.semi, marginBottom: SP.xs },
});
