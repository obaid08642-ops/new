// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { apiFetch } from '../../src/utils/api';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

export default function InsuranceApprovalPendingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [copayPercent, setCopayPercent] = useState<number | null>(null);
  const [copayAmountReal, setCopayAmountReal] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [policyNumber, setPolicyNumber] = useState<string | null>(null);
  const totalAmount = Number(params.amount) || 0;

  // Poll the real insurance-approval request linked to this booking — never auto-approve.
  useEffect(() => {
    let stopped = false;
    const TERMINAL_APPROVED = ['COPAY_PENDING', 'COPAY_PAID', 'APPROVED', 'CONFIRMED'];
    const TERMINAL_REJECTED = ['REJECTED', 'DECLINED', 'CANCELLED'];

    const check = async () => {
      try {
        let req: any = null;
        if (params.requestId) {
          req = await apiFetch(`/insurance/requests/${params.requestId}`).catch(() => null);
        } else {
          const list = await apiFetch('/insurance/requests/my').catch(() => []);
          const arr = Array.isArray(list) ? list : [];
          req = params.bookingId
            ? arr.find((r: any) => r.booking_id === params.bookingId)
            : arr[0];
        }
        if (stopped || !req) return;
        if (req.copay_percent !== undefined && req.copay_percent !== null) setCopayPercent(Number(req.copay_percent));
        if (req.copay_amount !== undefined && req.copay_amount !== null) setCopayAmountReal(Number(req.copay_amount));
        if (TERMINAL_APPROVED.includes(req.state)) setStatus('approved');
        else if (TERMINAL_REJECTED.includes(req.state)) setStatus('rejected');
      } catch { /* keep polling */ }
    };

    apiFetch('/users/me/profile').then((p: any) => {
      if (stopped) return;
      setCompanyName(p?.insurance?.provider || null);
      setPolicyNumber(p?.insurance?.policy_number || null);
    }).catch(() => {});

    check();
    const t = setInterval(check, 6000);
    return () => { stopped = true; clearInterval(t); };
  }, [params.requestId, params.bookingId]);

  const copayAmount = copayAmountReal ?? (copayPercent !== null ? Math.round(totalAmount * copayPercent / 100) : null);
  const insurancePays = copayAmount !== null ? totalAmount - copayAmount : null;

  if (status === 'pending') {
    return (
      <View style={[st.c, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 } ]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[st.iconWrap, { backgroundColor: colors.primarySurface } ]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <AppText variant="h3" align="center">جاري مراجعة التأمين</AppText>
        <AppText variant="bodySM" color={colors.textTertiary} align="center">نتحقق من تغطية التأمين الخاص بك. عادةً يستغرق أقل من دقيقة</AppText>
        {(companyName || policyNumber) && (
          <View style={[st.infoBox, { backgroundColor: colors.infoSurface } ]}>
            {companyName && (
              <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center' }}>
                <Icon name="shield" size={18} color={colors.info} />
                <AppText variant="bodySM" color={colors.textSecondary}>شركة التأمين: {companyName}</AppText>
              </View>
            )}
            {policyNumber && (
              <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center' }}>
                <Icon name="document" size={18} color={colors.info} />
                <AppText variant="bodySM" color={colors.textSecondary}>رقم الوثيقة: {policyNumber}</AppText>
              </View>
            )}
          </View>
        )}
        <Button label="متابعة حالة الطلبات" variant="ghost" icon="refresh" onPress={() => router.push('/insurance/claim-tracking')} />
      </View>
    );
  }

  if (status === 'rejected') {
    return (
      <View style={[st.c, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 } ]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[st.iconWrap, { backgroundColor: colors.errorSurface } ]}>
          <Icon name="close" size={40} color={colors.error} />
        </View>
        <AppText variant="h3" align="center" color={colors.error}>لم تتم الموافقة</AppText>
        <AppText variant="bodySM" color={colors.textTertiary} align="center">التأمين لا يغطي هذه الخدمة. يمكنك الدفع كاش أو الاتصال بشركة التأمين</AppText>
        <View style={{ gap: 10, width: '100%' }}>
          {totalAmount > 0 && (
            <Button label={`ادفع كاش — ${totalAmount} ر.س`} variant="gradient" icon="card" onPress={() => router.push('/payments/processing')} />
          )}
          <Button label="اتصل بشركة التأمين" variant="outline" icon="call" onPress={() => router.replace('/(tabs)/consultations')} />
          <Button label="إلغاء" variant="ghost" icon="close" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={[st.iconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' } ]}>
          <Icon name="check_circle" size={48} color="#fff" />
        </View>
        <AppText variant="h3" color="#fff" align="center">تمت الموافقة!</AppText>
        <AppText variant="bodySM" color="rgba(255,255,255,0.85)" align="center">التأمين يغطي هذه الخدمة</AppText>
      </View>

      <View style={{ padding: 20, gap: 16, flex: 1 }}>
        <Card>
          <AppText variant="h5" style={{ marginBottom: 12 }}>تفاصيل التغطية</AppText>
          <View style={st.row}>
            <AppText variant="h5" color={colors.primary}>{totalAmount} ر.س</AppText>
            <AppText variant="bodySM" color={colors.textSecondary}>إجمالي التكلفة</AppText>
          </View>
          {insurancePays !== null && copayPercent !== null && (
            <>
              <View style={[st.divider, { backgroundColor: colors.borderLight }]} />
              <View style={st.row}>
                <AppText variant="h5" color={colors.success}>{insurancePays} ر.س</AppText>
                <AppText variant="bodySM" color={colors.textSecondary}>يدفع التأمين ({100 - copayPercent}%)</AppText>
              </View>
            </>
          )}
          {copayAmount !== null && copayPercent !== null && (
            <>
              <View style={[st.divider, { backgroundColor: colors.borderLight }]} />
              <View style={st.row}>
                <AppText variant="h4" color={colors.warning}>{copayAmount} ر.س</AppText>
                <AppText variant="bodySM" color={colors.textSecondary}>نسبة تحملك ({copayPercent}%)</AppText>
              </View>
            </>
          )}
          {copayAmount === null && (
            <>
              <View style={[st.divider, { backgroundColor: colors.borderLight }]} />
              <AppText variant="bodySM" color={colors.textTertiary} align="center">سيُحدَّد مبلغ التحمل عند اكتمال مراجعة التأمين</AppText>
            </>
          )}
        </Card>

        {copayPercent === 0 && (
          <Card style={{ backgroundColor: colors.successSurface }}>
            <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'center' }}>
              <Icon name="star" size={22} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <AppText variant="h6" color={colors.success}>تغطية VIP كاملة</AppText>
                <AppText variant="caption" color={colors.textTertiary}>لا يوجد مبلغ تحمل — التأمين يغطي 100%</AppText>
              </View>
            </View>
          </Card>
        )}

        <Card style={{ backgroundColor: colors.infoSurface }}>
          <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="info" size={18} color={colors.info} />
            <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1 }}>سيتم خصم نسبة تحملك عند تأكيد الخدمة. الباقي يُحاسب مباشرة على التأمين.</AppText>
          </View>
        </Card>
      </View>

      <View style={[st.bottom, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight } ]}>
        <Button label={copayAmount !== null && copayAmount > 0 ? `تأكيد ودفع ${copayAmount} ر.س` : 'تأكيد'} variant="gradient" size="lg" icon="check_circle" onPress={() => router.push('/payments/processing')} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingBottom: 28, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  iconWrap: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  infoBox: { width: '100%', padding: 16, borderRadius: 16, gap: 8 },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  divider: { height: 1, marginVertical: 4 },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
