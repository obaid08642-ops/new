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
import { DoctorServiceSlotsCard } from './StatisticsScreen';


export function AvailabilityExceptions({ ctx }: any) {
  const { t: tt } = useLang();
  const { theme, AR, exceptions, showAddException, setShowAddException, exStart, setExStart, exEnd, setExEnd, handleAddException, handleDeleteException, exDate, exType, setExDate, setExType } = ctx;
  return (
    <>
     {/* Exceptional Settings */}
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SP.xl, marginBottom: SP.lg }}>
     <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
     {tt('sxzc.a1b2dec6')}
     </Text>
     <TouchableOpacity onPress={() => setShowAddException(true)} style={{ backgroundColor: theme.surface2, paddingHorizontal: SP.md, paddingVertical: SP.xs, borderRadius: R.md }}>
     <Text style={{ color: theme.primary, fontSize: FS.sm, fontWeight: FW.bold }}> {tt('sxzc.5d96746c')}</Text>
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
     <NSheet visible={showAddException} onClose={() => setShowAddException(false)} title={tt('sxzc.dea3de8a')} height={500}>
     <View style={{ padding: SP.md }}>
     <NInput label={tt('sxzc.3411edcf')} value={exDate} onChange={setExDate} />
 
     <Text style={{ fontSize: FS.sm, color: theme.text, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>
     {tt('sxzc.c48ece3f')}
     </Text>
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.lg }}>
     {(['close_day', 'block_time', 'exceptional_open'] as const).map(type => (
     <TouchableOpacity key={type} onPress={() => setExType(type)} style={{
     flex: 1, padding: SP.md, borderRadius: R.md, borderWidth: 1.5,
     borderColor: exType === type ? theme.primary : theme.border,
     backgroundColor: exType === type ? theme.primaryLight : theme.surface
     }}>
     <Text style={{ fontSize: 11, fontWeight: FW.bold, color: exType === type ? theme.primary : theme.text, textAlign: 'center' }}>
     {type === 'close_day' ? (tt('sxzc.c9157634')) : type === 'block_time' ? (tt('sxzc.4736592a')) : (tt('sxzc.428771b4'))}
     </Text>
     </TouchableOpacity>
     ))}
     </View>

     {exType !== 'close_day' && (
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.md }}>
     <View style={{ flex: 1 }}>
     <NInput label={tt('sxzc.684188d7')} value={exStart} onChange={setExStart} />
     </View>
     <View style={{ flex: 1 }}>
     <NInput label={tt('sxzc.663e71e4')} value={exEnd} onChange={setExEnd} />
     </View>
     </View>
     )}

     <NBtn label={tt('sxzc.7ad9bfac')} onPress={handleAddException} style={{ marginTop: SP.md }} />
     </View>
     </NSheet>
    </>
  );
}

