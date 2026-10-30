import React, { useEffect, useMemo, useState } from 'react';
import { ScopedSuggest } from '../../../src/components/search/ScopedSuggest';
import { SUGGEST_SCOPES } from '../../../src/utils/searchSuggest';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { AppHeader, Chip, DoctorCard, EmptyState, ErrorState, FIcon, Icon, OfferCard, Screen, Search, Skeleton, useTabBarHeight } from '../../../../packages/ui-native/src';
import { COLUMN, step as scale, useScreenUi } from '../../../src/components/screen/ScreenKit';
import { CONSULT_TONE, MODE_LOOK, Section, Sheet, goBack, visitMode, specialtyLook, type VisitMode } from '../../../src/components/consult/ConsultKit';
import { GlyphRound, WishlistButton } from '../../../src/components/pharmacy/PharmacyKit';
import { ServiceCartButton } from '../../../src/components/cart/ServiceCartButton';
import { HeaderMenuButton } from '../../../src/components/nav/HeaderMenuButton';
import { ActiveFilters, type ActiveFilter } from '../../../src/components/pharmacy/ActiveFilters';
import { apiFetch } from '../../../src/utils/api';
import { fetchPublicList } from '../../../src/utils/publicCache';
import { logError } from '../../../src/utils/logger';
import { DOCTOR_DEGREES, buildDoctorsPath, doctorRows, type DoctorDegree, keepsServerOrder, nearestApplies, resolveNearbyPlace, type NearbyPlace } from '../../../src/utils/consultNearby';
import { deviceNearbyDeps } from '../../../src/utils/consultNearbyDevice';
import { pickLocalized } from '../../../src/utils/localize';
import { dateLocaleFor } from '../../../src/utils/dates';
import { sortFromParam } from '../../../src/utils/doctorSearch';
import { GuaranteeLine, useLateGuarantee } from '../../../src/components/consult/Differentiators';

/**
 * Consultations hub — board Consult (canvas/Consult.dc.html): the header with the appointments button, the search with
 * its filter square, the visit-type choice, the payment filter, the specialties and the doctors. The data is what the
 * screen always loaded: GET /providers?type=doctor, GET /care/specialties (with live counts), GET /home/offers and the
 * insurance catalogue (GET /insurance/companies and its networks). The filters work on those fields only; nothing is
 * invented for a doctor who does not have it.
 */

interface Doc {
  id?: string;
  n: string;
  sp: string;
  specialty?: string;
  specialty_ar?: string;
  specialty_en?: string;
  badge: string;
  loc: string;
  addr: string;
  services: VisitMode[] | string[];
  r: number | null;
  rev: number;
  p: number | null;
  img?: string;
  photo_url?: string;
  gender?: string;
  home_visit_enabled?: boolean;
  video_enabled?: boolean;
  insurance_only?: boolean;
  insurance_supported?: unknown[];
  accepted_insurance?: unknown[];
  insurance_plans?: Record<string, string[]>;
  tags?: string[];
  is_online?: boolean;
  description?: string;
  desc?: string;
  biography?: string;
  name?: string;
  name_ar?: string;
  rating?: number;
  consultation_fee?: number;
  /** Only GET /care/doctors sends it (the plain GET /providers list does not). */
  next_available_at?: string;
}
/** A provider profile as GET /providers returns it: the fields the cards and the filters read. */
type ProviderRow = Partial<Doc> & {
  name_en?: string;
  title?: string;
  district?: string;
  city?: string;
  address?: string;
  consultation_modes?: string[];
  rating_avg?: number;
  rating_count?: number;
  reviews_count?: number;
  price_clinic?: number;
  price_online?: number;
  price_home?: number;
};
interface Spec {
  slug?: string;
  name_ar?: string;
  name_en?: string;
  specialty?: string;
  count?: number;
}
interface Offer {
  id?: string;
  t?: string;
  disc?: string | number;
  price?: string | number;
  old?: string | number;
}
interface Named {
  id?: string;
  _id?: string;
  code?: string;
  name_ar?: string;
  name_en?: string;
  name?: string;
}

