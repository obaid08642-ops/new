import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { Button, FIcon, Input } from '../../../packages/ui-native/src';
import { Gate, Section, useConsultFormat, type GateStatus } from '../../src/components/consult/ConsultKit';
import { Notice } from '../../src/components/health/HealthKit';
import { INSURANCE_TONE, InsuranceScreen, KIND_LOOK } from '../../src/components/insurance/InsuranceKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';

interface Booking { kind: string; id: string; title: string; amount: number; date?: string }
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- six different booking shapes, read field by field below

/**
 * Submit a claim (board Insurance, merge map 2 keeps this screen): pick a paid booking (the lists are the ones this screen
 * always read), add a note and the receipt (POST /media/upload), POST /insurance/claims/submit with the same body as before.
 * The review time and the claim state are the server's; nothing is promised here.
 */
const CLAIM_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
const CLAIM_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export default function SubmitClaimScreen() {
  const { k, theme, t, c, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const [status, setStatus] = useState<GateStatus>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [note, setNote] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    const safe = async (p: Promise<unknown>) => { try { return await p; } catch { return null; } };
    const [appts, orders, pharmacyOrders, labs, rads, nursing] = await Promise.all([
      safe(apiFetch('/care/appointments')),
      safe(apiFetch('/orders/mine')),
      safe(apiFetch('/patient/pharmacy/orders')),
      safe(apiFetch('/labs/bookings/mine')),
      safe(apiFetch('/radiology/bookings/mine')),
      safe(apiFetch('/home-care/bookings/my')),
    ]);
    const arr = (x: unknown): Row[] => (Array.isArray(x) ? x : (x as Row | null)?.data || (x as Row | null)?.items || []);
    const paid = (row: Row) => ['paid', 'completed', 'delivered', 'reported', 'confirmed'].includes(String(row.payment_status || row.status || row.state || '').toLowerCase());
    const short = (id: unknown) => String(id).slice(0, 8);
    const out: Booking[] = [];
    for (const a of arr(appts)) if (paid(a)) out.push({ kind: 'consultation', id: a.id, title: a.doctor_name || k('insurance.kind.consultation'), amount: Number(a.total_price || a.price || 0), date: a.slot_start });
    for (const o of arr(orders)) if (paid(o)) out.push({ kind: 'pharmacy', id: o.id, title: k('insurance.claim.title.pharmacy', { id: short(o.id) }), amount: Number(o.total || 0), date: o.createdAt });
    for (const o of arr(pharmacyOrders)) if (paid(o)) out.push({ kind: 'pharmacy', id: o.id, title: k('insurance.claim.title.pharmacy', { id: short(o.id) }), amount: Number(o.totals?.total ?? o.total_price ?? 0), date: o.createdAt });
    for (const b of arr(labs)) if (paid(b)) out.push({ kind: 'lab', id: b.id, title: k('insurance.claim.title.lab', { id: short(b.id) }), amount: Number(b.total || 0), date: b.scheduled_at });
    for (const b of arr(rads)) if (paid(b)) out.push({ kind: 'radiology', id: b.id, title: k('insurance.claim.title.radiology', { id: short(b.id) }), amount: Number(b.total || b.price || 0), date: b.scheduled_at });
    for (const b of arr(nursing)) if (paid(b)) out.push({ kind: 'nursing', id: b.id, title: k('insurance.claim.title.nursing', { id: short(b.id) }), amount: Number(b.total || b.price || 0), date: b.scheduled_at });
    setBookings(out);
    setStatus('ready');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { void load(); }, [load]);

  const pickReceipt = async () => {
    setNotice(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      // Check the file on the device before uploading it (needs-review issue 828).
      const mime = (asset.mimeType || '').toLowerCase();
      if ((mime && !CLAIM_IMAGE_TYPES.includes(mime)) || (typeof asset.fileSize === 'number' && asset.fileSize > CLAIM_IMAGE_MAX_BYTES)) {
        setNotice({ tone: 'danger', text: k('insurance.claim.fileInvalid') });
        return;
      }
      setUploading(true);
      const formData = new FormData();
      formData.append('file', { uri: asset.uri, name: asset.fileName || 'receipt.jpg', type: asset.mimeType || 'image/jpeg' } as unknown as Blob);
      formData.append('folder', 'insurance-claims');
      const up = await apiFetch<{ url?: string; data?: { url?: string } }>('/media/upload', { method: 'POST', body: formData });
      const url = up?.url || up?.data?.url;
      if (url) setAttachmentUrl(url);
      else setNotice({ tone: 'danger', text: k('insurance.claim.uploadFailed') });
    } catch (err) {
      logError('insurance:submit-claim:upload', err);
      setNotice({ tone: 'danger', text: k('insurance.claim.uploadFailed') });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!selected || submitting) {
      if (!selected) setNotice({ tone: 'danger', text: k('insurance.claim.pickFirst') });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
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
      router.replace({ pathname: '/insurance', params: { tab: 'claims' } } as unknown as Href);
    } catch (err) {
      logError('insurance:submit-claim', err);
      setNotice({ tone: 'danger', text: k('insurance.claim.submitFailed') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <InsuranceScreen
      title={k('insurance.claim.title')}
      footer={<Button label={k('insurance.claim.submit')} size="lg" fullWidth loading={submitting} disabled={!selected || uploading} onPress={() => void submit()} theme={theme} testID="claim-submit" />}
      testID="insurance-submit-claim"
    >
      <Section title={k('insurance.claim.pickTitle')}>
        <Gate status={status} onRetry={() => void load()}>
          {bookings.length === 0 ? (
            <Notice tone="info" text={k('insurance.claim.noBookings')} testID="claim-none" />
          ) : (
            bookings.map((b) => {
              const active = selected?.id === b.id && selected?.kind === b.kind;
              const look = KIND_LOOK[b.kind] ?? KIND_LOOK.consultation;
              return (
                <Pressable
                  key={`${b.kind}-${b.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${k(look.key)}, ${b.title}`}
                  onPress={() => setSelected(b)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, padding: 12, borderRadius: 20, backgroundColor: c.bg.surface, borderWidth: active ? 2 : 1, borderColor: active ? c.border.strong : c.border.hairline }}
                >
                  <FIcon icon={look.icon} tone={INSURANCE_TONE} size={40} chip="soft" theme={theme} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={{ ...scale(t, 'body', 'bold'), color: c.text.primary, ...flow }}>{k(look.key)}</Text>
                    <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{`${b.title} · ${fmt.money(b.amount)} ${k('consult.currency')}`}</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </Gate>
      </Section>
      <Section title={k('insurance.claim.details')}>
        <Input label={k('insurance.claim.note')} value={note} onChange={setNote} multiline rows={3} theme={theme} testID="claim-note" />
        <Button label={attachmentUrl ? k('insurance.claim.attached') : k('insurance.claim.attach')} variant="outline" fullWidth loading={uploading} onPress={() => void pickReceipt()} theme={theme} testID="claim-attach" />
        {attachmentUrl ? <Image source={{ uri: attachmentUrl }} accessibilityLabel={k('insurance.claim.receiptImage')} style={{ width: '100%', height: 140, borderRadius: 12 }} resizeMode="cover" /> : null}
      </Section>
      {notice ? <Notice tone={notice.tone} text={notice.text} testID="claim-notice" /> : null}
    </InsuranceScreen>
  );
}
