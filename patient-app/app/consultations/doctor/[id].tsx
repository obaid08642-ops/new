import React, { useCallback, useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, FIcon } from '../../../../packages/ui-native/src';
import { DayStrip, ModeTiles, SlotGrid, slotsEmptyKey, useDays, type ModeTile } from '../../../src/components/consult/ConsultBooking';
import { ConsultScreen, Gate, Section, ShareGlyph, StatusTag, specialtyLook, useConsultFormat, visitMode, type GateStatus } from '../../../src/components/consult/ConsultKit';
import { Glyph } from '../../../src/components/pharmacy/PharmacyKit';
import { step as scale, tint, useScreenUi } from '../../../src/components/screen/ScreenKit';
import { apiFetch } from '../../../src/utils/api';
import { isOffline } from '../../../src/utils/isOffline';
import { logError } from '../../../src/utils/logger';
import { pickLocalized } from '../../../src/utils/localize';

/**
 * Doctor page — board DoctorFull (canvas/DoctorFull.dc.html) and docs/design/SPEC_PRODUCT_DOCTOR_DETAIL.md §B. The
 * doctor is GET /care/doctors/:id (a field the server did not send is not drawn: no sample, no zero), the times are
 * GET /care/doctors/:id/slots for the chosen day and visit type, and the cancellation figures of the questions come
 * from GET /system-config/public. The book button goes to the confirmation with the chosen slot, or to the booking page
 * to choose one, as before.
 */

interface Review {
  id?: string;
  rating?: number;
  text?: string;
  date?: string;
}
interface Doctor {
  id: string;
  slug?: string;
  name_ar?: string;
  name_en?: string;
  n?: string;
  title?: string;
  specialty?: string;
  sp?: string;
  photo_url?: string;
  img?: string;
  facility_id?: string;
  facility?: { name_ar?: string };
  hospital?: string;
  city?: string;
  district?: string;
  address?: string;
  is_online?: boolean;
  tags?: string[];
  consultation_modes?: string[];
  price_clinic?: number;
  price_online?: number;
  price_home?: number;
  bio?: string;
  biography?: string;
  sub_specialties?: string[];
  years_experience?: number;
  rating_avg?: number;
  rating_count?: number;
  clinic_images?: string[];
  facility_images?: string[];
  education?: string | Array<{ degree?: string; school?: string }>;
  languages?: string[];
  license_number?: string;
  scfhs_license_number?: string;
  /** The public card model (GET /care/doctors/:id): `verified` = admin-approved and licence-verified, the SCFHS number, `rating` / `reviews_count`, `clinicPhotos`. */
  verified?: boolean;
  scfhs_license_no?: string;
  rating?: number;
  reviews_count?: number;
  clinicPhotos?: string[];
  accepts_insurance?: boolean;
  reviews_data?: Review[];
}
interface Slot {
  start: string;
  available?: boolean;
}
interface Policy {
  cancellation_policy?: { full_hours?: number; half_hours?: number; half_refund_percent?: number };
}

