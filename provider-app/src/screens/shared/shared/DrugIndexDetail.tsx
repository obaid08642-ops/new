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
import { useUploadsEnabled } from '../../../hooks/useUploadsEnabled';
import { UploadsUnavailable } from '../../../components/UploadsUnavailable';


export function DrugIndexDetail({ ctx }: any) {
  const uploadsOn = useUploadsEnabled();
  const { t: tt } = useLang();
  const { theme, AR, show, insets, onBack, search, setSearch, selectedCat, setSelectedCat, selectedDrug, setSelectedDrug, drugDetail, setDrugDetail, detailLoading, setDetailLoading, drugs, categories, loading, scrollY, suggestOpen, setSuggestOpen, suggestTab, setSuggestTab, suggestForm, setSuggestForm, suggestNote, setSuggestNote, suggestImg, setSuggestImg, suggestBusy, setSuggestBusy, openSuggest, pickSuggestImage, submitSuggestFields, submitSuggestImage, SUGGEST_FIELD_DEFS } = ctx;
   const FactRow = ({ label, value }: { label: string; value?: any }) => {
     if (value === undefined || value === null || value === '') return null;
     return (
       <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', gap: SP.sm }}>
         <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>{label}</Text>
         <Text style={{ fontSize: FS.sm, color: theme.textSub, flex: 1, textAlign: AR ? 'left' : 'right' }}>{String(value)}</Text>
       </View>
     );
   };

   // ── FULL-PAGE drug profile (read-only index — no cart / no purchase actions) ──
   if (selectedDrug) {
     const d: any = drugDetail || {};
     const pick = (ar: any, en: any) => (AR ? (ar ?? en) : (en ?? ar)) ?? null;
     const gallery: string[] = resolveGallery({ ...selectedDrug, ...d });
     const winW = Dimensions.get('window').width;
     return (
     <View style={{ flex: 1, backgroundColor: theme.bg }}>
       <View style={{ backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border, paddingTop: Math.max(insets.top, SP.sm) }}>
         <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: SP.md, paddingVertical: SP.sm }}>
           <TouchableOpacity onPress={() => setSelectedDrug(null)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}>
             <I name="back" size={20} color={theme.text} />
           </TouchableOpacity>
           <Text style={{ flex: 1, fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: 'center' }} numberOfLines={1}>
             {tt('drug.bc626038')}
           </Text>
           <View style={{ width: 40 }} />
         </View>
       </View>

       <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 60 }}>
         {/* Image gallery (multiple images, swipeable) */}
         {gallery.length > 0 ? (
           <View style={{ marginBottom: SP.md }}>
             <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ borderRadius: R.lg, backgroundColor: theme.surface }}>
               {gallery.map((uri, idx) => (
                 <Image key={idx} source={{ uri }} style={{ width: winW - SP.lg * 2, height: 220 }} resizeMode="contain" />
               ))}
             </ScrollView>
             {gallery.length > 1 && (
               <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: SP.xs }}>
                 {gallery.map((_, idx) => (<View key={idx} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.border }} />))}
               </View>
             )}
           </View>
         ) : (
           <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${theme.primary}12`, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: SP.md }}>
             <I name="pill" size={32} color={theme.primary} />
           </View>
         )}

         {/* Header: name / manufacturer / price / badges */}
         <View style={{ alignItems: 'center', marginBottom: SP.md }}>
           <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: 'center' }}>
             {AR ? (d.name_ar || selectedDrug.name_ar) : (d.name_en || selectedDrug.name_en)}
           </Text>
           {(d.manufacturer || selectedDrug.manufacturer) ? (
             <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: 4 }}>{d.manufacturer || selectedDrug.manufacturer}</Text>
           ) : null}
           <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary, marginTop: 6 }}>
             {d.price ?? selectedDrug.price} {tt('drug.d5b1688a')}
           </Text>
           <View style={{ flexDirection: 'row', gap: SP.xs, marginTop: SP.xs }}>
             {(d.requires_prescription ?? selectedDrug.requires_prescription) ? <NBadge label={tt('drug.69d7b831')} variant="danger" size="xs" /> : null}
             {(d.potentially_unavailable ?? selectedDrug.potentially_unavailable) ? <NBadge label={tt('drug.9c7c3dca')} variant="warning" size="xs" /> : null}
             {d.discontinued ? <NBadge label={tt('drug.2d1a9a37')} variant="danger" size="xs" /> : null}
           </View>
         </View>

         {detailLoading && <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.md }} />}

         {/* Key facts */}
         <View style={{ gap: SP.sm, borderTopWidth: 1, borderTopColor: theme.border, paddingVertical: SP.md, marginBottom: SP.md }}>
           <FactRow label={tt('drug.ef2fa834')} value={pick(d.active_ar, d.active_en) ?? selectedDrug.active_ar} />
           <FactRow label={tt('drug.2d648ba2')} value={d.generic_name} />
           <FactRow label={tt('drug.0a7a026e')} value={d.category_ar ?? selectedDrug.category_ar} />
           <FactRow label={tt('drug.48e0313d')} value={d.sub_category ?? selectedDrug.sub_category} />
           <FactRow label={tt('drug.64c5b6c7')} value={d.form ?? selectedDrug.form} />
           <FactRow label={tt('drug.3415cda8')} value={d.strength ?? selectedDrug.strength} />
           <FactRow label={tt('drug.32d6e11f')} value={d.package_size ?? selectedDrug.package_size} />
           <FactRow label={tt('drug.cda6fd04')} value={d.barcode} />
         </View>

         {/* Informational sections (same set as the patient app) */}
         <DrugSection title={tt('drug.83e7eb16')} content={pick(d.description_ar, d.description_en)} defaultOpen />
         <DrugSection title={tt('drug.fe3eecbf')} content={pick(d.indications_ar, d.indications_en)} />
         <DrugSection title={tt('drug.75c8d59e')} content={pick(d.dosage_ar, d.dosage_en) || pick(d.usage_instructions_ar, d.usage_instructions_en)} />
         <DrugSection title={tt('drug.feecee20')} content={pick(d.usage_instructions_ar, d.usage_instructions_en)} />
         <DrugSection title={tt('drug.22e856b4')} content={pick(d.warnings_ar, d.warnings_en)} warn />
         <DrugSection title={tt('drug.d690537c')} content={pick(d.precautions_ar, d.precautions_en)} warn />
         <DrugSection title={tt('drug.a8353333')} content={pick(d.contraindications_ar, d.contraindications_en)} warn />
         <DrugSection title={tt('drug.474380db')} content={pick(d.side_effects_ar, d.side_effects_en)} />
         <DrugSection title={tt('drug.df650f83')} content={d.interactions} warn />
         <DrugSection title={tt('drug.4b3accc5')} content={pick(d.storage_conditions_ar, d.storage_conditions_en)} />
         <DrugSection title={tt('drug.f9aec312')} content={pick(d.pregnancy_info_ar, d.pregnancy_info_en)} warn />
         <DrugSection title={tt('drug.e2376f1b')} content={pick(d.breastfeeding_info_ar, d.breastfeeding_info_en)} warn />
         <DrugSection title={tt('drug.87b5749f')} content={pick(d.more_info_ar, d.more_info_en)} />
         {d.potentially_unavailable && d.shortage_notes ? (
           <DrugSection title={tt('drug.a5b466d7')} content={d.shortage_notes} warn defaultOpen />
         ) : null}

         {/* Alternatives (same active ingredient) — tappable, opens that profile */}
         {(d.alternatives?.length > 0) && (
           <View style={{ gap: SP.sm, marginTop: SP.md }}>
             <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
               {tt('drug.6876ec83')}
             </Text>
             {d.alternatives.map((alt: any) => (
               <TouchableOpacity key={alt.id} onPress={() => setSelectedDrug(alt)} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface2 }}>
                 {resolveImageUri(alt.image) ? <Image source={{ uri: resolveImageUri(alt.image)! }} style={{ width: 36, height: 36, borderRadius: R.sm }} resizeMode="contain" /> : null}
                 <Text style={{ color: theme.text, fontSize: FS.sm, flex: 1, textAlign: AR ? 'right' : 'left' }} numberOfLines={1}>{AR ? alt.name_ar : alt.name_en}</Text>
                 <Text style={{ color: theme.primary, fontSize: FS.sm, fontWeight: FW.bold }}>{alt.price} {tt('drug.0e39e6ca')}</Text>
               </TouchableOpacity>
             ))}
           </View>
         )}

         {/* Similar (same category) — tappable, opens that profile */}
         {(d.similar?.length > 0) && (
           <View style={{ gap: SP.sm, marginTop: SP.md }}>
             <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
               {tt('drug.2e268a1e')}
             </Text>
             {d.similar.map((alt: any) => (
               <TouchableOpacity key={alt.id} onPress={() => setSelectedDrug(alt)} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface2 }}>
                 {resolveImageUri(alt.image) ? <Image source={{ uri: resolveImageUri(alt.image)! }} style={{ width: 36, height: 36, borderRadius: R.sm }} resizeMode="contain" /> : null}
                 <Text style={{ color: theme.text, fontSize: FS.sm, flex: 1, textAlign: AR ? 'right' : 'left' }} numberOfLines={1}>{AR ? alt.name_ar : alt.name_en}</Text>
                 <Text style={{ color: theme.primary, fontSize: FS.sm, fontWeight: FW.bold }}>{alt.price} {tt('drug.0e39e6ca')}</Text>
               </TouchableOpacity>
             ))}
           </View>
         )}

         {/* Suggest edit — proposals go to the admin review queue (approve/reject) */}
         <View style={{ marginTop: SP.lg }}>
           <NBtn
             label={tt('drug.c082f389')}
             icon="edit"
             onPress={openSuggest}
           />
           <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: 'center', marginTop: SP.xs }}>
             {tt('drug.18f377ac')}
           </Text>
         </View>

         <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: 'center', marginTop: SP.xl }}>
           {tt('drug.6757558d')}
         </Text>
       </ScrollView>

       {/* ── Suggest-edit sheet ── */}
       <NSheet visible={suggestOpen} onClose={() => !suggestBusy && setSuggestOpen(false)} title={tt('drug.598039cd')} height={Math.round(Dimensions.get('window').height * 0.85)}>
         <View style={{ flex: 1 }}>
           {/* Tab switcher */}
           <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.xs, marginBottom: SP.md }}>
             <TouchableOpacity onPress={() => setSuggestTab('fields')} style={{ flex: 1, paddingVertical: SP.sm, borderRadius: R.md, alignItems: 'center', backgroundColor: suggestTab === 'fields' ? theme.primary : theme.surface2, borderWidth: 1, borderColor: suggestTab === 'fields' ? theme.primary : theme.border }}>
               <Text style={{ color: suggestTab === 'fields' ? '#FFF' : theme.text, fontWeight: FW.bold, fontSize: FS.sm }}>{tt('drug.c416e673')}</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={() => setSuggestTab('image')} style={{ flex: 1, paddingVertical: SP.sm, borderRadius: R.md, alignItems: 'center', backgroundColor: suggestTab === 'image' ? theme.primary : theme.surface2, borderWidth: 1, borderColor: suggestTab === 'image' ? theme.primary : theme.border }}>
               <Text style={{ color: suggestTab === 'image' ? '#FFF' : theme.text, fontWeight: FW.bold, fontSize: FS.sm }}>{tt('drug.1b1e5aa1')}</Text>
             </TouchableOpacity>
           </View>

           <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: SP.xl }} keyboardShouldPersistTaps="handled">
             {suggestTab === 'fields' ? (
               <View style={{ gap: SP.sm }}>
                 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                   {tt('drug.debb7724')}
                 </Text>
                 {SUGGEST_FIELD_DEFS.map(f => (
                   <NInput
                     key={f.key}
                     label={AR ? f.ar : f.en}
                     value={suggestForm[f.key] ?? ''}
                     onChange={(v: string) => setSuggestForm(prev => ({ ...prev, [f.key]: v }))}
                     multi={!!f.multi}
                     lines={f.multi ? 3 : 1}
                     kbType={f.numeric ? 'numeric' : undefined}
                   />
                 ))}
               </View>
             ) : (
               <View style={{ gap: SP.md }}>
                 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                   {tt('drug.36249279')}
                 </Text>
                 {suggestImg ? (
                   <View style={{ alignItems: 'center', gap: SP.sm }}>
                     <Image source={{ uri: suggestImg.uri }} style={{ width: 180, height: 180, borderRadius: R.md, backgroundColor: theme.surface2 }} resizeMode="contain" />
                     {uploadsOn ? (
<NBtn label={tt('drug.af97d0e2')} variant="outline" size="sm" icon="image" onPress={pickSuggestImage} full={false} />
) : null}
                   </View>
                 ) : (
                   (uploadsOn ? <NBtn label={tt('drug.fdc73895')} variant="outline" icon="image" onPress={pickSuggestImage} /> : <UploadsUnavailable />)
                 )}
               </View>
             )}

             <View style={{ marginTop: SP.md }}>
               <NInput
                 label={tt('drug.ed59bf4a')}
                 value={suggestNote}
                 onChange={setSuggestNote}
                 multi
                 lines={2}
                 placeholder={tt('drug.11857b5f')}
               />
             </View>

             <View style={{ marginTop: SP.md }}>
               <NBtn
                 label={suggestTab === 'fields' ? (tt('drug.3bd7f124')) : (tt('drug.627ab603'))}
                 icon="send"
                 loading={suggestBusy}
                 disabled={suggestBusy || (suggestTab === 'image' && !suggestImg)}
                 onPress={suggestTab === 'fields' ? submitSuggestFields : submitSuggestImage}
               />
             </View>
           </ScrollView>
         </View>
       </NSheet>
     </View>
     );
   }
  return null;
}

