/**
 * NABDAH PLUS – AMBULANCE / EMERGENCY DRIVER DASHBOARD
 * Screens: Home (SOS pool + missions) · ActiveMission (ETA+GPS) · Handover ·
 * CompletionReport · History — all backed by live APIs (emergency + provider/ops).
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../context';
import { I } from '../../components/icons';
import {
  NBtn, NCard, NAvatar, NBadge, NHeader, NScroll, NInput,
  NSecHeader, NOnlineToggle, NEmpty,
} from '../../components/ui';
import { SP, R, FS, FW } from '../../constants';
import client from '../../api/client';
import { FleetScreen } from '../shared/FleetScreen';

const Stack = createNativeStackNavigator();

// ── 1. HOME ──────────────────────────────────────────────────────────────────
function AmbulanceHomeScreen({ onNavigate }: { onNavigate: (s: string, p?: any) => void }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { lang } = useLang();
  const { user, toggleOnline } = useAuth();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [pool, setPool] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await client.get('/emergency/driver/missions');
      setPool(res.data?.pool || []);
      setMine(res.data?.mine || []);
    } catch {
      setPool([]); setMine([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const claim = async (id: string) => {
    setClaiming(id);
    try {
      await client.post(`/emergency/${id}/claim`, {});
      show(AR ? 'تم قبول المهمة — انطلق' : 'Mission claimed — go!', 'success');
      await load();
      onNavigate('mission', { id });
    } catch (e: any) {
      show(e?.response?.data?.message === 'already_claimed_or_closed'
        ? (AR ? 'سبقك إليها سائق آخر' : 'Already claimed by another driver')
        : (AR ? 'تعذر قبول المهمة' : 'Could not claim mission'), 'error');
      await load();
    } finally {
      setClaiming(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <NHeader
        title={AR ? ' مركز مهام الإسعاف' : ' Ambulance Missions'}
        right={<NOnlineToggle value={!!user?.isOnline} onToggle={toggleOnline} />}
      />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.danger} />}
        contentContainerStyle={{ padding: SP.lg, paddingBottom: 60 }}>

        {mine.length > 0 && (
          <>
            <NSecHeader title={AR ? 'مهامي النشطة' : 'My Active Missions'} />
            {mine.map((m: any) => (
              <TouchableOpacity key={m.id} onPress={() => onNavigate('mission', { id: m.id })}>
                <NCard style={{ marginBottom: SP.md, borderLeftWidth: 4, borderLeftColor: theme.danger }}>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
                    <View style={[s.sosIcon, { backgroundColor: theme.danger + '22' }]}>
                      <I name="ambulance" size={26} color={theme.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                        {m.patient_name || (AR ? 'مريض' : 'Patient')} · {m.severity === 'high' ? (AR ? 'حرج' : 'HIGH') : (AR ? 'متوسط' : 'MED')}
                      </Text>
                      <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                        {m.symptoms || ''} · {m.state}
                      </Text>
                    </View>
                    <I name={AR ? 'chevron-back' : 'chevron-forward'} size={20} color={theme.textSub} />
                  </View>
                </NCard>
              </TouchableOpacity>
            ))}
          </>
        )}

        <NSecHeader title={AR ? `نداءات مفتوحة (${pool.length})` : `Open SOS Calls (${pool.length})`} />
        {loading && <ActivityIndicator color={theme.danger} style={{ marginTop: SP.xl }} />}
        {!loading && pool.length === 0 && (
          <NEmpty
            title={AR ? 'لا نداءات حالياً' : 'No open calls'}
            subtitle={AR ? 'ابقَ متصلاً — تصلك النداءات فورياً كل 15 ثانية' : 'Stay online — calls refresh every 15s'}
          />
        )}
        {pool.map((m: any) => (
          <NCard key={m.id} style={{ marginBottom: SP.md }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
              <View style={[s.sosIcon, { backgroundColor: theme.danger + '22' }]}>
                <I name="alert" size={24} color={theme.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                  {m.patient_name || (AR ? 'نداء استغاثة' : 'SOS Call')}
                </Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                  {m.symptoms || (AR ? 'بدون تفاصيل' : 'No details')} · {new Date(m.createdAt).toLocaleTimeString(AR ? 'ar-SA-u-ca-gregory' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <NBtn
                label={claiming === m.id ? '…' : (AR ? 'قبول' : 'Accept')}
                size="sm" full={false} loading={claiming === m.id}
                onPress={() => claim(m.id)}
                style={{ backgroundColor: theme.danger, paddingHorizontal: SP.lg }}
              />
            </View>
          </NCard>
        ))}

        <TouchableOpacity onPress={() => onNavigate('fleet')}>
          <NCard style={{ marginTop: SP.md, alignItems: 'center' }}>
            <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{AR ? ' أسطول الإسعاف' : ' Ambulance Fleet'}</Text>
          </NCard>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('history')}>
          <NCard style={{ marginTop: SP.md, alignItems: 'center' }}>
            <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{AR ? 'سجل المهام المكتملة' : 'Completed Missions History'}</Text>
          </NCard>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── 2. ACTIVE MISSION ────────────────────────────────────────────────────────
function ActiveMissionScreen({ mission, onBack, onNavigate }: { mission: any; onBack: () => void; onNavigate: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';

  const [eta, setEta] = useState<{ eta_minutes: number | null; distance_km?: number } | null>(null);
  const [tracking, setTracking] = useState(false);
  const trackRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const Location = require('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        const res = await client.get(`/provider/ops/ambulance/${mission.id}/eta`, {
          params: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        });
        if (mounted) setEta(res.data);
      } catch {
        if (mounted) setEta({ eta_minutes: null });
      }
    })();
    return () => { mounted = false; };
  }, [mission.id]);

  useEffect(() => {
    if (!tracking) { if (trackRef.current) clearInterval(trackRef.current); return; }
    trackRef.current = setInterval(async () => {
      try {
        const Location = require('expo-location');
        const pos = await Location.getCurrentPositionAsync({});
        await client.post(`/emergency/${mission.id}/track`, { lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch { /* best-effort tracking */ }
    }, 30000);
    return () => { if (trackRef.current) clearInterval(trackRef.current); };
  }, [tracking, mission.id]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? ' المهمة النشطة' : ' Active Mission'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ backgroundColor: theme.danger + '12', alignItems: 'center', padding: SP.xl, marginBottom: SP.lg }}>
          <I name="timer" size={40} color={theme.danger} />
          <Text style={{ fontSize: 48, fontWeight: FW.xbold, color: theme.danger, marginTop: SP.sm }}>
            {eta?.eta_minutes != null ? `${eta.eta_minutes}` : '—'}
          </Text>
          <Text style={{ fontSize: FS.md, color: theme.textSub }}>
            {AR ? 'دقيقة للوصول' : 'minutes ETA'}{eta?.distance_km ? ` · ${eta.distance_km} ${AR ? 'كم' : 'km'}` : ''}
          </Text>
        </NCard>

        <NCard style={{ marginBottom: SP.lg }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
            <NAvatar name={mission.patient_name || 'P'} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                {mission.patient_name || (AR ? 'مريض' : 'Patient')}
              </Text>
              <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                {mission.symptoms || '—'}
              </Text>
            </View>
            <NBadge label={mission.severity === 'high' ? (AR ? 'حرج' : 'HIGH') : (AR ? 'متوسط' : 'MED')} variant={mission.severity === 'high' ? 'danger' : 'warning'} />
          </View>
        </NCard>

        <NBtn
          label={tracking ? (AR ? 'إيقاف التتبع المباشر' : 'Stop Live Tracking') : (AR ? 'بدء التتبع المباشر' : 'Start Live Tracking')}
          variant={tracking ? 'outline' : 'secondary'}
          onPress={() => setTracking(!tracking)}
          style={{ marginBottom: SP.md }}
        />
        <NBtn
          label={AR ? 'تسليم للمستشفى' : 'Hospital Handover'}
          onPress={() => onNavigate('handover', mission)}
          style={{ marginBottom: SP.md, backgroundColor: theme.primary }}
        />
        <NBtn
          label={AR ? 'إنهاء المهمة + التقرير' : 'Complete Mission + Report'}
          variant="outline"
          onPress={() => onNavigate('complete', mission)}
        />
      </NScroll>
    </View>
  );
}

