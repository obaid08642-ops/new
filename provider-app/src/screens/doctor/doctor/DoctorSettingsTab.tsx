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
 SmartOutboundReferralNetwork, SosDispatchScreen, GpsRouterScreen
} from '../../shared/BlueprintScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens } from '../../../theme/tokens';
import { styles } from './_shared';

import { PatientFileScreen } from './PatientFileScreen';

// ══════════════════════════════════════════════════════════════════════════════
// CHAT TAB — server-backed threads and messages only
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ══════════════════════════════════════════════════════════════════════════════

export function DoctorSettingsTab({ onLogout, onNavigate }: { onLogout: () => void, onNavigate: (s: string) => void }) {
  const { theme, mode, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang } = useLang();
  const { show } = useToast();
  const { user } = useAuth();
  const AR = lang === 'ar';
  
  // Real facility link state (from the authenticated user record).
  const isLinkedToFacility = !!(user as any)?.parent_provider_account_id || !!(user as any)?.parent_facility_id;
  const [facilityName, setFacilityName] = useState<string>('');
  const [invitationsCount, setInvitationsCount] = useState(0);

  // Pricing: persisted server-side per provider.
  const [clinicPrice, setClinicPrice] = useState('');
  const [onlinePrice, setOnlinePrice] = useState('');
  const [homePrice, setHomePrice] = useState('');
  const [clinicActive, setClinicActive] = useState(false);
  const [onlineActive, setOnlineActive] = useState(false);
  const [homeActive, setHomeActive] = useState(false);
  const [pricingLoaded, setPricingLoaded] = useState(false);

  // Real facility permissions: a linked provider keeps only the permissions granted by the facility.
  const grantedPerms: string[] = Array.isArray((user as any)?.permissions) ? (user as any).permissions : [];
  const isPricingLocked = isLinkedToFacility && !grantedPerms.includes('pricing');

  useEffect(() => {
    let active = true;
    client.get('/provider/settings/pricing').then((res) => {
      if (!active) return;
      const pr = res.data?.pricing;
      if (pr) {
        setClinicPrice(pr.price_clinic != null ? String(pr.price_clinic) : '');
        setOnlinePrice(pr.price_online != null ? String(pr.price_online) : '');
        setHomePrice(pr.price_home != null ? String(pr.price_home) : '');
        setClinicActive(!!pr.active_clinic);
        setOnlineActive(!!pr.active_online);
        setHomeActive(!!pr.active_home);
      }
    }).catch(() => {}).finally(() => { if (active) setPricingLoaded(true); });
    client.get('/hospital/invitations/inbox').then((res) => {
      if (!active) return;
      const list = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setInvitationsCount(list.filter((i: any) => i.status === 'pending').length);
      const accepted = list.find((i: any) => i.status === 'accepted' && i.facility_name);
      if (accepted) setFacilityName(accepted.facility_name);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const requestDeltaUpdate = async () => {
    try {
      const pricing = {
        price_clinic: clinicPrice !== '' ? Number(clinicPrice) : null,
        price_online: onlinePrice !== '' ? Number(onlinePrice) : null,
        price_home: homePrice !== '' ? Number(homePrice) : null,
        active_clinic: clinicActive, active_online: onlineActive, active_home: homeActive,
      };
      await client.post('/provider/settings/delta', { newData: pricing });
      await client.put('/provider/settings/pricing', { pricing }).catch(() => {});
      show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending Admin Approval for Settings Delta', 'info');
    } catch (err) {
      show(AR ? 'فشل إرسال التعديل' : 'Failed to push delta', 'error');
    }
  };

  const [unlinking, setUnlinking] = useState(false);
  const handleUnlink = async () => {
    if (unlinking) return;
    setUnlinking(true);
    try {
      await client.post('/hospital/leave-facility');
      show(AR ? 'تم إنهاء الارتباط بالمنشأة' : 'Facility link ended', 'success');
    } catch (e: any) {
      show(e?.response?.data?.message === 'not_linked_to_facility'
        ? (AR ? 'لا يوجد ارتباط حالي بمنشأة' : 'No active facility link')
        : (AR ? 'تعذر إنهاء الارتباط' : 'Could not leave facility'), 'error');
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'الإعدادات' : 'Settings'} />
      <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
        
        {/* ── Facility Link ────────────────────────────────────────── */}
        {isLinkedToFacility ? (
          <NCard style={{ backgroundColor: theme.infoBg, borderColor: theme.info, borderWidth: 1 }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
              <Text style={{ fontSize: 24 }}>🏛️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.info, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'مرتبط بمنشأة' : 'Linked to Facility'}
                </Text>
                <Text style={{ fontSize: FS.xs, color: theme.info, textAlign: AR ? 'right' : 'left' }}>
                  {facilityName
                    ? (AR ? `تعمل حالياً ضمن طاقم ${facilityName}` : `Currently working under ${facilityName}`)
                    : (AR ? 'أنت مرتبط حالياً بمنشأة طبية' : 'You are currently linked to a medical facility')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleUnlink} style={{ marginTop: SP.md, alignSelf: AR ? 'flex-start' : 'flex-end' }}>
              <Text style={{ color: theme.danger, fontWeight: FW.bold, fontSize: FS.xs }}>
                {AR ? 'إنهاء الارتباط' : 'Leave Facility'}
              </Text>
            </TouchableOpacity>
          </NCard>
        ) : (
          <NSettingsRow icon="document" label={AR ? `دعوات المنشآت (${invitationsCount})` : `Facility Invitations (${invitationsCount})`} onPress={() => onNavigate('facility_invitations')} />
        )}

        {/* ── Appearance & Language ─────────────────────────────────── */}
        <NSecHeader title={AR ? 'المظهر واللغة' : 'Appearance & Language'} />
        <NCard style={{ gap: SP.lg }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
              <I name={mode === 'dark' ? 'moon' : 'sun'} size={20} color={theme.primary} />
              <Text style={{ fontSize: FS.md, color: theme.text }}>
                {AR ? (mode === 'dark' ? 'الوضع الليلي' : 'الوضع النهاري') : (mode === 'dark' ? 'Dark Mode' : 'Light Mode')}
              </Text>
            </View>
            <Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ true: theme.primary }} />
          </View>
          <NDivider />
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
              <I name="globe" size={20} color={theme.primary} />
              <Text style={{ fontSize: FS.md, color: theme.text }}>
                {AR ? 'اللغة: العربية' : 'Language: English'}
              </Text>
            </View>
            <TouchableOpacity onPress={toggleLang}
              style={{ paddingHorizontal: SP.lg, paddingVertical: SP.sm, backgroundColor: theme.primaryLight, borderRadius: R.md }}>
              <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{AR ? 'EN' : 'عربي'}</Text>
            </TouchableOpacity>
          </View>
        </NCard>

        {/* ── Services & Pricing ────────────────────────────────────── */}
        <NSecHeader title={AR ? 'إعدادات الحساب' : 'Account'} />
        <NCard style={{ marginBottom: SP.lg }}>
          <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, marginBottom: SP.sm, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'الخدمات المقدمة والأسعار' : 'Services & Pricing'}
          </Text>
          
          <View style={{ gap: SP.md, opacity: isPricingLocked ? 0.6 : 1 }} pointerEvents={isPricingLocked ? 'none' : 'auto'}>
            {isPricingLocked && (
              <Text style={{ fontSize: FS.xs, color: theme.danger, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'الأسعار والخدمات مقفلة ومتحكم بها من قبل المنشأة (مستشفى نبضة الطبي)' : 'Pricing and services are locked and managed by the facility'}
              </Text>
            )}
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
                <Switch value={clinicActive} onValueChange={setClinicActive} trackColor={{ true: theme.primary }} />
                <Text style={{ color: theme.text, fontSize: FS.sm }}>{AR ? 'كشف العيادة' : 'Clinic Visit'}</Text>
              </View>
              <NInput label="" value={clinicPrice} onChange={setClinicPrice} kbType="numeric" style={{ width: 80, marginVertical: 0 }} editable={clinicActive} />
            </View>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
                <Switch value={onlineActive} onValueChange={setOnlineActive} trackColor={{ true: theme.primary }} />
                <Text style={{ color: theme.text, fontSize: FS.sm }}>{AR ? 'استشارة أونلاين' : 'Online Consult'}</Text>
              </View>
              <NInput label="" value={onlinePrice} onChange={setOnlinePrice} kbType="numeric" style={{ width: 80, marginVertical: 0 }} editable={onlineActive} />
            </View>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
                <Switch value={homeActive} onValueChange={setHomeActive} trackColor={{ true: theme.primary }} />
                <Text style={{ color: theme.text, fontSize: FS.sm }}>{AR ? 'زيارة منزلية' : 'Home Visit'}</Text>
              </View>
              <NInput label="" value={homePrice} onChange={setHomePrice} kbType="numeric" style={{ width: 80, marginVertical: 0 }} editable={homeActive} />
            </View>
          </View>
          
          {!isPricingLocked && <NBtn label={AR ? 'حفظ التعديلات' : 'Save Changes'} onPress={requestDeltaUpdate} style={{ marginTop: SP.md }} />}
        </NCard>

        {/* ── Profile & Configuration ───────────────────────────────── */}
        <NSecHeader title={AR ? 'الملف الشخصي والإعدادات' : 'Profile & Config'} />
        <NSettingsRow icon="user" label={AR ? 'تعديل الملف الشخصي' : 'Edit Profile'} onPress={() => onNavigate('profile_edit')} />
        <NSettingsRow icon="mapPin" label={AR ? 'الموقع ونطاق التغطية' : 'Location & Coverage'} onPress={() => onNavigate('location_config')} />
        <NSettingsRow icon="calendar" label={AR ? 'مواعيد العمل (Scheduler)' : 'Availability Engine'} onPress={() => onNavigate('availability_engine')} />
        <NSettingsRow icon="shield" label={AR ? 'شركات التأمين' : 'Insurance Config'} onPress={() => onNavigate('insurance_config')} />
       <NSettingsRow icon="shield" label={AR ? 'طلبات التأمين الواردة' : 'Insurance Requests'} onPress={() => onNavigate('insurance_requests')} />
        <GlobalSystemSettings />
        
        <NBtn label={AR ? 'تسجيل الخروج' : 'Logout'} onPress={onLogout} variant="outline" style={{ borderColor: theme.danger, marginTop: SP.lg }} labelStyle={{ color: theme.danger }} />
      </ScrollView>
    </View>
  );
}
