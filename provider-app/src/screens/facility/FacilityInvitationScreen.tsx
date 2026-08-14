import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NInput, NBtn, NSecHeader, NScroll } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';

export function FacilityInvitationScreen({ onBack, preRole }: { onBack: () => void; preRole?: string }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [invited, setInvited] = useState(false);

  // Permission Matrix State
  const [perms, setPerms] = useState({
    pricing: true,
    schedule: true,
    insurance: true,
    vacation: true,
    availability: true,
    online_consultation: true,
    home_visit: true,
    catalog: true,
    read_stats: true,
    manage_wallet: false
  });

  const PERMISSION_LABELS = [
    { key: 'pricing', ar: 'إدارة الأسعار', en: 'Pricing Management' },
    { key: 'schedule', ar: 'إدارة الجدول', en: 'Schedule Management' },
    { key: 'insurance', ar: 'شركات التأمين', en: 'Insurance Networks' },
    { key: 'vacation', ar: 'اعتماد الإجازات', en: 'Vacation Approval' },
    { key: 'availability', ar: 'التحكم بالتوفر', en: 'Availability Control' },
    { key: 'online_consultation', ar: 'الاستشارات عن بعد', en: 'Online Consultation' },
    { key: 'home_visit', ar: 'الزيارات المنزلية', en: 'Home Visits' },
    { key: 'catalog', ar: 'إدارة الخدمات (كتالوج)', en: 'Service Catalog' },
    { key: 'read_stats', ar: 'قراءة الإحصائيات', en: 'Read Statistics' },
    { key: 'manage_wallet', ar: 'إدارة المحفظة المالية', en: 'Manage Wallet' },
  ] as const;

  const handleInvite = async () => {
    if (!identifier.trim()) {
      show(AR ? 'يرجى إدخال رقم جوال أو Nabdah ID' : 'Please enter Phone or Nabdah ID', 'warning');
      return;
    }
    setLoading(true);
    // Simulate API Call for creating FacilityInvitation
    setTimeout(() => {
      setLoading(false);
      setInvited(true);
      show(AR ? 'تم إرسال الدعوة بنجاح' : 'Invitation sent successfully', 'success');
    }, 1500);
  };

  if (invited) {
    return (
      <NScroll>
        <NHeader title={AR ? 'دعوة مزود خدمة' : 'Invite Provider'} onBack={onBack} />
        <View style={{ padding: SP.xl, alignItems: 'center', marginTop: SP.xl }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.successBg, alignItems: 'center', justifyContent: 'center', marginBottom: SP.lg }}>
            <Text style={{ fontSize: 32 }}>✉️</Text>
          </View>
          <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text, textAlign: 'center' }}>
            {AR ? 'تم إرسال الدعوة' : 'Invitation Sent'}
          </Text>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginTop: SP.sm, marginBottom: SP.xl }}>
            {AR 
              ? `تم إرسال إشعار إلى المزود (${identifier}). بمجرد قبوله سيتم إضافته لطاقم المنشأة بالصلاحيات المحددة.` 
              : `A notification has been sent to (${identifier}). Once accepted, they will join the facility staff with the specified permissions.`}
          </Text>
          <NBtn label={AR ? 'عودة للإدارة' : 'Back to Management'} onPress={onBack} />
        </View>
      </NScroll>
    );
  }

  return (
    <NScroll>
      <NHeader title={AR ? 'دعوة مزود خدمة' : 'Invite Provider'} onBack={onBack} />

      <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
        <Text style={{ fontSize: FS.sm, color: theme.info, lineHeight: 22, textAlign: AR ? 'right' : 'left' }}>
          {AR
            ? 'أدخل رقم جوال المزود أو رقم تعريفه (Nabdah ID). سيتم إرسال دعوة له للارتباط بالمنشأة، ولن يتم إضافته إلا بعد موافقته.'
            : 'Enter the provider\'s phone number or Nabdah ID. An invitation will be sent to them, and they will only be linked after approval.'}
        </Text>
      </NCard>

      <NSecHeader title={AR ? 'بيانات المزود' : 'Provider Details'} />
      <NInput
        label={AR ? 'رقم الجوال أو Nabdah ID' : 'Phone or Nabdah ID'}
        placeholder={AR ? 'مثال: +966500000000 أو NBD-1234' : 'e.g., +966500000000 or NBD-1234'}
        value={identifier}
        onChange={setIdentifier}
        icon="🔍"
      />

      <NSecHeader title={AR ? 'مصفوفة الصلاحيات (Permission Matrix)' : 'Permission Matrix'} />
      <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
        {AR ? 'حدد ما يمكن لإدارة المنشأة التحكم به نيابة عن هذا المزود:' : 'Select what the facility management can control on behalf of this provider:'}
      </Text>

      <View style={{ gap: 2, marginBottom: SP.xl }}>
        {PERMISSION_LABELS.map((p, i) => (
          <View key={p.key} style={{ 
            flexDirection: AR ? 'row-reverse' : 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: SP.md,
            backgroundColor: theme.surface,
            borderBottomWidth: i < PERMISSION_LABELS.length - 1 ? 1 : 0,
            borderBottomColor: theme.border
          }}>
            <Text style={{ fontSize: FS.sm, color: theme.text, fontWeight: FW.semi }}>{AR ? p.ar : p.en}</Text>
            <Switch 
              value={perms[p.key as keyof typeof perms]} 
              onValueChange={(val) => setPerms({ ...perms, [p.key]: val })}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>
        ))}
      </View>

      <NBtn 
        label={AR ? 'إرسال الدعوة' : 'Send Invitation'} 
        onPress={handleInvite} 
        loading={loading}
        style={{ marginBottom: SP.xl }}
      />
    </NScroll>
  );
}
