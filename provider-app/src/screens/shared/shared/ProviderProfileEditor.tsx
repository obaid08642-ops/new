import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Share } from 'react-native';
import client from '../../../api/client';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import { NBtn, NCard, NInput, NHeader, NAvatar, NToggle, NSecHeader, NProfileImageUploader } from '../../../components/ui';
import { I, IBg } from '../../../components/icons';
import { SP, R, FS, FW } from '../../../constants';

// One profile editor for every provider role. Same record, same calls for all:
//   GET /provider/profile, PATCH /provider/profile (and the image calls inside NProfileImageUploader).
// Sections: profile (names, bio, website + role fields), location (doctor map, radius, fee), public page (toggle, social link).
// Only the fields the provider changed are sent, so an untouched section never creates an admin change request.
export type ProfileEditorRole = 'doctor' | 'nursing' | 'other';
export type ProfileSection = 'profile' | 'location' | 'public';

const SECTIONS_BY_ROLE: Record<ProfileEditorRole, ProfileSection[]> = {
  doctor: ['profile', 'location', 'public'],
  nursing: ['profile', 'public'],
  other: ['public'],
};

interface ProfileForm {
  nameAr: string; nameEn: string; descAr: string; descEn: string; website: string;
  exp: string; specialty: string; degree: string; clinicImages: string[];
  avatarId: string;
  pin: { lat: number; lng: number } | null; radius: string; fee: string;
  active: boolean; social: string;
}

interface ProfileResponse {
  display_name_ar?: string; display_name_en?: string; description_ar?: string; description_en?: string; bio?: string;
  website?: string; years_of_experience?: number | string; specialty?: string; degree?: string;
  profile_image_id?: string; clinic_images?: unknown[];
  geo?: { lat?: number | string; lng?: number | string }; max_delivery_radius_km?: number | string | null; delivery_fee?: number | string | null;
  public_eligibility?: boolean; social?: { website?: string; url?: string }; slug?: string;
}

const EMPTY: ProfileForm = {
  nameAr: '', nameEn: '', descAr: '', descEn: '', website: '', exp: '', specialty: '', degree: '', clinicImages: [],
  avatarId: '', pin: null, radius: '10', fee: '0', active: false, social: '',
};

function toForm(p: ProfileResponse): ProfileForm {
  const lat = Number(p.geo?.lat); const lng = Number(p.geo?.lng);
  return {
    nameAr: p.display_name_ar || '', nameEn: p.display_name_en || '',
    descAr: p.description_ar || '', descEn: p.description_en || '', website: p.website || '',
    exp: p.years_of_experience != null ? String(p.years_of_experience) : '',
    specialty: p.specialty || '', degree: p.degree || '',
    clinicImages: Array.isArray(p.clinic_images) ? p.clinic_images.filter((x): x is string => typeof x === 'string') : [],
    avatarId: p.profile_image_id || '',
    pin: Number.isFinite(lat) && Number.isFinite(lng) && lat && lng ? { lat, lng } : null,
    radius: p.max_delivery_radius_km != null ? String(p.max_delivery_radius_km) : '10',
    fee: p.delivery_fee != null ? String(p.delivery_fee) : '0',
    active: Boolean(p.public_eligibility),
    social: p.social?.website || p.social?.url || '',
  };
}

