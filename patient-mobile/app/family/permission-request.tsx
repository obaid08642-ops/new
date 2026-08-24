// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';
import { dateLocale } from '@/utils/dates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
// Connected to GET /family/permissions/pending

export default function PermissionRequestScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const requestId = params.id as string;
  const [requestInfo, setRequestInfo] = useState<any>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [responded, setResponded] = useState(false);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    apiFetch('/family/permissions/pending')
      .then(res => {
        if (Array.isArray(res)) {
          const req = res.find(r => r._id === requestId || r.id === requestId) || res[0]; // fallback to first if no ID passed for some reason
          if (req) {
            setRequestInfo(req);
            const mapped = (req.permissions || []).map((p: string) => ({
              key: p,
              label: p === 'vitals' ? 'المؤشرات الحيوية' : p === 'meds' ? 'الأدوية' : p === 'reports' ? 'التقارير الطبية' : p,
              desc: 'الوصول لبيانات ' + p,
              icon: (p === 'vitals' ? 'monitor_heart' : p === 'meds' ? 'medication' : 'document') as IconName,
              granted: true
            }));
            setPermissions(mapped);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [requestId]);

  const togglePerm = (key: string) => {
    setPermissions(prev => prev.map(p => p.key === key ? { ...p, granted: !p.granted } : p));
  };

  const submitResponse = async (decision: 'approved' | 'rejected') => {
    try {
      if (requestInfo) {
        const granted = permissions.filter(p => p.granted).map(p => p.key);
        await apiFetch(`/family/permissions/respond/${requestInfo._id || requestInfo.id}`, {
          method: 'PUT',
          body: JSON.stringify({ decision, note: '', permissions: decision === 'approved' ? granted : [] })
        });
      }
    } catch (e) {
      console.error(e);
      showLocalizedAlert('خطأ', 'تعذر إرسال الرد. حاول مرة أخرى.');
      return;
    }
    setResponded(true);
    setTimeout(() => router.back(), 1500);
  };

  const handleAccept = () => submitResponse('approved');
  const handleReject = () => submitResponse('rejected');

  if (responded) {
    return (
      <View style={[st.c, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 } ]}>
        <View style={[st.iconWrap, { backgroundColor: colors.successSurface } ]}>
          <Icon name="check_circle" size={48} color={colors.success} />
        </View>
        <AppText variant="h3" align="center">تم الرد بنجاح</AppText>
        <AppText variant="bodySM" color={colors.textTertiary} align="center">تم إشعار العضو بالتغييرات</AppText>
      </View>
    );
  }

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={st.hdrRow}>
          <View style={{ width: 40 }}/>
          <AppText variant="h4" color="#fff">طلب صلاحيات</AppText>
          <IconButton icon="back" bg="rgba(255,255,255,0.18)" color="#fff" onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
        {/* Requester info */}
        {loading ? <AppText align="center">جاري التحميل...</AppText> : null}
        {!loading && !requestInfo ? <AppText align="center">لا يوجد طلب</AppText> : null}

        {requestInfo && (
          <>
            <Card style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>
              <View style={[st.avatar, { backgroundColor: colors.primarySurface } ]}>
                <Icon name="person" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                <AppText variant="h5">{requestInfo.requester_name || 'عضو من العائلة'}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>{requestInfo.createdAt ? new Date(requestInfo.createdAt).toLocaleDateString(dateLocale()) : 'اليوم'}</AppText>
              </View>
              <Badge label="طلب جديد" color={colors.warning} />
            </Card>

            <AppText variant="bodySM" color={colors.textSecondary} align="right">
              {requestInfo.requester_name || 'العضو'} يطلب الوصول إلى بياناتك الصحية. يمكنك الموافقة على كل صلاحية أو رفضها بشكل فردي.
            </AppText>
          </>
        )}

        {/* Permissions list */}
        <Card>
          <SectionHeader title="الصلاحيات المطلوبة" />
          {permissions.map((perm, i) => (
            <View key={perm.key} style={[st.permRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
              <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'center', flex: 1 }}>
                <View style={[st.permIcon, { backgroundColor: perm.granted ? colors.primarySurface : colors.surfaceSecondary } ]}>
                  <Icon name={perm.icon} size={18} color={perm.granted ? colors.primary : colors.textTertiary} />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                  <AppText variant="labelMD">{perm.label}</AppText>
                  <AppText variant="caption" color={colors.textTertiary}>{perm.desc}</AppText>
                </View>
              </View>
              <Button
                label={perm.granted ? 'مسموح' : 'مرفوض'}
                variant={perm.granted ? 'primary' : 'outline'}
                size="sm"
                onPress={() => togglePerm(perm.key)}
              />
            </View>
          ))}
        </Card>

        <Card style={{ backgroundColor: colors.infoSurface }}>
          <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'flex-start' }}>
            <Icon name="info" size={16} color={colors.info} />
            <AppText variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>يمكنك تعديل الصلاحيات لاحقاً من إعدادات العائلة. سيتم إشعار الطرف الآخر بأي تغيير.</AppText>
          </View>
        </Card>
      </ScrollView>

      <View style={[st.bottom, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight } ]}>
        <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
          <Button label="قبول الصلاحيات" variant="gradient" icon="check_circle" onPress={handleAccept} full={false} style={{ flex: 1 }}/>
          <Button label="رفض الكل" variant="outline" icon="close" onPress={handleReject} full={false} style={{ flex: 1 }}/>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  hdrRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  permRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  permIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
