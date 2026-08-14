import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NInput, NBtn, NSecHeader, NBadge, NScroll } from '../../components/ui';
import { SP, FS, FW, R, SPECIALTIES } from '../../constants';

export function FacilityProfileConfigScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [logo, setLogo] = useState('https://ui-avatars.com/api/?name=Nabdah+Hospital&background=2196F3&color=fff');
  const [cover, setCover] = useState('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80');
  const [descAr, setDescAr] = useState('مستشفى نبضة الطبي يوفر أفضل رعاية صحية متكاملة بأحدث الأجهزة والتقنيات الطبية.');
  const [descEn, setDescEn] = useState('Nabdah Medical Hospital provides the best integrated healthcare with the latest medical devices and technologies.');
  const [phone, setPhone] = useState('920012345');
  const [whatsapp, setWhatsapp] = useState('+966500000000');
  const [hours, setHours] = useState('24/7');
  
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>(['cardiology', 'pediatrics', 'orthopedics']);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      show(AR ? 'تم حفظ ملف المنشأة بنجاح' : 'Facility profile saved successfully', 'success');
      onBack();
    }, 1000);
  };

  const toggleSpec = (id: string) => {
    setSelectedSpecs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'ملف المنشأة' : 'Facility Profile'} onBack={onBack} />
      
      {/* Cover & Logo */}
      <View style={{ position: 'relative', marginBottom: SP.xl }}>
        <Image source={{ uri: cover }} style={{ width: '100%', height: 160, backgroundColor: theme.surface2 }} />
        <TouchableOpacity style={{ position: 'absolute', top: SP.md, right: SP.md, backgroundColor: 'rgba(0,0,0,0.5)', padding: SP.sm, borderRadius: R.md }}>
          <Text style={{ color: '#FFF', fontSize: FS.xs }}>{AR ? 'تغيير الغلاف' : 'Change Cover'}</Text>
        </TouchableOpacity>

        <View style={{ position: 'absolute', bottom: -40, left: SP.xl, flexDirection: 'row', alignItems: 'flex-end', gap: SP.md }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: theme.bg, overflow: 'hidden', backgroundColor: theme.surface2 }}>
            <Image source={{ uri: logo }} style={{ width: '100%', height: '100%' }} />
          </View>
          <TouchableOpacity style={{ marginBottom: SP.sm, backgroundColor: theme.surface, paddingHorizontal: SP.md, paddingVertical: SP.xs, borderRadius: R.md, borderWidth: 1, borderColor: theme.border }}>
            <Text style={{ color: theme.text, fontSize: FS.xs }}>{AR ? 'تغيير الشعار' : 'Change Logo'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ height: 40 }} />

      <NSecHeader title={AR ? 'التفاصيل العامة' : 'General Details'} />
      <NInput label={AR ? 'الوصف (عربي)' : 'Description (AR)'} value={descAr} onChange={setDescAr} icon="" />
      <NInput label={AR ? 'الوصف (إنجليزي)' : 'Description (EN)'} value={descEn} onChange={setDescEn} icon="" />
      
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
        <NInput label={AR ? 'الرقم الموحد' : 'Contact Number'} value={phone} onChange={setPhone} kbType="phone-pad" icon="📞" style={{ flex: 1 }} />
        <NInput label={AR ? 'رقم الواتساب' : 'WhatsApp'} value={whatsapp} onChange={setWhatsapp} kbType="phone-pad" icon="💬" style={{ flex: 1 }} />
      </View>
      <NInput label={AR ? 'أوقات العمل' : 'Working Hours'} value={hours} onChange={setHours} placeholder="e.g. 24/7 or 9 AM - 10 PM" icon="⏰" />

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
