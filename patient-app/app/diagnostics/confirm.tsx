import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, type Href } from 'expo-router';

import { Button, Card, Chip, EmptyState, FIcon, Radio } from '../../../packages/ui-native/src';
import { ConsultScreen, Section } from '../../src/components/consult/ConsultKit';
import { AmountLine, Block, LAB_TONE, Price, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { useOrderDates } from '../../src/components/ordering/OrderingKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { cartIdsToClear } from '../../src/utils/singleOrder';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';
import { parseOrders, type MedicalOrder } from '../../src/utils/medicalOrders';
import { providerName, type OrderingMode } from '../../src/utils/ordering';
import {
  bookingErrorKey, clearDraft, createBookings, eligibleOrders, getDraft, groupsMissingPick, groupsMissingTime, paymentErrorKey, paymentMethodsFor,
  type BookingDocument, type CreatedGroup, type PaymentMethod,
} from '../../src/utils/orderingBooking';
import { statusHref } from '../../src/utils/orderingStatus';
import { insuredShare } from '../../src/utils/differentiators';
import { paymentIntentHeaders } from '../../src/utils/payment-idempotency';

const DAY_OPTS: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
const HOUR_OPTS: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

/**
 * Ord07: confirm and pay. Items, place, staff-gender preference, the server's price lines, the doctor's order (attached from "my
 * medical orders" or uploaded; required with insurance), then POST /ordering/bookings (one booking per split group, made from the
 * server quote: the body carries ids and picks, never a price) and the payment of each card booking through POST /payments/intent/lab/:id
 * and the shared /payments/result screen. Every amount shown is a field of the server's answer.
 */
export default function DiagnosticsConfirm() {
  const { theme, t, c, k, money, flow, lang } = useScreenUi();
  const { fmtDate, fmtTime } = useOrderDates();
  const { items: cartItems, removeItem } = useDiagnosticsCart();
  const draft = getDraft();
  const methods = draft ? paymentMethodsFor(draft.payer, draft.quote.groups) : [];
  const [method, setMethod] = useState<PaymentMethod>(methods[0] ?? 'card');
  const [gender, setGender] = useState<'female' | 'male' | null>(null);
  const [orders, setOrders] = useState<MedicalOrder[]>([]);
  const [ordersState, setOrdersState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [docs, setDocs] = useState<BookingDocument[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreatedGroup | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState<string | null>(null);
  const [payError, setPayError] = useState('');
  const lock = useRef(false);
  const payLock = useRef(false);
  const keys = useRef<Record<string, Record<string, string>>>({});

  const insured = draft?.payer === 'insurance';
  const catalogIds = draft ? draft.quote.groups.flatMap((g) => g.items.map((i) => i.catalog_id)) : [];

  const loadOrders = useCallback(async () => {
    if (!insured) return;
    setOrdersState('loading');
    try {
      setOrders(parseOrders(await apiFetch<unknown>('/medical-orders/mine')));
      setOrdersState('ready');
    } catch (err) {
      logError('ordering:medical-orders', err);
      setOrdersState('error');
    }
  }, [insured]);
  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  if (!draft || groupsMissingPick(draft).length > 0 || groupsMissingTime(draft).length > 0) {
    return (
      <ConsultScreen testID="diagnostics-confirm" title={k('ordering.pay.title')} onBack={goBackDiag}>
        <EmptyState icon="test-tube" tone={LAB_TONE} title={k('ordering.when.noDraft')} actionLabel={k('ordering.common.back')} onAction={goBackDiag} theme={theme} />
      </ConsultScreen>
    );
  }

  const eligible = eligibleOrders(orders, catalogIds);
  const hasEvidence = orderId !== null || docs.length > 0;
  const needsEvidence = insured && !hasEvidence;
  const hasHome = draft.quote.groups.some((g) => g.mode === 'home');
  const picks = draft.quote.groups.map((g) => ({ g, p: draft.picks[g.mode]! }));
  const dueSum = Math.round(picks.reduce((s, x) => s + x.p.row.total, 0) * 100) / 100;
  const allBest = picks.every((x) => x.p.best);
  // The booking's insured line: the server's estimate from the card's copay % and cap, else only the acceptance (owner decision 2026-10-24).
  const share = insuredShare(picks.map((x) => x.p.estimatedShare ?? null));
  const notCovered = picks.some((x) => x.p.items.some((i) => i.coverage === 'not_covered'));
  const nameOf = (id: string) => draft.names?.[id] || cartItems.find((i) => i.id === id)?.name || names[id] || '';
  const when = (m: OrderingMode): string => {
    const x = draft.times[m];
    if (!x) return '';
    return x.type === 'walk_in' ? k('ordering.when.modeWalk') : `${fmtDate(x.start, DAY_OPTS)} · ${fmtTime(x.start, HOUR_OPTS)} – ${fmtTime(x.end, HOUR_OPTS)}`;
  };

  async function pickFile(source: 'camera' | 'gallery') {
    setError('');
    try {
      const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        setError(k('ordering.pay.permDenied'));
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, quality: 0.8, base64: true };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      const b64 = !result.canceled ? result.assets?.[0]?.base64 : null;
      if (b64) {
        setOrderId(null);
        setDocs([{ kind: 'doctor_request', url_or_b64: `data:image/jpeg;base64,${b64}` }]);
      }
    } catch (err) {
      logError('ordering:attach', err);
      setError(k('ordering.err.generic'));
    }
  }

  async function submit() {
    if (!draft || lock.current || needsEvidence) return;
    lock.current = true; // one request per tap sequence: no double submit, the quote itself is single-use on the server
    setSubmitting(true);
    setError('');
    try {
      const known = Object.fromEntries(catalogIds.map((id) => [id, nameOf(id)]));
      const result = await createBookings(draft, { paymentMethod: method, genderPreference: hasHome ? gender : null, medicalOrderId: orderId, documents: orderId ? [] : docs });
      setNames(known);
      setCreated(result);
      // a one-item order ("Order now") never touched the cart, so the cart keeps its lines
      for (const id of cartIdsToClear(draft, catalogIds)) {
        const line = cartItems.find((i) => i.id === id);
        if (line) await removeItem(id, line.kind);
      }
      clearDraft();
    } catch (err) {
      logError('ordering:book', err);
      setError(k(bookingErrorKey(err)));
      lock.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  async function pay(bookingId: string) {
    if (payLock.current) return;
    payLock.current = true;
    setPaying(bookingId);
    setPayError('');
    try {
      const headers = (keys.current[bookingId] ??= paymentIntentHeaders('lab', bookingId)); // the same key on a retry of this booking
      const intent = await apiFetch<{ id?: string; checkout_url?: string; amount?: number; data?: { id?: string; checkout_url?: string; amount?: number } }>(`/payments/intent/lab/${bookingId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const txn = intent?.data || intent;
      if (!txn?.id) throw new Error('payment_intent_missing');
      router.replace({
        pathname: '/payments/result',
        params: { moyasarId: String(txn.id), paymentUrl: txn.checkout_url || '', bookingId, bookingKind: 'lab', amount: String(txn.amount ?? '') },
      } as unknown as Href);
    } catch (err) {
      logError('ordering:pay', err);
      setPayError(k(paymentErrorKey()));
    } finally {
      payLock.current = false;
      setPaying(null);
    }
  }

  // ---- created: the server's bookings and totals; card bookings are paid one by one ----
  if (created) {
    return (
      <ConsultScreen testID="diagnostics-confirm" title={k('ordering.pay.createdTitle')} onBack={() => router.replace(statusHref(created.bookings.map((b) => b.id)) as Href)}>
        <Notice tone="info" text={method === 'card' ? k('ordering.pay.createdCard') : k('ordering.pay.createdOther')} />
        {created.bookings.map((b) => (
          <Section key={b.id} title={b.mode === 'home' ? k('ordering.match.homeVisit') : k('ordering.match.atCentre')}>
            <Block gap={6}>
              {b.items.map((i) => (
                <AmountLine key={i.catalog_id} label={nameOf(i.catalog_id) || k('ordering.pay.item')} amount={i.price} />
              ))}
              <AmountLine label={k('ordering.pay.lTotal')} amount={b.total} strong />
              {b.status === 'awaiting_approval' ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.pay.dispatchHome')}</Text> : null}
              {method === 'card' ? (
                <Button theme={theme} size="lg" fullWidth loading={paying === b.id} disabled={paying !== null} label={k('ordering.pay.btnPay', { a: money(b.total) })} onPress={() => void pay(b.id)} />
              ) : null}
              <Button theme={theme} size="md" variant="outline" label={k('ordering.pay.viewOrder')} onPress={() => router.replace(statusHref(created.bookings.map((x) => x.id), b.id) as Href)} />
            </Block>
          </Section>
        ))}
        {created.amount !== null ? <AmountLine label={k('ordering.pay.lTotal')} amount={created.amount} strong /> : null}
        {payError ? <Notice tone="danger" text={`${payError}. ${k('ordering.pay.failSub')}`} /> : null}
      </ConsultScreen>
    );
  }

  const footer = (
    <>
      <Button
        theme={theme}
        size="lg"
        fullWidth
        loading={submitting}
        disabled={needsEvidence || submitting}
        label={needsEvidence ? k('ordering.pay.btnOff') : method === 'card' ? k('ordering.pay.btnContinue', { a: money(dueSum) }) : k('ordering.pay.btnConfirm')}
        onPress={() => void submit()}
      />
      <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('ordering.pay.secure')}</Text>
    </>
  );

  return (
    <ConsultScreen testID="diagnostics-confirm" title={k('ordering.pay.title')} onBack={goBackDiag} footer={footer}>
      {/* Ord07 board: one card per booking, the mode tile and provider on top with "Edit", then its items, the place and the time */}
      {picks.map(({ g, p }) => (
        <Card key={g.mode} theme={theme} padding="md">
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border.hairline }}>
              <FIcon icon={g.mode === 'home' ? 'house' : 'hospital'} tone={g.mode === 'home' ? 'mint' : 'violet'} size={44} theme={theme} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{g.mode === 'home' ? k('ordering.match.homeVisit') : k('ordering.match.atCentre')}</Text>
                <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{providerName(p.row, lang)}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={k('ordering.pay.edit')} onPress={() => router.push('/diagnostics/when' as Href)} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ ...scale(t, 'small', 'bold'), color: c.action.primary.bg }}>{k('ordering.pay.edit')}</Text>
              </Pressable>
            </View>
            {g.items.map((i) => {
              const line = p.items.find((l) => l.catalog_id === i.catalog_id);
              return (
                <View key={i.catalog_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <FIcon icon={g.mode === 'facility' && i.facility_only ? 'scan' : 'test-tube'} tone={g.mode === 'facility' && i.facility_only ? 'violet' : LAB_TONE} size={36} theme={theme} />
                  <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{nameOf(i.catalog_id) || k('ordering.pay.item')}</Text>
                  {line ? <Price amount={line.price} size="small" /> : null}
                </View>
              );
            })}
            <View style={{ gap: 2 }}>
              <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.pay.place')}</Text>
              <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{g.mode === 'home' ? draft.placeLine ?? '' : providerName(p.row, lang)}</Text>
            </View>
            <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{when(g.mode)}</Text>
          </View>
        </Card>
      ))}

      {hasHome ? (
        <Section title={k('ordering.pay.gender')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip theme={theme} label={k('ordering.pay.gAny')} selected={gender === null} onPress={() => setGender(null)} />
            <Chip theme={theme} label={k('ordering.pay.gF')} selected={gender === 'female'} onPress={() => setGender('female')} />
            <Chip theme={theme} label={k('ordering.pay.gM')} selected={gender === 'male'} onPress={() => setGender('male')} />
          </View>
        </Section>
      ) : null}

      <Section title={k('ordering.pay.order')}>
        {insured ? <Text style={{ ...scale(t, 'small', 'regular'), color: needsEvidence ? c.status.danger.fg : c.text.secondary, ...flow }}>{k('ordering.pay.orderReq')}</Text> : <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.pay.orderOpt')}</Text>}
        {insured && ordersState === 'error' ? <Notice tone="danger" text={k('ordering.err.generic')} actionLabel={k('ordering.common.retry')} onAction={() => void loadOrders()} /> : null}
        {insured && ordersState === 'ready' && eligible.length === 0 ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.pay.orderNone')}</Text> : null}
        {insured && eligible.length > 0 ? (
          <View style={{ borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, overflow: 'hidden', paddingHorizontal: 4 }}>
            {eligible.map((o, i) => (
              <Radio
                key={o.id}
                theme={theme}
                label={k('ordering.pay.orderValid', { d: fmtDate(o.valid_until, { day: 'numeric', month: 'short', year: 'numeric' }) })}
                selected={orderId === o.id}
                divider={i < eligible.length - 1}
                onChange={() => { setOrderId(o.id); setDocs([]); }}
              />
            ))}
          </View>
        ) : null}
        {insured ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button theme={theme} size="md" variant="outline" label={k('ordering.pay.orderPhoto')} onPress={() => void pickFile('camera')} />
            <Button theme={theme} size="md" variant="outline" label={k('ordering.pay.orderFile')} onPress={() => void pickFile('gallery')} />
          </View>
        ) : null}
        {docs.length > 0 ? <Text style={{ ...scale(t, 'meta', 'bold'), color: c.status.success.fg, ...flow }}>{k('ordering.pay.orderUploaded')}</Text> : null}
      </Section>

      <Section title={k('ordering.pay.lines')}>
        <Block gap={8}>
          {picks.map(({ g, p }) => (
            <View key={g.mode} style={{ gap: 6 }}>
              {p.items.map((i) => (
                <AmountLine key={i.catalog_id} label={nameOf(i.catalog_id) || k('ordering.pay.item')} amount={i.price} />
              ))}
              {p.best && g.mode === 'home' ? <AmountLine label={k('ordering.pay.lFee')} amount={Math.round((p.row.total - p.items.reduce((s, i) => s + i.price, 0)) * 100) / 100} /> : null}
              {!p.best ? <AmountLine label={g.mode === 'home' ? k('ordering.match.homeVisit') : k('ordering.match.atCentre')} amount={p.row.total} /> : null}
            </View>
          ))}
          {insured && allBest ? <AmountLine label={k('ordering.pay.lIns')} amount={picks.reduce((s, x) => s + (x.p.insuranceShare ?? 0), 0)} success minus /> : null}
          <AmountLine label={k('ordering.pay.lTotal')} amount={insured && allBest ? picks.reduce((s, x) => s + (x.p.patientShare ?? 0), 0) : dueSum} strong />
          {insured ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.pay.estNote')}</Text> : null}
          {insured ? (
            share.kind === 'estimate' ? (
              <Text testID="insured-share-estimate" style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{k('ordering.pay.estimatedShare', { amount: money(share.amount) })}</Text>
            ) : (
              <Text testID="insured-share-accepted" style={{ ...scale(t, 'small', 'medium'), color: c.text.secondary, ...flow }}>{k('ordering.pay.insuranceAccepted')}</Text>
            )
          ) : null}
          {notCovered ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.status.warning.fg, ...flow }}>{k('ordering.pay.cashNote')}</Text> : null}
        </Block>
      </Section>

      {insured && hasHome ? <Notice tone="info" text={k('ordering.pay.dispatchHome')} /> : null}
      <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.pay.locked')}</Text>

      {methods.length > 1 ? (
        <Section title={k('ordering.pay.method')}>
          <View style={{ borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, overflow: 'hidden', paddingHorizontal: 4 }}>
            {methods.map((m, i) => (
              <Radio key={m} theme={theme} label={m === 'cash' ? k('diag.pay.cash') : k('diag.pay.card')} selected={method === m} divider={i < methods.length - 1} onChange={() => setMethod(m)} />
            ))}
          </View>
        </Section>
      ) : null}

      {error ? <Notice tone="danger" text={error} /> : null}
    </ConsultScreen>
  );
}