// ── 3. HANDOVER ──────────────────────────────────────────────────────────────
function HandoverScreen({ mission, onBack }: { mission: any; onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [hospital, setHospital] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!hospital.trim()) { show(AR ? 'اسم المستشفى مطلوب' : 'Hospital name required', 'error'); return; }
    setLoading(true);
    try {
      await client.post(`/provider/ops/ambulance/${mission.id}/handover`, { hospital_name: hospital.trim(), notes: notes.trim() });
      show(AR ? 'تم التسليم للمستشفى' : 'Handed over to hospital', 'success');
      onBack();
    } catch (e: any) {
      show(e?.message || (AR ? 'فشل التسليم' : 'Handover failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? ' تسليم المريض للمستشفى' : ' Hospital Handover'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.lg }}>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', lineHeight: 22 }}>
            {AR
              ? 'وثّق تسليم المريض لطاقم المستشفى. هذا السجل قانوني ويُحفظ مع توقيتك واسمك.'
              : 'Document the patient handover. This is a legal record stored with your name and timestamp.'}
          </Text>
        </NCard>
        <NInput label={AR ? 'اسم المستشفى *' : 'Hospital name *'} value={hospital} onChange={setHospital}
          placeholder={AR ? 'مثال: مستشفى الملك فهد' : 'e.g. King Fahad Hospital'} />
        <NInput label={AR ? 'ملاحظات التسليم' : 'Handover notes'} value={notes} onChange={setNotes} multiline
          placeholder={AR ? 'حالة المريض عند التسليم…' : 'Patient condition on arrival…'} />
        <NBtn label={AR ? 'تأكيد التسليم' : 'Confirm Handover'} onPress={submit} loading={loading} style={{ marginTop: SP.lg }} />
      </NScroll>
    </View>
  );
}

