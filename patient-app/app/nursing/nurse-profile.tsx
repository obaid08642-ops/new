import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Radio } from '../../../packages/ui-native/src';
import { ConsultScreen, Gate, InfoRow, ResultHero, Section, Sheet, type GateStatus } from '../../src/components/consult/ConsultKit';
import { DayStrip, DoctorHead, SlotGrid, useDays, type SlotItem } from '../../src/components/consult/ConsultBooking';
import { AmountLine, Block, PlaceRow } from '../../src/components/diagnostics/DiagKit';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { apiFetch } from '../../src/utils/api';
import { dateLocaleFor } from '../../src/utils/dates';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { paymentIntentHeaders } from '../../src/utils/payment-idempotency';
import { formatAddressLine, resolveEffectiveAddress } from '../../src/utils/selectedAddress';

type Rec = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');

// 24h canonical slots; the label is formatted for the language (Intl)
const TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00'];
const DAY_COUNTS = Array.from({ length: 20 }, (_, i) => i + 1);

/**
 * The booking page of one nurse (board DoctorFull, booking part): who it is, the day, time and number of days, where
 * the visit is and how the nurse gets there, the payment summary and the one action. HIGH care: the booking, the
 * insurance request and the payment hand-off are exactly what they were; only the look changed.
 */