/** Pure: the PATCH body for the fields that differ from what was loaded. Exported for tests. */
export function buildProfilePatch(base: ProfileForm, cur: ProfileForm, role: ProfileEditorRole): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const sections = SECTIONS_BY_ROLE[role];
  if (sections.includes('profile')) {
    if (cur.nameAr !== base.nameAr) out.display_name_ar = cur.nameAr;
    if (cur.nameEn !== base.nameEn) out.display_name_en = cur.nameEn;
    if (cur.descAr !== base.descAr) out.description_ar = cur.descAr;
    if (cur.descEn !== base.descEn) out.description_en = cur.descEn;
    if (cur.website !== base.website) out.website = cur.website;
    if (cur.avatarId && cur.avatarId !== base.avatarId) out.profile_image_id = cur.avatarId;
    if (role === 'doctor') {
      if (cur.exp !== base.exp) out.years_of_experience = parseInt(cur.exp, 10) || 0;
      if (cur.specialty !== base.specialty) out.specialty = cur.specialty;
      if (cur.degree !== base.degree) out.degree = cur.degree;
      if (cur.clinicImages.join('|') !== base.clinicImages.join('|')) out.clinic_images = cur.clinicImages;
    }
  }
  if (sections.includes('location')) {
    if (cur.pin && (cur.pin.lat !== base.pin?.lat || cur.pin.lng !== base.pin?.lng)) out.geo = { lat: cur.pin.lat, lng: cur.pin.lng };
    if (cur.radius !== base.radius) out.max_delivery_radius_km = Number(cur.radius);
    if (cur.fee !== base.fee) out.delivery_fee = Number(cur.fee) || 0;
  }
  if (sections.includes('public')) {
    if (cur.active !== base.active) out.public_eligibility = cur.active;
    if (cur.social.trim() !== base.social.trim()) out.social = { website: cur.social.trim() };
  }
  return out;
}

