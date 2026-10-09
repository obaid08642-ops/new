import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Chip, EmptyState, ErrorState, OfflineState, Screen, Search, Segmented, useTabBarHeight } from '../../../packages/ui-native/src';
import { CARE_TONE, Section, Sheet } from '../../src/components/consult/ConsultKit';
import { PackageCard, PillLink, Strip } from '../../src/components/diagnostics/DiagKit';
import { ServiceCard, serviceGlyph } from '../../src/components/nursing/NursingKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { pickDbField, pickLocalized } from '../../src/utils/localize';

type Rec = Record<string, unknown>;
type Flow = 'insurance' | 'cash';
const text = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
const priceOf = (v: unknown): number | null => (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

const GENDERS = [
  { id: 'any', key: 'nur.filter.all' },
  { id: 'male', key: 'nur.filter.male' },
  { id: 'female', key: 'nur.filter.female' },
];
const AVAILABILITY = [
  { id: 'any', key: 'nur.filter.all' },
  { id: 'now', key: 'nur.filter.now' },
];
const NATIONALITIES = [
  { id: 'any', key: 'nur.filter.all' },
  { id: 'saudi', key: 'nur.filter.saudi' },
  { id: 'filipino', key: 'nur.filter.filipino' },
  { id: 'egyptian', key: 'nur.filter.egyptian' },
];

/** The hub of home nursing (board ServiceHub): my visits, search and filters, how the visit is paid, the care packages and the services. */
export default function NursingHub() {
  const { theme, dir, t, c, k, flow: textFlow } = useScreenUi();
  const barHeight = useTabBarHeight();
  const [paymentFlow, setPaymentFlow] = useState<Flow>('cash');
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(false);
  const [gender, setGender] = useState('any');
  const [availability, setAvailability] = useState('any');
  const [nationality, setNationality] = useState('any');
  const [services, setServices] = useState<Rec[]>([]);
  const [packages, setPackages] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(null);
    const [servicesRes, packagesRes] = await Promise.all([
      apiFetch<unknown>('/home-care/services').catch((e) => {
        logError('nursing:tab', e);
        return null;
      }),
      apiFetch<unknown>('/home-care/packages').catch((e) => {
        logError('nursing:tab', e);
        return null;
      }),
    ]);
    if (servicesRes) setServices(Array.isArray(servicesRes) ? (servicesRes as Rec[]) : []);
    if (packagesRes) setPackages(Array.isArray(packagesRes) ? (packagesRes as Rec[]) : (((packagesRes as { data?: Rec[] }).data) ?? []));
    if (!servicesRes && !packagesRes) setFailed((await isOffline()) ? 'offline' : 'error');
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toService = (id: string, title: string) =>
    router.push({ pathname: '/nursing/service-details', params: { serviceId: id, title, flow: paymentFlow, gender, availability, nationality, search } } as unknown as Href);
  // A card opens the service profile (image, full description, book now)
  const toInfo = (id: string) => router.push({ pathname: '/nursing/service-info', params: { serviceId: id, flow: paymentFlow, gender, availability, nationality, search } } as unknown as Href);

  const reset = () => {
    setGender('any');
    setAvailability('any');
    setNationality('any');
  };
  const group = (title: string, options: Array<{ id: string; key: string }>, value: string, set: (v: string) => void) => (
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={{ ...scale(t, 'small', 'bold'), color: c.text.secondary, ...textFlow }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => (
          <Chip key={o.id} theme={theme} label={k(o.key)} selected={value === o.id} onPress={() => set(o.id)} />
        ))}
      </View>
    </View>
  );

  const nothing = !loading && !failed && services.length === 0 && packages.length === 0;

  return (
    <Screen
      theme={theme}
      direction={dir}
      edges={['top', 'start', 'end']}
      scroll
      bottomSpace={barHeight + 16}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} tintColor={c.text.primary} />}
      testID="nursing-hub"
    >
      <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text accessibilityRole="header" style={{ flex: 1, minWidth: 0, ...scale(t, 'h1'), color: c.text.primary, ...textFlow }}>{k('nur.hub.title')}</Text>
          <View style={{ flexShrink: 1 }}>
            <PillLink icon="clock-counter-clockwise" label={k('nur.hub.myVisits')} onPress={() => router.push('/nursing/visits' as Href)} />
          </View>
        </View>

        <Search theme={theme} variant="inline" value={search} onChange={setSearch} onClear={() => setSearch('')} clearLabel={k('nur.clear')} placeholder={k('nur.hub.search')} label={k('nur.hub.search')} onFilterPress={() => setSheet(true)} filterLabel={k('nur.hub.filter')} />

        {failed === 'error' ? <ErrorState title={k('consult.error.title')} body={k('consult.error.body')} retryLabel={k('consult.retry')} onRetry={() => void load()} theme={theme} /> : null}
        {failed === 'offline' ? <OfflineState title={k('consult.offline.title')} body={k('consult.offline.body')} retryLabel={k('consult.retry')} onRetry={() => void load()} theme={theme} /> : null}

        {failed ? null : (
          <Segmented
            theme={theme}
            label={k('nur.pay.group')}
            options={[
              { value: 'insurance', label: k('nur.pay.insurance') },
              { value: 'cash', label: k('nur.pay.cash') },
            ]}
            value={paymentFlow}
            onChange={(v) => setPaymentFlow(v as Flow)}
          />
        )}

        {loading ? (
          <View accessibilityLabel={k('consult.loading')} accessibilityState={{ busy: true }} style={{ gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ height: 120, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
            ))}
          </View>
        ) : null}

        {nothing ? <EmptyState icon="first-aid-kit" tone={CARE_TONE} title={k('nur.hub.empty')} theme={theme} /> : null}

        {!loading && !failed && !nothing ? (
          <View style={{ gap: 22 }}>
            <Section title={k('nur.hub.packages')}>
              {packages.length > 0 ? (
                <Strip>
                  {packages.map((pkg) => {
                    const name = text(pickLocalized(pkg.name_ar as string | undefined, pkg.title as string | undefined));
                    const kind = pkg.type === 'monthly' ? k('nur.hub.monthly') : pkg.type === 'weekly' ? k('nur.hub.weekly') : text(pkg.duration) || k('nur.hub.careService');
                    return <PackageCard key={text(pkg.id)} width={268} name={name} desc={kind} price={priceOf(pkg.price)} icon="first-aid-kit" tone={CARE_TONE} actionLabel={k('nur.hub.book')} onPress={() => toService(text(pkg.id), name)} />;
                  })}
                </Strip>
              ) : (
                <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('nur.hub.noPackages')}</Text>
              )}
            </Section>

            <Section title={k('nur.hub.services')}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {services.map((svc) => {
                  const title = text(pickDbField(svc, 'name') ?? svc.name_ar ?? svc.name_en ?? svc.title);
                  const look = serviceGlyph(svc.id);
                  return (
                    <ServiceCard
                      key={text(svc.id)}
                      title={title}
                      desc={text(pickDbField(svc, 'description')) || undefined}
                      image={text(svc.image_url ?? svc.image) || null}
                      icon={look.icon}
                      price={priceOf(svc.price)}
                      onPress={() => toInfo(text(svc.id))}
                      actionLabel={k('nur.hub.book')}
                      onAction={() => toService(text(svc.id), title)}
                    />
                  );
                })}
              </View>
            </Section>
          </View>
        ) : null}
      </View>

      <Sheet open={sheet} title={k('nur.filter.title')} onClose={() => setSheet(false)} closeLabel={k('nur.close')}>
        <View style={{ gap: 18 }}>
          {group(k('nur.filter.gender'), GENDERS, gender, setGender)}
          {group(k('nur.filter.availability'), AVAILABILITY, availability, setAvailability)}
          {group(k('nur.filter.nationality'), NATIONALITIES, nationality, setNationality)}
          <View style={{ gap: 8 }}>
            <Button theme={theme} size="lg" fullWidth label={k('nur.filter.apply')} onPress={() => setSheet(false)} />
            <Button theme={theme} size="lg" fullWidth variant="outline" label={k('nur.filter.reset')} onPress={reset} />
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}
