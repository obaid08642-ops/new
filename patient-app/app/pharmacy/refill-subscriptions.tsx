// @ts-nocheck
// app/pharmacy/refill-subscriptions.tsx — P22.1 auto-refill subscribe/manage/cancel.
// Contract: p22-a RefillController (pharmacy/refills/subscriptions).
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Badge, Button } from '../../src/components/ui';
import { ScreenState } from '../../src/components/ScreenStates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { apiFetch } from '../../src/utils/api';
import {
  buildSubscribeBody,
  canProduceRefill,
  daysUntilRefill,
  type RefillSubscription,
} from '../../src/utils/p22/refill-subscriptions';

const fetchJson = (path: string, init?: RequestInit) => apiFetch(path, init);

export default function RefillSubscriptionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [subs, setSubs] = useState<RefillSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [medicineId, setMedicineId] = useState('');
  const [qty, setQty] = useState('1');
  const [cadence, setCadence] = useState('30');
  const [prescriptionId, setPrescriptionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await fetchJson('/pharmacy/refills/subscriptions');
      const list = Array.isArray(res) ? res : res?.data || res?.subscriptions || [];
      setSubs(list);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل اشتراكات إعادة الصرف');
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
      body = buildSubscribeBody({
        items: [{ medicine_id: medicineId.trim(), qty: Number(qty) }],
        cadence_days: Number(cadence),
        ...(prescriptionId.trim() ? { prescription_id: prescriptionId.trim() } : {}),
        reminder_days_before: 3,
      });
    } catch (e: any) {
      showLocalizedAlert('تحقق من البيانات', String(e?.message || 'بيانات غير صالحة'));
      return;
    }
    setSubmitting(true);
    try {
      await fetchJson('/pharmacy/refills/subscriptions', {
        method: 'POST',
        headers: { 'Idempotency-Key': `refill-sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` },
        body: JSON.stringify(body),
      });
      setMedicineId('');
      setPrescriptionId('');
      showLocalizedAlert('تم الاشتراك', 'سيصلك تذكير قبل كل صرف تلقائي.');
      await load();
    } catch (e: any) {
      showLocalizedAlert('تعذر الاشتراك', e?.message || 'حاول مرة أخرى لاحقاً.');
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel(id: string) {
    setCancellingId(id);
    try {
      await fetchJson(`/pharmacy/refills/subscriptions/${id}/cancel`, {
        method: 'POST',
        headers: { 'Idempotency-Key': `refill-cancel-${id}-${Date.now().toString(36)}` },
        body: JSON.stringify({}),
      });
      await load();
    } catch (e: any) {
      showLocalizedAlert('تعذر الإلغاء', e?.message || 'حاول مرة أخرى لاحقاً.');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <View style={[st.hdr, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={st.hBtn}>
          <AppText variant="bodySM">رجوع</AppText>
        </TouchableOpacity>
        <AppText variant="h4">اشتراكات إعادة الصرف</AppText>
        <View style={{ width: 60 }} />
      </View>
      <ScreenState loading={loading} error={error} empty={false} emptyTitle="" onRetry={load}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
          <Card style={{ padding: 14, gap: 10 }}>
            <AppText variant="labelMD">اشتراك جديد للأدوية المزمنة</AppText>
            <TextInput
              value={medicineId}
              onChangeText={setMedicineId}
              placeholder="معرّف الدواء (medicine_id)"
              placeholderTextColor={colors.textTertiary}
              style={[st.input, { color: colors.textPrimary, borderColor: colors.border }]}
            />
            <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
              <TextInput
                value={qty}
                onChangeText={setQty}
                placeholder="الكمية"
                keyboardType="numeric"
                placeholderTextColor={colors.textTertiary}
                style={[st.input, { flex: 1, color: colors.textPrimary, borderColor: colors.border }]}
              />
              <TextInput
                value={cadence}
                onChangeText={setCadence}
                placeholder="كل كم يوم؟ (7-120)"
                keyboardType="numeric"
                placeholderTextColor={colors.textTertiary}
                style={[st.input, { flex: 1, color: colors.textPrimary, borderColor: colors.border }]}
              />
            </View>
            <TextInput
              value={prescriptionId}
              onChangeText={setPrescriptionId}
              placeholder="معرّف الروشتة (مطلوب للأدوية بوصفة)"
              placeholderTextColor={colors.textTertiary}
              style={[st.input, { color: colors.textPrimary, borderColor: colors.border }]}
            />
            <AppText variant="caption" color={colors.textTertiary}>
              لن يتم أي صرف تلقائي بعد انتهاء صلاحية الروشتة — ستشاهد التنبيه هنا أولاً.
            </AppText>
            <Button label="اشترك" onPress={subscribe} loading={submitting} disabled={submitting} />
          </Card>

          {subs.length === 0 && !loading ? (
            <AppText align="center" color={colors.textTertiary}>
              لا توجد اشتراكات بعد
            </AppText>
          ) : null}
          {subs.map((s) => {
            const days = daysUntilRefill(s);
            const live = canProduceRefill(s);
            return (
              <Card key={s.id} style={{ padding: 14, gap: 8 }}>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="labelMD">كل {s.cadence_days} يوم</AppText>
                  <Badge label={s.status === 'active' ? (live ? 'نشط' : 'متوقف — روشتة منتهية') : String(s.status)} color={live ? '#16A34A' : '#DC2626'} />
                </View>
                <AppText variant="caption" color={colors.textTertiary}>
                  {days == null ? 'موعد الصرف التالي يحدده الخادم' : `الصرف التالي خلال ${days} يوم`}
                </AppText>
                {s.status === 'active' ? (
                  <Button
                    label="إلغاء الاشتراك"
                    variant="outline"
                    size="sm"
                    full={false}
                    loading={cancellingId === s.id}
                    onPress={() => void cancel(s.id)}
                  />
                ) : null}
              </Card>
            );
          })}
          {submitting ? <ActivityIndicator /> : null}
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
});
