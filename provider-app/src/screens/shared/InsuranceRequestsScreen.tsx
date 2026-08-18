/**
 * ════════════════════════════════════════════════════════════════════════════
 * NABDAH PLUS – M4 · PROVIDER INSURANCE REQUESTS QUEUE (BR-2)
 * طابور طلبات التأمين الواردة للمزود + قرار يدوي:
 *   قبول كلي · قبول جزئي (نسبة copay) · رفض مع سبب
 * Backend: GET  /insurance/requests/provider/queue
 *          POST /insurance/requests/:id/decide
 * ════════════════════════════════════════════════════════════════════════════
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NBtn, NScroll, NBadge, NEmpty, NSkeleton } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';

type DecisionMode = 'approve_full' | 'approve_partial' | 'reject' | null;

const STATE_META: Record<string, { ar: string; en: string; variant: string }> = {
  PENDING_PROVIDER_REVIEW: { ar: 'بانتظار قرارك', en: 'Awaiting your decision', variant: 'warn' },
  APPROVED_FULL: { ar: 'قبول كلي', en: 'Fully approved', variant: 'success' },
  COPAY_PENDING: { ar: 'بانتظار دفع المريض', en: 'Awaiting patient copay', variant: 'info' },
  COPAY_PAID: { ar: 'تم الدفع — ابدأ الخدمة', en: 'Paid — start service', variant: 'success' },
  REJECTED: { ar: 'مرفوض', en: 'Rejected', variant: 'danger' },
};

export function InsuranceRequestsScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Decision modal state
  const [target, setTarget] = useState<any | null>(null);
  const [mode, setMode] = useState<DecisionMode>(null);
  const [copayPct, setCopayPct] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setLoadErr(null);
    try {
      const res = await client.get('/insurance/requests/provider/queue');
      const list = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setItems(list);
    } catch (e: any) {
      const msg = e?.message || (AR ? 'تعذر تحميل طلبات التأمين' : 'Failed to load insurance requests');
      setLoadErr(typeof msg === 'string' ? msg : String(msg));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [AR]);

  useEffect(() => { load(); }, [load]);

  const openDecision = (req: any) => {
    setTarget(req);
    setMode(null);
    setCopayPct('');
    setReason('');
  };

  const submitDecision = async () => {
    if (!target || !mode) return;
    const body: any = { decision: mode };
    if (mode === 'approve_partial') {
      const pct = Number(copayPct);
      if (!pct || pct <= 0 || pct >= 100) {
        show(AR ? 'أدخل نسبة copay بين 1 و 99' : 'Enter a copay percent between 1 and 99', 'error');
        return;
      }
      body.copay_percent = pct;
    }
    if (mode === 'reject') {
      if (!reason.trim()) {
        show(AR ? 'سبب الرفض إلزامي' : 'Rejection reason is required', 'error');
        return;
      }
      body.reason = reason.trim();
    }
    setSubmitting(true);
    try {
      const res = await client.post(`/insurance/requests/${target.id}/decide`, body);
      const updated = res.data;
      setItems(prev => prev.map(it => it.id === target.id ? { ...it, ...updated } : it));
      setTarget(null);
      show(AR ? 'تم إرسال القرار للمريض' : 'Decision sent to patient', 'success');
    } catch (e: any) {
      show(e?.message || (AR ? 'تعذر إرسال القرار' : 'Failed to submit decision'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const copayPreview = (() => {
    if (mode !== 'approve_partial' || !target) return null;
    const pct = Number(copayPct);
    if (!pct || pct <= 0 || pct >= 100) return null;
    return Math.round(Number(target.price) * (pct / 100) * 100) / 100;
  })();

  return (
    <NScroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}>
      <NHeader
        title={AR ? 'طلبات التأمين' : 'Insurance Requests'}
        sub={AR ? 'مراجعة يدوية قبل تقديم الخدمة' : 'Manual review before service'}
        onBack={onBack}
      />

      <View style={{ padding: SP.xl }}>
        {loading ? (
          <>
            <NSkeleton w="100%" h={120} style={{ marginBottom: SP.md }} />
            <NSkeleton w="100%" h={120} style={{ marginBottom: SP.md }} />
            <NSkeleton w="100%" h={120} />
          </>
        ) : loadErr ? (
          <NEmpty
            icon="alert"
            title={AR ? 'حدث خطأ' : 'Something went wrong'}
            sub={loadErr}
            actionLabel={AR ? 'إعادة المحاولة' : 'Retry'}
            onAction={() => load()}
          />
        ) : items.length === 0 ? (
          <NEmpty
            icon="shield"
            title={AR ? 'لا توجد طلبات تأمين' : 'No insurance requests'}
            sub={AR ? 'طلبات المرضى الواردة ستظهر هنا' : 'Incoming patient requests will appear here'}
          />
        ) : (
          items.map(req => {
            const meta = STATE_META[req.state] || { ar: req.state, en: req.state, variant: 'info' };
            const pending = req.state === 'PENDING_PROVIDER_REVIEW';
            return (
              <NCard key={req.id} style={{ marginBottom: SP.lg, borderColor: pending ? theme.warn : theme.border }}>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
                    {req.patient_name || (AR ? 'مريض' : 'Patient')}
                  </Text>
                  <NBadge label={AR ? meta.ar : meta.en} variant={meta.variant as any} />
                </View>

                <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: 4, textAlign: AR ? 'right' : 'left' }}>
                  {(AR ? 'الخدمة: ' : 'Service: ') + (req.service_type || '—') + ' · ' + (req.channel || '—')}
                </Text>
                <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: 4, textAlign: AR ? 'right' : 'left' }}>
                  {(AR ? 'السعر: ' : 'Price: ') + (req.price ?? '—') + (AR ? ' ر.س' : ' SAR')}
                </Text>
                {!!req.policy?.company && (
                  <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: 4, textAlign: AR ? 'right' : 'left' }}>
                    {(AR ? 'شركة التأمين: ' : 'Insurer: ') + req.policy.company}
                  </Text>
                )}
                {req.state === 'COPAY_PENDING' && (
                  <Text style={{ fontSize: FS.sm, color: theme.warn, marginBottom: 4, textAlign: AR ? 'right' : 'left' }}>
                    {(AR ? 'copay المطلوب من المريض: ' : 'Patient copay due: ') + (req.copay_amount ?? '—') + (AR ? ` ر.س (${req.copay_percent}%)` : ` SAR (${req.copay_percent}%)`)}
                  </Text>
                )}
                {req.state === 'REJECTED' && !!req.rejection_reason && (
                  <Text style={{ fontSize: FS.sm, color: theme.danger, marginBottom: 4, textAlign: AR ? 'right' : 'left' }}>
                    {(AR ? 'سبب الرفض: ' : 'Reason: ') + req.rejection_reason}
                  </Text>
                )}

                {pending && (
                  <NBtn
                    label={AR ? 'اتخاذ القرار' : 'Make Decision'}
                    icon="edit"
                    onPress={() => openDecision(req)}
                    style={{ marginTop: SP.md }}
                  />
                )}
              </NCard>
            );
          })
        )}
      </View>

      {/* ── Decision Modal ─────────────────────────────────────────────────── */}
      <Modal visible={!!target} transparent animationType="slide" onRequestClose={() => setTarget(null)}>
        <View style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: R.xxl, borderTopRightRadius: R.xxl, padding: SP.xl, maxHeight: '88%' }}>
            <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: 'center', marginBottom: SP.xs }}>
              {AR ? 'قرار التأمين' : 'Insurance Decision'}
            </Text>
            <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginBottom: SP.lg }}>
              {target ? `${target.patient_name || ''} · ${target.service_type || ''} · ${target.price ?? ''} ${AR ? 'ر.س' : 'SAR'}` : ''}
            </Text>

            {/* Mode selector */}
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.lg }}>
              {([
                { k: 'approve_full', ar: 'قبول كلي', en: 'Full', color: theme.success },
                { k: 'approve_partial', ar: 'جزئي %', en: 'Partial %', color: theme.warn },
                { k: 'reject', ar: 'رفض', en: 'Reject', color: theme.danger },
              ] as const).map(opt => (
                <TouchableOpacity
                  key={opt.k}
                  onPress={() => setMode(opt.k as DecisionMode)}
                  style={{
                    flex: 1, paddingVertical: SP.md, borderRadius: R.lg, alignItems: 'center',
                    backgroundColor: mode === opt.k ? opt.color : theme.surface2,
                    borderWidth: 1, borderColor: mode === opt.k ? opt.color : theme.border,
                  }}
                >
                  <Text style={{ color: mode === opt.k ? '#FFF' : theme.text, fontWeight: FW.bold, fontSize: FS.sm }}>
                    {AR ? opt.ar : opt.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {mode === 'approve_partial' && (
              <View style={{ marginBottom: SP.lg }}>
                <Text style={{ fontSize: FS.sm, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'نسبة copay على المريض (1–99%)' : 'Patient copay percent (1–99%)'}
                </Text>
                <TextInput
                  value={copayPct}
                  onChangeText={setCopayPct}
                  keyboardType="numeric"
                  placeholder="20"
                  placeholderTextColor={theme.textHint}
                  style={{
                    backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.border,
                    borderRadius: R.md, padding: SP.md, color: theme.text, fontSize: FS.md, textAlign: 'center',
                  }}
                />
                {copayPreview !== null && (
                  <Text style={{ fontSize: FS.sm, color: theme.warn, marginTop: SP.sm, textAlign: 'center' }}>
                    {AR ? `يدفع المريض: ${copayPreview} ر.س` : `Patient pays: ${copayPreview} SAR`}
                  </Text>
                )}
              </View>
            )}

            {mode === 'reject' && (
              <View style={{ marginBottom: SP.lg }}>
                <Text style={{ fontSize: FS.sm, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'سبب الرفض (إلزامي — يظهر للمريض)' : 'Rejection reason (required — shown to patient)'}
                </Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  placeholder={AR ? 'مثال: الخدمة غير مغطاة في وثيقتك' : 'e.g. Service not covered by your policy'}
                  placeholderTextColor={theme.textHint}
                  style={{
                    backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.border,
                    borderRadius: R.md, padding: SP.md, color: theme.text, fontSize: FS.sm,
                    minHeight: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left',
                  }}
                />
              </View>
            )}

            <NBtn
              label={submitting ? (AR ? 'جارٍ الإرسال…' : 'Submitting…') : (AR ? 'تأكيد القرار' : 'Confirm Decision')}
              onPress={submitDecision}
              disabled={!mode || submitting}
              loading={submitting}
            />
            <NBtn
              label={AR ? 'إلغاء' : 'Cancel'}
              variant="outline"
              onPress={() => setTarget(null)}
              style={{ marginTop: SP.sm }}
            />
          </View>
        </View>
      </Modal>
    </NScroll>
  );
}

export default InsuranceRequestsScreen;
