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

export function DoctorLocationScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [radius, setRadius] = useState('10');
  const [transportFee, setTransportFee] = useState('50');
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let active = true;
    client.get('/provider/profile').then((res) => {
      if (!active) return;
      const p = res?.data?.data || res?.data || {};
      if (p.geo?.lat && p.geo?.lng) setPin({ lat: Number(p.geo.lat), lng: Number(p.geo.lng) });
      if (p.max_delivery_radius_km != null) setRadius(String(p.max_delivery_radius_km));
    }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function useMyLocation() {
    setLocating(true);
    try {
      const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
      const perm = await requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { show(AR ? 'الصلاحية مطلوبة لتحديد الموقع' : 'Location permission is required', 'error'); return; }
      const pos = await getCurrentPositionAsync({});
      setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      show(AR ? 'تعذر تحديد الموقع' : 'Could not determine location', 'error');
    } finally {
      setLocating(false);
    }
  }

  async function handleSave() {
    if (!pin) { show(AR ? 'حدد موقع العيادة على الخريطة أولاً' : 'Pin the clinic location on the map first', 'error'); return; }
    const r = Number(radius);
    if (!Number.isFinite(r) || r < 0) { show(AR ? 'أدخل نطاق تغطية صحيح' : 'Enter a valid coverage radius', 'error'); return; }
    setSaving(true);
    try {
      await client.patch('/provider/profile', {
        geo: { lat: pin.lat, lng: pin.lng },
        max_delivery_radius_km: r,
        delivery_fee: Number(transportFee) || 0,
      });
      show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
      onBack();
    } catch (err: any) {
      show(err?.response?.data?.message || (AR ? 'تعذر الحفظ' : 'Could not save'), 'error');
    } finally {
      setSaving(false);
    }
  }

  const MapView = require('react-native-maps').default;
  const Marker = require('react-native-maps').Marker;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'الموقع ونطاق التغطية' : 'Location & Coverage'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md }}>
        <NSecHeader title={AR ? 'موقع العيادة' : 'Clinic Location'} />
        <View style={{ height: 260, borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
          {loading ? null : (
            <MapView
              style={{ flex: 1 }}
              initialRegion={{ latitude: pin?.lat || 24.7136, longitude: pin?.lng || 46.6753, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
              onPress={(e: any) => setPin({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
            >
              {pin && <Marker coordinate={{ latitude: pin.lat, longitude: pin.lng }} draggable onDragEnd={(e: any) => setPin({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })} />}
            </MapView>
          )}
        </View>
        <NBtn label={locating ? (AR ? 'جارٍ التحديد…' : 'Locating…') : (AR ? 'استخدم موقعي الحالي' : 'Use my current location')} variant="outline" onPress={useMyLocation} />

        <View style={{ marginTop: SP.lg }}>
          <NSecHeader title={AR ? 'الزيارات المنزلية' : 'Home Visits'} />
        </View>
        <NCard>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.md }}>
            <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'نطاق التغطية (كم)' : 'Coverage Radius (KM)'}</Text>
            <NInput label="" value={radius} onChange={setRadius} kbType="numeric" style={{ width: 100, marginVertical: 0 }} />
          </View>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'رسوم الانتقال' : 'Transport Fee'}</Text>
            <NInput label="" value={transportFee} onChange={setTransportFee} kbType="numeric" style={{ width: 100, marginVertical: 0 }} />
          </View>
        </NCard>

        <NBtn label={AR ? 'حفظ' : 'Save'} loading={saving} onPress={handleSave} style={{ marginTop: SP.lg }} />
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// insuranceCos CONFIG SCREEN
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// CERTIFICATES CONFIG SCREEN
