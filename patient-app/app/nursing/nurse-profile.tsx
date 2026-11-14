import { gatewayDownKey } from '../../src/utils/paymentGateway';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Radio } from '../../../packages/ui-native/src';
import { ConsultScreen, Gate, InfoRow, ResultHero, Section, Sheet, useConsultFormat, type GateStatus } from '../../src/components/consult/ConsultKit';
import { DayStrip, DoctorHead, SlotGrid, slotsEmptyKey, useDays } from '../../src/components/consult/ConsultBooking';
import { AmountLine, Block, PlaceRow } from '../../src/components/diagnostics/DiagKit';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { RefundPolicyTick } from '../../src/components/legal/RefundPolicyTick';
import { withRefundPolicy } from '../../src/utils/refundAcceptance';
import { HomeVisitTerms } from '../../src/components/nursing/HomeVisitTerms';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { paymentIntentHeaders } from '../../src/utils/payment-idempotency';
import { formatAddressLine, resolveEffectiveAddress } from '../../src/utils/selectedAddress';
import {
  choiceFields,
  choiceQuery,
  defaultChoice,
  normalizeChoice,
  optionErrorKey,
  parseNursingOptions,
  parseQuote,
  type NursingChoice,
  type NursingOptions,
  type NursingQuote,
} from '../../src/utils/nursingOptions';

type Rec = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');

/** One time of the nurse's home-visit schedule (GET /home-care/providers/:id/slots): `start` is the ISO instant. */
interface Slot { start: string; available?: boolean }
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

/** One choice field of the booking options: its label, the value shown, and the values the server offers. */
interface OptionField { id: 'recurrence' | 'times' | 'hours' | 'shift' | 'period' | 'days'; label: string; value: string; values: Array<{ id: string | number; label: string }>; current: string | number | undefined }

/**
 * The booking page of one nurse (board DoctorFull, booking part): who it is, the day, time and number of days, where
 * the visit is and how the nurse gets there, the payment summary and the one action. HIGH care: the booking, the
 * insurance request and the payment hand-off are exactly what they were; only the look changed.
 */
