/**
 * Pharmacy insurance decisions — CORRECT domain flow (P0-08).
 * Records the insurer response obtained by the pharmacy through its own
 * system via POST /provider/pharmacy/orders/:id/insurance-decision with
 * per-item outcomes + approval_reference + idempotency_key.
 * This replaces the generic insurance-engine screen for pharmacy orders.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useTheme, useLang, useToast } from '../../context';
import {
  NCard, NBtn, NInput, NHeader, NEmpty, NBadge, NRadio, NSecHeader, NDivider,
} from '../../components/ui';
import { SP, FS, FW } from '../../constants';
import client from '../../api/client';

type ItemDecision = { outcome: 'approved' | 'partial' | 'rejected' | ''; approved_qty: string; reason: string };

const isInsuranceOrder = (order: any) => {
  const m = String(order?.payment_method || order?.payment?.method || (order?.insurance_details ? 'insurance' : '')).toLowerCase();
  return m === 'insurance';
};

export function PharmacyInsuranceQueueScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        client.get('/provider/pharmacy/allocations', { params: { status: 'PENDING_REVIEW' } }),
        client.get('/provider/pharmacy/allocations', { params: { status: 'PARTIALLY_CONFIRMED' } }),
      ]);
      const allocs = [...(a.data || []), ...(b.data || [])];
      const details = await Promise.all(
        allocs.map((x: any) =>
          client.get(`/provider/pharmacy/allocations/${x.id}`)
            .then((r) => r.data)
            .catch(() => null),
        ),
      );
      const ready = (details.filter(Boolean) as any[]).filter(
        (d) => isInsuranceOrder(d.order) && !d.order?.insurance_decision,
      );
      setOrders(ready);
    } catch {
      show(AR ? 'تعذر تحميل طلبات التأمين' : 'Failed to load insurance orders', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [AR, show]);

  useEffect(() => { void load(); }, [load]);

  if (selected) {
    return <PharmacyInsuranceDecisionForm detail={selected} onBack={() => { setSelected(null); void load(); }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'قرارات التأمين — الصيدلية' : 'Insurance Decisions — Pharmacy'} onBack={onBack} />
      <ScrollView
        contentContainerStyle={{ padding: SP.lg, gap: SP.md, paddingBottom: SP.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        <NCard>
          <Text style={{ color: theme.text, fontWeight: FW.bold }}>
            {AR ? 'سجّل رد شركة التأمين الذي حصلت عليه عبر نظامك' : 'Record the insurer response from your own system'}
          </Text>
          <Text style={{ color: theme.textSub, marginTop: SP.xs }}>
            {AR ? 'موافقة / جزئية / رفض لكل صنف + مرجع الموافقة. يُحفظ القرار ولا يمكن تعديله.' : 'Approve / partial / reject per item + approval reference. Decisions are immutable.'}
          </Text>
        </NCard>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : orders.length === 0 ? (
          <NEmpty icon="shield" title={AR ? 'لا توجد طلبات بانتظار القرار' : 'No orders awaiting decision'} sub={AR ? 'تظهر هنا طلبات التأمين المختارة من قبلك' : 'Your selected insurance orders appear here'} />
        ) : (
          orders.map((d: any) => (
            <TouchableOpacity key={d.id} onPress={() => setSelected(d)}>
              <NCard>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: theme.text, fontWeight: FW.bold }}>#{String(d.order_id).slice(-6)}</Text>
                  <NBadge label={d.status} />
                </View>
                <Text style={{ color: theme.textSub, marginTop: SP.xs }}>
                  {(d.order?.patient_contact?.name || '') + (d.items?.length ? ` · ${d.items.length} ${AR ? 'أصناف' : 'items'}` : '')}
                </Text>
              </NCard>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function PharmacyInsuranceDecisionForm({ detail, onBack }: { detail: any; onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const order = detail.order || {};
  const items = Array.isArray(detail.items) ? detail.items : [];
  const [decisions, setDecisions] = useState<Record<string, ItemDecision>>({});
  const [approvalRef, setApprovalRef] = useState('');
  const [busy, setBusy] = useState(false);
  // Stable per-form idempotency key: safe retries never duplicate the decision.
  const [idemKey] = useState(() => `pharm-ins-${Crypto.randomUUID()}`);

  const set = (id: string, patch: Partial<ItemDecision>) =>
    setDecisions((p) => ({ ...p, [id]: { outcome: '', approved_qty: '', reason: '', ...(p[id] || {}), ...patch } }));

  const submit = async () => {
    const ref = approvalRef.trim();
    if (!ref) {
      show(AR ? 'أدخل مرجع الموافقة من شركة التأمين' : 'Enter the insurer approval reference', 'error');
      return;
    }
    if (ref.length > 160) {
      show(AR ? 'مرجع الموافقة أطول من 160 حرفاً' : 'Approval reference exceeds 160 chars', 'error');
      return;
    }
    const payloadItems: any[] = [];
    for (const it of items) {
      const key = String(it.order_item_id);
      const d = decisions[key] || { outcome: '', approved_qty: '', reason: '' };
      const quoted = Math.max(0, Number(it.qty_offered || 0));
      if (!d.outcome) {
        show(AR ? `اختر القرار لكل صنف (${it.name || key})` : `Decide every item (${it.name || key})`, 'error');
        return;
      }
      if (d.outcome === 'approved') {
        payloadItems.push({ order_item_id: key, outcome: 'approved', approved_qty: quoted });
      } else {
        const aq = Math.floor(Number(d.approved_qty));
        if (d.outcome === 'partial' && (!(aq > 0) || aq >= quoted)) {
          show(AR ? `الكمية المعتمدة للصنف ${it.name || key} يجب أن تكون بين 1 و${quoted - 1}` : `Approved qty for ${it.name || key} must be 1..${quoted - 1}`, 'error');
          return;
        }
        if (!d.reason.trim()) {
          show(AR ? `السبب إلزامي للصنف ${it.name || key}` : `Reason required for ${it.name || key}`, 'error');
          return;
        }
        payloadItems.push({ order_item_id: key, outcome: d.outcome, approved_qty: d.outcome === 'partial' ? aq : 0, reason: d.reason.trim().slice(0, 500) });
      }
    }
    setBusy(true);
    try {
      await client.post(`/provider/pharmacy/orders/${order.id}/insurance-decision`, {
        idempotency_key: idemKey,
        approval_reference: ref,
        items: payloadItems,
      });
      show(AR ? 'تم تسجيل قرار التأمين وإخطار المريض' : 'Insurance decision recorded, patient notified', 'success');
      onBack();
    } catch (error: any) {
      show(error?.response?.data?.message || (AR ? 'تعذر تسجيل القرار' : 'Decision failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={`${AR ? 'قرار تأمين #' : 'Insurance #'}${String(order.id || '').slice(-6)}`} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md, paddingBottom: SP.xxl }}>
        {(order?.patient_contact?.name || order?.patient_contact?.phone) ? (
          <NCard>
            <Text style={{ color: theme.text, fontWeight: FW.bold }}>{AR ? 'المريض (مكشوف بعد اختيار عرضك)' : 'Patient (revealed after your selection)'}</Text>
            <Text style={{ color: theme.textSub, marginTop: SP.xs }}>{[order.patient_contact?.name, order.patient_contact?.phone].filter(Boolean).join(' · ')}</Text>
          </NCard>
        ) : null}
        <NSecHeader title={AR ? 'قرار كل صنف' : 'Per-item decision'} />
        {items.map((it: any) => {
          const key = String(it.order_item_id);
          const d = decisions[key] || { outcome: '', approved_qty: '', reason: '' };
          return (
            <NCard key={key}>
              <Text style={{ color: theme.text, fontWeight: FW.bold }}>{it.name || it.sku || key}</Text>
              <Text style={{ color: theme.textSub, marginTop: SP.xs }}>
                {AR ? `الكمية: ${it.qty_offered} · السعر: ${it.unit_price ?? '—'}` : `Qty: ${it.qty_offered} · Price: ${it.unit_price ?? '—'}`}
              </Text>
              <NDivider />
              <NRadio
                value={d.outcome}
                onSelect={(v) => set(key, { outcome: v as any })}
                opts={[
                  { value: 'approved', label: AR ? 'موافقة كاملة' : 'Approve full' },
                  { value: 'partial', label: AR ? 'موافقة جزئية' : 'Approve partial' },
                  { value: 'rejected', label: AR ? 'رفض' : 'Reject' },
                ]}
              />
              {d.outcome === 'partial' && (
                <NInput label={AR ? 'الكمية المعتمدة' : 'Approved qty'} value={d.approved_qty} onChange={(v: string) => set(key, { approved_qty: v })} kbType="numeric" />
              )}
              {(d.outcome === 'partial' || d.outcome === 'rejected') && (
                <NInput label={AR ? 'السبب (إلزامي)' : 'Reason (required)'} value={d.reason} onChange={(v: string) => set(key, { reason: v })} />
              )}
            </NCard>
          );
        })}
        <NSecHeader title={AR ? 'مرجع الموافقة' : 'Approval reference'} />
        <NInput label={AR ? 'مرجع شركة التأمين' : 'Insurer reference'} value={approvalRef} onChange={setApprovalRef} />
        <NBtn label={AR ? 'تسجيل القرار وإخطار المريض' : 'Record decision and notify patient'} loading={busy} onPress={() => void submit()} />
      </ScrollView>
    </View>
  );
}