export function ProviderProfileEditor({ role, onBack, initialSection }: { role: ProfileEditorRole; onBack: () => void; initialSection?: ProfileSection }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const { user } = useAuth();
  const AR = lang === 'ar';
  const sections = SECTIONS_BY_ROLE[role];
  const [section, setSection] = useState<ProfileSection>(initialSection && sections.includes(initialSection) ? initialSection : sections[0]);
  const [base, setBase] = useState<ProfileForm>(EMPTY);
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingClinic, setUploadingClinic] = useState(false);
  const [locating, setLocating] = useState(false);
  const set = useCallback(<K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => setForm(prev => ({ ...prev, [k]: v })), []);

  useEffect(() => {
    let alive = true;
    client.get('/provider/profile').then((res) => {
      if (!alive) return;
      const p: ProfileResponse = res?.data?.data || res?.data || {};
      const f = toForm(p);
      setBase(f); setForm(f); setSlug(p.slug || null);
    }).catch(() => {
      if (alive) show(AR ? 'فشل تحميل الملف الشخصي' : 'Failed to load profile', 'error');
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const handleSave = async () => {
    if (sections.includes('location') && form.pin === null && base.pin === null && (form.radius !== base.radius || form.fee !== base.fee)) {
      show(AR ? 'حدد موقع العيادة على الخريطة أولاً' : 'Pin the clinic location on the map first', 'error'); return;
    }
    const r = Number(form.radius);
    if (sections.includes('location') && (!Number.isFinite(r) || r < 0)) { show(AR ? 'أدخل نطاق تغطية صحيح' : 'Enter a valid coverage radius', 'error'); return; }
    const patch = buildProfilePatch(base, form, role);
    if (Object.keys(patch).length === 0) { show(AR ? 'لا توجد تعديلات للحفظ' : 'No changes to save', 'info'); return; }
    setSaving(true);
    try {
      await client.patch('/provider/profile', patch);
      show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
      onBack();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      show(msg || (AR ? 'فشل حفظ الملف الشخصي' : 'Failed to save profile'), 'error');
    } finally { setSaving(false); }
  };

  async function useMyLocation() {
    setLocating(true);
    try {
      const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
      const perm = await requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { show(AR ? 'الصلاحية مطلوبة لتحديد الموقع' : 'Location permission is required', 'error'); return; }
      const pos = await getCurrentPositionAsync({});
      set('pin', { lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      show(AR ? 'تعذر تحديد الموقع' : 'Could not determine location', 'error');
    } finally { setLocating(false); }
  }

  async function addClinicImage() {
    try {
      const DocPicker = await import('expo-document-picker');
      const picked = await DocPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
      const asset = picked.canceled ? undefined : picked.assets?.[0];
      if (!asset?.uri) return;
      setUploadingClinic(true);
      const { ProviderApi } = await import('../../../api/provider');
      const id = await ProviderApi.uploadFile(asset.uri, asset.mimeType || 'image/jpeg', asset.name || 'clinic.jpg');
      if (typeof id === 'string' && id) set('clinicImages', [...form.clinicImages, id]);
      else show(AR ? 'تعذر رفع الصورة' : 'Could not upload image', 'error');
    } catch {
      show(AR ? 'تعذر رفع الصورة' : 'Could not upload image', 'error');
    } finally { setUploadingClinic(false); }
  }

  const sectionLabel: Record<ProfileSection, string> = {
    profile: AR ? 'الملف الشخصي' : 'Profile',
    location: AR ? 'الموقع والتغطية' : 'Location',
    public: AR ? 'الصفحة العامة' : 'Public page',
  };
  const title = role === 'nursing' ? (AR ? 'معلومات الحساب' : 'Account Info')
    : sections.length === 1 ? (AR ? 'موقع مزود الخدمة العام' : 'Public Mini-Website')
    : (AR ? 'تعديل الملف الشخصي' : 'Edit Profile');
  const publicUrl = slug ? `https://nabdah.plus/provider/${slug}` : null;
  const row = AR ? 'row-reverse' : 'row';

  const profileSection = (
    <View style={{ gap: SP.lg }}>
      <NCard style={{ alignItems: 'center', paddingVertical: SP.xl }}>
        <NAvatar name={form.nameEn || user?.displayName} size={80} />
        <NProfileImageUploader
          ownerType={role === 'nursing' ? 'nurse' : 'doctor'}
          onProcessComplete={(urls) => { set('avatarId', urls.processed); show(AR ? 'تم تحديث الصورة الشخصية' : 'Profile picture updated', 'success'); }}
        />
      </NCard>
      <NInput label={AR ? 'الاسم بالكامل (العربية)' : 'Full Name (Arabic)'} value={form.nameAr} onChange={(v: string) => set('nameAr', v)} required />
      <NInput label={AR ? 'الاسم بالكامل (الإنجليزية)' : 'Full Name (English)'} value={form.nameEn} onChange={(v: string) => set('nameEn', v)} required />
      <NInput label={AR ? 'النبذة التعريفية (العربية)' : 'Bio (Arabic)'} value={form.descAr} onChange={(v: string) => set('descAr', v)} multi lines={3} />
      <NInput label={AR ? 'النبذة التعريفية (الإنجليزية)' : 'Bio (English)'} value={form.descEn} onChange={(v: string) => set('descEn', v)} multi lines={3} />
      {role === 'doctor' && <NInput label={AR ? 'سنوات الخبرة' : 'Years of Experience'} value={form.exp} onChange={(v: string) => set('exp', v)} kbType="numeric" />}
      <NInput label={AR ? 'الموقع الإلكتروني' : 'Website'} value={form.website} onChange={(v: string) => set('website', v)} />
      {role === 'doctor' && (
        <>
          <NInput label={AR ? 'التخصص الطبي' : 'Specialty'} value={form.specialty} onChange={(v: string) => set('specialty', v)} />
          <NInput label={AR ? 'الدرجة العلمية' : 'Degree / Title'} value={form.degree} onChange={(v: string) => set('degree', v)} />
          <NSecHeader title={AR ? 'صور العيادة' : 'Clinic Images'} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: row, gap: SP.md }}>
              <TouchableOpacity onPress={addClinicImage} style={{ width: 100, height: 100, borderRadius: R.md, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed' }}>
                <I name="plus" size={24} color={theme.primary} />
                <Text style={{ fontSize: FS.xs, color: theme.primary, marginTop: SP.xs }}>{uploadingClinic ? (AR ? 'جارٍ الرفع…' : 'Uploading…') : (AR ? 'إضافة صورة' : 'Add Image')}</Text>
              </TouchableOpacity>
              {form.clinicImages.map((id) => (
                <View key={id} style={{ width: 100, height: 100, borderRadius: R.md, backgroundColor: theme.surface2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                  <TouchableOpacity onPress={() => set('clinicImages', form.clinicImages.filter((x) => x !== id))} style={{ position: 'absolute', top: 4, right: 4, zIndex: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: theme.danger, alignItems: 'center', justifyContent: 'center' }}>
                    <I name="close" size={12} color={theme.textInv} />
                  </TouchableOpacity>
                  <IBg name="image" size={32} color={theme.textSub} bg="transparent" />
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );

  const locationSection = (() => {
    // react-native-maps is only needed here, so it is loaded when this section is opened.
    const Maps = require('react-native-maps');
    const MapView = Maps.default; const Marker = Maps.Marker;
    return (
      <View style={{ gap: SP.md }}>
        <NSecHeader title={AR ? 'موقع العيادة' : 'Clinic Location'} />
        <View style={{ height: 260, borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{ latitude: form.pin?.lat || 24.7136, longitude: form.pin?.lng || 46.6753, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
            onPress={(e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => set('pin', { lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
          >
            {form.pin && <Marker coordinate={{ latitude: form.pin.lat, longitude: form.pin.lng }} draggable onDragEnd={(e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => set('pin', { lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })} />}
          </MapView>
        </View>
        <NBtn label={locating ? (AR ? 'جارٍ التحديد…' : 'Locating…') : (AR ? 'استخدم موقعي الحالي' : 'Use my current location')} variant="outline" onPress={useMyLocation} />
        <NSecHeader title={AR ? 'الزيارات المنزلية' : 'Home Visits'} />
        <NCard>
          <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.md }}>
            <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'نطاق التغطية (كم)' : 'Coverage Radius (KM)'}</Text>
            <NInput label="" value={form.radius} onChange={(v: string) => set('radius', v)} kbType="numeric" style={{ width: 100, marginVertical: 0 }} />
          </View>
          <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'رسوم الانتقال' : 'Transport Fee'}</Text>
            <NInput label="" value={form.fee} onChange={(v: string) => set('fee', v)} kbType="numeric" style={{ width: 100, marginVertical: 0 }} />
          </View>
        </NCard>
      </View>
    );
  });

  const publicSection = (
    <View style={{ gap: SP.xl }}>
      <NCard>
        <NToggle
          label={AR ? 'تفعيل الصفحة العامة للمريض' : 'Active Public Website'}
          sub={AR ? 'تمكين حجز المواعيد عبر رابط موقعك العام مباشرة' : 'Allow patients to book directly via link'}
          value={form.active}
          onChange={(v: boolean) => set('active', v)}
        />
      </NCard>
      <NInput label={AR ? 'حسابات التواصل الاجتماعي' : 'Social Media Link'} value={form.social} onChange={(v: string) => set('social', v)} />
      {publicUrl && (
        <NCard style={{ backgroundColor: theme.primaryLight, borderColor: theme.primary }}>
          <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontSize: FS.sm, color: theme.primary, fontWeight: FW.bold }}>{publicUrl}</Text>
            <TouchableOpacity
              onPress={async () => { try { await Share.share({ message: publicUrl }); } catch { show(AR ? 'تعذر المشاركة' : 'Could not share', 'error'); } }}
              style={{ padding: SP.sm }}>
              <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{AR ? 'مشاركة' : 'Share'}</Text>
            </TouchableOpacity>
          </View>
        </NCard>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={title} onBack={onBack} />
      {sections.length > 1 && (
        <View style={{ flexDirection: row, gap: SP.sm, paddingHorizontal: SP.xl, paddingBottom: SP.sm }}>
          {sections.map((s) => (
            <TouchableOpacity key={s} onPress={() => setSection(s)}
              style={{ flex: 1, paddingVertical: SP.sm, borderRadius: R.lg, borderWidth: 1.5, alignItems: 'center', backgroundColor: section === s ? theme.primary : theme.surface2, borderColor: section === s ? theme.primary : theme.border }}>
              <Text style={{ fontSize: FS.xs, fontWeight: FW.semi, color: section === s ? theme.textInv : theme.text }}>{sectionLabel[s]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.lg }}>
        {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} /> : (
          <>
            {section === 'profile' && profileSection}
            {section === 'location' && locationSection()}
            {section === 'public' && publicSection}
            <NBtn label={AR ? ' حفظ التعديلات' : ' Save Changes'} onPress={handleSave} loading={saving} style={{ marginTop: SP.lg }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
