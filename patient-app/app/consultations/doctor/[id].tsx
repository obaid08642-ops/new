import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, FIcon } from '../../../../packages/ui-native/src';
import { DayStrip, ModeTiles, SlotGrid, slotsEmptyKey, useDays, type ModeTile } from '../../../src/components/consult/ConsultBooking';
import { ConsultScreen, Gate, Section, ShareGlyph, StatusTag, specialtyLook, useConsultFormat, visitMode, type GateStatus } from '../../../src/components/consult/ConsultKit';
import { Glyph } from '../../../src/components/pharmacy/PharmacyKit';
import { GuaranteeLine, LicenseRow, useLateGuarantee } from '../../../src/components/consult/Differentiators';
import { readLicenseLine } from '../../../src/utils/differentiators';
import { step as scale, tint, useScreenUi } from '../../../src/components/screen/ScreenKit';
import MapView, { Marker, PROVIDER_DEFAULT } from '../../../src/components/MapPrimitives';
import { apiFetch } from '../../../src/utils/api';
import { isOffline } from '../../../src/utils/isOffline';
import { logError } from '../../../src/utils/logger';
import { apiMediaUri } from '../../../src/utils/mediaUri';
import { pickLocalized } from '../../../src/utils/localize';
import { optimizedImageUri } from '../../../src/utils/optimizedImage';
import { dateLocaleFor } from '../../../src/utils/dates';
import { slotBarLabel, summaryItems } from '../../../src/utils/doctorSummary';

/**
 * Doctor page — board DoctorFull (canvas/DoctorFull.dc.html) and docs/design/SPEC_PRODUCT_DOCTOR_DETAIL.md §B. The
 * doctor is GET /care/doctors/:id (a field the server did not send is not drawn: no sample, no zero), the times are
 * GET /care/doctors/:id/slots for the chosen day and visit type, and the cancellation figures of the questions come
 * from GET /system-config/public. The book button goes to the confirmation with the chosen slot, or to the booking page
 * to choose one, as before.
 */

