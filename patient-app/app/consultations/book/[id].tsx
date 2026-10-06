// app/consultations/book/[id].tsx — book an appointment: the visit type, the day and the time from the real slots
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, FIcon, Input } from '../../../../packages/ui-native/src';
import { DayStrip, DoctorHead, ModeTiles, SlotGrid, slotsEmptyKey, useDays, type ModeTile } from '../../../src/components/consult/ConsultBooking';
import { ConsultScreen, Gate, Section, useConsultFormat, visitMode, type GateStatus } from '../../../src/components/consult/ConsultKit';
import { step as scale, useScreenUi } from '../../../src/components/screen/ScreenKit';
import { showLocalizedAlert } from '../../../src/components/LocalizedAlert';
import { apiFetch } from '../../../src/utils/api';
import { isOffline } from '../../../src/utils/isOffline';
import { logError } from '../../../src/utils/logger';
import { pickLocalized } from '../../../src/utils/localize';
import { resolveEffectiveAddress, formatAddressLine } from '../../../src/utils/selectedAddress';

/**
 * Book an appointment — board BookingConfirm's step before the confirmation (canvas/BookingConfirm.dc.html), with the
 * DoctorFull day and time controls. The doctor is GET /care/doctors/:id, the times are GET /care/doctors/:id/slots for
 * the chosen day and visit type, and a home visit needs the selected address. "Continue" goes to booking-status with the
 * same params it always sent; nothing is booked on this page.
 */

interface Doctor {
  id: string;
  name_ar?: string;
  name_en?: string;
  title?: string;
  specialty?: string;
  photo_url?: string;
  rating_avg?: number;
  rating_count?: number;
  consultation_modes?: string[];
  price_clinic?: number;
  price_online?: number;
  price_home?: number;
}
interface Slot {
  start: string;
  available?: boolean;
}
type Address = NonNullable<Awaited<ReturnType<typeof resolveEffectiveAddress>>>;

function priceFor(doc: Doctor | null, vt: string): number | null {
  if (!doc) return null;
  const p = vt === 'clinic' ? doc.price_clinic : vt === 'video' ? doc.price_online : doc.price_home;
  return typeof p === 'number' && p > 0 ? p : null;
}

