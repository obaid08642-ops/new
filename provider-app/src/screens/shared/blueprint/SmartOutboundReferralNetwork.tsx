import { buildHeaders } from '../../../security/Security';
import { API_BASE } from '../../../constants';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Dimensions, Switch, Platform, Alert, Vibration,
 ActivityIndicator, TextInput, Linking
} from 'react-native';
import { useTheme, useLang, useToast } from '../../../context';
import client from '../../../api/client';
import { useServicesCatalog } from '../../../api/catalogs';
import {
 NBtn, NCard, NInput, NBadge, NHeader, NScroll, NDivider,
 NPriceInput, NToggle, NSearch, NSecHeader, NStatCard, NAvatar,
 NSheet, NEmpty
} from '../../../components/ui';
import { I, IBg } from '../../../components/icons';
import { SP, R, FS, FW, C } from '../../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function SmartOutboundReferralNetwork({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [search, setSearch] = useState('');
  const [patientId, setPatientId] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [network, setNetwork] = useState<any[]>([]);
  const labCatalog = useServicesCatalog('lab');
  const radiologyCatalog = useServicesCatalog('radiology');
  const CATALOGUE = [...labCatalog, ...radiologyCatalog].map((service) => ({ id: service.id, label: AR ? service.ar : service.en }));
  useEffect(() => {
    let active = true;
    client.get('/provider/referral-network').then((response) => {
      if (active) setNetwork(Array.isArray(response.data) ? response.data : (response.data?.items || []));
    }).catch(() => { if (active) setNetwork([]); });
    return () => { active = false; };
  }, []);

  const handleToggleTest = (id: string) => {
    setSelectedTests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const attemptGenerate = () => {
    if (!patientId.trim() || !selectedProviderId || selectedTests.length === 0) {
      show(AR ? 'أدخل معرف المريض وحدد الجهة وفحصاً واحداً على الأقل' : 'Enter a patient ID, select a destination, and choose at least one test', 'warning');
      return;
    }
    executeGenerate();
  };

  const executeGenerate = async () => {
    const destination = network.find((item) => item.id === selectedProviderId);
    if (!destination) return;
    setLoading(true);
    try {
      const selectedTestLabels = selectedTests.map(id => CATALOGUE.find(c => c.id === id)?.label || id);
      const res = await client.post('/provider/referrals', {
        patient_id: patientId.trim(),
        target_type: destination.type,
        target_provider_id: destination.id,
        target_name: AR ? (destination.name || destination.name_en) : (destination.name_en || destination.name),
        notes: AR ? 'تحويل تشخيصي خارجي' : 'Outbound diagnostic referral',
        requested_tests: selectedTestLabels,
      });
      setRefCode(res.data.referral_code || null);
      show(AR ? 'تم إنشاء الإحالة وحفظها' : 'Referral created and saved', 'success');
    } catch (e) {
      show(AR ? 'فشل إصدار كود التحويل' : 'Failed to generate referral code', 'error');
    } finally {
      setLoading(false);
    }
  };


  return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'شبكة التحويلات الخارجية' : 'Smart Outbound Referral'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 
 <NInput label={AR ? 'اسم أو رقم المريض' : 'Patient Name / ID'} value={patientId} onChange={setPatientId} placeholder={AR ? 'أدخل اسم المريض أو هويته...' : 'Enter patient name/ID...'} />

 <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث عن معمل تحاليل أو مركز أشعة...' : 'Search lab networks / radiologies...'} />

 <NSecHeader title={AR ? 'الشبكة المعتمدة' : 'Accredited Centers'} />
 {network.filter((item) => `${item.name || ''} ${item.name_en || ''}`.toLowerCase().includes(search.toLowerCase())).length === 0 ? <NEmpty title={AR ? 'لا توجد جهات معتمدة' : 'No accredited destinations'} sub={AR ? 'ستظهر الجهات المعتمدة من الخادم هنا.' : 'Approved destinations returned by the server will appear here.'} icon="hospital" /> : network.filter((item) => `${item.name || ''} ${item.name_en || ''}`.toLowerCase().includes(search.toLowerCase())).map(item => (
 <TouchableOpacity key={item.id} onPress={() => setSelectedProviderId(item.id)}>
 <NCard style={{ marginBottom: SP.sm, borderColor: selectedProviderId === item.id ? theme.primary : theme.border }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>{AR ? (item.name || item.name_en) : (item.name_en || item.name)}</Text>
 <NBadge label={item.type} variant={item.type === 'lab' ? 'primary' : 'success'} />
 </View>
 </NCard>
 </TouchableOpacity>
 ))}

 <NSecHeader title={AR ? 'حدد الفحوصات المطلوبة للتحويل' : 'Select Referral Catalog tests'} />
 <NCard style={{ gap: SP.md }}>
 {CATALOGUE.map(test => {
 const sel = selectedTests.includes(test.id);
 return (
 <TouchableOpacity key={test.id} onPress={() => handleToggleTest(test.id)}
 style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center', paddingVertical: SP.sm }}>
 <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: sel ? theme.primary : theme.border, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? theme.primary : 'transparent' }}>
 {sel && <I name="check" size={10} color="#FFF" />}
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{test.label}</Text>
 </TouchableOpacity>
 );
 })}
 </NCard>

 <NBtn label={AR ? ' توليد كود التحويل الرقمي' : ' Generate Digital Referral'} onPress={attemptGenerate} loading={loading} />

 {refCode && (
 <NCard style={{ backgroundColor: theme.successBg, borderColor: theme.success, alignItems: 'center', paddingVertical: SP.xl }}>
 <Text style={{ fontSize: FS.xs, color: theme.success }}>{AR ? 'كود التحويل الرقمي النشط' : 'Active Digital Referral Code'}</Text>
 <Text style={{ fontSize: FS['2xl'], fontWeight: '800', color: theme.success, marginVertical: SP.sm }}>{refCode}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: 'center' }}>
 {AR ? 'تم إرسال الكود للمريض برسالة نصية ومشاركته مع المختبر المختار.' 
 : 'Code sent to patient and shared with the selected laboratory network.'}
 </Text>
 </NCard>
 )}

 

 </View>
 </NScroll>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 4: EMERGENCY DISPATCHING
// ══════════════════════════════════════════════════════════════════════════════

// 4.1 EMERGENCY SOS DISPATCH & GPS ROUTER
