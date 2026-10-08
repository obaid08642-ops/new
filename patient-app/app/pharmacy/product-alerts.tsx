// @ts-nocheck
// app/pharmacy/product-alerts.tsx — P22.2 stock + price-drop alert toggles.
// Contract: p22-a ProductAlertController (pharmacy/alerts/subscriptions).
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Badge, Button } from '../../src/components/ui';
import { ScreenState } from '../../src/components/ScreenStates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { apiFetch } from '../../src/utils/api';
import { buildAlertBody, type AlertKind, type AlertSubscription } from '../../src/utils/p22/product-alerts';

export default function ProductAlertsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();
  const [subs, setSubs] = useState<AlertSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [medicineId, setMedicineId] = useState('');
  const [kind, setKind] = useState<AlertKind>('restock');
  const [threshold, setThreshold] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiFetch('/pharmacy/alerts/subscriptions');
      setSubs(Array.isArray(res) ? res : res?.data || res?.subscriptions || []);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل التنبيهات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function subscribe() {
    let body: Record<string, unknown>;
    try {
      body = buildAlertBody({
        medicine_id: medicineId.trim(),
        kind,
        ...(kind === 'price_drop' ? { price_threshold: Number(threshold) } : {}),
      });
    } catch (e: any) {
      const msg =
        String(e?.message || '') === 'alert_threshold_required'
          ? 'حدد السعر الذي تريد التنبيه عند النزول إليه.'
          : 'تحقق من بيانات التنبيه.';
      showLocalizedAlert('تحقق من البيانات', msg);
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/pharmacy/alerts/subscriptions', {
        method: 'POST',
        headers: { 'Idempotency-Key': `alert-sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` },
        body: JSON.stringify(body),
      });
      setMedicineId('');
      setThreshold('');
      showLocalizedAlert('تم تفعيل التنبيه', 'سنرسل لك إشعاراً عند تحقق الشرط.');
      await load();
    } catch (e: any) {
      showLocalizedAlert('تعذر تفعيل التنبيه', e?.message || 'حاول مرة أخرى لاحقاً.');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    setRemovingId(id);
    try {
      await apiFetch(`/pharmacy/alerts/subscriptions/${id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      showLocalizedAlert('تعذر إيقاف التنبيه', e?.message || 'حاول مرة أخرى لاحقاً.');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <View style={[st.hdr, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={st.hBtn}>
          <AppText variant="bodySM">رجوع</AppText>
        </TouchableOpacity>
        <AppText variant="h4">تنبيهات الأدوية</AppText>
        <View style={{ width: 60 }} />
      </View>
      <ScreenState loading={loading} error={error} empty={false} emptyTitle="" onRetry={load}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
          <Card style={{ padding: 14, gap: 10 }}>
            <AppText variant="labelMD">تنبيه جديد</AppText>
            <TextInput
              value={medicineId}
              onChangeText={setMedicineId}
              placeholder="معرّف الدواء (medicine_id)"
              placeholderTextColor={colors.textTertiary}
              style={[st.input, { color: colors.textPrimary, borderColor: colors.border }]}
            />
            <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
              {(
                [
                  ['restock', 'عودة للمخزون'],
                  ['price_drop', 'نزول السعر'],
                ] as Array<[AlertKind, string]>
              ).map(([k, label]) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setKind(k)}
                  accessibilityRole="button"
                  style={[
                    st.kind,
                    { borderColor: kind === k ? colors.primary : colors.border, backgroundColor: kind === k ? colors.primarySurface : 'transparent' },
                  ]}
                >
                  <AppText variant="labelMD" color={kind === k ? colors.primary : colors.textSecondary}>
                    {label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
            {kind === 'price_drop' ? (
              <TextInput
                value={threshold}
                onChangeText={setThreshold}
                placeholder="نبّهني عند سعر (ر.س)"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textTertiary}
                style={[st.input, { color: colors.textPrimary, borderColor: colors.border }]}
              />
            ) : null}
            <Button label="فعّل التنبيه" onPress={subscribe} loading={submitting} disabled={submitting} />
          </Card>

          {subs.length === 0 && !loading ? (
            <AppText align="center" color={colors.textTertiary}>
              لا توجد تنبيهات مفعّلة
            </AppText>
          ) : null}
          {subs.map((s) => (
            <Card key={s.id} style={{ padding: 14, gap: 8 }}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="labelMD">{s.medicine_id}</AppText>
                <Badge label={s.kind === 'price_drop' ? `سعر ≤ ${s.price_threshold ?? '—'}` : 'عودة للمخزون'} color="#0EA5E9" />
              </View>
              <Button
                label="إيقاف التنبيه"
                variant="outline"
                size="sm"
                full={false}
                loading={removingId === s.id}
                onPress={() => void remove(s.id)}
              />
            </Card>
          ))}
        </ScrollView>
      </ScreenState>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  hBtn: { minWidth: 60 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, textAlign: 'right' },
  kind: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
});