export default function BookAppointmentScreen() {
  const { theme, t, c, flow, k, money } = useScreenUi();
  const { clock } = useConsultFormat();
  const { id, visit_type } = useLocalSearchParams<{ id: string; visit_type?: string }>();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');

  const [visitType, setVisitType] = useState<string>('clinic');
  const [dayOffset, setDayOffset] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsReason, setSlotsReason] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [homeAddress, setHomeAddress] = useState<Address | null>(null);

  // Next 7 days (real dates)
  const days = useDays(7);

  // ── Load doctor ──────────────────────────────────────────────
  const loadDoctor = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await apiFetch<Doctor>(`/care/doctors/${encodeURIComponent(String(id || ''))}`);
      if (data && data.id) {
        setDoctor(data);
        const modes: string[] = Array.isArray(data.consultation_modes) && data.consultation_modes.length > 0 ? data.consultation_modes : ['clinic'];
        const preferred = visit_type && modes.includes(visit_type) ? visit_type : null;
        setVisitType(preferred || (modes.includes('clinic') ? 'clinic' : modes[0]));
        setStatus('ready');
      } else {
        setDoctor(null);
        setStatus('missing');
      }
    } catch (e) {
      logError('consultations:book:doctor', e);
      setDoctor(null);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [id, visit_type]);

  useEffect(() => {
    void loadDoctor();
  }, [loadDoctor]);

  // ── Load real slots whenever day / visit type changes ────────
  useEffect(() => {
    if (!doctor?.id) return;
    let active = true;
    (async () => {
      setLoadingSlots(true);
      setSelectedSlot(null);
      setSlots([]);
      setSlotsReason(null);
      try {
        const res = await apiFetch<{ slots?: Slot[]; reason?: string }>(`/care/doctors/${encodeURIComponent(doctor.id)}/slots?date=${days[dayOffset].iso}&service_type=${visitType}`);
        if (!active) return;
        setSlots(Array.isArray(res?.slots) ? res.slots : []);
        setSlotsReason(res?.reason || null);
      } catch {
        if (!active) return;
        setSlots([]);
        setSlotsReason('error');
      } finally {
        if (active) setLoadingSlots(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [doctor?.id, dayOffset, visitType, days]);

  // ── Home visit needs an address ──────────────────────────────
  useEffect(() => {
    if (visitType !== 'home') return;
    (async () => {
      setHomeAddress(await resolveEffectiveAddress());
    })();
  }, [visitType, dayOffset]);

  const modes: string[] = useMemo(() => (Array.isArray(doctor?.consultation_modes) && doctor.consultation_modes.length > 0 ? doctor.consultation_modes : ['clinic']), [doctor]);
  const tiles: ModeTile[] = modes.flatMap((m) => {
    const mode = visitMode(m);
    return mode ? [{ id: m, mode, price: priceFor(doctor, m) }] : [];
  });

  const price = priceFor(doctor, visitType);
  const canContinue = !!selectedSlot && !!doctor?.id && (visitType !== 'home' || !!homeAddress);

  const handleContinue = () => {
    if (!canContinue || !doctor) return;
    if (visitType === 'home' && !homeAddress) {
      showLocalizedAlert(k('consult.book.addressRequired'), k('consult.book.addressRequiredBody'));
      return;
    }
    router.push({
      pathname: '/consultations/booking-status',
      params: {
        doctorId: doctor.id,
        slot_start: selectedSlot,
        visitType,
        notes: notes.trim(),
        ...(visitType === 'home' && homeAddress ? { visit_lat: String(homeAddress.lat ?? ''), visit_lng: String(homeAddress.lng ?? ''), visit_address: formatAddressLine(homeAddress) } : {}),
      },
    } as unknown as Href);
  };

  const footer =
    status === 'ready' ? (
      <>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary }}>{k('consult.book.fee')}</Text>
          <Text style={{ ...scale(t, 'h4'), color: c.text.price }}>{price !== null ? `${money(price)} ${k('consult.currency')}` : '—'}</Text>
        </View>
        <Button label={selectedSlot ? k('consult.book.continue') : k('consult.book.pickSlot')} size="lg" fullWidth disabled={!canContinue} onPress={handleContinue} theme={theme} testID="book-continue" />
      </>
    ) : undefined;

  return (
    <ConsultScreen title={k('consult.book.title')} footer={footer} testID="book-screen">
      <Gate status={status} onRetry={() => void loadDoctor()} missingTitle={k('consult.doctor.missing')} missingBody={k('consult.doctor.missingBody')} errorTitle={k('consult.doctor.loadError')}>
        {doctor ? (
          <>
            <DoctorHead name={pickLocalized(doctor.name_ar, doctor.name_en) || ''} line={[doctor.title, doctor.specialty].filter(Boolean).join(' · ')} photo={doctor.photo_url} rating={doctor.rating_avg} count={doctor.rating_count} />

            <Section title={k('consult.book.visitType')}>
              <ModeTiles tiles={tiles} value={visitType} onChange={setVisitType} label={k('consult.book.visitType')} />
            </Section>

            <Section title={k('consult.book.day')}>
              <DayStrip days={days} value={dayOffset} onChange={setDayOffset} label={k('consult.book.day')} />
            </Section>

            <Section title={k('consult.book.times')}>
              <SlotGrid
                loading={loadingSlots}
                value={selectedSlot}
                onChange={setSelectedSlot}
                emptyText={k(slotsEmptyKey(slotsReason))}
                slots={slots.map((s) => ({ id: s.start, label: clock(s.start), available: Boolean(s.available) }))}
              />
            </Section>

            {visitType === 'home' ? (
              <Section title={k('consult.book.address')}>
                <Card theme={theme} padding="sm">
                  {homeAddress ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <FIcon icon="map-pin" tone="coral" size={40} theme={theme} />
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{homeAddress.label || k('consult.book.addressSelected')}</Text>
                        <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{formatAddressLine(homeAddress)}</Text>
                      </View>
                      <Pressable accessibilityRole="button" accessibilityLabel={k('consult.book.change')} onPress={() => router.push('/delivery/address-select' as Href)} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.link }}>{k('consult.book.change')}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Button label={k('consult.book.chooseAddress')} variant="outline" size="md" fullWidth startIcon="map-pin" onPress={() => router.push('/delivery/address-select' as Href)} theme={theme} />
                  )}
                </Card>
              </Section>
            ) : null}

            <Section title={k('consult.book.notes')}>
              <Input label={k('consult.book.notes')} placeholder={k('consult.book.notesPlaceholder')} value={notes} onChange={setNotes} multiline rows={4} theme={theme} testID="book-notes" />
            </Section>
          </>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
