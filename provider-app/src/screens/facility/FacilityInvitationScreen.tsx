import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NInput, NBtn, NSecHeader, NScroll, NBadge } from '../../components/ui';
import { I } from '../../components/icons';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';

export function FacilityInvitationScreen({ onBack, preRole }: { onBack: () => void; preRole?: string }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [invited, setInvited] = useState(false);

  // Invitations this facility sent: a pending one can be withdrawn (POST /hospital/invitations/:id/cancel).
  const [sent, setSent] = useState<Array<{ id: string; invitee_name?: string | null; invitee_id?: string; status: string }>>([]);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const loadSent = useCallback(() => {
    client.get('/hospital/invitations').then((res) => setSent(Array.isArray(res.data) ? res.data : [])).catch(() => setSent([]));
  }, []);
  useEffect(() => { loadSent(); }, [loadSent]);
  const cancelInvitation = async (id: string) => {
    setCancelling(id);
    try {
      await client.post(`/hospital/invitations/${id}/cancel`, {});
      show(tt('finv.cd83c75a'), 'success');
      loadSent();
    } catch (e: any) {
      show(String(e?.response?.data?.message || '').startsWith('invitation_not_pending') ? (tt('finv.633b8542')) : (tt('finv.15ed06f5')), 'error');
      loadSent();
    } finally {
      setCancelling(null);
    }
  };

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
      show(tt('finv.df8b2d07'), 'warning');
      return;
    }
    setLoading(true);
    try {
      await client.post('/hospital/invitations', {
        identifier: identifier.trim(),
        role: preRole || 'doctor',
        permissions: perms,
      });
      setInvited(true);
      show(tt('finv.490d580a'), 'success');
    } catch (e: any) {
      const st = e?.response?.status;
      if (st === 404) show(tt('finv.c02ae588'), 'error');
      else if (st === 400) show(tt('finv.62926ceb'), 'error');
      else show(tt('finv.feaad4db'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (invited) {
    return (
      <NScroll>
        <NHeader title={tt('finv.7a5686be')} onBack={onBack} />
        <View style={{ padding: SP.xl, alignItems: 'center', marginTop: SP.xl }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.successBg, alignItems: 'center', justifyContent: 'center', marginBottom: SP.lg }}>
            <I name="email" size={32} color={theme.primary} />
          </View>
          <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text, textAlign: 'center' }}>
            {tt('finv.ed3a3fbf')}
          </Text>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginTop: SP.sm, marginBottom: SP.xl }}>
            {AR 
              ? `تم إرسال إشعار إلى المزود (${identifier}). بمجرد قبوله سيتم إضافته لطاقم المنشأة بالصلاحيات المحددة.` 
              : `A notification has been sent to (${identifier}). Once accepted, they will join the facility staff with the specified permissions.`}
          </Text>
          <NBtn label={tt('finv.cc8838cf')} onPress={onBack} />
        </View>
      </NScroll>
    );
  }

  return (
    <NScroll>
      <NHeader title={tt('finv.7a5686be')} onBack={onBack} />

      <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
        <Text style={{ fontSize: FS.sm, color: theme.info, lineHeight: 22, textAlign: AR ? 'right' : 'left' }}>
          {tt('finv.ae507959')}
        </Text>
      </NCard>

      <NSecHeader title={tt('finv.f2cc6f0b')} />
      <NInput
        label={tt('finv.9f13264d')}
        placeholder={tt('finv.f115fb34')}
        value={identifier}
        onChange={setIdentifier}
        icon="search"
      />

      <NSecHeader title={tt('finv.3b4c21e7')} />
      <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
        {tt('finv.8068ef09')}
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
        label={tt('finv.8b92e689')} 
        onPress={handleInvite} 
        loading={loading}
        style={{ marginBottom: SP.xl }}
      />

      {sent.length > 0 && (
        <View style={{ marginBottom: SP.xl }}>
          <NSecHeader title={tt('finv.738ea574')} />
          {sent.map((inv) => (
            <NCard key={inv.id} style={{ marginBottom: SP.md }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: SP.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{inv.invitee_name || inv.invitee_id || '—'}</Text>
                  <NBadge label={inv.status === 'pending' ? (tt('finv.cb626dc0')) : inv.status === 'accepted' ? (tt('finv.7453caea')) : inv.status === 'cancelled' ? (tt('finv.dd66303b')) : (tt('finv.d32bdb11'))} variant={inv.status === 'accepted' ? 'success' : 'info'} size="xs" />
                </View>
                {inv.status === 'pending' ? (
                  <NBtn label={tt('finv.a0dc9b00')} size="xs" variant="outline" full={false} loading={cancelling === inv.id} onPress={() => cancelInvitation(inv.id)} />
                ) : null}
              </View>
            </NCard>
          ))}
        </View>
      )}
    </NScroll>
  );
}
