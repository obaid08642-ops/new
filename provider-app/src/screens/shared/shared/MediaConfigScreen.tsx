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

export function MediaConfigScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 // Real persisted clinic images (storage object ids) — loaded from profile,
 // changes go through the admin-approval delta pipeline.
 const [images, setImages] = useState<{ id: string; url: string; title: string }[]>([]);
 const [loadingImgs, setLoadingImgs] = useState(true);
 const [busy, setBusy] = useState(false);

 const resolveUrl = async (storageId: string) => {
   if (/^https?:\/\//.test(storageId) || storageId.startsWith('data:')) return storageId;
   try {
     const r = await client.get(`/storage/${storageId}/signed-url`);
     return r.data?.url || '';
   } catch { return ''; }
 };

 useEffect(() => {
   (async () => {
     try {
       const res = await client.get('/provider-onboarding/my-profile');
       const p = res.data?.profile || res.data || {};
       const list: string[] = Array.isArray(p.clinic_images) ? p.clinic_images : [];
       const out: { id: string; url: string; title: string }[] = [];
       for (const sid of list) {
         const url = await resolveUrl(String(sid));
         if (url) out.push({ id: String(sid), url, title: AR ? 'صورة العيادة' : 'Clinic Photo' });
       }
       setImages(out);
     } catch (e) {}
     setLoadingImgs(false);
   })();
 }, []);

 const submitImagesDelta = async (ids: string[]) => {
   await client.post('/provider/settings/delta', { changes: { clinic_images: ids } });
 };

 const handleDelete = async (id: string) => {
   if (busy) return;
   setBusy(true);
   try {
     const next = images.filter(x => x.id !== id).map(x => x.id);
     await submitImagesDelta(next);
     setImages(prev => prev.filter(x => x.id !== id));
     show(AR ? 'تم إرسال طلب الحذف — يسري بعد اعتماد الإدارة' : 'Deletion submitted — effective after admin approval', 'info');
   } catch (e) {
     show(AR ? 'فشل إرسال طلب الحذف' : 'Failed to submit deletion', 'error');
   } finally { setBusy(false); }
 };

 const handleAddPhoto = async () => {
   if (busy) return;
   try {
     const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
     if (!perm.granted) { show(AR ? 'يلزم إذن الوصول إلى الصور' : 'Photo permission required', 'error'); return; }
     const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, quality: 0.85 });
     if (r.canceled || !r.assets?.[0]) return;
     const a: any = r.assets[0];
     setBusy(true);
     // Provider images live on Cloudinary (private + signed delivery)
     const base64 = await FileSystem.readAsStringAsync(a.uri, { encoding: 'base64' });
     const up = await client.post('/storage/upload', {
       data_base64: base64,
       mime: a.mimeType || 'image/jpeg',
       original_name: `clinic_${Date.now()}.jpg`,
       visibility: 'private',
       target: 'cloudinary',
     });
     const storageId = up.data?.id;
     if (!storageId) throw new Error('upload_failed');
     const next = [...images.map(x => x.id), storageId];
     await submitImagesDelta(next);
     const url = await resolveUrl(storageId);
     setImages(prev => [...prev, { id: storageId, url: url || a.uri, title: AR ? 'صورة مرفقة جديدة' : 'New Attached Photo' }]);
     show(AR ? 'تم رفع الصورة — تظهر نهائياً بعد اعتماد الإدارة' : 'Photo uploaded — final after admin approval', 'success');
   } catch (e) {
     show(AR ? 'فشل رفع الصورة' : 'Failed to upload photo', 'error');
   } finally { setBusy(false); }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? 'الصور والوسائط' : 'Photos & Media'} onBack={onBack} />
 <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'الصور المعروضة في صفحتك العامة للمرضى (العيادة، الأجهزة، الشهادات المعلقة):' : 'Photos displayed on your public profile for patients (clinic, instruments, facilities):'}
 </Text>

 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, justifyContent: 'space-between' }}>
 {images.map(img => (
 <View key={img.id} style={{ width: '47%', borderRadius: R.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
 <View style={{ height: 120, backgroundColor: theme.surface2, position: 'relative' }}>
 <View style={{ position: 'absolute', top: 5, right: 5, zIndex: 10 }}>
 <TouchableOpacity
 onPress={() => handleDelete(img.id)}
 style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(244,67,54,0.9)', alignItems: 'center', justifyContent: 'center' }}
 >
 <I name="close" size={14} color="#FFF" />
 </TouchableOpacity>
 </View>
 <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
 <I name="camera" size={30} color={theme.textSub} />
 </View>
 </View>
 <View style={{ padding: SP.sm }}>
 <Text style={{ fontSize: FS.xs, color: theme.text, fontWeight: FW.bold, textAlign: 'center' }} numberOfLines={1}>
 {img.title}
 </Text>
 </View>
 </View>
 ))}

 <TouchableOpacity
 onPress={handleAddPhoto}
 style={{
 width: '47%',
 height: 154,
 borderRadius: R.lg,
 borderWidth: 2,
 borderColor: theme.primary,
 borderStyle: 'dashed',
 alignItems: 'center',
 justifyContent: 'center',
 backgroundColor: `${theme.primary}05`,
 }}
 >
 <I name="plus" size={24} color={theme.primary} />
 <Text style={{ fontSize: FS.sm, color: theme.primary, fontWeight: FW.bold, marginTop: SP.sm }}>
 {AR ? 'إضافة صورة' : 'Add Photo'}
 </Text>
 </TouchableOpacity>
 </View>
 </ScrollView>
 </View>
 );
}

// ─── REGISTRATION SUCCESS ───
// ══════════════════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER WALLET SCREEN (REVENUE & WITHDRAWALS)