type Sort = 'rating' | 'price' | 'available_today' | 'nearest' | 'available_now';
type TitleF = 'all' | DoctorDegree;
type GenderF = 'all' | 'male' | 'female';
type PayF = 'all' | 'cash' | 'insurance';
/** The visit-type cards: order, tone and the subtitle key (owner layout decision 13). Home is peach on the cards. */
const VISIT_CARDS: Array<{ mode: VisitMode; tone: 'blue' | 'violet' | 'peach'; sub: string }> = [
  { mode: 'clinic', tone: 'blue', sub: 'consult.hub.visitSubClinic' },
  { mode: 'online', tone: 'violet', sub: 'consult.hub.visitSubVideo' },
  { mode: 'home', tone: 'peach', sub: 'consult.hub.visitSubHome' },
];
const priceOf = (d: Doc): number => d.consultation_fee || Number(String(d.p ?? '0').replace(/\D/g, '')) || 0;

export default function Consultations() {
  const { theme, t, c, flow, dir, lang, k, num, money } = useScreenUi();
  const barHeight = useTabBarHeight();
  const [activePay, setActivePay] = useState<PayF>('all');
  const [activeVt, setActiveVt] = useState<VisitMode>('clinic');
  const [activeSpec, setActiveSpec] = useState('');
  // The rows as the server sent them; the card shape (with the localised name) is derived below so a language change re-derives it.
  const [providerRows, setProviderRows] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [specialties, setSpecialties] = useState<Spec[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filterTitle, setFilterTitle] = useState<TitleF>('all');
  const [filterGender, setFilterGender] = useState<GenderF>('all');
  // the sheet edits a draft; Apply commits it (owner layout decision 15)
  const [draft, setDraft] = useState<{ sort: Sort; title: TitleF; gender: GenderF; pay: PayF }>({ sort: 'rating', title: 'all', gender: 'all', pay: 'all' });
  // "Book now" entries open this tab with ?sort=available_today, which preselects the availability order (owner decision 2026-10-24).
  const entrySort = sortFromParam(useLocalSearchParams<{ sort?: string }>().sort);
  const [filterSort, setFilterSort] = useState<Sort>(entrySort === 'available_today' ? 'available_today' : 'rating');
  useEffect(() => {
    if (entrySort === 'available_today') setFilterSort('available_today');
  }, [entrySort]);
  const guarantee = useLateGuarantee();
  const [showInsModal, setShowInsModal] = useState(false);
  const [insCompany, setInsCompany] = useState('');
  const [insClass, setInsClass] = useState('');
  const [stepIns, setStepIns] = useState(1);
  const [insuranceCompanies, setInsuranceCompanies] = useState<Named[]>([]);
  const [insuranceNetworks, setInsuranceNetworks] = useState<Named[]>([]);
  const [insuranceCatalogUnavailable, setInsuranceCatalogUnavailable] = useState(false);
  // "Nearest" and "Available now" are two of the sort choices; "Nearest" needs a place to measure from.
  const nearest = filterSort === 'nearest';
  const availableNow = filterSort === 'available_now';
  const [place, setPlace] = useState<NearbyPlace | null>(null);
  const [locating, setLocating] = useState(false);
  const [noPlace, setNoPlace] = useState(false);
  const doctorsPath = buildDoctorsPath({ mode: activeVt, nearest, availableNow, place, availableToday: filterSort === 'available_today', degree: filterTitle === 'all' ? null : filterTitle });

  /** Picks "Nearest": it needs a place (device position, else the saved city); without one the sort stays as it was. */
  const resolveNearest = async (): Promise<boolean> => {
    setNoPlace(false);
    setLocating(true);
    const found = await resolveNearbyPlace(deviceNearbyDeps);
    setLocating(false);
    setPlace(found);
    if (!found) setNoPlace(true);
    return found !== null;
  };

  const openFilters = () => {
    setDraft({ sort: filterSort, title: filterTitle, gender: filterGender, pay: activePay });
    setShowFilter(true);
  };
  const commit = async (d: typeof draft) => {
    setShowFilter(false);
    setFilterTitle(d.title);
    setFilterGender(d.gender);
    setActivePay(d.pay);
    if (d.sort === 'nearest' && !(await resolveNearest())) setFilterSort('rating');
    else setFilterSort(d.sort);
    if (d.pay === 'insurance' && d.pay !== activePay) {
      setStepIns(1);
      setShowInsModal(true);
    }
  };
  const clearAll = () => {
    setNoPlace(false);
    setFilterSort('rating');
    setFilterTitle('all');
    setFilterGender('all');
    setActivePay('all');
    setInsCompany('');
    setInsClass('');
  };

  useEffect(() => {
    let live = true;
    const fetchDoctors = async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        // GET /providers returns the array; GET /care/doctors (the quick filters) returns { items }
        const data = await apiFetch<ProviderRow[] | { items?: ProviderRow[] }>(doctorsPath);
        if (!live) return;
        setProviderRows(doctorRows<ProviderRow>(data));
      } catch (err) {
        if (!live) return;
        logError('consultations:fetch-doctors', err);
        setProviderRows([]);
        setLoadFailed(true);
      } finally {
        if (live) setLoading(false);
      }
    };
    void fetchDoctors();
    return () => {
      live = false;
    };
  }, [doctorsPath, reload]);

  useEffect(() => {
    // Real specialties (names + live doctor counts) and real active offers
    fetchPublicList<Spec[] | { data?: Spec[] }>('/care/specialties')
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data;
        setSpecialties(Array.isArray(list) ? list : []);
      })
      .catch(() => setSpecialties([]));
    apiFetch<Offer[] | { data?: Offer[] }>('/home/offers')
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data;
        setOffers(Array.isArray(list) ? list : []);
      })
      .catch(() => setOffers([]));
    apiFetch<Named[] | { data?: Named[] }>('/insurance/companies')
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setInsuranceCompanies(list);
        setInsuranceCatalogUnavailable(list.length === 0);
      })
      .catch(() => {
        setInsuranceCompanies([]);
        setInsuranceCatalogUnavailable(true);
      });
  }, []);

  useEffect(() => {
    if (!insCompany) {
      setInsuranceNetworks([]);
      return;
    }
    apiFetch<Named[] | { data?: Named[] }>(`/insurance/companies/${insCompany}/networks`)
      .then((res) => setInsuranceNetworks(Array.isArray(res) ? res : res?.data || []))
      .catch(() => setInsuranceNetworks([]));
  }, [insCompany]);

  // Normalize real provider-profile fields into the card display shape (the name follows the language, so it is derived here, not at fetch).
  const doctors = useMemo(
    () =>
      providerRows.map((x) => {
        return {
          ...x,
          n: pickLocalized(x.name_ar, x.name_en) || '',
          sp: [x.title, x.specialty].filter(Boolean).join(' — '),
          specialty_ar: x.specialty,
          badge: x.title || '',
          loc: [x.district, x.city].filter(Boolean).join('، '),
          addr: x.address || '',
          services: (Array.isArray(x.consultation_modes) ? x.consultation_modes : []).map((m) => (m === 'video' ? 'online' : m)),
          r: x.rating_avg ?? x.rating ?? null,
          rev: x.rating_count ?? x.reviews_count ?? 0,
          p: (typeof x.price_clinic === 'number' ? x.price_clinic : null) ?? x.price_online ?? x.price_home ?? null,
        } as Doc;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [providerRows, lang],
  );

  const filteredDocs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return doctors
      .filter((d) => {
        const matchesSearch = (d.name || d.name_ar || d.n || '').toLowerCase().includes(q) || (d.description || d.desc || d.sp || d.specialty_ar || '').toLowerCase().includes(q);

        // Filter by visit type (clinic, online, home)
        const services = d.services as string[] | undefined;
        const matchesVt =
          (services && services.includes(activeVt)) ||
          (activeVt === 'home' && d.home_visit_enabled) ||
          (activeVt === 'online' && d.video_enabled) ||
          (activeVt === 'clinic' && !d.video_enabled && !d.home_visit_enabled) ||
          services === undefined;

        // Filter by payment type (cash, insurance)
        let matchesPay = true;
        if (activePay === 'cash') {
          matchesPay = !d.insurance_only;
        } else if (activePay === 'insurance') {
          const isInsured = (d.insurance_supported && d.insurance_supported.length > 0) || (d.tags && d.tags.includes('تأمين'));
          if (!isInsured) matchesPay = false;
          else if (insCompany) {
            const supportedCompanies = (Array.isArray(d.accepted_insurance) ? d.accepted_insurance : Array.isArray(d.insurance_supported) ? d.insurance_supported : []) as Array<Named | string>;
            const acceptsCompany = supportedCompanies.some((value) => (typeof value === 'string' ? value : value?.id || value?.code) === insCompany);
            const acceptedNetworks = d.insurance_plans?.[insCompany];
            matchesPay = acceptsCompany && (!insClass || (Array.isArray(acceptedNetworks) && acceptedNetworks.includes(insClass)));
          }
        }

        // Filter by specialty
        const matchesSpec = !activeSpec || d.specialty_ar === activeSpec || (d.sp && d.sp.includes(activeSpec));

        // Modal filters — real fields only (no name-based gender guessing)
        const matchesGender = filterGender === 'all' || !d.gender || (filterGender === 'male' ? d.gender === 'male' : d.gender === 'female');

        return matchesSearch && matchesVt && matchesPay && matchesSpec && matchesGender;
      })
      .sort((a, b) => {
        // "Nearest": the server's distance order is kept (the sort is stable)
        if (keepsServerOrder(doctorsPath) && filterSort !== 'price') return 0;
        if (filterSort === 'price') return priceOf(a) - priceOf(b);
        return (b.rating || Number(b.r || 0)) - (a.rating || Number(a.r || 0));
      });
  }, [doctors, searchQuery, activeVt, activePay, activeSpec, insCompany, insClass, filterGender, filterTitle, filterSort, doctorsPath]);

  const openDoctor = (d: Doc) => router.push((d.id ? `/consultations/doctor/${d.id}` : '/consultations/doctor-search') as Href);
  const nameOf = (n: Named) => pickLocalized(n.name_ar, n.name_en || n.name) || n.code || '';
  const listed = filteredDocs.slice(0, 10);
  const sortKey: Record<Sort, string> = { rating: 'consult.hub.sortRating', price: 'consult.hub.sortPrice', available_today: 'consult.hub.sortAvailable', nearest: 'consult.hub.nearest', available_now: 'consult.hub.availableNow' };
  const insuranceName = insCompany ? nameOf(insuranceCompanies.find((x) => String(x.id || x._id || x.code || '') === insCompany) ?? {}) : '';
  const activeItems: ActiveFilter[] = [
    ...(filterGender !== 'all' ? [{ key: 'gender', label: k(filterGender === 'male' ? 'consult.hub.male' : 'consult.hub.female'), onRemove: () => setFilterGender('all') }] : []),
    ...(filterTitle !== 'all' ? [{ key: 'title', label: k(`consult.hub.degree.${filterTitle}`), onRemove: () => setFilterTitle('all') }] : []),
    ...(activePay !== 'all' ? [{ key: 'pay', label: activePay === 'cash' ? k('consult.hub.payCash') : [k('consult.hub.payInsurance'), insuranceName].filter(Boolean).join(' · '), onRemove: () => { setActivePay('all'); setInsCompany(''); setInsClass(''); } }] : []),
    ...(filterSort !== 'rating' ? [{ key: 'sort', label: k(sortKey[filterSort]), onRemove: () => setFilterSort('rating') }] : []),
  ];
  const filterCount = activeItems.length;
  const slotLabel = (iso?: string): string | undefined => {
    if (!iso) return undefined;
    const when = new Date(iso);
    return Number.isNaN(when.getTime()) ? undefined : when.toLocaleString(dateLocaleFor(lang), { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  };

  const choice = <T extends string>(label: string, value: T, set: (v: T) => void, options: Array<[T, string]>) => (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map(([id, text]) => (
          <Chip key={id} label={text} selected={value === id} onPress={() => set(id)} theme={theme} />
        ))}
      </View>
    </View>
  );

  const header = (
    <View style={COLUMN}>
      <AppHeader
        title={k('consult.hub.title')}
        onBack={() => goBack('/(tabs)' as Href)}
        backLabel={k('consult.back')}
        trailing={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <GlyphRound name="calendar-dots" label={k('consult.appt.title')} onPress={() => router.push('/consultations/appointments' as Href)} testID="consult-appointments-entry" />
            <WishlistButton />
            <ServiceCartButton />
            <HeaderMenuButton testID="consult-menu-button" />
          </View>
        }
        theme={theme}
        direction={dir}
      />
      {/* pinned under the header while the page scrolls (owner layout addition b): the search with the one Filters button, then the filters that are on (addition a) */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 10, backgroundColor: c.bg.canvas }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Search value={searchQuery} onChange={setSearchQuery} placeholder={k('consult.hub.search')} label={k('consult.hub.search')} onClear={() => setSearchQuery('')} clearLabel={k('consult.hub.clear')} theme={theme} testID="hub-search" />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={filterCount > 0 ? k('consult.hub.filtersWithCount', { n: num(filterCount) }) : k('consult.hub.filters')}
            onPress={openFilters}
            testID="hub-filters"
            style={{ minHeight: 52, minWidth: 52, paddingHorizontal: 14, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.action.primary.bg }}
          >
            <Icon name="sliders" size={20} theme={theme} color={c.action.primary.fg} />
            <Text style={{ ...scale(t, 'small', 'bold'), color: c.action.primary.fg }}>{k('consult.hub.filters')}</Text>
            {filterCount > 0 ? (
              <View testID="hub-filters-count" style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: c.action.primary.fg }}>
                <Text style={{ ...scale(t, 'tag', 'bold'), color: c.action.primary.bg }}>{num(filterCount)}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <ScopedSuggest query={searchQuery} scope={SUGGEST_SCOPES.consultations} />
        <ActiveFilters items={activeItems} onClearAll={clearAll} tone={CONSULT_TONE} testIdPrefix="consult" />
      </View>
    </View>
  );

  return (
    <Screen theme={theme} direction={dir} header={header} scroll edges={['start', 'end']} testID="consultations-hub">
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: barHeight + 40, gap: 16 }}>
        <View accessibilityRole="radiogroup" accessibilityLabel={k('consult.hub.visitType')} style={{ flexDirection: 'row', gap: 8 }}>
          {VISIT_CARDS.map(({ mode, tone, sub }) => {
            const on = activeVt === mode;
            return (
              <Pressable
                key={mode}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${k(`consult.mode.${mode}`)}. ${k(sub)}`}
                testID={`hub-visit-${mode}`}
                onPress={() => setActiveVt(mode)}
                style={{ flex: 1, minWidth: 0, minHeight: 132, borderRadius: 20, padding: 10, gap: 8, alignItems: 'center', backgroundColor: on ? c.service.coral.bg : c.bg.surface, borderWidth: 2, borderColor: on ? c.service.coral.fg : c.border.hairline }}
              >
                <FIcon icon={MODE_LOOK[mode].icon} tone={tone} size={44} theme={theme} />
                <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, textAlign: 'center' }}>{k(`consult.mode.${mode}`)}</Text>
                <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k(sub)}</Text>
              </Pressable>
            );
          })}
        </View>
        {!nearestApplies(activeVt) && nearest ? (
          <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.hub.nearestOnline')}</Text>
        ) : locating ? (
          <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.hub.locating')}</Text>
        ) : noPlace && !nearest ? (
          <Text accessibilityRole="alert" style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.hub.nearestNoPlace')}</Text>
        ) : nearest && place?.kind === 'city' && nearestApplies(activeVt) ? (
          <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.hub.nearestCity', { city: place.city })}</Text>
        ) : null}

        {/* Specialties — the real list from /care/specialties with live doctor counts */}
        {specialties.length > 0 ? (
          <Section title={k('consult.hub.specialties')} actionLabel={k('consult.hub.viewAll')} onAction={() => router.push('/consultations/specialty-select' as Href)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {specialties
                .filter((s) => (s.count || 0) > 0)
                .slice(0, 10)
                .map((s, i) => {
                  const name = pickLocalized(s.name_ar, s.name_en || s.specialty) || '';
                  const on = activeSpec === s.name_ar;
                  const look = specialtyLook(s.name_ar || name);
                  return (
                    <Pressable key={s.slug || i} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={name} onPress={() => setActiveSpec(on ? '' : s.name_ar || '')} style={{ width: 72, minHeight: 44, alignItems: 'center', gap: 6 }}>
                      <View style={{ borderRadius: 22, borderWidth: on ? 2 : 0, borderColor: c.action.primary.bg, padding: on ? 2 : 0 }}>
                        <FIcon icon={look.icon} tone={look.tone} size={58} theme={theme} />
                      </View>
                      <Text style={{ ...scale(t, 'meta', on ? 'bold' : 'medium'), color: c.text.primary, textAlign: 'center' }}>{name}</Text>
                    </Pressable>
                  );
                })}
            </ScrollView>
          </Section>
        ) : null}

        {/* Offers — the real active offers */}
        {offers.length > 0 ? (
          <Section title={k('consult.hub.offers')} actionLabel={k('consult.hub.viewAll')} onAction={() => router.push('/offers' as Href)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {offers.map((p, i) => (
                <View key={p.id || i} style={{ width: 280 }}>
                  <OfferCard title={String(p.t ?? '')} price={String(p.price ?? '')} currency={k('consult.currency')} was={p.old != null ? String(p.old) : undefined} tag={p.disc != null ? k('consult.hub.discount', { n: String(p.disc) }) : undefined} icon="gift" tone="coral" onPress={() => p.id && router.push(`/offers/${p.id}` as Href)} theme={theme} />
                </View>
              ))}
            </ScrollView>
          </Section>
        ) : null}

        <Section title={k('consult.hub.doctors')} actionLabel={k('consult.hub.viewAll')} onAction={() => router.push('/consultations/doctor-search' as Href)}>
          {loading ? (
            <View accessibilityLabel={k('consult.loading')} accessibilityState={{ busy: true }} style={{ gap: 12 }}>
              {[0, 1].map((i) => (
                <View key={i} style={{ minHeight: 200, borderRadius: 28, padding: 16, gap: 14, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Skeleton variant="circle" theme={theme} />
                    <View style={{ flex: 1 }}><Skeleton lines={2} theme={theme} /></View>
                  </View>
                  <Skeleton lines={3} theme={theme} />
                </View>
              ))}
            </View>
          ) : loadFailed ? (
            <ErrorState title={k('consult.error.title')} body={k('consult.error.body')} retryLabel={k('consult.retry')} onRetry={() => setReload((n) => n + 1)} theme={theme} testID="hub-doctors-error" />
          ) : listed.length === 0 ? (
            <EmptyState icon="stethoscope" tone="blue" title={k('consult.hub.empty')} body={k('consult.hub.emptyBody')} theme={theme} />
          ) : (
            listed.map((d, i) => (
              <View key={d.id || i} style={{ gap: 6 }}>
              <DoctorCard
                name={d.n}
                photoSrc={d.img || d.photo_url}
                tone={specialtyLook(d.specialty_ar || d.sp).tone}
                availableLabel={d.is_online ? k('consult.doc.availableNow') : undefined}
                grade={d.badge || undefined}
                specialty={pickLocalized(d.specialty_ar, d.specialty_en || d.specialty || d.sp) || undefined}
                place={[d.loc, d.addr].filter(Boolean).join(' · ') || undefined}
                modes={((d.services as string[]) || []).flatMap((s) => {
                  const mode = visitMode(s);
                  return mode ? [{ mode, label: k(`consult.mode.${mode}`) }] : [];
                })}
                rating={d.r != null && d.r > 0 ? { value: d.r, count: d.rev } : undefined}
                formatCount={num}
                nextSlot={slotLabel(d.next_available_at)}
                price={d.p != null ? money(Number(d.p)) : undefined}
                currency={d.p != null ? k('consult.currency') : undefined}
                bookLabel={k('consult.hub.book')}
                onPress={() => openDoctor(d)}
                onBook={() => openDoctor(d)}
                theme={theme}
                testID={`hub-doctor-${i}`}
              />
              <GuaranteeLine guarantee={guarantee} testID={`hub-doctor-${i}-guarantee`} />
              </View>
            ))
          )}
          {filteredDocs.length > 10 ? (
            <Pressable accessibilityRole="button" accessibilityLabel={k('consult.hub.seeAll')} onPress={() => router.push('/consultations/doctor-search' as Href)} style={{ minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
              <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.link }}>{k('consult.hub.seeAll')}</Text>
            </Pressable>
          ) : null}
        </Section>
      </View>

      <Sheet open={showFilter} title={k('consult.hub.filtersTitle')} onClose={() => setShowFilter(false)} closeLabel={k('consult.hub.filtersClose')}>
        {choice<GenderF>(k('consult.hub.gender'), draft.gender, (v) => setDraft((d) => ({ ...d, gender: v })), [['all', k('consult.hub.all')], ['male', k('consult.hub.male')], ['female', k('consult.hub.female')]])}
        {choice<TitleF>(k('consult.hub.grade'), draft.title, (v) => setDraft((d) => ({ ...d, title: v })), [['all', k('consult.hub.all')], ...DOCTOR_DEGREES.map((g): [TitleF, string] => [g, k(`consult.hub.degree.${g}`)])])}
        {choice<PayF>(k('consult.hub.payment'), draft.pay, (v) => setDraft((d) => ({ ...d, pay: v })), [['all', k('consult.hub.payAll')], ['insurance', k('consult.hub.payInsurance')], ['cash', k('consult.hub.payCash')]])}
        {choice<Sort>(k('consult.hub.sort'), draft.sort, (v) => setDraft((d) => ({ ...d, sort: v })), [['rating', k('consult.hub.sortRating')], ['price', k('consult.hub.sortPrice')], ...(nearestApplies(activeVt) ? [['nearest', k('consult.hub.nearest')] as [Sort, string]] : []), ['available_now', k('consult.hub.availableNow')], ['available_today', k('consult.hub.sortAvailable')]])}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Chip label={k('consult.hub.filtersClearAll')} onPress={() => { clearAll(); setShowFilter(false); }} theme={theme} testID="hub-filters-clear" />
          <Chip label={k('consult.hub.apply')} selected onPress={() => void commit(draft)} theme={theme} testID="hub-filters-apply" />
        </View>
      </Sheet>

      <Sheet open={showInsModal} title={stepIns === 1 ? k('consult.hub.insCompany') : k('consult.hub.insClass')} onClose={() => setShowInsModal(false)} onBack={stepIns === 2 ? () => setStepIns(1) : undefined} backLabel={k('consult.back')} closeLabel={k('consult.close')}>
        {stepIns === 1 ? (
          <>
            <Chip label={k('consult.hub.all')} selected={!insCompany} onPress={() => { setInsCompany(''); setInsClass(''); setShowInsModal(false); }} theme={theme} />
            {insuranceCompanies.map((company) => {
              const companyId = String(company.id || company._id || company.code || '');
              return <Chip key={companyId} label={nameOf(company)} selected={insCompany === companyId} onPress={() => { setInsCompany(companyId); setInsClass(''); setStepIns(2); }} theme={theme} />;
            })}
            {insuranceCatalogUnavailable ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center', padding: 16 }}>{k('consult.hub.insUnavailable')}</Text> : null}
          </>
        ) : (
          insuranceNetworks.map((network) => {
            const networkId = String(network.id || network._id || network.code || '');
            return <Chip key={networkId} label={nameOf(network)} selected={insClass === networkId} onPress={() => { setInsClass(networkId); setShowInsModal(false); }} theme={theme} />;
          })
        )}
      </Sheet>
    </Screen>
  );
}