/** One row of the public GET /ratings/provider/:id list: score, comment, date and the reviewer's first name only. */
interface PublicReview {
  score?: number;
  comment?: string | null;
  createdAt?: string | null;
  reviewer?: string | null;
}
interface ReviewsPage {
  data?: PublicReview[];
  total?: number;
  page?: number;
  total_pages?: number;
}
interface Review {
  rating?: number;
  text?: string;
  date?: string;
  reviewer?: string | null;
}
const REVIEWS_PAGE_SIZE = 5;
const toReview = (r: PublicReview): Review[] => (typeof r.score === 'number' && r.score > 0 ? [{ rating: r.score, text: r.comment || undefined, date: r.createdAt || undefined, reviewer: r.reviewer }] : []);
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
  sub_specialties?: string[];
  years_experience?: number;
  rating_avg?: number;
  rating_count?: number;
  facility_images?: string[];
  /** The public row sends university, graduation year and fellowship / board per entry. */
  education?: Array<{ university?: string | null; graduation_year?: number | null; fellowship_board?: string | null }>;
  languages?: string[];
  license_number?: string;
  scfhs_license_number?: string;
  /** The public card model (GET /care/doctors/:id): `verified` = admin-approved and licence-verified, the SCFHS number, `rating` / `reviews_count`, `clinicPhotos`. */
  verified?: boolean;
  scfhs_license_no?: string;
  /** "Licensed by SCFHS, no. X": number, authority and whether it was verified (no date). */
  license?: { number?: string | null; authority?: string | null; verified?: boolean };
  license_verified?: boolean;
  rating?: number;
  reviews_count?: number;
  clinicPhotos?: string[];
  accepts_insurance?: boolean;
  /** Not sent by the backend yet (docs/design/needs-review/doctor-card-app.json): drawn only when present. */
  wait_time?: number;
  services?: Array<{ id?: string; name?: string; name_ar?: string; name_en?: string; price?: number }>;
  follow_up_price?: number;
  follow_up_days?: number;
  location?: { lat?: number; lng?: number };
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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsBusy, setReviewsBusy] = useState(false);
  const days = useDays(30);
  // The late-appointment guarantee of the same /system-config/public answer the cancellation numbers come from.
  const guarantee = useLateGuarantee(policy);

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

  // The written reviews: the first page of the public list, more pages on request (GET /ratings/provider/:id).
  const loadReviews = useCallback(
    async (page: number) => {
      if (!doc?.id) return;
      setReviewsBusy(true);
      try {
        const res = await apiFetch<ReviewsPage>(`/ratings/provider/${encodeURIComponent(doc.id)}?page=${page}&limit=${REVIEWS_PAGE_SIZE}`);
        const rows = Array.isArray(res?.data) ? res.data.flatMap(toReview) : [];
        setReviews((prev) => (page === 1 ? rows : [...prev, ...rows]));
        setReviewsTotal(typeof res?.total === 'number' ? res.total : rows.length);
        setReviewsPage(page);
      } catch (e) {
        logError('consultations:doctor:reviews', e);
      } finally {
        setReviewsBusy(false);
      }
    },
    [doc?.id],
  );

  useEffect(() => {
    void loadReviews(1);
  }, [loadReviews]);

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
  const [slotsAttempt, setSlotsAttempt] = useState(0);

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
  }, [doc?.id, day, activeVt, days, slotsAttempt]);

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
  const photo = apiMediaUri(doc?.photo_url);
  const facilityName = pickLocalized(doc?.facility?.name_ar, doc?.hospital);
  const place = [[doc?.district, doc?.city].filter(Boolean).join('، '), doc?.address].filter(Boolean).join(' · ');
  const bio = doc?.bio || '';
  const modes = Array.isArray(doc?.consultation_modes) && doc.consultation_modes.length > 0 ? doc.consultation_modes : ['clinic', 'video', 'home'];
  const tiles: ModeTile[] = modes.flatMap((m) => {
    const mode = visitMode(m);
    return mode ? [{ id: m, mode, price: getPrice(m) }] : [];
  });
  const price = getPrice(activeVt);
  const look = specialtyLook(doc?.specialty || doc?.sp);
  const license = readLicenseLine(doc);
  const ratingAvg = doc?.rating ?? doc?.rating_avg ?? 0;
  const ratingCount = doc?.reviews_count ?? doc?.rating_count ?? 0;
  const education = (Array.isArray(doc?.education) ? doc.education : [])
    .map((e) => [e.fellowship_board, e.university, typeof e.graduation_year === 'number' ? num(e.graduation_year, { useGrouping: false }) : undefined].filter(Boolean).join(' · '))
    .filter(Boolean)
    .join('\n');
  const info: Array<{ icon: 'globe' | 'shield-check'; label: string; value: string }> = [
    ...(Array.isArray(doc?.languages) && doc.languages.length > 0 ? [{ icon: 'globe' as const, label: k('consult.doc.languages'), value: doc.languages.map(languageName).join('، ') }] : []),
    ...(doc?.accepts_insurance ? [{ icon: 'shield-check' as const, label: k('consult.doc.insurance'), value: k('consult.doc.acceptsInsurance') }] : []),
  ];

  const services = (doc?.services ?? []).flatMap((sv) => {
    const label = pickLocalized(sv.name_ar, sv.name_en) || sv.name;
    return label && typeof sv.price === 'number' && sv.price > 0 ? [{ key: sv.id || label, label, price: sv.price }] : [];
  });
  const followUp = typeof doc?.follow_up_price === 'number' && doc.follow_up_price >= 0 ? { price: doc.follow_up_price, days: doc.follow_up_days } : null;
  const mapLat = doc?.location?.lat;
  const mapLng = doc?.location?.lng;
  // the map belongs to the clinic visit only
  const showMap = activeVt === 'clinic' && typeof mapLat === 'number' && typeof mapLng === 'number';

  const book = () => {
    if (!doc) return;
    if (selectedSlot) router.push({ pathname: '/consultations/booking-status', params: { doctorId: doc.id, slot_start: selectedSlot, visitType: activeVt } } as unknown as Href);
    else router.push({ pathname: '/consultations/book/[id]', params: { id: doc.id, visit_type: activeVt } } as unknown as Href);
  };

  // The compact line under the photo and name: only what the server sent (the wait is not sent yet, see needs-review).
  const summary = summaryItems({
    specialty: doc?.specialty || doc?.sp,
    rating: ratingAvg,
    reviews: ratingCount,
    feeText: price !== null ? `${num(price)} ${k('consult.currency')}` : undefined,
    waitMinutes: doc?.wait_time,
    num,
    waitText: (minutes) => k('consult.card.wait', { n: minutes }),
  });
  // The sticky bar: the chosen day, time and fee; disabled with a hint until a time is chosen.
  const barLabel = slotBarLabel(dateLocaleFor(lang), selectedSlot, price !== null ? `${num(price)} ${k('consult.currency')}` : undefined);

  const footer =
    status === 'ready' && doc ? (
      <>
        <Text accessibilityLiveRegion="polite" style={{ ...scale(t, 'small', barLabel ? 'bold' : 'regular'), color: barLabel ? c.text.primary : c.text.secondary, textAlign: 'center' }}>{barLabel ?? k('consult.doc.stickyChooseTime')}</Text>
        {barLabel ? (
          <Button label={k('consult.doc.stickyBook')} size="lg" fullWidth onPress={book} theme={theme} testID="doctor-book" />
        ) : (
          // disabled: sunken background with primary text (declared contrast pair), not a half-transparent red
          <View accessible accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel={k('consult.doc.stickyBook')} testID="doctor-book" style={{ minHeight: 56, borderRadius: 18, backgroundColor: c.bg.sunken, borderWidth: 1, borderColor: c.border.subtle, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
            <Text style={{ ...scale(t, 'h4', 'bold'), color: c.text.primary }}>{k('consult.doc.stickyBook')}</Text>
          </View>
        )}
      </>
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
              {photo ? (
                <Pressable accessibilityRole="imagebutton" accessibilityLabel={name} onPress={() => setPhotoOpen(true)} style={{ marginBottom: 12 }}>
                  <Image cachePolicy="memory-disk" accessibilityIgnoresInvertColors source={{ uri: optimizedImageUri(photo, 640) }} contentFit="cover" contentPosition="top" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 24, backgroundColor: c.bg.media }} />
                </Pressable>
              ) : (
                <View style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 24, backgroundColor: c.bg.media, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <FIcon icon={look.icon} tone={look.tone} size={96} theme={theme} />
                </View>
              )}
              <View style={{ alignItems: 'center', gap: 8 }}>
                {doc.is_online ? <StatusTag label={k('consult.doc.availableNow')} tone="success" /> : null}
                {doc.verified === true ? <StatusTag label={k('consult.doc.verified')} tone="info" /> : null}
                <Text accessibilityRole="header" style={{ ...scale(t, 'h2'), color: c.text.primary, textAlign: 'center' }}>{name}</Text>
                {doc.title ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{doc.title}</Text> : null}
                {summary.length > 0 ? <Text accessibilityLabel={`${k('consult.doc.summaryLabel')}: ${summary.join(', ')}`} testID="doctor-summary" style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, textAlign: 'center' }}>{summary.join(' \u00b7 ')}</Text> : null}
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
                <LicenseRow license={license} testID="doctor-license" />
                <GuaranteeLine guarantee={guarantee} center testID="doctor-guarantee" />
                {Array.isArray(doc.tags) && doc.tags.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                    {doc.tags.slice(0, 3).map((tag) => (
                      <StatusTag key={tag} label={tag} tone="neutral" />
                    ))}
                  </View>
                ) : null}
              </View>
            </Card>

            <Section title={k('consult.book.visitType')}>
              <ModeTiles tiles={tiles} value={activeVt} onChange={setActiveVt} label={k('consult.book.visitType')} />
            </Section>

            <Section title={k('consult.doc.bookTitle')}>
              <DayStrip days={days} value={day} onChange={setDay} label={k('consult.book.day')} />
              <SlotGrid loading={loadingSlots} value={selectedSlot} onChange={setSelectedSlot} emptyText={k(slotsEmptyKey(slotsReason))} slots={daySlots.map((s) => ({ id: s.start, label: clock(s.start), available: Boolean(s.available) }))} />
              {!loadingSlots && slotsReason === 'error' ? <Button label={k('consult.retry')} variant="secondary" size="md" onPress={() => setSlotsAttempt((n) => n + 1)} theme={theme} testID="doctor-slots-retry" /> : null}
            </Section>

            {(doc.years_experience ?? 0) > 0 ? (
              <View style={{ flexDirection: 'row', gap: 8 }} testID="doctor-stats">
                <Stat value={`${num(doc.years_experience ?? 0)}+`} label={k('consult.doc.years')} tone="blue" />
              </View>
            ) : null}

            {[
              { key: 'clinic', title: k('consult.doc.clinicPhotos'), urls: (doc.clinicPhotos ?? []).map((u) => apiMediaUri(u)).filter((u): u is string => Boolean(u)), w: 180 },
              { key: 'facility', title: k('consult.doc.facilityPhotos'), urls: doc.facility_images, w: 200 },
            ]
              .filter((g) => Array.isArray(g.urls) && g.urls.length > 0)
              .map((g) => (
                <Section key={g.key} title={g.title}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {(g.urls ?? []).map((uri) => (
                      <Image cachePolicy="memory-disk" key={uri} accessibilityIgnoresInvertColors accessibilityLabel={g.title} source={{ uri: optimizedImageUri(uri, g.w) }} contentFit="cover" style={{ width: g.w, height: 130, borderRadius: 16, backgroundColor: c.bg.media }} />
                    ))}
                  </ScrollView>
                </Section>
              ))}

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

            {services.length > 0 || followUp ? (
              <Section title={k('consult.doc.services')}>
                <Card theme={theme}>
                  {services.map((sv, i) => (
                    <View key={sv.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.border.hairline }}>
                      <Text style={{ flex: 1, ...scale(t, 'small', 'medium'), color: c.text.primary, ...flow }}>{sv.label}</Text>
                      <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary }}>{`${num(sv.price)} ${k('consult.currency')}`}</Text>
                    </View>
                  ))}
                  {followUp ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: services.length ? 1 : 0, borderTopColor: c.border.hairline }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, ...flow }}>{k('consult.doc.followUp')}</Text>
                        {typeof followUp.days === 'number' && followUp.days > 0 ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.doc.followUpWindow', { n: num(followUp.days) })}</Text> : null}
                      </View>
                      <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary }}>{followUp.price > 0 ? `${num(followUp.price)} ${k('consult.currency')}` : k('consult.doc.free')}</Text>
                    </View>
                  ) : null}
                </Card>
              </Section>
            ) : null}

            {showMap ? (
              <Section title={k('consult.doc.clinicMap')}>
                <View style={{ height: 200, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: c.border.hairline }}>
                  <MapView provider={PROVIDER_DEFAULT} style={{ flex: 1 }} userInterfaceStyle={theme} initialRegion={{ latitude: mapLat, longitude: mapLng, latitudeDelta: 0.01, longitudeDelta: 0.01 }} showsMyLocationButton={false} showsCompass={false} scrollEnabled={false} zoomEnabled={false}>
                    <Marker coordinate={{ latitude: mapLat, longitude: mapLng }} title={facilityName || name} tracksViewChanges={false} />
                  </MapView>
                </View>
                {place ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{place}</Text> : null}
              </Section>
            ) : null}

            <Section title={k('consult.doc.education')}>
              <Card theme={theme}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Glyph name="file-text" size={20} color={c.icon.secondary} />
                  <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'small', 'medium'), color: education ? c.text.primary : c.text.secondary, ...flow }}>{education || k('consult.doc.noEducation')}</Text>
                </View>
              </Card>
            </Section>

            <Section title={k('consult.doc.patientReviews')}>
              {reviews.length === 0 ? (
                <Card theme={theme} padding="sm">
                  <Text testID="doctor-reviews-empty" style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.doc.noReviews')}</Text>
                </Card>
              ) : null}
              {reviews.map((r, i) => (
                <Card key={`${i}-${r.date ?? ''}`} theme={theme} padding="sm">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Glyph key={n} name="star" size={14} color={n <= (r.rating || 0) ? c.icon.ratingStar : c.border.strong} />
                    ))}
                    {r.reviewer ? <Text style={{ ...scale(t, 'micro', 'bold'), color: c.text.secondary, marginStart: 8 }}>{r.reviewer}</Text> : null}
                    {r.date ? <Text style={{ ...scale(t, 'micro', 'regular'), color: c.text.tertiary, marginStart: 8 }}>{date(r.date)}</Text> : null}
                  </View>
                  {r.text ? <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, marginTop: 6, ...flow }}>{r.text}</Text> : null}
                </Card>
              ))}
              {reviews.length < reviewsTotal ? (
                <Pressable accessibilityRole="button" accessibilityState={{ busy: reviewsBusy, disabled: reviewsBusy }} accessibilityLabel={k('consult.doc.seeAllReviews', { n: num(reviewsTotal) })} disabled={reviewsBusy} onPress={() => void loadReviews(reviewsPage + 1)} style={{ minHeight: 44, justifyContent: 'center' }} testID="doctor-reviews-more">
                  <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.link, ...flow }}>{k('consult.doc.seeAllReviews', { n: num(reviewsTotal) })}</Text>
                </Pressable>
              ) : null}
            </Section>

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
                {photo ? <Image cachePolicy="memory-disk" accessibilityIgnoresInvertColors accessibilityLabel={name} source={{ uri: photo }} style={{ width: '100%', height: 400 }} contentFit="contain" /> : null}
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
function Stat({ value, label, tone }: { value: string; label: string; tone: 'blue' | 'mint' | 'amber' | 'violet' }) {
  const { t, c } = useScreenUi();
  const look = c.service[tone];
  return (
    <View style={{ flex: 1, minWidth: 0, borderRadius: 18, backgroundColor: look.bg, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 2 }}>
      <Text style={{ ...scale(t, 'bodyLg', 'bold'), color: look.fg }}>{value}</Text>
      <Text style={{ ...scale(t, 'micro', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}
