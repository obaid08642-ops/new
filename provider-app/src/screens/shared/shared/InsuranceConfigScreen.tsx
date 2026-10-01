import { API_BASE } from '../../../constants';
import { buildHeaders } from '../../../security/Security';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppointmentStatus } from '../../../types/contracts';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Switch, TextInput,
 KeyboardAvoidingView, Platform, Linking, ActivityIndicator, Image
} from 'react-native';
import client from '../../../api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NDivider, NPriceInput, NCheckbox
} from '../../../components/ui';
import { I, IBg, RatingStars } from '../../../components/icons';
import { SP, R, FS, FW, C } from '../../../constants';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { resolveImageUri, resolveGallery } from '../../../utils/imageUrl';
import { useInsuranceCatalog } from '../../../api/catalogs';
import { SK, Vault } from '../../../security/Security';
import { tokens, withAlpha } from '../../../theme/tokens';

export function InsuranceConfigScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 // UNIFIED CATALOG: companies + plan tiers come from the backend (same source
 // as onboarding, the patient app and the admin dashboard) — never hardcoded.
 const catalog = useInsuranceCatalog();
 const [insurances, setInsurances] = useState<any[]>([]);
 const [saving, setSaving] = useState(false);

 useEffect(() => {
   (async () => {
     // prefill the provider's current acceptance from their profile
     let current: string[] = [];
     let currentPlans: Record<string, string[]> = {};
     let currentCopays: Record<string, string> = {};
     try {
       const res = await client.get('/provider-onboarding/my-profile').catch(() => null);
       const p: any = res?.data || {};
       current = p.accepted_insurance || [];
       currentPlans = p.insurance_plans || {};
       currentCopays = p.insurance_copays || {};
     } catch {}
     try {
       const m = await client.get('/provider/insurance-matrix').catch(() => null);
       const md: any = m?.data || {};
       if (md && typeof md === 'object') {
         if (Array.isArray(md.supported_companies) && md.supported_companies.length) current = md.supported_companies;
         if (md.tiers && typeof md.tiers === 'object') {
           for (const [k, v] of Object.entries(md.tiers)) {
             if (Array.isArray(v) && (v as string[]).length) currentPlans[k] = v as string[];
           }
         }
       }
     } catch {}
     setInsurances(catalog.map(c => ({
       id: c.id, ar: c.ar, en: c.en, plans: c.plans,
       active: current.includes(c.id),
       copay: currentCopays[c.id] || '20',
       selectedPlans: currentPlans[c.id] || [],
     })));
   })();
 }, [catalog]);

 const toggleIns = (id: string) => {
 setInsurances(prev => prev.map(item => item.id === id ? { ...item, active: !item.active } : item));
 };

 const updateCopay = (id: string, val: string) => {
 setInsurances(prev => prev.map(item => item.id === id ? { ...item, copay: val.replace(/\D/g, '') } : item));
 };

 const togglePlan = (id: string, plan: string) => {
 setInsurances(prev => prev.map(item => {
   if (item.id !== id) return item;
   const has = item.selectedPlans.includes(plan);
   return { ...item, selectedPlans: has ? item.selectedPlans.filter((p: string) => p !== plan) : [...item.selectedPlans, plan] };
 }));
 };

 const handleSave = async () => {
   if (saving) return;
   setSaving(true);
   try {
     const active = insurances.filter(i => i.active);
     // Changes go through the delta-audit pipeline — applied to the public
     // provider profile only after admin approval (same as other settings).
     await client.post('/provider/settings/delta', {
       changes: {
         accepts_insurance: active.length > 0,
         accepted_insurance: active.map(i => i.id),
         insurance_plans: Object.fromEntries(active.filter(i => i.selectedPlans.length).map(i => [i.id, i.selectedPlans])),
         insurance_copays: Object.fromEntries(active.map(i => [i.id, i.copay])),
       },
     });
     // Sync the enforcement matrix (companies + accepted tiers) so uncovered
     // requests never reach this provider.
     await client.put('/provider/insurance-matrix', {
       companies: active.map(i => i.id),
       tiers: Object.fromEntries(active.filter(i => i.selectedPlans.length).map(i => [i.id, i.selectedPlans])),
     }).catch(() => null);
     show(AR ? 'تم إرسال التعديلات — تُطبق بعد اعتماد الإدارة' : 'Changes sent — applied after admin approval', 'success');
     onBack();
   } catch (e: any) {
     show(AR ? `فشل الحفظ: ${e?.response?.data?.message || e?.message || ''}` : 'Save failed', 'error');
   } finally {
     setSaving(false);
   }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? 'التأمين الصحي' : 'Health Insurance'} onBack={onBack} />
 <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'حدد شركات التأمين المقبولة لديك ونسب التحمل لكل شركة:' : 'Select which insurance providers you accept and specify copay percentages:'}
 </Text>

 {insurances.map(item => (
 <NCard key={item.id} style={{ marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <IBg name="shield" size={16} color={item.active ? theme.primary : theme.textSub} bg={item.active ? `${theme.primary}12` : theme.surface2} />
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
 {AR ? item.ar : item.en}
 </Text>
 </View>
 <Switch value={item.active} onValueChange={() => toggleIns(item.id)} trackColor={{ true: theme.primary }} />
 </View>

 {item.active && (
 <View style={{ marginTop: SP.md, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.md, gap: SP.sm }}>
 <View style={{ width: 140 }}>
 <NInput
 label={AR ? 'نسبة التحمل %' : 'Copay %'}
 value={item.copay}
 onChange={(v) => updateCopay(item.id, v)}
 kbType="numeric"
 maxLen={3}
 />
 </View>
 {(item.plans || []).length > 0 && (
 <View>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الفئات المقبولة:' : 'Accepted tiers:'}</Text>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6 }}>
 {item.plans.map((p: string) => {
   const on = item.selectedPlans.includes(p);
   return (
   <TouchableOpacity key={p} onPress={() => togglePlan(item.id, p)} style={{ paddingHorizontal: SP.md, paddingVertical: SP.xs, borderRadius: R.full, borderWidth: 1.5, backgroundColor: on ? theme.primary : theme.surface2, borderColor: on ? theme.primary : theme.border }}>
   <Text style={{ color: on ? 'var(--nabd-bg.surface-light)' : theme.text, fontSize: FS.xs, fontWeight: FW.semi }}>{p}</Text>
   </TouchableOpacity>
   );
 })}
 </View>
 </View>
 )}
 </View>
 )}
 </NCard>
 ))}

 <NBtn label={AR ? ' حفظ الإعدادات' : ' Save Settings'} onPress={handleSave} loading={saving} style={{ marginTop: SP.xl }} />
 </ScrollView>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// CERTIFICATES CONFIG SCREEN