export default function NursingMegaProfile() {
  const { theme, t, c, k, lang, num, money, flow: textFlow } = useScreenUi();
  const { nurseId, flow, serviceId } = useLocalSearchParams<{ nurseId?: string; flow?: string; serviceId?: string }>();
  const locale = dateLocaleFor(lang);
  const days = useDays(30);

  const [nurse, setNurse] = useState<Rec | null>(null);
  const [insuranceData, setInsuranceData] = useState<Rec | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');
  const [processing, setProcessing] = useState(false);
  const [insuranceSent, setInsuranceSent] = useState<string | boolean>(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [selectedTime, setSelectedTime] = useState(TIMES[0]);
  const [daysCount, setDaysCount] = useState(1);
  const [frequencyOpen, setFrequencyOpen] = useState(false);
  const [transportMode, setTransportMode] = useState<'patient' | 'nurse'>('nurse');
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

  const slots: SlotItem[] = TIMES.map((id) => {
    const [h, m] = id.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return { id, label: new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', numberingSystem: 'latn' }).format(d), available: true };
  });

  // Financial calculation: the real price only; the backend recomputes the total from the service record
  const basePrice = Number(nurse?.price);
  const priced = Number.isFinite(basePrice) && nurse?.price !== null && nurse?.price !== undefined;
  const totalServiceFee = basePrice * daysCount; // an estimate shown to the patient

  const handleSubmit = async () => {
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
      // selectedDate = YYYY-MM-DD, selectedTime = "08:00": a real ISO timestamp
      const timeMatch = (selectedTime || '').match(/(\d{1,2}):(\d{2})/);
      const hours = timeMatch ? parseInt(timeMatch[1], 10) : 9;
      const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 0;
      const scheduled = new Date(`${selectedDate}T00:00:00`);
      scheduled.setHours(hours, minutes, 0, 0);
      const payload = {
        provider_id: nurseId,
        service_id: serviceId || undefined,
        service_name_ar: nurse?.service_name_ar || undefined,
        scheduled_at: scheduled.toISOString(),
        // with coordinates: the nurse navigates to it and the arrival geofence checks against it
        address: {
          address: addressObj ? formatAddressLine(addressObj) : undefined,
          city: addressObj?.city || undefined,
          district: addressObj?.district || undefined,
          lat: Number.isFinite(Number(addressObj?.lat)) ? Number(addressObj?.lat) : undefined,
          lng: Number.isFinite(Number(addressObj?.lng)) ? Number(addressObj?.lng) : undefined,
        },
        payment_method: flow === 'insurance' ? 'insurance' : 'card',
      };
      // POST /nursing/bookings is the patient booking contract (P6-D): the legacy /home-care/bookings path never existed server-side.
      const res = await apiFetch<Rec>('/nursing/bookings', { method: 'POST', body: JSON.stringify(payload) });
      const bookingId = res?.id || res?.booking_id;
      if (flow === 'insurance') {
        setInsuranceSent(bookingId ? String(bookingId) : true);
      } else if (bookingId) {
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
            return;
          }
        } catch (payErr) {
          showLocalizedAlert(k('nur.book.payFailTitle'), (payErr as { message?: string } | null)?.message || k('nur.book.payFailBody'));
        }
        router.replace({ pathname: '/nursing/live-tracking', params: { type: transportMode, bookingId } } as unknown as Href);
      } else {
        showLocalizedAlert(k('nur.book.sentTitle'), k('nur.book.sentBody'), [{ text: k('nur.ok'), onPress: () => router.back() }]);
      }
    } catch (err) {
      showLocalizedAlert(k('nur.book.failTitle'), (err as { message?: string } | null)?.message || k('nur.book.failBody'));
    } finally {
      setProcessing(false);
    }
  };

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
        disabled={processing || !selectedTime}
        label={flow === 'insurance' ? k('nur.book.sendInsurance') : priced ? k('nur.book.confirmPrice', { amount: money(totalServiceFee), currency: k('pharmacy.currency') }) : k('nur.book.confirm')}
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
          <SlotGrid slots={slots} value={selectedTime} onChange={setSelectedTime} loading={false} emptyText="" />
          <Pressable accessibilityRole="button" accessibilityLabel={`${k('nur.book.frequency')}: ${daysCount === 1 ? k('nur.book.once') : k('nur.book.everyDay', { n: num(daysCount) })}`} onPress={() => setFrequencyOpen(true)} style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, justifyContent: 'center', gap: 2, opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...textFlow }}>{k('nur.book.frequency')}</Text>
            <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...textFlow }}>{daysCount === 1 ? k('nur.book.once') : k('nur.book.everyDay', { n: num(daysCount) })}</Text>
          </Pressable>
        </Section>

        <Section title={k('nur.book.where')}>
          <Block gap={4}>
            <PlaceRow text={gpsLocation ?? k('nur.book.noAddress')} actionLabel={gpsLocation ? k('nur.book.change') : k('nur.book.choose')} onAction={() => router.push('/delivery/address-select' as Href)} />
            <View>
              <Radio theme={theme} label={k('nur.book.nurseTransport')} selected={transportMode === 'nurse'} divider onChange={() => setTransportMode('nurse')} />
              <Radio theme={theme} label={k('nur.book.myTransport')} selected={transportMode === 'patient'} onChange={() => setTransportMode('patient')} />
            </View>
            <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...textFlow }}>{transportMode === 'nurse' ? (gpsLocation ? k('nur.book.nurseTransportTo', { address: gpsLocation }) : k('nur.book.nurseTransportBody')) : k('nur.book.myTransportBody')}</Text>
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
                  <AmountLine label={k('nur.book.visitPrice')} amount={basePrice} />
                  <InfoRow label={k('nur.book.daysCount')} value={num(daysCount)} />
                  <AmountLine label={k('nur.book.estimate')} amount={totalServiceFee} strong />
                </>
              ) : (
                <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...textFlow }}>{k('nur.details.priceAtBooking')}</Text>
              )}
              <Notice tone="info" text={k('nur.book.cashNote')} />
            </Block>
          )}
        </Section>
      </Gate>

      <Sheet open={frequencyOpen} title={k('nur.book.durationTitle')} onClose={() => setFrequencyOpen(false)} closeLabel={k('nur.close')}>
        <View>
          {DAY_COUNTS.map((n, i) => (
            <Radio
              key={n}
              theme={theme}
              label={n === 1 ? k('nur.book.once') : k('nur.book.consecutive', { n: num(n) })}
              selected={daysCount === n}
              divider={i < DAY_COUNTS.length - 1}
              onChange={() => {
                setDaysCount(n);
                setFrequencyOpen(false);
              }}
            />
          ))}
        </View>
      </Sheet>
    </ConsultScreen>
  );
}
