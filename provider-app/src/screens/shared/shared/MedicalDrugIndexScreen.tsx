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
import { DrugSection } from './MedicalJobsScreen';

import { DrugIndexCard } from './DrugIndexCard';

import { DrugIndexHeader } from './DrugIndexHeader';

import { DrugIndexDetail } from './DrugIndexDetail';

export function MedicalDrugIndexScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
 const [search, setSearch] = useState('');
 const [selectedCat, setSelectedCat] = useState('all');
 const [selectedDrug, setSelectedDrug] = useState<any | null>(null);
 const [drugDetail, setDrugDetail] = useState<any | null>(null);
 const [detailLoading, setDetailLoading] = useState(false);
 const [drugs, setDrugs] = useState<any[]>([]);
 const [categories, setCategories] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const { show } = useToast();
 const scrollY = useRef(new Animated.Value(0)).current;
 const insets = useSafeAreaInsets();

 // ── Suggest-edit (اقتراح تعديل) state — providers propose field fixes or a
 // replacement image; every suggestion lands in the admin review queue.
 const [suggestOpen, setSuggestOpen] = useState(false);
 const [suggestTab, setSuggestTab] = useState<'fields' | 'image'>('fields');
 const [suggestForm, setSuggestForm] = useState<Record<string, string>>({});
 const [suggestNote, setSuggestNote] = useState('');
 const [suggestImg, setSuggestImg] = useState<{ uri: string; mime: string } | null>(null);
 const [suggestBusy, setSuggestBusy] = useState(false);

 // Editable catalog fields (must stay within the backend EDITABLE_FIELDS
 // whitelist — anything outside it is dropped server-side).
 const SUGGEST_FIELD_DEFS: Array<{ key: string; ar: string; en: string; multi?: boolean; numeric?: boolean; cur: (d: any, s: any) => any }> = [
   { key: 'name_ar', ar: 'اسم الدواء (عربي)', en: 'Drug name (AR)', cur: (d, s) => d.name_ar ?? s.name_ar },
   { key: 'name_en', ar: 'اسم الدواء (إنجليزي)', en: 'Drug name (EN)', cur: (d, s) => d.name_en ?? s.name_en },
   { key: 'active_ingredient', ar: 'المادة الفعالة', en: 'Active ingredient', cur: (d, s) => d.active_ingredient ?? d.active_ar ?? s.active_ar },
   { key: 'generic_name', ar: 'الاسم العلمي', en: 'Generic name', cur: (d) => d.generic_name },
   { key: 'manufacturer', ar: 'الشركة المصنعة', en: 'Manufacturer', cur: (d, s) => d.manufacturer ?? s.manufacturer },
   { key: 'category', ar: 'الفئة', en: 'Category', cur: (d, s) => d.category ?? d.category_ar ?? s.category_ar },
   { key: 'sub_category', ar: 'الفئة الفرعية', en: 'Subcategory', cur: (d, s) => d.sub_category ?? s.sub_category },
   { key: 'form', ar: 'الشكل الدوائي', en: 'Dosage form', cur: (d, s) => d.form ?? s.form },
   { key: 'strength', ar: 'التركيز', en: 'Strength', cur: (d, s) => d.strength ?? s.strength },
   { key: 'package_size', ar: 'حجم العبوة', en: 'Package size', cur: (d, s) => d.package_size ?? s.package_size },
   { key: 'barcode', ar: 'الباركود', en: 'Barcode', cur: (d) => d.barcode },
   { key: 'price', ar: 'السعر (ر.س)', en: 'Price (SAR)', numeric: true, cur: (d, s) => d.price ?? s.price },
   { key: 'description_ar', ar: 'الوصف', en: 'Description', multi: true, cur: (d) => d.description_ar ?? d.description_en },
   { key: 'indications_ar', ar: 'دواعي الاستعمال', en: 'Indications', multi: true, cur: (d) => d.indications_ar ?? d.indications_en },
   { key: 'dosage_ar', ar: 'الجرعة وطريقة الاستخدام', en: 'Dosage & usage', multi: true, cur: (d) => d.dosage_ar ?? d.dosage_en },
   { key: 'usage_instructions_ar', ar: 'إرشادات الاستخدام', en: 'Usage instructions', multi: true, cur: (d) => d.usage_instructions_ar ?? d.usage_instructions_en },
   { key: 'warnings_ar', ar: 'تحذيرات', en: 'Warnings', multi: true, cur: (d) => d.warnings_ar ?? d.warnings_en },
   { key: 'precautions_ar', ar: 'احتياطات', en: 'Precautions', multi: true, cur: (d) => d.precautions_ar ?? d.precautions_en },
   { key: 'side_effects_ar', ar: 'الأعراض الجانبية', en: 'Side effects', multi: true, cur: (d) => d.side_effects_ar ?? d.side_effects_en },
   { key: 'contraindications_ar', ar: 'موانع الاستخدام', en: 'Contraindications', multi: true, cur: (d) => d.contraindications_ar ?? d.contraindications_en },
   { key: 'interactions', ar: 'التفاعلات الدوائية', en: 'Drug interactions', multi: true, cur: (d) => d.interactions },
   { key: 'storage_conditions_ar', ar: 'شروط التخزين', en: 'Storage conditions', multi: true, cur: (d) => d.storage_conditions_ar ?? d.storage_conditions_en },
 ];

 const openSuggest = () => {
   const d: any = drugDetail || {};
   const init: Record<string, string> = {};
   for (const f of SUGGEST_FIELD_DEFS) {
     const v = f.cur(d, selectedDrug);
     init[f.key] = v === undefined || v === null ? '' : String(v);
   }
   setSuggestForm(init);
   setSuggestNote('');
   setSuggestImg(null);
   setSuggestTab('fields');
   setSuggestOpen(true);
 };

 const pickSuggestImage = async () => {
   try {
     const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
     if (!perm.granted) { show(AR ? 'يلزم إذن الوصول إلى الصور' : 'Photo permission required', 'error'); return; }
     const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, quality: 0.85 });
     if (r.canceled || !r.assets?.[0]) return;
     const a: any = r.assets[0];
     setSuggestImg({ uri: a.uri, mime: a.mimeType || 'image/jpeg' });
   } catch {
     show(AR ? 'تعذر اختيار الصورة' : 'Could not pick image', 'error');
   }
 };

 const submitSuggestFields = async () => {
   if (!selectedDrug || suggestBusy) return;
   const d: any = drugDetail || {};
   const changes: Record<string, any> = {};
   for (const f of SUGGEST_FIELD_DEFS) {
     const cur = f.cur(d, selectedDrug);
     const curStr = cur === undefined || cur === null ? '' : String(cur);
     const v = (suggestForm[f.key] ?? '').trim();
     if (v !== curStr.trim()) changes[f.key] = f.numeric ? Number(v) : v;
   }
   if (Object.keys(changes).length === 0) {
     show(AR ? 'لم تقم بتعديل أي حقل' : 'No field was modified', 'info');
     return;
   }
   if (changes.price !== undefined && !isFinite(changes.price)) {
     show(AR ? 'السعر المدخل غير صالح' : 'Invalid price', 'error');
     return;
   }
   setSuggestBusy(true);
   try {
     await client.post(`/medicines/${selectedDrug.id}/suggest-change`, {
       type: 'field_edit',
       changes,
       note: suggestNote.trim() || undefined,
     });
     show(AR ? 'تم إرسال الاقتراح — بانتظار موافقة الإدارة' : 'Suggestion sent — pending admin approval', 'success');
     setSuggestOpen(false);
   } catch (e: any) {
     show(AR ? `فشل إرسال الاقتراح: ${e?.response?.data?.message || e?.message || ''}` : 'Failed to send suggestion', 'error');
   } finally {
     setSuggestBusy(false);
   }
 };

 const submitSuggestImage = async () => {
   if (!selectedDrug || !suggestImg || suggestBusy) return;
   setSuggestBusy(true);
   try {
     // Real FILE upload (no links): push the picked image bytes to storage,
     // then reference the stored object in the suggestion.
     const base64 = await FileSystem.readAsStringAsync(suggestImg.uri, { encoding: 'base64' });
     // Registered providers use the standard upload; unregistered visitors fall
     // back to the public, image-only, size-capped suggestion upload route.
     let up;
     try {
       up = await client.post('/storage/upload', {
         data_base64: base64,
         mime: suggestImg.mime,
         original_name: `drug_suggest_${selectedDrug.id}.jpg`,
         visibility: 'public_read', // medicine catalogue images live on Cloudflare R2 (default target)
       });
     } catch (e: any) {
       if (e?.response?.status !== 401) throw e;
       up = await client.post('/storage/upload-suggestion-image', {
         data_base64: base64,
         mime: suggestImg.mime,
         original_name: `drug_suggest_${selectedDrug.id}.jpg`,
       });
     }
     const storageId = up.data?.id;
     if (!storageId) throw new Error('upload_failed');
     await client.post(`/medicines/${selectedDrug.id}/suggest-image`, {
       storage_id: storageId,
       note: suggestNote.trim() || undefined,
     });
     show(AR ? 'تم إرسال الصورة المقترحة — بانتظار موافقة الإدارة' : 'Image suggestion sent — pending admin approval', 'success');
     setSuggestOpen(false);
     setSuggestImg(null);
   } catch (e: any) {
     show(AR ? `فشل إرسال الصورة: ${e?.response?.data?.message || e?.message || ''}` : 'Failed to send image', 'error');
   } finally {
     setSuggestBusy(false);
   }
 };

 // Load dynamic categories from the real medicines catalog
 useEffect(() => {
   (async () => {
     try {
       const headers = await buildHeaders(true);
       const res = await fetch(`${API_BASE}/drugs/categories`, { headers });
       if (res.ok) {
         const data = await res.json();
         setCategories([{ key: 'all', count: 0 }, ...(data.data || [])]);
       }
     } catch {}
   })();
 }, []);

 // Server-side search + category filtering (debounced)
 useEffect(() => {
   let cancelled = false;
   const t = setTimeout(async () => {
     setLoading(true);
     try {
       const q = new URLSearchParams();
       if (search.trim()) q.append('search', search.trim());
       if (selectedCat !== 'all') q.append('category', selectedCat);
       q.append('limit', '100');
       const headers = await buildHeaders(true);
       const res = await fetch(`${API_BASE}/drugs?${q.toString()}`, { headers });
       if (res.ok) {
         const data = await res.json();
         if (!cancelled) setDrugs(data.data || []);
       }
     } catch {
     } finally {
       if (!cancelled) setLoading(false);
     }
   }, 300);
   return () => { cancelled = true; clearTimeout(t); };
 }, [search, selectedCat]);

 // Load the full product profile when a drug is opened
 useEffect(() => {
   if (!selectedDrug) { setDrugDetail(null); return; }
   setDetailLoading(true);
   (async () => {
     try {
       const headers = await buildHeaders(true);
       const res = await fetch(`${API_BASE}/drugs/${selectedDrug.id}`, { headers });
       if (res.ok) {
         const data = await res.json();
         if (!data.error) setDrugDetail(data);
       }
     } catch {
     } finally {
       setDetailLoading(false);
     }
   })();
 }, [selectedDrug?.id]);

 const headerHeight = scrollY.interpolate({
   inputRange: [0, 80],
   outputRange: [120, 60],
   extrapolate: 'clamp',
 });
 const headerOpacity = scrollY.interpolate({
   inputRange: [0, 40],
   outputRange: [1, 0],
   extrapolate: 'clamp',
 });

   const FactRow = ({ label, value }: { label: string; value?: any }) => {
     if (value === undefined || value === null || value === '') return null;
     return (
       <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', gap: SP.sm }}>
         <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>{label}</Text>
         <Text style={{ fontSize: FS.sm, color: theme.textSub, flex: 1, textAlign: AR ? 'left' : 'right' }}>{String(value)}</Text>
       </View>
     );
   };

  const ctx: any = { theme, AR, show, insets, onBack, search, setSearch, selectedCat, setSelectedCat, selectedDrug, setSelectedDrug, drugDetail, setDrugDetail, detailLoading, setDetailLoading, drugs, categories, loading, scrollY, suggestOpen, setSuggestOpen, suggestTab, setSuggestTab, suggestForm, setSuggestForm, suggestNote, setSuggestNote, suggestImg, setSuggestImg, suggestBusy, setSuggestBusy, openSuggest, pickSuggestImage, submitSuggestFields, submitSuggestImage, headerHeight, headerOpacity,
    // DrugIndexDetail renders the suggest-change form from these (lost in the P9 split: the form crashed).
    SUGGEST_FIELD_DEFS };
  if (selectedDrug) { return <DrugIndexDetail ctx={ctx} />; }


 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
    <DrugIndexHeader ctx={ctx} />

 <View style={{ paddingHorizontal: SP.lg, paddingTop: SP.md, gap: SP.md, backgroundColor: theme.bg }}>
 <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث باسم الدواء أو المادة الفعالة...' : 'Search drug name or active ingredient...'} />

 {/* Categories Carousel (from live catalog) */}
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: AR ? 'row-reverse' : 'row' }}>
 <View style={{ flexDirection: 'row', gap: SP.xs, paddingBottom: 4 }}>
 {categories.map(cat => (
 <TouchableOpacity key={cat.key} onPress={() => setSelectedCat(cat.key)}
 style={[{ paddingHorizontal: SP.md, paddingVertical: SP.xs, borderRadius: R.full, borderWidth: 1.5 }, {
 backgroundColor: selectedCat === cat.key ? theme.primary : theme.surface2, borderColor: selectedCat === cat.key ? theme.primary : theme.border
 }]}>
 <Text style={{ color: selectedCat === cat.key ? '#FFF' : theme.text, fontSize: FS.sm, fontWeight: FW.semi }}>
 {cat.key === 'all' ? (AR ? 'الكل' : 'All') : cat.key}{cat.count ? ` (${cat.count})` : ''}
 </Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>
 </View>

 {loading ? (
   <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
     <ActivityIndicator size="large" color={theme.primary} />
   </View>
 ) : (
 <Animated.FlatList
 data={drugs}
 onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
 scrollEventThrottle={16}
 keyExtractor={item => item.id}
 contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}
 ListEmptyComponent={<NEmpty title={AR ? 'لا توجد أدوية' : 'No drugs found'} sub={AR ? 'حاول تغيير كلمات البحث' : 'Try a different search'} />}
 renderItem={({ item }) => (
 <DrugIndexCard item={item} ctx={ctx} />
 )}
 />
 )}

 </View>
 );
}

export const st = StyleSheet.create({
 topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SP.xl, paddingVertical: SP.md, borderBottomWidth: StyleSheet.hairlineWidth },
 chip: { paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1.5 },
 chatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SP.lg, borderBottomWidth: StyleSheet.hairlineWidth },
 unreadBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
 msgBubble: { maxWidth: '80%', paddingHorizontal: SP.lg, paddingVertical: SP.md, borderRadius: R.xl },
 imgBubble: { width: 150, height: 100, borderRadius: R.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
 inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SP.md, paddingVertical: SP.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: 28 },
 chatInput: { flex: 1, paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.xl, maxHeight: 100, fontSize: FS.md },
 sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: SP.sm },
 notifRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SP.lg, borderBottomWidth: StyleSheet.hairlineWidth },
});

// ══════════════════════════════════════════════════════════════════════════════
// INSURANCE CONFIG SCREEN
