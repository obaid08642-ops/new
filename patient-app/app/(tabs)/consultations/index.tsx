import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { AppHeader, Chip, DoctorCard, EmptyState, FIcon, OfferCard, Screen, Search, useTabBarHeight } from '../../../../packages/ui-native/src';
import { COLUMN, step as scale, useScreenUi } from '../../../src/components/screen/ScreenKit';
import { MODE_LOOK, Section, Sheet, goBack, visitMode, specialtyLook, type VisitMode } from '../../../src/components/consult/ConsultKit';
import { Glyph } from '../../../src/components/pharmacy/PharmacyKit';
import { apiFetch } from '../../../src/utils/api';
import { logError } from '../../../src/utils/logger';
import { pickLocalized } from '../../../src/utils/localize';

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

type Sort = 'rating' | 'price';
type TitleF = 'all' | 'specialist' | 'consultant';
type GenderF = 'all' | 'male' | 'female';
type PriceF = 'all' | 'low' | 'mid' | 'high';
const TITLE_WORDS: Record<Exclude<TitleF, 'all'>, string[]> = { specialist: ['أخصائي', 'specialist'], consultant: ['استشاري', 'consultant'] };
const priceOf = (d: Doc): number => d.consultation_fee || Number(String(d.p ?? '0').replace(/\D/g, '')) || 0;

