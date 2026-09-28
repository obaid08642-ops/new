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

export function ProfileWebConfig({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [active, setActive] = useState(false);
 const [bio, setBio] = useState('');
 const [socials, setSocials] = useState('');
 const [publicUrl, setPublicUrl] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 useEffect(() => {
   let alive = true;
   client.get('/provider/profile').then((response) => {
     if (!alive) return;
     const profile = response.data || {};
     setActive(Boolean(profile.public_eligibility));
     setBio(AR ? (profile.description_ar || profile.bio || '') : (profile.description_en || profile.bio || ''));
     setSocials(profile.social?.website || profile.social?.url || '');
     setPublicUrl(profile.slug ? `https://nabdah.plus/provider/${profile.slug}` : null);
   }).catch((error: any) => {
     if (alive) show(error?.response?.data?.message || (AR ? 'تعذر تحميل إعدادات الموقع' : 'Unable to load site settings'), 'error');
   }).finally(() => { if (alive) setLoading(false); });
   return () => { alive = false; };
 }, [AR, show]);
 const handleSave = async () => {
   setSaving(true);
   try {
     const response = await client.patch('/provider/profile', {
       public_eligibility: active,
       description_ar: AR ? bio : undefined,
       description_en: AR ? undefined : bio,
       social: { website: socials.trim() },
     });
     const profile = response.data || {};
     setPublicUrl(profile.slug ? `https://nabdah.plus/provider/${profile.slug}` : null);
     show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
     onBack();
   } catch (error: any) {
     show(error?.response?.data?.message || (AR ? 'تعذر حفظ إعدادات الموقع' : 'Unable to save site settings'), 'error');
   } finally { setSaving(false); }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'موقع مزود الخدمة العام' : 'Public Mini-Website'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 {loading ? <ActivityIndicator color={theme.primary} /> : null}
 <NCard>
 <NToggle
 label={AR ? 'تفعيل الصفحة العامة للمريض' : 'Active Public Website'}
 sub={AR ? 'تمكين حجز المواعيد عبر رابط موقعك العام مباشرة' : 'Allow patients to book directly via link'}
 value={active}
 onChange={setActive}
 />
 </NCard>

 <NInput label={AR ? 'النبذة التعريفية' : 'Doctor/Clinic Bio'} value={bio} onChange={setBio} multi lines={4} />
 <NInput label={AR ? 'حسابات التواصل الاجتماعي' : 'Social Media Link'} value={socials} onChange={setSocials} />

 {publicUrl && <NCard style={{ backgroundColor: theme.primaryLight, borderColor: theme.primary }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ flex: 1, fontSize: FS.sm, color: theme.primary, fontWeight: FW.bold }}>{publicUrl}</Text>
 <TouchableOpacity onPress={async () => {
   try {
     const { Share } = await import('react-native');
     await Share.share({ message: publicUrl });
   } catch {
     show(AR ? 'تعذر المشاركة' : 'Could not share', 'error');
   }
 }} style={{ padding: SP.sm }}>
 <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{AR ? 'مشاركة' : 'Share'}</Text>
 </TouchableOpacity>
 </View>
 </NCard>}
 <NBtn label={AR ? ' حفظ التعديلات' : ' Save Settings'} loading={saving} onPress={handleSave} />
 </View>
 </NScroll>
 </View>
 );
}

// 1.4 SUBSCRIPTION & AD PURCHASES & AFFILIATE
