import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Chip, EmptyState, Radio } from '../../../packages/ui-native/src';
import { ConsultScreen, Section } from '../../src/components/consult/ConsultKit';
import { AmountLine, Block, LAB_TONE, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';
import { dateLocaleFor } from '../../src/utils/dates';

const TIMES = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'];

/** Day, time and payment of a labs / radiology booking, then the booking itself (board CheckoutV2; the booking and payment calls are unchanged). */
export default function DiagnosticsCheckoutScreen() {
  const { theme, t, c, k, lang, num, flow } = useScreenUi();
  const params = useLocalSearchParams<{ serviceType?: string; labId?: string; labName?: string }>();
  const location = params.serviceType === 'clinic' ? 'clinic' : 'home';
  const { items, clearCart, total } = useDiagnosticsCart();
  const [dayOffset, setDayOffset] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [method, setMethod] = useState<'card' | 'cash' | 'insurance'>(location === 'home' ? 'card' : 'cash');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const days = useMemo(() => {
    const out: { label: string; iso: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      out.push({
        label: new Intl.DateTimeFormat(dateLocaleFor(lang), { weekday: 'long', day: 'numeric', month: 'numeric', numberingSystem: 'latn' }).format(d),
        iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const allowedMethods: Array<'card' | 'cash' | 'insurance'> = location === 'home' ? ['card', 'insurance'] : ['cash', 'card', 'insurance'];

  async function submit() {
    if (!items.length) return;
    if (!params.labId) {
      setError(k('diag.checkout.pickLab'));
      return;
    }
    if (!time) {
      setError(k('diag.checkout.pickTime'));
      return;
    }
    if (method === 'insurance') {
      if (!time) {
        setError(k('diag.checkout.pickTime'));
        return;
      }
      router.push({
        pathname: '/diagnostics/insurance-upload',
        params: {
          labId: String(params.labId),
          labName: params.labName || '',
          serviceType: location,
          dayIso: days[dayOffset].iso,
          time,
        },
      } as unknown as Href);
      return;
    }
    const [h, m] = time.split(':').map(Number);
    const scheduled = new Date(`${days[dayOffset].iso}T00:00:00`);
    scheduled.setHours(h, m, 0, 0);
    if (scheduled.getTime() < Date.now()) {
      setError(k('diag.checkout.past'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const labItems = items.filter((it) => it.kind !== 'radiology');
      const radioItems = items.filter((it) => it.kind === 'radiology');
      let bookingId: string | null = null;
      if (labItems.length) {
        const created = await apiFetch<{ id?: string; booking_id?: string; data?: { id?: string } }>('/labs/bookings', {
          method: 'POST',
          body: JSON.stringify({
            items: labItems.map((it) => ({ service_id: it.id })),
            scheduled_at: scheduled.toISOString(),
            location_type: location === 'home' ? 'home' : 'facility',
            payment_method: method,
            provider_account_id: String(params.labId),
          }),
        });
        bookingId = created?.id || created?.booking_id || created?.data?.id || null;
      }
      for (const it of radioItems) {
        const created = await apiFetch<{ id?: string; booking_id?: string; data?: { id?: string } }>('/radiology/bookings', {
          method: 'POST',
          body: JSON.stringify({
            service_id: it.id,
            scheduled_at: scheduled.toISOString(),
            location_type: location === 'home' ? 'home' : 'facility',
            payment_method: method,
            provider_account_id: String(params.labId),
          }),
        });
        if (!bookingId) bookingId = created?.id || created?.booking_id || created?.data?.id || null;
      }
      await clearCart();
      if (bookingId) {
        if (method === 'card') {
          const kind = labItems.length ? 'lab' : 'radiology';
          try {
            const { paymentIntentHeaders } = await import('../../src/utils/payment-idempotency');
            const intent = await apiFetch<{ id?: string; checkout_url?: string; amount?: number; data?: { id?: string; checkout_url?: string; amount?: number } }>(`/payments/intent/${kind}/${bookingId}`, {
              method: 'POST',
              headers: paymentIntentHeaders(kind, String(bookingId)),
              body: JSON.stringify({}),
            });
            const txn = intent?.data || intent;
            if (txn?.id) {
              router.replace({
                pathname: '/payments/result',
                params: {
                  moyasarId: String(txn.id),
                  paymentUrl: txn.checkout_url || '',
                  bookingId: String(bookingId),
                  bookingKind: kind,
                  amount: String(txn.amount ?? ''),
                },
              } as unknown as Href);
              return;
            }
          } catch (payErr: unknown) {
            const message = payErr instanceof Error ? payErr.message : '';
            setError(message || k('diag.checkout.payFailed'));
            showLocalizedAlert(k('diag.checkout.payFailed'), message || k('diag.checkout.payRetry'));
          }
        }
        router.replace({ pathname: '/diagnostics/order/[id]', params: { id: String(bookingId) } } as unknown as Href);
      } else {
        router.replace('/diagnostics/orders' as Href);
      }
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : '';
      setError(message || k('diag.checkout.failed'));
      showLocalizedAlert(k('diag.checkout.failed'), message || k('diag.checkout.failedBody'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!items.length) {
    return (
      <ConsultScreen testID="diagnostics-checkout" title={k('diag.checkout.title')} onBack={goBackDiag}>
        <EmptyState icon="test-tube" tone={LAB_TONE} title={k('diag.cart.emptyTitle')} actionLabel={k('diag.checkout.browse')} onAction={() => router.replace('/diagnostics/packages' as Href)} theme={theme} />
      </ConsultScreen>
    );
  }

  const methodLabel = (pm: 'card' | 'cash' | 'insurance') => (pm === 'cash' ? k('diag.pay.cash') : pm === 'card' ? k('diag.pay.card') : k('diag.pay.insurance'));

  const footer = (
    <>
      <AmountLine label={k('diag.cart.total')} amount={total} strong />
      <Button theme={theme} size="lg" fullWidth loading={submitting} label={method === 'insurance' ? k('diag.checkout.toInsurance') : k('diag.checkout.confirm')} onPress={() => void submit()} />
    </>
  );

  return (
    <ConsultScreen testID="diagnostics-checkout" title={k('diag.checkout.title')} onBack={goBackDiag} footer={footer}>
      <Block gap={4}>
        <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{params.labName || k('diag.checkout.chosenLab')}</Text>
        <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>
          {[location === 'home' ? k('diag.place.homeLab') : k('diag.place.visitLab'), k('diag.checkout.count', { n: num(items.length) })].join(' · ')}
        </Text>
      </Block>

      <Section title={k('diag.checkout.day')}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
            {days.map((d, i) => (
              <Chip key={d.iso} theme={theme} label={d.label} selected={dayOffset === i} onPress={() => setDayOffset(i)} />
            ))}
          </View>
        </ScrollView>
      </Section>

      <Section title={k('diag.checkout.time')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TIMES.map((tm) => (
            <Chip key={tm} theme={theme} label={new Intl.DateTimeFormat(dateLocaleFor(lang), { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' }).format(new Date(2000, 0, 1, Number(tm.slice(0, 2)), Number(tm.slice(3))))} selected={time === tm} onPress={() => setTime(tm)} />
          ))}
        </View>
      </Section>

      <Section title={k('diag.checkout.method')}>
        <View style={{ borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, overflow: 'hidden', paddingHorizontal: 4 }}>
          {allowedMethods.map((pm, i) => (
            <Radio key={pm} theme={theme} label={methodLabel(pm)} selected={method === pm} divider={i < allowedMethods.length - 1} onChange={() => setMethod(pm)} />
          ))}
        </View>
        {method === 'insurance' ? <Notice tone="info" text={k('diag.checkout.insuranceNote')} /> : null}
      </Section>

      {error ? <Notice tone="danger" text={error} /> : null}
    </ConsultScreen>
  );
}
