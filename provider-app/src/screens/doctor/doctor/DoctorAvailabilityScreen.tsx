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

export function DoctorAvailabilityScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate?: (s: string, p?: any) => void }) { const { theme } = useTheme();
 const { lang, t: tt } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
  const [saving, setSaving] = useState(false);
 const [loadingAvailability, setLoadingAvailability] = useState(true);
 const [vacationMode, setVacationMode] = useState(false);
 const [weeklySchedule, setWeeklySchedule] = useState<any[]>([]);
 const [exceptions, setExceptions] = useState<any[]>([]);
 useEffect(() => {
   let active = true;
   client.get('/provider/profile/availability').then(async (response) => {
     if (!active) return;
     const av: any = response.data || {}; // null for a provider who never saved availability: the insurance list must still load
     setVacationMode(Boolean(av.vacation_mode));
     setWeeklySchedule(Array.isArray(av.weekly_schedule) ? av.weekly_schedule : []);
     setExceptions(Array.isArray(av.availability_exceptions) ? av.availability_exceptions : []);
     try {
       const catalog = await getInsuranceCatalog();
       if (!active) return;
       const saved: any[] = Array.isArray((av as any).accepted_insurance) ? (av as any).accepted_insurance : [];
       const byId = new Map(saved.map((s: any) => [String(s.company_id), s]));
       const merged = catalog.map((c: any) => {
         const s: any = byId.get(String(c.id)) || {};
         return {
           id: String(c.id), ar: c.ar, en: c.en, plans: Array.isArray((c as any).plans) ? (c as any).plans : [], classes: Array.isArray(s.classes) ? s.classes : [],
           active: s.active === true,
           copay: s.copay_pct ?? '',
           tier: s.tier || '',
           clinic: s.services ? !!s.services.clinic : true,
           online: s.services ? !!s.services.online : false,
           home: s.services ? !!s.services.home : false,
         };
       });
       for (const s of saved) {
         if (!merged.some((m: any) => m.id === String(s.company_id))) {
           merged.push({ id: String(s.company_id), ar: String(s.company_id), en: String(s.company_id),
             active: !!s.active, copay: s.copay_pct ?? '', tier: s.tier || '', plans: [], classes: Array.isArray(s.classes) ? s.classes : [],
             clinic: !!s.services?.clinic, online: !!s.services?.online, home: !!s.services?.home });
         }
       }
       setInsurances(merged);
     } catch {
       if (active) show(tt('dav.7c190559'), 'error');
     } finally {
       if (active) setInsLoading(false);
     }
   }).catch((error: any) => {
     if (active) show(error?.response?.data?.message || (tt('dav.988f3f96')), 'error');
     if (active) setInsLoading(false);
   }).finally(() => { if (active) setLoadingAvailability(false); });
   return () => { active = false; };
 }, [AR, show]);

 const [showAddException, setShowAddException] = useState(false);
 const [exDate, setExDate] = useState(() => new Date().toISOString().slice(0, 10));
 const [exType, setExType] = useState<'close_day'|'block_time'|'exceptional_open'>('close_day');
 const [exStart, setExStart] = useState('12:00');
 const [exEnd, setExEnd] = useState('14:00');

 // Insurance matrix: driven by the admin-managed catalog (/insurance/companies)
 // merged with the saved availability.accepted_insurance. Nothing is
 // hardcoded — an empty catalog renders an honest empty state (P5-c).
 const [insurances, setInsurances] = useState<any[]>([]);
 const [insLoading, setInsLoading] = useState(true);
 const [savingIns, setSavingIns] = useState(false);

  const toggleIns = (id: string) => {
  setInsurances(prev => prev.map(item => item.id === id ? { ...item, active: !item.active } : item));
  };

  const toggleService = (id: string, service: 'clinic'|'online'|'home') => {
    setInsurances(prev => prev.map(item => item.id === id ? { ...item, [service]: !item[service] } : item));
  };

 const toggleDay = (dayName: string) => {
 setWeeklySchedule(prev => prev.map(d => d.day === dayName ? { ...d, active: !d.active } : d));
 };

 const toggleSplit = (dayName: string) => {
 setWeeklySchedule(prev => prev.map(d => d.day === dayName ? { ...d, splitShift: !d.splitShift } : d));
 };

 const updateHours = (dayName: string, field: string, value: string) => {
 setWeeklySchedule(prev => prev.map(d => d.day === dayName ? { ...d, [field]: value } : d));
 };

 const [showPicker, setShowPicker] = useState(false);
 const [pickerTarget, setPickerTarget] = useState<{day: string, field: string}|null>(null);

 const onTimeChange = (event: any, selectedDate?: Date) => {
   if (Platform.OS === 'android') {
     setShowPicker(false);
   }
   if (selectedDate && pickerTarget) {
     const hours = selectedDate.getHours().toString().padStart(2, '0');
     const mins = selectedDate.getMinutes().toString().padStart(2, '0');
     updateHours(pickerTarget.day, pickerTarget.field, `${hours}:${mins}`);
   }
 };

 const openTimePicker = (day: string, field: string) => {
   setPickerTarget({ day, field });
   setShowPicker(true);
 };

  // The vacation switch saves at once (it used to change only the screen and say "enabled" while Save was disabled).
  const saveVacation = async (val: boolean) => {
    setVacationMode(val);
    try {
      await client.patch('/provider/profile/availability', { is_accepting_requests: !val, vacation_mode: val });
      show(val ? (tt('dav.ec064676')) : (tt('dav.16faab28')), val ? 'warning' : 'success');
    } catch (e: any) {
      setVacationMode(!val);
      show(e?.response?.data?.message || (tt('dav.ccf9717f')), 'error');
    }
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      await client.patch('/provider/profile/availability', {
        is_accepting_requests: !vacationMode,
        vacation_mode: vacationMode,
        weekly_schedule: weeklySchedule,
        availability_exceptions: exceptions,
      });
      show(tt('dav.2b3b748d'), 'success');
      onBack();
    } catch (e) {
      show((e as any)?.response?.data?.message || (tt('dav.840737cd')), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInsurance = async () => {
    const badCopay = insurances.find((c: any) => c.active && c.copay !== '' && c.copay != null && (!Number.isFinite(Number(c.copay)) || Number(c.copay) < 0 || Number(c.copay) > 100));
    if (badCopay) { show(tt('dav.2c54b5a2'), 'error'); return; }
    const noClasses = insurances.find((c: any) => c.active && !(c.classes?.length || c.plans?.length));
    if (noClasses) { show(AR ? `حدد فئات التأمين المقبولة لـ ${noClasses.ar} من شاشة التأمين` : `Choose the accepted plans for ${noClasses.en} on the insurance screen first`, 'error'); return; }
    setSavingIns(true);
    try {
      const accepted_insurance = insurances.map((c: any) => ({
        company_id: c.id,
        // the server needs the plan classes accepted: the ones saved before, else every plan the insurer offers
        classes: (Array.isArray(c.classes) && c.classes.length ? c.classes : (c.plans || [])).map((x: unknown) => String(x)),
        active: !!c.active,
        ...(c.copay !== '' && c.copay !== null && c.copay !== undefined && Number.isFinite(Number(c.copay))
          ? { copay_pct: Math.min(100, Math.max(0, Number(c.copay))) } : {}),
        ...(c.tier && String(c.tier).trim() ? { tier: String(c.tier).trim().slice(0, 40) } : {}),
        services: { clinic: !!c.clinic, online: !!c.online, home: !!c.home },
      }));
      await client.patch('/provider/profile/availability', { accepted_insurance });
      show(tt('dav.20e40ff3'), 'success');
    } catch (e: any) {
      show(e?.response?.data?.message || (tt('dav.d479a205')), 'error');
    } finally {
      setSavingIns(false);
    }
  };

 // An exception is saved at once; the toast is shown only when the server accepted it (it used to change the screen only).
 const persistExceptions = async (next: any[], okText: string, done?: () => void) => {
 const before = exceptions;
 setExceptions(next);
 try {
 await client.patch('/provider/profile/availability', { availability_exceptions: next });
 done?.();
 show(okText, 'success');
 } catch (e: any) {
 setExceptions(before);
 show(e?.response?.data?.message || (tt('dav.9155147b')), 'error');
 }
 };

 const handleAddException = () => {
 const labelAr = exType === 'close_day' 
 ? 'إغلاق اليوم بالكامل' 
 : exType === 'block_time' 
 ? `حظر (${exStart} - ${exEnd})` 
 : `موعد استثنائي (${exStart} - ${exEnd})`;
 
 const labelEn = exType === 'close_day' 
 ? 'Full Day Closed' 
 : exType === 'block_time' 
 ? `Blocked (${exStart} - ${exEnd})` 
 : `Exceptional (${exStart} - ${exEnd})`;

 if (!/^\d{4}-\d{2}-\d{2}$/.test(exDate) || Number.isNaN(new Date(exDate).getTime())) { show(tt('dav.a5087f24'), 'error'); return; }
 if (exType !== 'close_day') {
 const ok = /^([01]\d|2[0-3]):[0-5]\d$/;
 if (!ok.test(exStart) || !ok.test(exEnd) || exStart >= exEnd) { show(tt('dav.d65c08d8'), 'error'); return; }
 }
 const item = {
 id: String(Date.now()),
 date: exDate,
 type: exType,
 labelAr,
 labelEn,
 start: exStart,
 end: exEnd
 };

 persistExceptions([...exceptions, item], tt('dav.12f7c075'), () => setShowAddException(false));
 };

 const handleDeleteException = (id: string) => {
 persistExceptions(exceptions.filter(x => x.id !== id), tt('dav.86172202'));
 };


  const ctx: any = { theme, AR, exceptions, showAddException, setShowAddException, exStart, setExStart, exEnd, setExEnd, handleAddException, handleDeleteException,
    // the exception form edits its date and type (lost in the P9 split: typing or choosing a type crashed)
    exDate, setExDate, exType, setExType };
 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={tt('dav.f140d58f')} onBack={onBack} />
  <ScrollView contentContainerStyle={{ padding: SP.xl, paddingBottom: 100 }}>
 {loadingAvailability ? <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} /> : null}
 {/* Vacation Mode */}
 <NCard style={{ marginBottom: SP.xl, backgroundColor: vacationMode ? `${theme.danger}15` : theme.surface }} accent={vacationMode ? theme.danger : undefined}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 ️ {tt('dav.f0bcac69')}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
 {tt('dav.6f8f7ecc')}
 </Text>
 </View>
 <Switch value={vacationMode} onValueChange={saveVacation} trackColor={{ true: theme.danger }} />
 </View>
 </NCard>

 {/* Insurance Config — managed on the dedicated screen (delta approval) */}
 <NCard style={{ marginBottom: SP.xl }}>
 <NSettingsRow icon="shield" label={tt('dav.c3b6b676')} onPress={() => onNavigate && onNavigate('insurance_config')} />
 </NCard>
 {/* Weekly Schedule */}
 <NSecHeader title={tt('dav.02e787eb')} />
 {weeklySchedule.map(d => (
 <NCard key={d.day} style={{ marginBottom: SP.md, opacity: vacationMode ? 0.5 : 1 }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <Switch value={d.active} disabled={vacationMode} onValueChange={() => toggleDay(d.day)} trackColor={{ true: theme.primary }} />
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: d.active ? theme.text : theme.textSub }}>
 {AR ? d.dayAr : d.day}
 </Text>
 </View>
 {d.active && (
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{tt('dav.01d46dfe')}</Text>
 <Switch value={d.splitShift} disabled={vacationMode} onValueChange={() => toggleSplit(d.day)} />
 </View>
 )}
 </View>

 {d.active && (
 <View style={{ gap: SP.md }}>
 {/* Morning/Main Shift */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
 <Text style={{ fontSize: FS.sm, color: theme.text, width: 80, textAlign: AR ? 'right' : 'left' }}>
 {d.splitShift ? (tt('dav.17361233')) : (tt('dav.7b438a2f'))}
 </Text>
 <TouchableOpacity disabled={vacationMode} onPress={() => openTimePicker(d.day, 'morningStart')} style={{ flex: 1, height: 40, backgroundColor: theme.surface2, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' }}>
   <Text style={{ color: theme.text, fontSize: FS.sm }}>{d.morningStart || '--:--'}</Text>
 </TouchableOpacity>
 <Text style={{ color: theme.textSub }}>{tt('qqv.69012625')}</Text>
 <TouchableOpacity disabled={vacationMode} onPress={() => openTimePicker(d.day, 'morningEnd')} style={{ flex: 1, height: 40, backgroundColor: theme.surface2, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' }}>
   <Text style={{ color: theme.text, fontSize: FS.sm }}>{d.morningEnd || '--:--'}</Text>
 </TouchableOpacity>
 </View>

 {/* Evening Shift */}
 {d.splitShift && (
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
 <Text style={{ fontSize: FS.sm, color: theme.text, width: 80, textAlign: AR ? 'right' : 'left' }}>
 {tt('dav.dc42ac3a')}
 </Text>
 <TouchableOpacity disabled={vacationMode} onPress={() => openTimePicker(d.day, 'eveningStart')} style={{ flex: 1, height: 40, backgroundColor: theme.surface2, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' }}>
   <Text style={{ color: theme.text, fontSize: FS.sm }}>{d.eveningStart || '--:--'}</Text>
 </TouchableOpacity>
 <Text style={{ color: theme.textSub }}>{tt('qqv.69012625')}</Text>
 <TouchableOpacity disabled={vacationMode} onPress={() => openTimePicker(d.day, 'eveningEnd')} style={{ flex: 1, height: 40, backgroundColor: theme.surface2, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' }}>
   <Text style={{ color: theme.text, fontSize: FS.sm }}>{d.eveningEnd || '--:--'}</Text>
 </TouchableOpacity>
 </View>
 )}
 </View>
 )}
 </NCard>
 ))}
  {showPicker && (
    Platform.OS === 'ios' ? (
      <Modal transparent visible={showPicker} animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: theme.surface, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: SP.sm, borderBottomWidth: 1, borderColor: theme.border }}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={{ color: theme.primary, fontSize: FS.md, fontWeight: FW.bold }}>{tt('dav.2b48d77f')}</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={new Date()}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={(e, d) => onTimeChange(e, d)}
            />
          </View>
        </View>
      </Modal>
    ) : (
      <DateTimePicker
        value={new Date()}
        mode="time"
        is24Hour={true}
        display="default"
        onChange={onTimeChange}
      />
    )
  )}

 <NBtn label={tt('dav.255d092d')} loading={saving} onPress={handleSaveSchedule} style={{ marginVertical: SP.lg }} />
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SP.xl, marginBottom: SP.lg }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
 {tt('dav.48757853')}
 </Text>
 </View>
 {insLoading ? (
 <ActivityIndicator size="small" color={theme.primary} />
 ) : insurances.length === 0 ? (
 <NCard><Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {tt('dav.975a0970')}
 </Text></NCard>
 ) : insurances.map((c: any) => (
 <NCard key={c.id} style={{ marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? c.ar : c.en}</Text>
 </View>
 <Switch value={!!c.active} onValueChange={() => toggleIns(c.id)} trackColor={{ true: theme.primary }} />
 </View>
 {c.active ? (
 <View style={{ marginTop: SP.md, gap: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
 <View style={{ flex: 1 }}>
 <NInput label={tt('dav.e3114fdb')} value={String(c.copay ?? '')} onChange={(v: string) => setInsurances(prev => prev.map(x => x.id === c.id ? { ...x, copay: v } : x))} kbType="numeric" />
 </View>
 <View style={{ flex: 1 }}>
 <NInput label={tt('dav.c71c2356')} value={c.tier || ''} onChange={(v: string) => setInsurances(prev => prev.map(x => x.id === c.id ? { ...x, tier: v } : x))} />
 </View>
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
 {(['clinic', 'online', 'home'] as const).map(svc => (
 <TouchableOpacity key={svc} onPress={() => toggleService(c.id, svc)} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}>
 <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: c[svc] ? theme.primary : theme.border, backgroundColor: c[svc] ? theme.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
 {c[svc] ? <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text> : null}
 </View>
 <Text style={{ color: theme.text, fontSize: FS.sm }}>{svc === 'clinic' ? (tt('dav.265e8cd4')) : svc === 'online' ? (tt('dav.a6bd2a2a')) : (tt('dav.8ca476d4'))}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </View>
 ) : null}
 </NCard>
 )) }
 <NBtn label={tt('dav.5d7803cf')} loading={savingIns} onPress={handleSaveInsurance} style={{ marginTop: SP.md }} />
 <DoctorServiceSlotsCard />

      <AvailabilityExceptions ctx={ctx} />
      </ScrollView>

 </View>
 );
}
import { AvailabilityExceptions } from './AvailabilityExceptions';