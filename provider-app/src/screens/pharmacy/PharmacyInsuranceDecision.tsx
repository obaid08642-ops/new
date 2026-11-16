/**
 * Pharmacy insurance decisions — CORRECT domain flow (P0-08).
 * Records the insurer response obtained by the pharmacy through its own
 * system via POST /provider/pharmacy/orders/:id/insurance-decision with
 * per-item outcomes + approval_reference + idempotency_key.
 * This replaces the generic insurance-engine screen for pharmacy orders.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  const load = useCallback(async () => {
    try {
      // The list marks the rows that await this pharmacy's insurance decision (awaits_insurance_decision). The old
      // status filters asked for 'PENDING_REVIEW' / 'PARTIALLY_CONFIRMED', but the stored states are lower case, so
      // this queue was always empty.
      const list = await client.get('/provider/pharmacy/allocations');
      const allocs = (Array.isArray(list.data) ? list.data : []).filter((x: { awaits_insurance_decision?: boolean }) => x.awaits_insurance_decision === true);
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
      show(tt('sxd.8934acbe'), 'error');
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
      <NHeader title={tt('sxd.31883910')} onBack={onBack} />
      <ScrollView
        contentContainerStyle={{ padding: SP.lg, gap: SP.md, paddingBottom: SP.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        <NCard>
          <Text style={{ color: theme.text, fontWeight: FW.bold }}>
            {tt('sxd.d280917d')}
          </Text>
          <Text style={{ color: theme.textSub, marginTop: SP.xs }}>
            {tt('sxd.39c123d7')}
          </Text>
        </NCard>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : orders.length === 0 ? (
          <NEmpty icon="shield" title={tt('sxd.bb6fce87')} sub={tt('sxd.48130fb3')} />
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

/**
 * Opens the same decision form straight from an Orders card whose allocation row carries
 * awaits_insurance_decision (provider-journeys needs-review line 22). It only loads the
 * allocation detail the queue loads; the decision itself is the form's existing POST.
 */
export function PharmacyInsuranceDecisionForAllocation({ allocationId, onBack }: { allocationId: string; onBack: () => void }) {
  const { theme } = useTheme();
  const { t, t: tt } = useLang();
  const { show } = useToast();
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const backRef = useRef(onBack);
  backRef.current = onBack;

  useEffect(() => {
    let live = true;
    client.get<Record<string, unknown>>(`/provider/pharmacy/allocations/${allocationId}`)
      .then((r) => { if (live) setDetail(r.data); })
      .catch(() => { if (live) { show(t('error'), 'error'); backRef.current(); } });
    return () => { live = false; };
  }, [allocationId, show, t]);

  if (detail) return <PharmacyInsuranceDecisionForm detail={detail} onBack={onBack} />;
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={t('insuranceDecisionRecord')} onBack={onBack} />
      <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: SP.xxl }} accessibilityLabel={t('loading')} />
    </View>
  );
}

function PharmacyInsuranceDecisionForm({ detail, onBack }: { detail: any; onBack: () => void }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
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
      show(tt('sxd.6528bc1c'), 'error');
      return;
    }
    if (ref.length > 160) {
      show(tt('sxd.df526486'), 'error');
      return;
    }
    const payloadItems: any[] = [];
    for (const it of items) {
      const key = String(it.order_item_id);
      const d = decisions[key] || { outcome: '', approved_qty: '', reason: '' };
      const quoted = Math.max(0, Number(it.qty_offered || 0));
      if (!d.outcome) {
        show(tt('tpaa.944d0e84', { p1: String(it.name || key) }), 'error');
        return;
      }
      if (d.outcome === 'approved') {
        payloadItems.push({ order_item_id: key, outcome: 'approved', approved_qty: quoted });
      } else {
        const aq = Math.floor(Number(d.approved_qty));
        if (d.outcome === 'partial' && (!(aq > 0) || aq >= quoted)) {
          show(tt('tpaa.dca912cf', { p1: String(it.name || key), p2: String(quoted - 1) }), 'error');
          return;
        }
        if (!d.reason.trim()) {
          show(tt('tpaa.0ac76741', { p1: String(it.name || key) }), 'error');
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
      show(tt('sxd.f081382f'), 'success');
      onBack();
    } catch (error: any) {
      show(error?.response?.data?.message || (tt('sxd.9ebe5afc')), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={`${tt('sxd.b9319457')}${String(order.id || '').slice(-6)}`} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md, paddingBottom: SP.xxl }}>
        {(order?.patient_contact?.name || order?.patient_contact?.phone) ? (
          <NCard>
            <Text style={{ color: theme.text, fontWeight: FW.bold }}>{tt('sxd.c575400e')}</Text>
            <Text style={{ color: theme.textSub, marginTop: SP.xs }}>{[order.patient_contact?.name, order.patient_contact?.phone].filter(Boolean).join(' · ')}</Text>
          </NCard>
        ) : null}
        <NSecHeader title={tt('sxd.1532b8b7')} />
        {items.map((it: any) => {
          const key = String(it.order_item_id);
          const d = decisions[key] || { outcome: '', approved_qty: '', reason: '' };
          return (
            <NCard key={key}>
              <Text style={{ color: theme.text, fontWeight: FW.bold }}>{it.name || it.sku || key}</Text>
              <Text style={{ color: theme.textSub, marginTop: SP.xs }}>
                {tt('tpaa.9cfe34b9', { p1: String(it.qty_offered), p2: String(it.unit_price ?? '—') })}
              </Text>
              <NDivider />
              <NRadio
                value={d.outcome}
                onSelect={(v) => set(key, { outcome: v as any })}
                opts={[
                  { value: 'approved', label: tt('sxd.5e78845a') },
                  { value: 'partial', label: tt('sxd.1e2792f5') },
                  { value: 'rejected', label: tt('sxd.8a223f36') },
                ]}
              />
              {d.outcome === 'partial' && (
                <NInput label={tt('sxd.42b8e502')} value={d.approved_qty} onChange={(v: string) => set(key, { approved_qty: v })} kbType="numeric" />
              )}
              {(d.outcome === 'partial' || d.outcome === 'rejected') && (
                <NInput label={tt('sxd.7f4fca6d')} value={d.reason} onChange={(v: string) => set(key, { reason: v })} />
              )}
            </NCard>
          );
        })}
        <NSecHeader title={tt('sxd.72e9da28')} />
        <NInput label={tt('sxd.d13583b7')} value={approvalRef} onChange={setApprovalRef} />
        <NBtn label={tt('sxd.c22d2dba')} loading={busy} onPress={() => void submit()} />
      </ScrollView>
    </View>
  );
}