export default function Consultations() {
  const { theme, t, c, flow, dir, k, num, money } = useScreenUi();
  const barHeight = useTabBarHeight();
  const [activePay, setActivePay] = useState<'all' | 'cash' | 'insurance'>('all');
  const [activeVt, setActiveVt] = useState<VisitMode>('clinic');
  const [activeSpec, setActiveSpec] = useState('');
  const [doctors, setDoctors] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialties, setSpecialties] = useState<Spec[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filterTitle, setFilterTitle] = useState<TitleF>('all');
  const [filterGender, setFilterGender] = useState<GenderF>('all');
  const [filterPrice, setFilterPrice] = useState<PriceF>('all');
  const [filterSort, setFilterSort] = useState<Sort>('rating');
  const [showInsModal, setShowInsModal] = useState(false);
  const [insCompany, setInsCompany] = useState('');
  const [insClass, setInsClass] = useState('');
  const [stepIns, setStepIns] = useState(1);
  const [insuranceCompanies, setInsuranceCompanies] = useState<Named[]>([]);
  const [insuranceNetworks, setInsuranceNetworks] = useState<Named[]>([]);
  const [insuranceCatalogUnavailable, setInsuranceCatalogUnavailable] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await apiFetch<ProviderRow[]>('/providers?type=doctor');
        // Normalize real provider-profile fields into the card display shape
        const normalized = (Array.isArray(data) ? data : []).map((x) => {
          return {
            ...x,
            n: pickLocalized(x.name_ar, x.name_en) || '',
            sp: [x.title, x.specialty].filter(Boolean).join(' — '),
            specialty_ar: x.specialty,
            badge: x.title || '',
            loc: [x.district, x.city].filter(Boolean).join('، '),
            addr: x.address || '',
            services: (Array.isArray(x.consultation_modes) ? x.consultation_modes : []).map((m) => (m === 'video' ? 'online' : m)),
            r: x.rating_avg ?? null,
            rev: x.rating_count ?? 0,
            p: (typeof x.price_clinic === 'number' ? x.price_clinic : null) ?? x.price_online ?? x.price_home ?? null,
          } as Doc;
        });
        setDoctors(normalized);
      } catch (err) {
        logError('consultations:fetch-doctors', err);
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchDoctors();

    // Real specialties (names + live doctor counts) and real active offers
    apiFetch<Spec[] | { data?: Spec[] }>('/care/specialties')
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
        const matchesTitle = filterTitle === 'all' || TITLE_WORDS[filterTitle].some((w) => (d.sp || d.badge || d.biography || '').toLowerCase().includes(w));
        const price = priceOf(d);
        const matchesPrice = filterPrice === 'all' || (filterPrice === 'low' ? price < 100 : filterPrice === 'mid' ? price >= 100 && price <= 200 : price > 200);

        return matchesSearch && matchesVt && matchesPay && matchesSpec && matchesGender && matchesTitle && matchesPrice;
      })
      .sort((a, b) => {
        if (filterSort === 'price') return priceOf(a) - priceOf(b);
        return (b.rating || Number(b.r || 0)) - (a.rating || Number(a.r || 0));
      });
  }, [doctors, searchQuery, activeVt, activePay, activeSpec, insCompany, insClass, filterGender, filterTitle, filterPrice, filterSort]);

  const openDoctor = (d: Doc) => router.push((d.id ? `/consultations/doctor/${d.id}` : '/consultations/doctor-search') as Href);
  const filtersOn = filterSort !== 'rating' || filterTitle !== 'all' || filterGender !== 'all' || filterPrice !== 'all';
  const nameOf = (n: Named) => pickLocalized(n.name_ar, n.name_en || n.name) || n.code || '';
  const listed = filteredDocs.slice(0, 10);

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
        actions={[{ key: 'appointments', label: k('consult.appt.title'), icon: <Glyph name="calendar-dots" size={20} color={c.icon.primary} />, onPress: () => router.push('/consultations/appointments' as Href) }]}
        theme={theme}
        direction={dir}
      />
    </View>
  );

  return (
    <Screen theme={theme} direction={dir} header={header} scroll edges={['top', 'start', 'end']} testID="consultations-hub">
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: barHeight + 40, gap: 16 }}>
        <Search value={searchQuery} onChange={setSearchQuery} placeholder={k('consult.hub.search')} label={k('consult.hub.search')} onFilterPress={() => setShowFilter(true)} filterLabel={k('consult.hub.filter')} onClear={() => setSearchQuery('')} clearLabel={k('consult.hub.clear')} theme={theme} testID="hub-search" />
        {filtersOn ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.hub.filtersOn')}</Text> : null}

        <View accessibilityRole="radiogroup" accessibilityLabel={k('consult.hub.visitType')} style={{ flexDirection: 'row', gap: 8 }}>
          {(['clinic', 'home', 'online'] as VisitMode[]).map((m) => {
            const on = activeVt === m;
            return (
              <Pressable key={m} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={k(`consult.mode.${m}`)} onPress={() => setActiveVt(m)} style={{ flex: 1, minWidth: 0, minHeight: 48, borderRadius: 16, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: on ? c.action.selected.bg : c.bg.surface, borderWidth: on ? 0 : 1, borderColor: c.border.hairline }}>
                <Glyph name={MODE_LOOK[m].icon} size={18} color={on ? c.action.selected.fg : c.icon.primary} />
                <Text style={{ ...scale(t, 'small', 'bold'), color: on ? c.action.selected.fg : c.text.primary, flexShrink: 1 }}>{k(`consult.mode.${m}`)}</Text>
              </Pressable>
            );
          })}
        </View>

        <View accessibilityRole="radiogroup" accessibilityLabel={k('consult.hub.payment')} style={{ alignSelf: 'flex-start', flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: c.bg.sunken }}>
          {([['all', 'consult.hub.payAll'], ['cash', 'consult.hub.payCash'], ['insurance', 'consult.hub.payInsurance']] as const).map(([id, key]) => {
            const on = activePay === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={k(key)}
                onPress={() => {
                  setActivePay(id);
                  if (id === 'insurance') {
                    setStepIns(1);
                    setShowInsModal(true);
                  }
                }}
                style={{ minHeight: 44, minWidth: 64, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.bg.surface : 'transparent' }}
              >
                <Text style={{ ...scale(t, 'small', on ? 'bold' : 'medium'), color: c.text.primary }}>{k(key)}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Specialties — the real list from /care/specialties with live doctor counts */}
        {specialties.length > 0 ? (
          <Section title={k('consult.hub.specialties')} actionLabel={k('consult.hub.viewAll')} onAction={() => router.push('/consultations/specialty-select' as Href)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {specialties
                .filter((s) => (s.count || 0) > 0)
                .slice(0, 10)
                .map((s, i) => {
                  const name = s.name_ar || s.name_en || s.specialty || '';
                  const on = activeSpec === s.name_ar;
                  const look = specialtyLook(name);
                  return (
                    <Pressable key={s.slug || i} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={name} onPress={() => setActiveSpec(on ? '' : s.name_ar || '')} style={{ width: 72, minHeight: 44, alignItems: 'center', gap: 6 }}>
                      <View style={{ borderRadius: 22, borderWidth: on ? 2 : 0, borderColor: c.action.selected.bg, padding: on ? 2 : 0 }}>
                        <FIcon icon={look.icon} tone={look.tone} size={58} theme={theme} />
                      </View>
                      <Text style={{ ...scale(t, 'meta', on ? 'bold' : 'medium'), color: c.text.primary, textAlign: 'center' }}>{name}</Text>
                      {typeof s.count === 'number' ? <Text style={{ ...scale(t, 'micro', 'regular'), color: c.text.tertiary }}>{k('consult.spec.count', { n: num(s.count) })}</Text> : null}
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
                <View key={i} style={{ height: 200, borderRadius: 28, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
              ))}
            </View>
          ) : listed.length === 0 ? (
            <EmptyState icon="stethoscope" tone="blue" title={k('consult.hub.empty')} body={k('consult.hub.emptyBody')} theme={theme} />
          ) : (
            listed.map((d, i) => (
              <DoctorCard
                key={d.id || i}
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
                price={d.p != null ? money(Number(d.p)) : undefined}
                currency={d.p != null ? k('consult.currency') : undefined}
                bookLabel={k('consult.hub.book')}
                onPress={() => openDoctor(d)}
                onBook={() => openDoctor(d)}
                theme={theme}
                testID={`hub-doctor-${i}`}
              />
            ))
          )}
          {filteredDocs.length > 10 ? (
            <Pressable accessibilityRole="button" accessibilityLabel={k('consult.hub.seeAll', { n: num(filteredDocs.length) })} onPress={() => router.push('/consultations/doctor-search' as Href)} style={{ minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
              <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.link }}>{k('consult.hub.seeAll', { n: num(filteredDocs.length) })}</Text>
            </Pressable>
          ) : null}
        </Section>
      </View>

      <Sheet open={showFilter} title={k('consult.hub.advanced')} onClose={() => setShowFilter(false)} closeLabel={k('consult.close')}>
        {choice<Sort>(k('consult.hub.sort'), filterSort, setFilterSort, [['rating', k('consult.hub.sortRating')], ['price', k('consult.hub.sortPrice')]])}
        {choice<TitleF>(k('consult.hub.grade'), filterTitle, setFilterTitle, [['all', k('consult.hub.all')], ['specialist', k('consult.hub.specialist')], ['consultant', k('consult.hub.consultant')]])}
        {choice<GenderF>(k('consult.hub.gender'), filterGender, setFilterGender, [['all', k('consult.hub.all')], ['male', k('consult.hub.male')], ['female', k('consult.hub.female')]])}
        {choice<PriceF>(k('consult.hub.price'), filterPrice, setFilterPrice, [['all', k('consult.hub.all')], ['low', k('consult.hub.priceLow', { n: num(100) })], ['mid', k('consult.hub.priceMid', { a: num(100), b: num(200) })], ['high', k('consult.hub.priceHigh', { n: num(200) })]])}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Chip label={k('consult.hub.reset')} onPress={() => { setFilterSort('rating'); setFilterTitle('all'); setFilterGender('all'); setFilterPrice('all'); }} theme={theme} />
          <Chip label={k('consult.hub.apply')} selected onPress={() => setShowFilter(false)} theme={theme} />
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
