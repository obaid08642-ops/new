import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AppointmentStatus } from '../../../types/contracts';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Platform, Modal, TextInput,
 RefreshControl, Switch, ActivityIndicator, KeyboardAvoidingView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio } from 'expo-av';
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
import { DoctorServiceSlotsCard } from './StatisticsScreen';

export function DoctorProfileEditScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const { user } = useAuth();
 const AR = lang === 'ar';

 const [loading, setLoading] = useState(false);
 const [profile, setProfile] = useState<any>(null);
 const [nameAr, setNameAr] = useState('');
 const [nameEn, setNameEn] = useState('');
 const [descAr, setDescAr] = useState('');
 const [descEn, setDescEn] = useState('');
 const [exp, setExp] = useState('');
 const [web, setWeb] = useState('');
 const [specialty, setSpecialty] = useState('');
 const [degree, setDegree] = useState('');
 const [avatarUrl, setAvatarUrl] = useState('');
 const [clinicImages, setClinicImages] = useState<string[]>([]);
 const [uploadingClinic, setUploadingClinic] = useState(false);

 useEffect(() => {
 fetchProfile();
 }, []);

 const fetchProfile = async () => {
 setLoading(true);
 try {
 const res = await client.get('/provider/profile');
 setProfile(res.data);
 setNameAr(res.data.display_name_ar || '');
 setNameEn(res.data.display_name_en || '');
 setDescAr(res.data.description_ar || '');
 setDescEn(res.data.description_en || '');
 setExp(String(res.data.years_of_experience || ''));
 setWeb(res.data.website || '');
 setAvatarUrl(res.data.profile_image_id || '');
 setClinicImages(Array.isArray(res.data.clinic_images) ? res.data.clinic_images.filter((x: any) => typeof x === 'string') : []);
 } catch (err) {
 show(AR ? 'فشل تحميل الملف الشخصي' : 'Failed to load profile', 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleSave = async () => {
 setLoading(true);
 try {
 await client.patch('/provider/profile', {
 display_name_ar: nameAr,
 display_name_en: nameEn,
 description_ar: descAr,
 description_en: descEn,
 years_of_experience: parseInt(exp) || 0,
 website: web,
 specialty,
 degree,
 ...(avatarUrl ? { profile_image_id: avatarUrl } : {}),
 clinic_images: clinicImages,
 });
 show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
 onBack();
 } catch (err) {
 show(AR ? 'فشل حفظ الملف الشخصي' : 'Failed to save profile', 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'تعديل الملف الشخصي' : 'Edit Profile'} onBack={onBack} />
 {loading && !profile ? (
 <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} />
 ) : (
 <View style={{ padding: SP.xl, gap: SP.lg }}>
 <NCard style={{ alignItems: 'center', paddingVertical: SP.xl }}>
 <NAvatar name={nameEn || user?.displayName} size={80} />
 
 <NProfileImageUploader 
 ownerType="doctor" 
 onProcessComplete={(urls) => {
 setAvatarUrl(urls.processed);
 show(AR ? 'تم تحديث الصورة الشخصية' : 'Profile picture updated', 'success');
 }}
 />
 </NCard>

 <NInput label={AR ? 'الاسم بالكامل (العربية)' : 'Full Name (Arabic)'} value={nameAr} onChange={setNameAr} required />
 <NInput label={AR ? 'الاسم بالكامل (الإنجليزية)' : 'Full Name (English)'} value={nameEn} onChange={setNameEn} required />
 <NInput label={AR ? 'النبذة التعريفية (العربية)' : 'Bio (Arabic)'} value={descAr} onChange={setDescAr} multi lines={3} />
 <NInput label={AR ? 'النبذة التعريفية (الإنجليزية)' : 'Bio (English)'} value={descEn} onChange={setDescEn} multi lines={3} />
 <NInput label={AR ? 'سنوات الخبرة' : 'Years of Experience'} value={exp} onChange={setExp} kbType="numeric" />
 <NInput label={AR ? 'الموقع الإلكتروني' : 'Website'} value={web} onChange={setWeb} />
 <NInput label={AR ? 'التخصص الطبي' : 'Specialty'} value={specialty} onChange={setSpecialty} />
 <NInput label={AR ? 'الدرجة العلمية' : 'Degree / Title'} value={degree} onChange={setDegree} />

 <View style={{ marginTop: SP.md }}>
   <NSecHeader title={AR ? 'صور العيادة' : 'Clinic Images'} />
 </View>
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: AR ? 'row-reverse' : 'row' }}>
   <TouchableOpacity
     onPress={async () => {
       try {
         const DocPicker: any = await import('expo-document-picker');
         const picked = await DocPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
         const uri = picked?.assets?.[0]?.uri || picked?.uri;
         if (!uri) return;
         setUploadingClinic(true);
         const { ProviderApi } = await import('../../../api/provider');
         const id = await ProviderApi.uploadFile(uri, picked?.assets?.[0]?.mimeType || 'image/jpeg', picked?.assets?.[0]?.name || 'clinic.jpg');
         if (typeof id === 'string' && id) setClinicImages((prev) => [...prev, id]);
         else show(AR ? 'تعذر رفع الصورة' : 'Could not upload image', 'error');
       } catch {
         show(AR ? 'تعذر رفع الصورة' : 'Could not upload image', 'error');
       } finally {
         setUploadingClinic(false);
       }
     }}
     style={{ width: 100, height: 100, borderRadius: R.md, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed', marginRight: SP.md }}>
     <I name="plus" size={24} color={theme.primary} />
     <Text style={{ fontSize: FS.xs, color: theme.primary, marginTop: SP.xs }}>{uploadingClinic ? (AR ? 'جارٍ الرفع…' : 'Uploading…') : (AR ? 'إضافة صورة' : 'Add Image')}</Text>
   </TouchableOpacity>
   {clinicImages.map((id) => (
     <View key={id} style={{ width: 100, height: 100, borderRadius: R.md, backgroundColor: theme.surface2, marginRight: SP.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
       <TouchableOpacity onPress={() => setClinicImages((prev) => prev.filter((x) => x !== id))} style={{ position: 'absolute', top: 4, right: 4, zIndex: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(244,67,54,0.9)', alignItems: 'center', justifyContent: 'center' }}>
         <I name="close" size={12} color="#FFF" />
       </TouchableOpacity>
       <IBg name="image" size={32} color={theme.textSub} bg="transparent" />
     </View>
   ))}
   {[1, 2].map(i => (
     <View key={`ph-${i}`} style={{ width: 100, height: 100, borderRadius: R.md, backgroundColor: theme.surface2, marginRight: SP.md, overflow: 'hidden', opacity: 0.4 }}>
       <IBg name="image" size={32} color={theme.textSub} bg="transparent" />
     </View>
   ))}
 </ScrollView>

 <NBtn label={AR ? ' حفظ التعديلات' : ' Save Changes'} onPress={handleSave} loading={loading} style={{ marginTop: SP.lg }} />
 </View>
 )}
 </NScroll>
 </View>
 );
}