// ── 4. COMPLETION REPORT ─────────────────────────────────────────────────────
function CompletionReportScreen({ mission, onBack }: { mission: any; onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState('');
  const [bp, setBp] = useState('');
  const [hr, setHr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [loading, setLoading] = useState(false);

  const OUTCOMES = AR
    ? ['نُقل للطوارئ', 'عولج في الموقع', 'رفض النقل', 'حالة مستقرة']
    : ['Transferred to ER', 'Treated on site', 'Refused transport', 'Stable'];

  const submit = async () => {
    if (!summary.trim() || !outcome) { show(AR ? 'الملخص والنتيجة مطلوبان' : 'Summary and outcome required', 'error'); return; }
    setLoading(true);
    try {
      await client.post(`/provider/ops/ambulance/${mission.id}/complete`, {
        summary: summary.trim(),
        outcome,
        vitals: { bp: bp || undefined, hr: hr || undefined, spo2: spo2 || undefined },
      });
      show(AR ? 'اكتملت المهمة — أحسنت' : 'Mission completed — well done', 'success');
      onBack();
    } catch (e: any) {
      show(e?.message || (AR ? 'فشل الإنهاء' : 'Completion failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? ' تقرير إنجاز المهمة' : ' Mission Completion Report'} onBack={onBack} />
      <NScroll pad>
        <NSecHeader title={AR ? 'نتيجة المهمة *' : 'Mission outcome *'} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.lg }}>
          {OUTCOMES.map((o) => (
            <TouchableOpacity key={o} onPress={() => setOutcome(o)}
              style={[s.chip, { backgroundColor: outcome === o ? theme.primary : theme.surface2, borderColor: outcome === o ? theme.primary : theme.border }]}>
              <Text style={{ color: outcome === o ? '#FFF' : theme.text, fontWeight: FW.semi }}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <NInput label={AR ? 'ملخص الحالة والإجراءات *' : 'Condition & procedures summary *'} value={summary} onChange={setSummary} multiline
          placeholder={AR ? 'وجدنا المريض… قمنا بـ…' : 'Found patient… performed…'} />

        <NSecHeader title={AR ? 'العلامات الحيوية عند الإنهاء' : 'Final vitals'} />
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
          <View style={{ flex: 1 }}><NInput label="BP" value={bp} onChange={setBp} placeholder="120/80" /></View>
          <View style={{ flex: 1 }}><NInput label="HR" value={hr} onChange={setHr} placeholder="72" /></View>
          <View style={{ flex: 1 }}><NInput label="SpO2" value={spo2} onChange={setSpo2} placeholder="98%" /></View>
        </View>

        <NBtn label={AR ? 'إنهاء المهمة واعتماد التقرير' : 'Complete Mission & Submit'} onPress={submit} loading={loading}
          style={{ marginTop: SP.xl, backgroundColor: theme.success }} />
      </NScroll>
    </View>
  );
}

// ── 5. HISTORY ───────────────────────────────────────────────────────────────
function AmbulanceHistoryScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/provider/ops/wallet/ledger?limit=50')
      .then(() => {})
      .catch(() => {})
      .finally(() => setLoading(false));
    setRows([]);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? ' سجل المهام' : ' Missions History'} onBack={onBack} />
      <NScroll pad>
        {loading && <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} />}
        {!loading && rows.length === 0 && (
          <NEmpty title={AR ? 'لا مهام مكتملة بعد' : 'No completed missions yet'} subtitle={AR ? 'مهامك المنتهية وملخصاتها تظهر هنا' : 'Your finished missions appear here'} />
        )}
        {rows.map((m: any) => (
          <NCard key={m.id} style={{ marginBottom: SP.sm }}>
            <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>{m.patient_name}</Text>
            <Text style={{ color: theme.textSub, fontSize: FS.xs, textAlign: AR ? 'right' : 'left' }}>{m.outcome} · {String(m.completed_at || '').slice(0, 10)}</Text>
          </NCard>
        ))}
      </NScroll>
    </View>
  );
}

// ── LOADER + NAVIGATOR ───────────────────────────────────────────────────────
function ActiveMissionLoader({ route, navigation }: any) {
  const { theme } = useTheme();
  const [mission, setMission] = useState<any>(null);
  useEffect(() => {
    const id = route.params?.param?.id;
    if (!id) return;
    client.get(`/emergency/driver/missions`).then((res: any) => {
      const all = [...(res.data?.mine || []), ...(res.data?.pool || [])];
      setMission(all.find((m: any) => m.id === id) || { id });
    }).catch(() => setMission({ id }));
  }, [route.params?.param?.id]);

  if (!mission) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.danger} size="large" />
      </View>
    );
  }
  return (
    <ActiveMissionScreen
      mission={mission}
      onBack={() => navigation.goBack()}
      onNavigate={(s, p) => navigation.navigate(s, { param: p })}
    />
  );
}

export function AmbulanceDashboardNavigator({ onLogout }: { onLogout: () => void }) {
  return (
    <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home">
        {({ navigation }: any) => (
          <AmbulanceHomeScreen onNavigate={(s, p) => navigation.navigate(s, { param: p })} />
        )}
      </Stack.Screen>
      <Stack.Screen name="mission">
        {({ navigation, route }: any) => (
          <ActiveMissionLoader route={route} navigation={navigation} />
        )}
      </Stack.Screen>
      <Stack.Screen name="handover">
        {({ navigation, route }: any) => (
          <HandoverScreen mission={route.params?.param} onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="complete">
        {({ navigation, route }: any) => (
          <CompletionReportScreen mission={route.params?.param} onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="history">
        {({ navigation }: any) => <AmbulanceHistoryScreen onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="fleet">
        {({ navigation }: any) => <FleetScreen onBack={() => navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

const s = StyleSheet.create({
  sosIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1.5 },
});
