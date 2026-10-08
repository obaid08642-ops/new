// @ts-nocheck
// app/pharmacy/bundles.tsx — P22.3 bundles + same-ingredient alternatives.
// Rules: Rx items are NEVER suggested (shown as suppressed), interaction
// warnings stay VISIBLE next to their suggestion.
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Badge, Button } from '../../src/components/ui';
import { ScreenState } from '../../src/components/ScreenStates';
import { apiFetch } from '../../src/utils/api';
import {
  fetchAlternatives,
  fetchFrequentlyBoughtTogether,
  warningsFor,
  type BundleResult,
} from '../../src/utils/p22/bundles';

const EMPTY: BundleResult = { items: [], excluded_rx_ids: [], interaction_warnings: [] };

export default function BundlesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();
  const params = useLocalSearchParams<{ id?: string }>();
  const seedId = Array.isArray(params.id) ? params.id[0] : params.id || '';
  const [medicineId, setMedicineId] = useState(seedId);
  const [together, setTogether] = useState<BundleResult>(EMPTY);
  const [alternatives, setAlternatives] = useState<BundleResult>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const [t, a] = await Promise.all([
        fetchFrequentlyBoughtTogether(apiFetch, id.trim()),
        fetchAlternatives(apiFetch, id.trim()),
      ]);
      setTogether(t);
      setAlternatives(a);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل الاقتراحات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (seedId) void load(seedId);
  }, [seedId, load]);

  const renderSuggestion = (res: BundleResult, item: (typeof res.items)[number]) => {
    const warns = warningsFor(res.interaction_warnings, item.medicine_id);
    return (
      <Card key={item.medicine_id} style={{ padding: 12, gap: 6 }}>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="labelMD">{item.name_ar || item.name_en || item.medicine_id}</AppText>
          {item.price != null ? (
            <AppText variant="caption" color={colors.textTertiary}>
              {Number(item.price).toFixed(2)} ر.س
            </AppText>
          ) : null}
        </View>
        {warns.map((w, i) => (
          <View key={i} style={[st.warn, { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }]}>
            <AppText variant="caption" color="#92400E">
              تحذير تداخل: يتداخل مع {w.interacts_with} — {w.detail}
            </AppText>
          </View>
        ))}
      </Card>
    );
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <View style={[st.hdr, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={st.hBtn}>
          <AppText variant="bodySM">رجوع</AppText>
        </TouchableOpacity>
        <AppText variant="h4">يُشترى معاً وبدائل</AppText>
        <View style={{ width: 60 }} />
      </View>
      <ScreenState loading={loading} error={error} empty={false} emptyTitle="" onRetry={() => load(medicineId)}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
          <Card style={{ padding: 14, gap: 10 }}>
            <TextInput
              value={medicineId}
              onChangeText={setMedicineId}
              placeholder="معرّف الدواء (medicine_id)"
              placeholderTextColor={colors.textTertiary}
              style={[st.input, { color: colors.textPrimary, borderColor: colors.border }]}
            />
            <Button label="عرض الاقتراحات" onPress={() => load(medicineId)} />
          </Card>

          <AppText variant="labelMD">يُشترى معاً غالباً</AppText>
          {together.items.map((it) => renderSuggestion(together, it))}
          {together.excluded_rx_ids.length > 0 ? (
            <View style={[st.rx, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <AppText variant="caption" color={colors.textTertiary}>
                أُخفيت {together.excluded_rx_ids.length} أدوية بوصفة من الاقتراحات — أدوية الوصفات لا تُقترح للبيع الإضافي.
              </AppText>
            </View>
          ) : null}

          <AppText variant="labelMD">بدائل بنفس المادة الفعالة</AppText>
          {alternatives.items.map((it) => renderSuggestion(alternatives, it))}
          {alternatives.excluded_rx_ids.length > 0 ? (
            <View style={[st.rx, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <AppText variant="caption" color={colors.textTertiary}>
                أُخفيت {alternatives.excluded_rx_ids.length} بدائل بوصفة من الاقتراحات.
              </AppText>
            </View>
          ) : null}
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
  warn: { borderWidth: 1, borderRadius: 10, padding: 8 },
  rx: { borderWidth: 1, borderRadius: 10, padding: 8 },
});
