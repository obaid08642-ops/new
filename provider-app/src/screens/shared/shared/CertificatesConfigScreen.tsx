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

export function CertificatesConfigScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';

 const DOC_LABELS: Record<string, { ar: string; en: string }> = {
 national_id: { ar: 'الهوية الوطنية', en: 'National ID' },
 commercial_registration: { ar: 'السجل التجاري', en: 'Commercial Registration' },
 medical_license: { ar: 'الترخيص الطبي (SCFHS)', en: 'Medical License (SCFHS)' },
 vat_certificate: { ar: 'شهادة ضريبة القيمة المضافة', en: 'VAT Certificate' },
 tax_number: { ar: 'الرقم الضريبي', en: 'Tax Number' },
 zakat_certificate: { ar: 'شهادة الزكاة', en: 'Zakat Certificate' },
 iban_letter: { ar: 'خطاب الآيبان البنكي', en: 'IBAN Letter' },
 facility_license: { ar: 'ترخيص المنشأة (وزارة الصحة)', en: 'Facility License (MOH)' },
 professional_cv: { ar: 'السيرة الذاتية المهنية', en: 'Professional CV' },
 profile_photo: { ar: 'الصورة الشخصية', en: 'Profile Photo' },
 other: { ar: 'مستند آخر', en: 'Other Document' },
 };
 const docLabel = (t: string) => { const l = DOC_LABELS[t]; return l ? (AR ? l.ar : l.en) : t; };

 const [docs, setDocs] = useState<any[]>([]);
 const [missing, setMissing] = useState<string[]>([]);
 const [loadingDocs, setLoadingDocs] = useState(true);
 const [loadError, setLoadError] = useState(false);
 const [uploading, setUploading] = useState(false);
 const [pendingDocType, setPendingDocType] = useState<string | null>(null);

 // Real KYC documents from the backend (Cloudinary private storage).
 const loadDocs = useCallback(async () => {
 setLoadingDocs(true);
 setLoadError(false);
 try {
 const res = await client.get('/provider/kyc/documents');
 setDocs(Array.isArray(res.data?.documents) ? res.data.documents : []);
 setMissing(Array.isArray(res.data?.missing) ? res.data.missing : []);
 } catch {
 setLoadError(true);
 } finally {
 setLoadingDocs(false);
 }
 }, []);

 useEffect(() => { loadDocs(); }, []);

 const pickAndUpload = async (docType: string) => {
 try {
 const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
 if (result.canceled || !result.assets || result.assets.length === 0) return;
 const asset = result.assets[0];
 const mime = asset.mimeType || (asset.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
 setPendingDocType(docType);
 setUploading(true);
 const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
 await client.post('/provider/kyc/documents', {
 doc_type: docType,
 file: { data_base64: base64, mime, original_name: asset.name || `${docType}.pdf` },
 });
 show(AR ? 'تم رفع المستند وهو الآن قيد مراجعة الإدارة' : 'Document uploaded and is now under admin review', 'success');
 await loadDocs();
 } catch (err: any) {
 const m = err?.response?.data?.message;
 show(typeof m === 'string' ? m : (AR ? 'تعذر رفع المستند — تحقق من الملف والاتصال وحاول مجدداً' : 'Could not upload the document — check the file and connection and retry'), 'error');
 } finally {
 setUploading(false);
 setPendingDocType(null);
 }
 };

 const statusMeta = (st: string) => {
 switch (st) {
 case 'approved': case 'verified': return { label: AR ? 'معتمد' : 'Approved', variant: 'success' as const };
 case 'rejected': return { label: AR ? 'مرفوض' : 'Rejected', variant: 'danger' as const };
 case 'needs_replacement': return { label: AR ? 'يحتاج إعادة رفع' : 'Needs Replacement', variant: 'warning' as const };
 case 'under_review': return { label: AR ? 'قيد المراجعة' : 'Under Review', variant: 'primary' as const };
 default: return { label: AR ? 'قيد المراجعة' : 'Pending', variant: 'primary' as const };
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? 'الشهادات والمؤهلات' : 'Qualifications'} onBack={onBack} />
 <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'المستندات الرسمية المرتبطة بملفك المهني وحالة اعتمادها لدى الإدارة:' : 'Official documents linked to your professional profile and their admin approval status:'}
 </Text>

 {loadingDocs && (
 <View style={{ alignItems: 'center', padding: SP.xl }}>
 <ActivityIndicator size="large" color={theme.primary} />
 </View>
 )}

 {loadError && !loadingDocs && (
 <View style={{ gap: SP.md }}>
 <NEmpty
 title={AR ? 'تعذر تحميل المستندات' : 'Could not load documents'}
 sub={AR ? 'تحقق من الاتصال ثم أعد المحاولة' : 'Check your connection and retry'}
 />
 <NBtn label={AR ? 'إعادة المحاولة' : 'Retry'} onPress={loadDocs} />
 </View>
 )}

 {!loadingDocs && !loadError && (
 <>
 {docs.length === 0 && missing.length === 0 && (
 <NEmpty
 title={AR ? 'لا توجد مستندات بعد' : 'No documents yet'}
 sub={AR ? 'ارفع مستنداتك الرسمية لاعتمادها من الإدارة' : 'Upload your official documents for admin approval'}
 />
 )}

 {docs.map((item: any) => {
 const meta = statusMeta(item.review_status || item.status);
 const dateStr = (item.createdAt || item.issued_date || '').slice(0, 10);
 return (
 <NCard key={item.id} style={{ marginBottom: SP.sm }} accent={meta.variant === 'success' ? tokens.success : meta.variant === 'danger' ? tokens.error : tokens.info}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, flex: 1, textAlign: AR ? 'right' : 'left' }}>
 {docLabel(item.doc_type)}
 </Text>
 <NBadge label={meta.label} variant={meta.variant} size="xs" />
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.sm }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 {item.doc_number ? (AR ? `رقم: ${item.doc_number}` : `No: ${item.doc_number}`) : docLabel(item.doc_type)}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{dateStr}</Text>
 </View>
 {(item.review_status === 'rejected' || item.review_status === 'needs_replacement') && (
 <View style={{ marginTop: SP.sm }}>
 <NBtn
 label={AR ? 'إعادة رفع المستند' : 'Re-upload Document'}
 size="sm"
 variant="outline"
 loading={uploading && pendingDocType === item.doc_type}
 onPress={() => pickAndUpload(item.doc_type)}
 />
 </View>
 )}
 </NCard>
 );
 })}

 {missing.length > 0 && (
 <>
 <NSecHeader title={AR ? 'مستندات مطلوبة ناقصة' : 'Missing Required Documents'} />
 {missing.map((t: string) => (
 <NCard key={t} style={{ marginBottom: SP.sm, borderColor: theme.warn, borderWidth: 1 }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, flex: 1, textAlign: AR ? 'right' : 'left' }}>{docLabel(t)}</Text>
 <NBadge label={AR ? 'مطلوب' : 'Required'} variant="warning" size="xs" />
 </View>
 <View style={{ marginTop: SP.sm }}>
 <NBtn
 label={uploading && pendingDocType === t ? (AR ? 'جاري الرفع…' : 'Uploading…') : (AR ? 'رفع المستند' : 'Upload Document')}
 size="sm"
 loading={uploading && pendingDocType === t}
 disabled={uploading}
 onPress={() => pickAndUpload(t)}
 />
 </View>
 </NCard>
 ))}
 </>
 )}

 <TouchableOpacity
 onPress={() => pickAndUpload('other')}
 disabled={uploading}
 style={{
 padding: SP.xl,
 borderRadius: R.lg,
 borderWidth: 2,
 borderColor: theme.primary,
 borderStyle: 'dashed',
 alignItems: 'center',
 justifyContent: 'center',
 backgroundColor: `${theme.primary}05`,
 marginTop: SP.md,
 opacity: uploading ? 0.6 : 1,
 }}
 >
 <I name="upload" size={24} color={theme.primary} />
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary, marginTop: SP.md }}>
 {AR ? ' رفع وثيقة أو شهادة جديدة' : ' Upload New Certificate'}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: SP.xs }}>
 {AR ? 'صيغ المقبولة: PDF, JPG, PNG (بحد أقصى 10 ميجا)' : 'Supported: PDF, JPG, PNG (Max 10MB)'}
 </Text>
 </TouchableOpacity>
 </>
 )}
 </ScrollView>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// PHOTOS & MEDIA SCREEN