export default function DoctorProfile() {
  const { theme, t, c, flow, lang, k, num } = useScreenUi();
  const { clock, date } = useConsultFormat();
  const { id, visit_type } = useLocalSearchParams<{ id: string; visit_type?: string }>();

  const [doc, setDoc] = useState<Doctor | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');
  // Cancellation numbers come from /system-config/public.
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [activeVt, setActiveVt] = useState(visit_type || 'clinic');
  const [day, setDay] = useState(0);
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
  const [bioOpen, setBioOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const days = useDays(30);

  const load = useCallback(async () => {
    setStatus('loading');
    apiFetch<Policy>('/system-config/public').then(setPolicy).catch(() => undefined);
    try {
      const data = await apiFetch<Doctor>(`/care/doctors/${encodeURIComponent(id || 'd1')}`);
      if (data && Object.keys(data).length > 0) {
        setDoc(data);
        // Auto-switch visit type if the doctor doesn't support the current one
        const modes = Array.isArray(data.consultation_modes) ? data.consultation_modes : [];
        if (modes.length > 0) {
          const current = (visit_type || 'clinic') === 'online' ? 'video' : visit_type || 'clinic';
          setActiveVt(modes.includes(current) ? current : modes[0]);
        }
        setStatus('ready');
      } else {
        setDoc(null);
        setStatus('missing');
      }
    } catch (e) {
      logError('consultations:doctor:details', e);
      setDoc(null);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [id, visit_type]);

  useEffect(() => {
    void load();
  }, [load]);

  // Real per-mode prices from the provider profile — no invented multipliers
  const getPrice = (type: string): number | null => {
    const vt = type === 'online' ? 'video' : type;
    const p = vt === 'clinic' ? doc?.price_clinic : vt === 'video' ? doc?.price_online : doc?.price_home;
    return typeof p === 'number' && p > 0 ? p : null;
  };

  // ── Real availability: slots for the selected day + visit type ──
  const [daySlots, setDaySlots] = useState<Slot[]>([]);
  const [slotsReason, setSlotsReason] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    if (!doc?.id) return;
    let active = true;
    (async () => {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const vt = activeVt === 'online' ? 'video' : activeVt;
        const res = await apiFetch<{ slots?: Slot[]; reason?: string }>(`/care/doctors/${encodeURIComponent(doc.id)}/slots?date=${days[day].iso}&service_type=${vt}`);
        if (!active) return;
        setDaySlots(Array.isArray(res?.slots) ? res.slots : []);
        setSlotsReason(res?.reason || null);
      } catch {
        if (!active) return;
        setDaySlots([]);
        setSlotsReason('error');
      } finally {
        if (active) setLoadingSlots(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [doc?.id, day, activeVt, days]);

  const handleShare = async () => {
    try {
      if (!doc?.id) return;
      const url = `https://app.nabdahplus.com/s/doctor/${doc.slug || doc.id}`;
      await Share.share({ message: k('consult.doc.shareMessage', { name: pickLocalized(doc.name_ar, doc.name_en) || '', url }), url });
    } catch (error) {
      logError('consultations:doctor', error);
    }
  };

  const cp = policy?.cancellation_policy;
  const faqs = [
    { q: k('consult.doc.faqCancelQ'), a: cp ? k('consult.doc.faqCancelA', { full: num(cp.full_hours ?? 0), half: num(cp.half_hours ?? 0), pct: num(cp.half_refund_percent ?? 0) }) : k('consult.doc.faqCancelGeneric') },
    { q: k('consult.doc.faqPayQ'), a: k('consult.doc.faqPayA') },
  ];

  const languageName = (code: string): string => {
    try {
      return new Intl.DisplayNames([lang], { type: 'language' }).of(code) || code;
    } catch {
      return code;
    }
  };

  const name = pickLocalized(doc?.name_ar, doc?.name_en) || doc?.n || '';
  const photo = doc?.img || doc?.photo_url;
  const facilityName = pickLocalized(doc?.facility?.name_ar, doc?.hospital);
  const place = [[doc?.district, doc?.city].filter(Boolean).join('، '), doc?.address].filter(Boolean).join(' · ');
  const bio = doc?.bio || doc?.biography || '';
  const modes = Array.isArray(doc?.consultation_modes) && doc.consultation_modes.length > 0 ? doc.consultation_modes : ['clinic', 'video', 'home'];
  const tiles: ModeTile[] = modes.flatMap((m) => {
    const mode = visitMode(m);
    return mode ? [{ id: m, mode, price: getPrice(m) }] : [];
  });
  const price = getPrice(activeVt);
  const look = specialtyLook(doc?.specialty || doc?.sp);
  const licenseNo = doc?.scfhs_license_no ?? doc?.scfhs_license_number;
  const ratingAvg = doc?.rating_avg ?? doc?.rating ?? 0;
  const ratingCount = doc?.rating_count ?? doc?.reviews_count ?? 0;
  const reviews = Array.isArray(doc?.reviews_data) ? doc.reviews_data : [];
  const education = doc?.education ? (Array.isArray(doc.education) ? doc.education.map((e) => `${e.degree} — ${e.school}`).join('\n') : String(doc.education)) : '';
  const info: Array<{ icon: 'file-text' | 'globe' | 'identification-card' | 'shield-check'; label: string; value: string }> = [
    ...(education ? [{ icon: 'file-text' as const, label: k('consult.doc.education'), value: education }] : []),
    ...(Array.isArray(doc?.languages) && doc.languages.length > 0 ? [{ icon: 'globe' as const, label: k('consult.doc.languages'), value: doc.languages.map(languageName).join('، ') }] : []),
    ...(licenseNo ? [{ icon: 'identification-card' as const, label: k('consult.doc.license'), value: licenseNo }] : []),
    ...(doc?.accepts_insurance ? [{ icon: 'shield-check' as const, label: k('consult.doc.insurance'), value: k('consult.doc.acceptsInsurance') }] : []),
  ];

  const book = () => {
    if (!doc) return;
    if (selectedSlot) router.push({ pathname: '/consultations/booking-status', params: { doctorId: doc.id, slot_start: selectedSlot, visitType: activeVt } } as unknown as Href);
    else router.push({ pathname: '/consultations/book/[id]', params: { id: doc.id, visit_type: activeVt } } as unknown as Href);
  };

  const footer =
    status === 'ready' && doc ? (
      <Button label={selectedSlot ? (price !== null ? k('consult.doc.confirmPrice', { price: `${num(price)} ${k('consult.currency')}` }) : k('consult.doc.confirm')) : k('consult.doc.book')} size="lg" fullWidth onPress={book} theme={theme} testID="doctor-book" />
    ) : undefined;

  return (
    <ConsultScreen
      title={k('consult.doc.title')}
      actions={doc ? [{ key: 'share', label: k('consult.doc.share'), icon: <ShareGlyph />, onPress: () => void handleShare() }] : undefined}
      footer={footer}
      gap={20}
      testID="doctor-screen"
    >
      <Gate status={status} onRetry={() => void load()} missingTitle={k('consult.doctor.missing')} missingBody={k('consult.doctor.missingBody')} errorTitle={k('consult.doctor.loadError')}>
        {doc ? (
          <>
            <Card theme={theme}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                {photo ? (
                  <Pressable accessibilityRole="imagebutton" accessibilityLabel={name} onPress={() => setPhotoOpen(true)}>
                    <Image accessibilityIgnoresInvertColors source={{ uri: photo }} resizeMode="cover" style={{ width: 120, height: 120, borderRadius: 40, backgroundColor: c.bg.media }} />
                  </Pressable>
                ) : (
                  <FIcon icon={look.icon} tone={look.tone} size={96} theme={theme} />
                )}
                {doc.is_online ? <StatusTag label={k('consult.doc.availableNow')} tone="success" /> : null}
                {doc.verified === true ? <StatusTag label={k('consult.doc.verified')} tone="info" /> : null}
                <Text accessibilityRole="header" style={{ ...scale(t, 'h2'), color: c.text.primary, textAlign: 'center' }}>{name}</Text>
                {[doc.title, doc.specialty || doc.sp].filter(Boolean).length > 0 ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{[doc.title, doc.specialty || doc.sp].filter(Boolean).join(' — ')}</Text> : null}
                {facilityName ? (
                  <Pressable accessibilityRole="link" accessibilityLabel={facilityName} onPress={() => doc.facility_id && router.push(`/consultations/clinic/${doc.facility_id}` as Href)} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.link, textAlign: 'center' }}>{facilityName}</Text>
                  </Pressable>
                ) : null}
                {place ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Glyph name="map-pin" size={14} color={c.icon.secondary} />
                    <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, flexShrink: 1 }}>{place}</Text>
                  </View>
                ) : null}
                {Array.isArray(doc.tags) && doc.tags.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                    {doc.tags.slice(0, 3).map((tag) => (
                      <StatusTag key={tag} label={tag} tone="neutral" />
                    ))}
                  </View>
                ) : null}
              </View>
              {(doc.years_experience ?? 0) > 0 || ratingCount > 0 || ratingAvg > 0 ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                  {(doc.years_experience ?? 0) > 0 ? <Stat value={`${num(doc.years_experience ?? 0)}+`} label={k('consult.doc.years')} tone="blue" /> : null}
                  {ratingCount > 0 ? <Stat value={num(ratingCount)} label={k('consult.doc.reviews')} tone="mint" /> : null}
                  {ratingAvg > 0 ? <Stat value={num(ratingAvg, { maximumFractionDigits: 1 })} label={k('consult.doc.average')} tone="amber" /> : null}
                </View>
              ) : null}
            </Card>

            <Section title={k('consult.book.visitType')}>
              <ModeTiles tiles={tiles} value={activeVt} onChange={setActiveVt} label={k('consult.book.visitType')} />
            </Section>

            <Section title={k('consult.doc.bookTitle')}>
              <DayStrip days={days} value={day} onChange={setDay} label={k('consult.book.day')} />
              <SlotGrid loading={loadingSlots} value={selectedSlot} onChange={setSelectedSlot} emptyText={k(slotsEmptyKey(slotsReason))} slots={daySlots.map((s) => ({ id: s.start, label: clock(s.start), available: Boolean(s.available) }))} />
            </Section>

            {bio ? (
              <Section title={k('consult.doc.about')}>
                <Card theme={theme}>
                  <Text numberOfLines={bioOpen ? undefined : 4} style={{ ...scale(t, 'small', 'regular'), lineHeight: 24, color: c.text.secondary, ...flow }}>{bio}</Text>
                  {!bioOpen ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={k('consult.doc.readMore')} onPress={() => setBioOpen(true)} style={{ minHeight: 44, justifyContent: 'center' }}>
                      <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.link, ...flow }}>{k('consult.doc.readMore')}</Text>
                    </Pressable>
                  ) : null}
                  {Array.isArray(doc.sub_specialties) && doc.sub_specialties.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {doc.sub_specialties.map((s) => (
                        <StatusTag key={s} label={s} tone="neutral" />
                      ))}
                    </View>
                  ) : null}
                </Card>
              </Section>
            ) : null}

            {[
              { key: 'clinic', title: k('consult.doc.clinicPhotos'), urls: doc.clinic_images ?? doc.clinicPhotos, w: 180 },
              { key: 'facility', title: k('consult.doc.facilityPhotos'), urls: doc.facility_images, w: 200 },
            ]
              .filter((g) => Array.isArray(g.urls) && g.urls.length > 0)
              .map((g) => (
                <Section key={g.key} title={g.title}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {(g.urls ?? []).map((uri) => (
                      <Image key={uri} accessibilityIgnoresInvertColors accessibilityLabel={g.title} source={{ uri }} resizeMode="cover" style={{ width: g.w, height: 130, borderRadius: 16, backgroundColor: c.bg.media }} />
                    ))}
                  </ScrollView>
                </Section>
              ))}

            {info.length > 0 ? (
              <Section title={k('consult.doc.more')}>
                <Card theme={theme}>
                  {info.map((row, i) => (
                    <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.border.hairline }}>
                      <Glyph name={row.icon} size={20} color={c.icon.secondary} />
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{row.label}</Text>
                        <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, ...flow }}>{row.value}</Text>
                      </View>
                    </View>
                  ))}
                </Card>
              </Section>
            ) : null}

            {reviews.length > 0 ? (
              <Section title={k('consult.doc.patientReviews')}>
                {reviews.map((r, i) => (
                  <Card key={r.id || i} theme={theme} padding="sm">
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Glyph key={n} name="star" size={14} color={n <= (r.rating || 0) ? c.icon.ratingStar : c.border.strong} />
                      ))}
                      {r.date ? <Text style={{ ...scale(t, 'micro', 'regular'), color: c.text.tertiary, marginStart: 8 }}>{date(r.date)}</Text> : null}
                    </View>
                    {r.text ? <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, marginTop: 6, ...flow }}>{r.text}</Text> : null}
                  </Card>
                ))}
              </Section>
            ) : null}

            <Section title={k('consult.doc.faq')}>
              {faqs.map((f, i) => (
                <Pressable key={f.q} accessibilityRole="button" accessibilityState={{ expanded: Boolean(faqOpen[i]) }} accessibilityLabel={f.q} onPress={() => setFaqOpen((p) => ({ ...p, [i]: !p[i] }))} style={{ minHeight: 44 }}>
                  <Card theme={theme} padding="sm">
                    <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{f.q}</Text>
                    {faqOpen[i] ? <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, marginTop: 8, ...flow }}>{f.a}</Text> : null}
                  </Card>
                </Pressable>
              ))}
            </Section>

            <Modal visible={photoOpen} transparent animationType="fade" onRequestClose={() => setPhotoOpen(false)}>
              <View style={{ flex: 1, backgroundColor: tint(c.bg.inverse, 0.9), justifyContent: 'center', alignItems: 'center' }}>
                {photo ? <Image accessibilityIgnoresInvertColors accessibilityLabel={name} source={{ uri: photo }} style={{ width: '100%', height: 400 }} resizeMode="contain" /> : null}
                <View style={{ position: 'absolute', top: 48, end: 16 }}>
                  <Button label={k('consult.close')} variant="secondary" size="md" onPress={() => setPhotoOpen(false)} theme={theme} />
                </View>
              </View>
            </Modal>
          </>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}

/** One of the three figures under the hero (years, reviews, average): the tone's soft tile, 17 bold. */
function Stat({ value, label, tone }: { value: string; label: string; tone: 'blue' | 'mint' | 'amber' }) {
  const { t, c } = useScreenUi();
  const look = c.service[tone];
  return (
    <View style={{ flex: 1, minWidth: 0, borderRadius: 18, backgroundColor: look.bg, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 2 }}>
      <Text style={{ ...scale(t, 'bodyLg', 'bold'), color: look.fg }}>{value}</Text>
      <Text style={{ ...scale(t, 'micro', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}
