import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NInput, NBtn, NSecHeader, NBadge, NScroll } from '../../components/ui';
import { SP, FS, FW, R, SPECIALTIES } from '../../constants';
import client from '../../api/client';

export function FacilityProfileConfigScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [facilityName, setFacilityName] = useState('');
  const [descAr, setDescAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [website, setWebsite] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await client.get('/provider/profile');
        const p = res.data || {};
        setFacilityName(AR ? (p.display_name_ar || p.display_name_en || '') : (p.display_name_en || p.display_name_ar || ''));
        setDescAr(p.description_ar || '');
        setDescEn(p.description_en || '');
        setWebsite(p.website || '');
        setWhatsapp(p.social?.whatsapp || '');
        setSelectedSpecs(Array.isArray(p.sub_specialties) ? p.sub_specialties : []);
      } catch {
        show(AR ? 'تعذر تحميل ملف المنشأة' : 'Could not load facility profile', 'error');
      } finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await client.patch('/provider/profile', {
        description_ar: descAr,
        description_en: descEn,
        website: website || undefined,
        social: { whatsapp: whatsapp || undefined },
        sub_specialties: selectedSpecs,
      });
      show(AR ? 'تم حفظ ملف المنشأة بنجاح' : 'Facility profile saved successfully', 'success');
      onBack();
    } catch (err: any) {
      show(err?.response?.data?.message || (AR ? 'فشل حفظ الملف' : 'Failed to save profile'), 'error');
    } finally { setSaving(false); }
  };

  const toggleSpec = (id: string) => {
    setSelectedSpecs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (loading) {
    return (
      <NScroll>
        <NHeader title={AR ? 'ملف المنشأة' : 'Facility Profile'} onBack={onBack} />
        <ActivityIndicator color={theme.primary} style={{ marginTop: 80 }} />
      </NScroll>
    );
  }

  return (
    <NScroll>
      <NHeader title={AR ? 'ملف المنشأة' : 'Facility Profile'} onBack={onBack} />
      
      {/* Facility identity (images managed via KYC/profile media flow) */}
      <NCard style={{ marginBottom: SP.xl, alignItems: 'center', padding: SP.xl }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: SP.md }}>
          <Text style={{ fontSize: 28, fontWeight: FW.bold, color: theme.primary }}>{(facilityName || ' ').trim().charAt(0)}</Text>
        </View>
        <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>{facilityName || '—'}</Text>
      </NCard>

      <NSecHeader title={AR ? 'التفاصيل العامة' : 'General Details'} />
      <NInput label={AR ? 'الوصف (عربي)' : 'Description (AR)'} value={descAr} onChange={setDescAr} icon="" />
      <NInput label={AR ? 'الوصف (إنجليزي)' : 'Description (EN)'} value={descEn} onChange={setDescEn} icon="" />

      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
        <NInput label={AR ? 'الموقع الإلكتروني' : 'Website'} value={website} onChange={setWebsite} kbType="url" icon="globe" style={{ flex: 1 }} />
        <NInput label={AR ? 'رقم الواتساب' : 'WhatsApp'} value={whatsapp} onChange={setWhatsapp} kbType="phone-pad" icon="chat" style={{ flex: 1 }} />
      </View>

      <NSecHeader title={AR ? 'التخصصات المتاحة' : 'Available Specialties'} />
      <NCard style={{ marginBottom: SP.xl }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm }}>
          {SPECIALTIES.map(sp => {
            const isSelected = selectedSpecs.includes(sp.id);
            return (
              <TouchableOpacity
                key={sp.id}
                onPress={() => toggleSpec(sp.id)}
                style={{
                  flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.full,
                  backgroundColor: isSelected ? theme.primary : theme.surface2,
                  borderWidth: 1, borderColor: isSelected ? theme.primary : theme.border
                }}
              >
                <Text style={{ fontSize: 16 }}>{sp.icon}</Text>
                <Text style={{ color: isSelected ? '#FFF' : theme.text, fontSize: FS.xs, fontWeight: isSelected ? FW.bold : FW.reg }}>
                  {AR ? sp.ar : sp.en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </NCard>

      <NBtn label={AR ? 'حفظ التحديثات' : 'Save Updates'} onPress={handleSave} loading={saving} style={{ marginBottom: SP.xl }} />
    </NScroll>
  );
}
