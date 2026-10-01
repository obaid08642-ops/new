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
 PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights, AiMedicalCopilot,
 SmartOutboundReferralNetwork, SosDispatchScreen, GpsRouterScreen
} from '../../shared/BlueprintScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens } from '../../../theme/tokens';
import { DoctorServiceSlotsCard } from './StatisticsScreen';

import { DoctorProfileEditScreen } from './DoctorProfileEditScreen';

export function AvailabilityExceptions({ ctx }: any) {
  const { theme, AR, exceptions, showAddException, setShowAddException, exStart, setExStart, exEnd, setExEnd, handleAddException, handleDeleteException, exDate, exType, setExDate, setExType } = ctx;
  return (
    <>
     {/* Exceptional Settings */}
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SP.xl, marginBottom: SP.lg }}>
     <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
     {AR ? ' إغلاق وحظر استثنائي' : ' Exceptional Blocks & Closures'}
     </Text>
     <TouchableOpacity onPress={() => setShowAddException(true)} style={{ backgroundColor: theme.surface2, paddingHorizontal: SP.md, paddingVertical: SP.xs, borderRadius: R.md }}>
     <Text style={{ color: theme.primary, fontSize: FS.sm, fontWeight: FW.bold }}> {AR ? 'إضافة استثناء' : 'Add Rule'}</Text>
     </TouchableOpacity>
     </View>

     {exceptions.map(x => (
     <NCard key={x.id} style={{ marginBottom: SP.sm, paddingVertical: SP.md }}>
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
     <View>
     <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
     {x.date}
     </Text>
     <Text style={{ fontSize: FS.sm, color: x.type === 'exceptional_open' ? theme.success : theme.danger, textAlign: AR ? 'right' : 'left', marginTop: 4 }}>
     {AR ? x.labelAr : x.labelEn}
     </Text>
     </View>
     <TouchableOpacity onPress={() => handleDeleteException(x.id)}>
     <Text style={{ fontSize: FS.xl, color: theme.danger }}>️</Text>
     </TouchableOpacity>
     </View>
     </NCard>
     ))}

     {/* Exception Sheet */}
     <NSheet visible={showAddException} onClose={() => setShowAddException(false)} title={AR ? ' إضافة قاعدة استثنائية' : ' Add Exceptional Rule'} height={500}>
     <View style={{ padding: SP.md }}>
     <NInput label={AR ? 'التاريخ (YYYY-MM-DD)' : 'Date (YYYY-MM-DD)'} value={exDate} onChange={setExDate} />
 
     <Text style={{ fontSize: FS.sm, color: theme.text, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>
     {AR ? 'نوع القاعدة الاستثنائية' : 'Rule Type'}
     </Text>
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.lg }}>
     {(['close_day', 'block_time', 'exceptional_open'] as const).map(type => (
     <TouchableOpacity key={type} onPress={() => setExType(type)} style={{
     flex: 1, padding: SP.md, borderRadius: R.md, borderWidth: 1.5,
     borderColor: exType === type ? theme.primary : theme.border,
     backgroundColor: exType === type ? theme.primaryLight : theme.surface
     }}>
     <Text style={{ fontSize: 11, fontWeight: FW.bold, color: exType === type ? theme.primary : theme.text, textAlign: 'center' }}>
     {type === 'close_day' ? (AR ? 'إغلاق اليوم' : 'Close Day') : type === 'block_time' ? (AR ? 'حظر وقت' : 'Block Time') : (AR ? 'فتح استثنائي' : 'Open Slot')}
     </Text>
     </TouchableOpacity>
     ))}
     </View>

     {exType !== 'close_day' && (
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.md }}>
     <View style={{ flex: 1 }}>
     <NInput label={AR ? 'من وقت' : 'From Time'} value={exStart} onChange={setExStart} />
     </View>
     <View style={{ flex: 1 }}>
     <NInput label={AR ? 'إلى وقت' : 'To Time'} value={exEnd} onChange={setExEnd} />
     </View>
     </View>
     )}

     <NBtn label={AR ? ' تطبيق القاعدة' : ' Apply Rule'} onPress={handleAddException} style={{ marginTop: SP.md }} />
     </View>
     </NSheet>
    </>
  );
}

