// @ts-nocheck
// app/insurance/submit-claim.tsx — LJ-02: file a reimbursement claim against a real paid booking.
import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator, TouchableOpacity, TextInput, Image } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText, Card, Button, IconButton, SectionHeader } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { logError } from '../../src/utils/logger';

type Booking = { kind: string; id: string; title: string; amount: number; date?: string };

const KIND_LABEL: Record<string, string> = {
  consultation: 'استشارة طبية', pharmacy: 'أدوية', lab: 'تحاليل', radiology: 'أشعة', nursing: 'تمريض منزلي',
};

export default function Screen() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [note, setNote] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const safe = async (p: Promise<any>) => { try { return await p; } catch { return null; } };
    const [appts, orders, pharmacyOrders, labs, rads, nursing] = await Promise.all([
      safe(apiFetch('/care/appointments')),
      safe(apiFetch('/orders/mine')),
      // Pharmacy checkout orders live in pharmacy_orders; /orders/mine only returns legacy rows.
      safe(apiFetch('/patient/pharmacy/orders')),
      safe(apiFetch('/labs/bookings/mine')),
      safe(apiFetch('/radiology/bookings/mine')),
      safe(apiFetch('/home-care/bookings/my')),
    ]);
    const arr = (x: any) => (Array.isArray(x) ? x : x?.data || x?.items || []);
    const paid = (row: any) => ['paid', 'completed', 'delivered', 'reported', 'confirmed'].includes(String(row.payment_status || row.status || row.state || '').toLowerCase());
    const out: Booking[] = [];
    for (const a of arr(appts)) if (paid(a)) out.push({ kind: 'consultation', id: a.id, title: a.doctor_name || 'استشارة طبية', amount: Number(a.total_price || a.price || 0), date: a.slot_start });
    for (const o of arr(orders)) if (paid(o)) out.push({ kind: 'pharmacy', id: o.id, title: `طلب صيدلية #${String(o.id).slice(0, 8)}`, amount: Number(o.total || 0), date: o.createdAt });
    for (const o of arr(pharmacyOrders)) if (paid(o)) out.push({ kind: 'pharmacy', id: o.id, title: `طلب صيدلية #${String(o.id).slice(0, 8)}`, amount: Number(o.totals?.total ?? o.total_price ?? 0), date: o.createdAt });
    for (const b of arr(labs)) if (paid(b)) out.push({ kind: 'lab', id: b.id, title: `تحاليل #${String(b.id).slice(0, 8)}`, amount: Number(b.total || 0), date: b.scheduled_at });
    for (const b of arr(rads)) if (paid(b)) out.push({ kind: 'radiology', id: b.id, title: `أشعة #${String(b.id).slice(0, 8)}`, amount: Number(b.total || b.price || 0), date: b.scheduled_at });
    for (const b of arr(nursing)) if (paid(b)) out.push({ kind: 'nursing', id: b.id, title: `تمريض #${String(b.id).slice(0, 8)}`, amount: Number(b.total || b.price || 0), date: b.scheduled_at });
    setBookings(out);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pickReceipt = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploading(true);
      const formData = new FormData();
      formData.append('file', { uri: asset.uri, name: asset.fileName || 'receipt.jpg', type: asset.mimeType || 'image/jpeg' } as any);
      formData.append('folder', 'insurance-claims');
      const up = await apiFetch<any>('/media/upload', { method: 'POST', body: formData });
      const url = up?.url || up?.data?.url;
      if (url) setAttachmentUrl(url);
      else showLocalizedAlert('تعذّر الرفع', 'لم يُرجع الخادم رابطًا للمرفق.');
    } catch (err: any) {
      logError('insurance:submit-claim:upload', err);
      showLocalizedAlert('تعذّر إرفاق الفاتورة', err?.message || 'حاول مرة أخرى.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!selected) { showLocalizedAlert('اختر حجزًا', 'اختر الخدمة المدفوعة التي تريد المطالبة بها.'); return; }
    setSubmitting(true);
    try {
      // The server sets status/submitted_at and derives eligibility; the client
      // sends only the booking it is claiming.
      await apiFetch('/insurance/claims/submit', {
        method: 'POST',
        body: JSON.stringify({
          booking_kind: selected.kind,
          booking_id: selected.id,
          claim_type: 'reimbursement',
          amount: selected.amount,
          service_date: selected.date,
          attachment_url: attachmentUrl || undefined,
          note: note.trim() || undefined,
        }),
      });
      showLocalizedAlert('تم تقديم المطالبة', 'سيتم مراجعتها خلال 2-5 أيام عمل. يمكنك متابعتها في تبويب المطالبات.');
      router.replace({ pathname: '/insurance/hub', params: { tab: 'claims' } } as any);
    } catch (err: any) {
      logError('insurance:submit-claim', err);
      showLocalizedAlert('خطأ', err?.message || 'تعذر تقديم المطالبة');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ width: 44 }} />
          <AppText variant="h3" color={colors.textPrimary}>تقديم مطالبة تأمين</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}>
        <SectionHeader title="اختر الخدمة المدفوعة" />
        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          : bookings.length === 0 ? (
            <Card style={{ alignItems: 'center', gap: 8 }}>
              <Icon name="info" size={26} color={colors.textTertiary} />
              <AppText color={colors.textSecondary} align="center">لا توجد حجوزات مدفوعة مؤهلة للمطالبة حالياً.</AppText>
            </Card>
          ) : bookings.map((b) => {
            const active = selected?.id === b.id && selected?.kind === b.kind;
            return (
              <Card key={`${b.kind}-${b.id}`} onPress={() => setSelected(b)}
                style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderWidth: active ? 2 : 1, borderColor: active ? colors.primary : colors.borderLight }}>
                <View style={[st.fIcon, { backgroundColor: colors.primarySurface }]}>
                  <Icon name={b.kind === 'pharmacy' ? 'medication' : b.kind === 'lab' || b.kind === 'radiology' ? 'science' : b.kind === 'nursing' ? 'home' : 'doctor'} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                  <AppText variant="h6">{KIND_LABEL[b.kind] || b.kind}</AppText>
                  <AppText variant="caption" color={colors.textTertiary}>{b.title} · {b.amount.toFixed(2)} ر.س</AppText>
                </View>
                <Icon name={active ? 'check-circle' : 'circle-outline'} size={20} color={active ? colors.primary : colors.textTertiary} />
              </Card>
            );
          })}

        <SectionHeader title="تفاصيل المطالبة" />
        <TextInput
          style={[st.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]}
          placeholder="ملاحظة (اختياري)"
          placeholderTextColor={colors.textTertiary}
          value={note}
          onChangeText={setNote}
          textAlign="right"
          multiline
        />
        <TouchableOpacity onPress={pickReceipt} disabled={uploading} style={[st.upload, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
          {uploading ? <ActivityIndicator color={colors.primary} /> : (
            <>
              <Icon name={attachmentUrl ? 'check-circle' : 'camera'} size={22} color={attachmentUrl ? colors.success || colors.primary : colors.primary} />
              <AppText color={colors.textSecondary}>{attachmentUrl ? 'تم إرفاق الفاتورة' : 'إرفاق صورة الفاتورة / الإيصال'}</AppText>
            </>
          )}
        </TouchableOpacity>
        {!!attachmentUrl && <Image source={{ uri: attachmentUrl }} style={{ width: '100%', height: 140, borderRadius: 12 }} resizeMode="cover" />}

        <Button label="تقديم المطالبة" onPress={() => void submit()} loading={submitting} disabled={!selected || uploading} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  fIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 80, borderRadius: 14, borderWidth: 1, padding: 12, textAlignVertical: 'top' },
  upload: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 18 },
});