export default function NursingMegaProfile() {
  const { theme, t, c, k, num, money, flow: textFlow } = useScreenUi();
  const { nurseId, flow, serviceId } = useLocalSearchParams<{ nurseId?: string; flow?: string; serviceId?: string }>();
  const days = useDays(30);

  const [nurse, setNurse] = useState<Rec | null>(null);
  const [insuranceData, setInsuranceData] = useState<Rec | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');
  const [processing, setProcessing] = useState(false);
  // the refund policy is shown before the booking and agreed here (the backend refuses a booking without it)
  const [refundAgreed, setRefundAgreed] = useState(false);
  const [insuranceSent, setInsuranceSent] = useState<string | boolean>(false);
  // Journey 6: a booking created whose payment did not start. The next tap retries the payment for THIS booking
  // (never a second booking), and the patient is never sent to tracking while it is unpaid.
  const [unpaidBookingId, setUnpaidBookingId] = useState<string | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  // #642: the times are the nurse's own free slots for the chosen day; the id is the slot's ISO start.
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slotList, setSlotList] = useState<Slot[]>([]);
  const [slotsReason, setSlotsReason] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const { clock } = useConsultFormat();
  // What the service accepts (GET /home-care/services/:id); null = not loaded, so one single visit is booked as before.
  const [options, setOptions] = useState<NursingOptions | null>(null);
  const [choice, setChoice] = useState<NursingChoice>({});
  const [pickerId, setPickerId] = useState<OptionField['id'] | null>(null);
  const [gpsLocation, setGpsLocation] = useState<string | null>(null);
  const [addressObj, setAddressObj] = useState<Awaited<ReturnType<typeof resolveEffectiveAddress>>>(null);
  const selectedDate = days[dayIndex]?.iso ?? '';

  // The real selected / saved address, refreshed whenever the screen regains focus
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void resolveEffectiveAddress().then((a) => {
        if (!active) return;
        setAddressObj(a);
        setGpsLocation(a ? formatAddressLine(a) : null);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const nurseData = await apiFetch<Rec>(`/home-care/providers/${nurseId}${serviceId ? `?serviceId=${encodeURIComponent(String(serviceId))}` : ''}`);
      setNurse(nurseData);
      if (flow === 'insurance') {
        // Real coverage check (endpoint /home-care/insurance/verify does not exist)
        const insData = await apiFetch<Rec>(`/insurance/coverage-check?provider_id=${nurseId}&service_type=home_nursing`).catch(() => null);
        setInsuranceData(insData);
      }
      setStatus(nurseData ? 'ready' : 'error');
    } catch (err) {
      logError('nursing:nurse-profile', err);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [nurseId, serviceId, flow]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOptions(null);
    setChoice({});
    if (!serviceId) return;
    let active = true;
    apiFetch<Rec>(`/home-care/services/${encodeURIComponent(String(serviceId))}`)
      .then((res) => {
        const parsed = parseNursingOptions(res);
        if (!active || !parsed) return;
        setOptions(parsed);
        setChoice(defaultChoice(parsed));
      })
      .catch((err) => logError('nursing:nurse-profile:service', err));
    return () => { active = false; };
  }, [serviceId]);

  useEffect(() => {
    if (!nurseId || !selectedDate) return;
    let active = true;
    setLoadingSlots(true);
    setSelectedTime(null);
    setSlotList([]);
    setSlotsReason(null);
    apiFetch<{ slots?: Slot[]; reason?: string }>(`/home-care/providers/${encodeURIComponent(String(nurseId))}/slots?date=${selectedDate}`)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.slots) ? res.slots.filter((x) => typeof x?.start === 'string') : [];
        setSlotList(list);
        // the first free time is chosen, as the fixed list chose its first time before
        setSelectedTime(list.find((x) => x.available !== false)?.start ?? null);
        setSlotsReason(res?.reason || null);
      })
      .catch((err) => {
        logError('nursing:nurse-profile:slots', err);
        if (active) setSlotsReason('error');
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [nurseId, selectedDate]);

  const slots = slotList.map((x) => ({ id: x.start, label: clock(x.start), available: x.available !== false }));

  // The price is the server's: GET /bookings/quote states the price of one visit and the total of the days chosen, from the same
  // pricing function the booking charges by. Nothing is multiplied here; with no quote the screen says the price is set at booking.
  const [quote, setQuote] = useState<NursingQuote | null>(null);
  const quoteTail = choiceQuery(options, choice);
  useEffect(() => {
    if (!nurseId || !serviceId) { setQuote(null); return; }
    let active = true;
    apiFetch<Rec>(`/bookings/quote?kind=nursing&service_id=${encodeURIComponent(String(serviceId))}&provider_id=${encodeURIComponent(String(nurseId))}${quoteTail}`)
      .then((res) => { if (active) setQuote(parseQuote(res)); })
      .catch((err) => { logError('nursing:nurse-profile:quote', err); if (active) setQuote(null); });
    return () => { active = false; };
  }, [nurseId, serviceId, quoteTail]);
  const priced = quote !== null;

  /** Starts the card payment of a created booking; true when the patient was sent to the payment page. */
  const startPayment = async (bookingId: string): Promise<boolean> => {
    try {
      const intent = await apiFetch<Rec>(`/payments/intent/nursing/${bookingId}`, {
        method: 'POST',
        headers: paymentIntentHeaders('nursing', String(bookingId)),
        body: JSON.stringify({}),
      });
      const txn = ((intent as { data?: Rec } | null)?.data ?? intent) as Rec | null;
      if (txn?.id) {
        router.replace({
          pathname: '/payments/result',
          params: {
            moyasarId: String(txn.id),
            paymentUrl: str(txn.checkout_url),
            bookingId: String(bookingId),
            bookingKind: 'nursing',
            amount: String(txn.amount ?? ''),
          },
        } as unknown as Href);
        return true;
      }
      showLocalizedAlert(k('nur.book.payFailTitle'), k('nur.book.payFailBody'));
    } catch (payErr) {
      const down = gatewayDownKey(payErr);
      showLocalizedAlert(k('nur.book.payFailTitle'), down ? k(down) : (payErr as { message?: string } | null)?.message || k('nur.book.payFailBody'));
    }
    return false;
  };

  const handleSubmit = async () => {
    if (unpaidBookingId) {
      setProcessing(true);
      try {
        if (await startPayment(unpaidBookingId)) setUnpaidBookingId(null);
      } finally {
        setProcessing(false);
      }
      return;
    }
    if (!addressObj) {
      showLocalizedAlert(k('nur.book.addressTitle'), k('nur.book.addressBody'));
      return;
    }
    if (flow === 'insurance') {
      // Auto-fill from the saved insurance policy; redirect to add it when missing.
      try {
        const me = await apiFetch<{ insurance?: Rec; data?: { insurance?: Rec } }>('/users/me/profile');
        const ins = me?.insurance || me?.data?.insurance || null;
        if (!(ins && (ins.company_id || ins.provider || ins.policy_number))) {
          showLocalizedAlert(k('nur.book.insMissingTitle'), k('nur.book.insMissingBody'));
          router.push('/profile/insurance' as Href);
          return;
        }
      } catch {
        router.push('/profile/insurance' as Href);
        return;
      }
    }
    setProcessing(true);
    try {
      // selectedTime is the chosen slot's ISO start from the nurse's schedule
      if (!selectedTime) return;
      const scheduled = new Date(selectedTime);
      const payload = {
        provider_id: nurseId,
        service_id: serviceId || undefined,
        service_name_ar: nurse?.service_name_ar || undefined,
        scheduled_at: scheduled.toISOString(),
        // the choice exactly as the service offers it (recurrence / hours / shift / period / sessions); the server prices it
        ...choiceFields(options, choice),
        // with coordinates: the nurse navigates to it and the arrival geofence checks against it
        address: {
          address: addressObj ? formatAddressLine(addressObj) : undefined,
          city: addressObj?.city || undefined,
          district: addressObj?.district || undefined,
          short_address: addressObj?.short_address || undefined,
          lat: Number.isFinite(Number(addressObj?.lat)) ? Number(addressObj?.lat) : undefined,
          lng: Number.isFinite(Number(addressObj?.lng)) ? Number(addressObj?.lng) : undefined,
        },
        payment_method: flow === 'insurance' ? 'insurance' : 'card',
      };
      // POST /nursing/bookings is the patient booking contract (P6-D): the legacy /home-care/bookings path never existed server-side.
      const res = await apiFetch<Rec>('/nursing/bookings', { method: 'POST', body: JSON.stringify(withRefundPolicy(payload)) });
      const bookingId = res?.id || res?.booking_id;
      if (flow === 'insurance') {
        setInsuranceSent(bookingId ? String(bookingId) : true);
      } else if (bookingId) {
        if (!(await startPayment(String(bookingId)))) setUnpaidBookingId(String(bookingId));
      } else {
        showLocalizedAlert(k('nur.book.sentTitle'), k('nur.book.sentBody'), [{ text: k('nur.ok'), onPress: () => router.back() }]);
      }
    } catch (err) {
      const message = (err as { message?: string } | null)?.message;
      const codeKey = optionErrorKey(message);
      showLocalizedAlert(k('nur.book.failTitle'), codeKey ? k(codeKey) : message || k('nur.book.failBody'));
    } finally {
      setProcessing(false);
    }
  };

  // The fields come only from what the service offers; with no options there is nothing to choose (one visit).
  const fields: OptionField[] = [];
  if (options) {
    const n = normalizeChoice(options, choice);
    const cap = (id: string) => k(`nur.book.${id}`);
    if (options.mode === 'visit') {
      const rl = (r: string) => cap(`recurrence${r[0].toUpperCase()}${r.slice(1)}`);
      fields.push({ id: 'recurrence', label: k('nur.book.recurrence'), value: rl(n.recurrence!), current: n.recurrence, values: options.recurrence.map((r) => ({ id: r, label: rl(r) })) });
      if (n.recurrence !== 'once' && options.maxTimes > 1) {
        fields.push({ id: 'times', label: k('nur.book.times'), value: k('nur.book.timesN', { n: num(n.times!) }), current: n.times, values: range(options.maxTimes).map((x) => ({ id: x, label: k('nur.book.timesN', { n: num(x) }) })) });
      }
    } else if (options.mode === 'programme') {
      fields.push({ id: 'times', label: k('nur.book.sessions'), value: k('nur.book.sessionsN', { n: num(n.times!) }), current: n.times, values: options.sessions.map((x) => ({ id: x, label: k('nur.book.sessionsN', { n: num(x) }) })) });
    } else {
      const pl = (p: string) => cap(`period${p[0].toUpperCase()}${p.slice(1)}`);
      const sl = (x: string) => cap(`shift${x[0].toUpperCase()}${x.slice(1)}`);
      fields.push({ id: 'hours', label: k('nur.book.hours'), value: k('nur.book.hoursN', { n: num(n.hours!) }), current: n.hours, values: options.hours.map((x) => ({ id: x, label: k('nur.book.hoursN', { n: num(x) }) })) });
      fields.push({ id: 'shift', label: k('nur.book.shift'), value: sl(n.shift!), current: n.shift, values: options.shift.map((x) => ({ id: x, label: sl(x) })) });
      fields.push({ id: 'period', label: k('nur.book.period'), value: pl(n.period!), current: n.period, values: options.period.map((x) => ({ id: x, label: pl(x) })) });
      if (n.period === 'days') {
        fields.push({ id: 'days', label: k('nur.book.days'), value: k('nur.book.daysN', { n: num(n.days!) }), current: n.days, values: range(options.maxDays).map((x) => ({ id: x, label: k('nur.book.daysN', { n: num(x) }) })) });
      }
    }
  }
  const picker = fields.find((f) => f.id === pickerId) ?? null;

  const crumbs: string[] = [str(nurse?.facility)].filter(Boolean);
  const reviews = Array.isArray(nurse?.reviews) ? (nurse?.reviews as Rec[]) : [];
  const review = reviews[0];
  const reviewCount = Number(nurse?.reviews_count);

  if (insuranceSent) {
    return (
      <ConsultScreen
        testID="nursing-booking-sent"
        title={k('nur.book.title')}
        footer={
          <>
            {typeof insuranceSent === 'string' ? <Button theme={theme} size="lg" fullWidth label={k('nur.book.followApproval')} onPress={() => router.push({ pathname: '/nursing/insurance-status', params: { bookingId: insuranceSent } } as unknown as Href)} /> : null}
            <Button theme={theme} size="lg" fullWidth variant="outline" label={k('nur.book.home')} onPress={() => router.push('/(tabs)' as Href)} />
          </>
        }
      >
        <ResultHero icon="check-circle" tone="success" title={k('nur.book.inReview')} body={k('nur.book.inReviewBody')} />
      </ConsultScreen>
    );
  }

  const footer =
    status === 'ready' ? (
      <Button
        theme={theme}
        size="lg"
        fullWidth
        loading={processing}
        disabled={processing || !selectedTime || !refundAgreed}
        label={flow === 'insurance' ? k('nur.book.sendInsurance') : priced ? k('nur.book.confirmPrice', { amount: money(quote!.total), currency: k('pharmacy.currency') }) : k('nur.book.confirm')}
        onPress={() => void handleSubmit()}
      />
    ) : undefined;

  return (
    <ConsultScreen testID="nursing-nurse-profile" title={k('nur.book.title')} footer={footer} onRefresh={() => void load()}>
      <Gate status={status} onRetry={() => void load()}>
        <DoctorHead name={str(nurse?.name)} line={crumbs.join(' · ')} rating={Number.isFinite(Number(nurse?.rating)) ? Number(nurse?.rating) : null} count={Number.isFinite(reviewCount) && reviewCount > 0 ? reviewCount : null} />
        {nurse?.degree || review ? (
          <Block gap={10}>
            {nurse?.degree ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Glyph name="identification-card" size={18} color={c.icon.secondary} />
                <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'small', 'medium'), color: c.text.primary, ...textFlow }}>{str(nurse.degree)}</Text>
              </View>
            ) : null}
            {review ? <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...textFlow }}>{`${str(review.user)}: “${str(review.text)}”`}</Text> : null}
          </Block>
        ) : null}

        <Section title={k('nur.book.when')}>
          <DayStrip days={days} value={dayIndex} onChange={setDayIndex} label={k('nur.book.day')} />
          <SlotGrid slots={slots} value={selectedTime} onChange={setSelectedTime} loading={loadingSlots} emptyText={k(slotsEmptyKey(slotsReason))} />
          {fields.map((f) => (
            <Pressable key={f.id} accessibilityRole="button" accessibilityLabel={`${f.label}: ${f.value}`} onPress={() => setPickerId(f.id)} style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, justifyContent: 'center', gap: 2, opacity: pressed ? 0.85 : 1 })}>
              <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...textFlow }}>{f.label}</Text>
              <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...textFlow }}>{f.value}</Text>
            </Pressable>
          ))}
        </Section>

        <Section title={k('nur.book.where')}>
          <Block gap={4}>
            <PlaceRow text={gpsLocation ?? k('nur.book.noAddress')} actionLabel={gpsLocation ? k('nur.book.change') : k('nur.book.choose')} onAction={() => router.push('/profile/addresses?select=1' as Href)} />
            {/* owner decision 42 (issue 641): no transport choice; the nurse always comes to the patient and the trip fee applies */}
            <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...textFlow }}>{gpsLocation ? k('nur.book.nurseTransportTo', { address: gpsLocation }) : k('nur.book.nurseTransportBody')}</Text>
          </Block>
        </Section>

        <Section title={flow === 'insurance' ? k('nur.book.payInsurance') : k('nur.book.payCash')}>
          {flow === 'insurance' ? (
            <Block gap={4}>
              <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...textFlow }}>{k('nur.book.insFetched')}</Text>
              <InfoRow label={k('nur.book.company')} value={str(insuranceData?.provider)} />
              <InfoRow label={k('nur.book.policy')} value={str(insuranceData?.policy)} last />
              <Notice tone="info" text={k('nur.book.insNote')} />
            </Block>
          ) : (
            <Block gap={10}>
              {priced ? (
                <>
                  <AmountLine label={k('nur.book.unitPrice')} amount={quote!.unit} />
                  {quote!.billableUnits !== null ? <InfoRow label={k('nur.book.billableUnits')} value={num(quote!.billableUnits)} /> : null}
                  <AmountLine label={k('nur.book.estimate')} amount={quote!.total} strong />
                </>
              ) : (
                <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...textFlow }}>{k('nur.details.priceAtBooking')}</Text>
              )}
              <Notice tone="info" text={k('nur.book.cashNote')} />
            </Block>
          )}
          {/* journeys 66 (decision 26): the cancellation terms are shown before payment */}
          <HomeVisitTerms />
          <RefundPolicyTick service="nursing" checked={refundAgreed} onChange={setRefundAgreed} />
        </Section>
      </Gate>

      <Sheet open={picker !== null} title={picker?.label ?? ''} onClose={() => setPickerId(null)} closeLabel={k('nur.close')}>
        <View>
          {(picker?.values ?? []).map((v, i, all) => (
            <Radio
              key={String(v.id)}
              theme={theme}
              label={v.label}
              selected={picker?.current === v.id}
              divider={i < all.length - 1}
              onChange={() => {
                if (picker && options) setChoice((prev) => normalizeChoice(options, { ...prev, [picker.id]: v.id }));
                setPickerId(null);
              }}
            />
          ))}
        </View>
      </Sheet>
    </ConsultScreen>
  );
}
