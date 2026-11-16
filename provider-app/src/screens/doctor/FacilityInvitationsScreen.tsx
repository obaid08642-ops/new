import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NBtn, NSecHeader, NScroll, NBadge } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';
import { dateLocale } from '../../utils/dates';

// Permission keys → labels (must mirror the facility invitation form)
const PERM_LABELS: Record<string, { ar: string; en: string }> = {
  pricing: { ar: 'إدارة الأسعار', en: 'Pricing' },
  schedule: { ar: 'إدارة الجدول', en: 'Schedule' },
  insurance: { ar: 'شركات التأمين', en: 'Insurance' },
  vacation: { ar: 'اعتماد الإجازات', en: 'Vacations' },
  availability: { ar: 'التحكم بالتوفر', en: 'Availability' },
  online_consultation: { ar: 'الاستشارات عن بعد', en: 'Teleconsult' },
  home_visit: { ar: 'الزيارات المنزلية', en: 'Home Visits' },
  catalog: { ar: 'إدارة الخدمات', en: 'Catalog' },
  read_stats: { ar: 'قراءة الإحصائيات', en: 'Statistics' },
  manage_wallet: { ar: 'إدارة المحفظة', en: 'Wallet' },
};

export function FacilityInvitationsScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await client.get('/hospital/invitations/inbox');
      const list = (Array.isArray(res.data) ? res.data : []).map((i: any) => ({
        id: i.id,
        facilityName: i.facility_name || (tt('sxw.c6dd524a')),
        date: i.createdAt ? new Date(i.createdAt).toLocaleDateString(dateLocale(AR)) : '',
        status: i.status,
        permissions: Object.keys(i.permissions || {}).filter(k => i.permissions[k]),
      }));
      setInvitations(list);
    } catch {
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [AR]);

  useEffect(() => { fetchInvitations(); }, [fetchInvitations]);

  const respond = async (id: string, accept: boolean) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await client.post(`/hospital/invitations/${id}/respond`, { accept });
      setInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: accept ? 'accepted' : 'rejected' } : inv));
      show(
        accept
          ? (tt('sxw.e4c1488f'))
          : (tt('sxw.4789ab5e')),
        accept ? 'success' : 'info',
      );
    } catch (e: any) {
      const code = e?.response?.data?.message || '';
      show(code === 'invitation_already_responded'
        ? (tt('sxw.3e08c9a2'))
        : (tt('sxw.4ab75d4e')), 'error');
      fetchInvitations();
    } finally {
      setBusyId(null);
    }
  };

  const handleAccept = (id: string) => respond(id, true);
  const handleReject = (id: string) => respond(id, false);

  return (
    <NScroll>
      <NHeader title={tt('sxw.68b55b3c')} onBack={onBack} />
      
      <View style={{ padding: SP.xl }}>
        {loading ? (
          <Text style={{ textAlign: 'center', color: theme.textSub, marginTop: SP.xxl }}>
            {tt('sxw.e62472ac')}
          </Text>
        ) : invitations.length === 0 ? (
          <Text style={{ textAlign: 'center', color: theme.textSub, marginTop: SP.xxl }}>
            {tt('sxw.e1fc9a56')}
          </Text>
        ) : (
          invitations.map(inv => (
            <NCard key={inv.id} style={{ marginBottom: SP.lg, borderColor: inv.status === 'pending' ? theme.primary : theme.border }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
                  {inv.facilityName}
                </Text>
                <NBadge 
                  label={inv.status === 'pending' ? (tt('sxw.25cd2b1f')) : inv.status === 'accepted' ? (tt('sxw.7453caea')) : (tt('sxw.6022b490'))} 
                  variant={inv.status === 'pending' ? 'primary' : inv.status === 'accepted' ? 'success' : 'danger'} 
                />
              </View>

              <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
                {AR ? `تاريخ الدعوة: ${inv.date}` : `Date: ${inv.date}`}
              </Text>

              <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                {tt('sxw.af946ccc')}
              </Text>
              
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.xs, marginBottom: SP.lg }}>
                {inv.permissions.map((perm, i) => (
                  <View key={i} style={{ backgroundColor: theme.surface2, paddingHorizontal: SP.sm, paddingVertical: 4, borderRadius: R.md }}>
                    <Text style={{ fontSize: FS.xs, color: theme.text }}>{PERM_LABELS[perm] ? (AR ? PERM_LABELS[perm].ar : PERM_LABELS[perm].en) : perm}</Text>
                  </View>
                ))}
              </View>

              {inv.status === 'pending' && (
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
                  <NBtn label={busyId === inv.id ? '...' : (tt('sxw.0c39bbd9'))} onPress={() => handleAccept(inv.id)} style={{ flex: 1 }} />
                  <NBtn label={tt('sxw.8881386a')} onPress={() => handleReject(inv.id)} variant="outline" style={{ flex: 1, borderColor: theme.danger }} labelStyle={{ color: theme.danger }} />
                </View>
              )}
            </NCard>
          ))
        )}
      </View>
    </NScroll>
  );
}
