// @ts-nocheck
// app/wallet/index.tsx — patient wallet hub (P6-D parity: web has /wallet).
// Reads server state only: GET /wallet/balance + /wallet/transactions.
// No amounts are computed locally; an empty wallet is the honest default.
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Button } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '@/utils/dates';
import { useGuestGuard } from '../../src/hooks/useGuestGuard';

export default function WalletHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();
  const { isGuest, requireAuth } = useGuestGuard();
  const [balance, setBalance] = useState<number | null>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (isGuest) { setLoading(false); return; }
    setLoading(true); setLoadError(false);
    try {
      const [b, t] = await Promise.all([
        apiFetch('/wallet/balance'),
        apiFetch('/wallet/transactions?page=1&limit=20'),
      ]);
      const bal = Number(b?.balance ?? b?.data?.balance ?? 0);
      setBalance(Number.isFinite(bal) ? bal : 0);
      const list = t?.transactions || t?.data?.transactions || [];
      setTxs(Array.isArray(list) ? list : []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (isGuest) {
    return (
      <View style={[st.c, { backgroundColor: colors.background, paddingTop: insets.top + 24 }]}>
        <View style={{ paddingHorizontal: 16, alignItems: 'center', gap: 12 }}>
          <Icon name="wallet" size={48} color={colors.primary} />
          <AppText variant="h4">المحفظة للأعضاء</AppText>
          <AppText variant="bodySM" color={colors.textSecondary} align="center">سجل الدخول لعرض رصيدك ومعاملاتك.</AppText>
          <Button label="تسجيل الدخول" variant="primary" onPress={() => requireAuth('wallet')} />
        </View>
      </View>
    );
  }

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={{ width: 40 }} />
        <AppText variant="h4">المحفظة</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}>
        <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Icon name="wallet" size={36} color={colors.primary} />
          <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: 8 }}>الرصيد المتاح</AppText>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 8 }} />
          ) : loadError ? (
            <AppText variant="h5" color={colors.textSecondary} style={{ marginTop: 8 }}>تعذر التحميل</AppText>
          ) : (
            <AppText variant="h2">{(balance ?? 0).toFixed(2)} ر.س</AppText>
          )}
        </Card>
        {loadError ? (
          <Button label="إعادة المحاولة" variant="outline" onPress={() => void load()} />
        ) : null}
        <AppText variant="h6">أحدث المعاملات</AppText>
        {loading ? null : txs.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Icon name="receipt" size={32} color={colors.textTertiary} />
            <AppText variant="bodySM" color={colors.textSecondary} style={{ marginTop: 8 }}>لا توجد معاملات بعد</AppText>
          </Card>
        ) : txs.map((t: any, i: number) => {
          const amt = Number(t.amount || 0);
          const credit = amt >= 0;
          return (
            <Card key={t.id || i} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodySM">{t.description || t.desc || (credit ? 'إيداع' : 'خصم')}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>
                  {t.createdAt ? new Date(t.createdAt).toLocaleDateString(dateLocale(), { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                </AppText>
              </View>
              <AppText variant="h6" color={credit ? colors.success : colors.danger}>
                {credit ? '+' : ''}{Number.isFinite(amt) ? amt.toFixed(2) : '—'} ر.س
              </AppText>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
});
