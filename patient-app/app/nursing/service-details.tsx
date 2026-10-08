import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Radio } from '../../../packages/ui-native/src';
import { ConsultList, Dialog, Sheet } from '../../src/components/consult/ConsultKit';
import { NurseCard } from '../../src/components/nursing/NursingKit';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { pickDbField } from '../../src/utils/localize';

type Rec = Record<string, unknown>;
const text = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? '') : (v ?? ''));
type Sort = 'nearest' | 'highest_rated' | 'any';
const SORTS: Array<{ id: Sort; key: string }> = [
  { id: 'nearest', key: 'nur.sort.nearest' },
  { id: 'highest_rated', key: 'nur.sort.rating' },
  { id: 'any', key: 'nur.sort.any' },
];

/** The nurses who give a service (board ServiceHub list): a card each with facility, rating, distance, price and the select action; sort sheet; the injection policy before choosing. */
export default function NursingServiceDetails() {
  const { theme, t, c, k, num } = useScreenUi();
  const params = useLocalSearchParams<{ serviceId?: string; title?: string; flow?: string; gender?: string; availability?: string; nationality?: string; search?: string }>();
  const serviceId = first(params.serviceId);
  const title = first(params.title);
  const flow = first(params.flow);
  const [nurses, setNurses] = useState<Rec[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'offline' | 'ready'>('loading');
  const [sheet, setSheet] = useState(false);
  const [sort, setSort] = useState<Sort>('nearest');
  // Pre-booking lock (injection policy): the nurse waits here until the patient confirms having a prescription.
  const [lockFor, setLockFor] = useState<string | null>(null);

  const fetchNurses = useCallback(
    async (sortType: Sort) => {
      setStatus('loading');
      try {
        const res = await apiFetch<unknown>(`/home-care/providers?type=${serviceId}&sort=${sortType}&gender=${params.gender || 'any'}&availability=${params.availability || 'any'}&nationality=${params.nationality || 'any'}&search=${params.search || ''}`);
        setNurses(Array.isArray(res) ? (res as Rec[]) : []);
        setStatus('ready');
      } catch (err) {
        logError('nursing:service-details', err);
        setStatus((await isOffline()) ? 'offline' : 'error');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serviceId],
  );

  useEffect(() => {
    void fetchNurses(sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const choose = (id: string) => router.push({ pathname: '/nursing/nurse-profile', params: { nurseId: id, flow, serviceId } } as unknown as Href);
  const select = (id: string) => {
    // Injections and drips need a prescription the nurse can see.
    if (serviceId === 'injections' || serviceId === 'iv_drip' || title.includes('حقن') || title.includes('وريد')) setLockFor(id);
    else choose(id);
  };

  const top = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text accessibilityRole="header" style={{ flex: 1, minWidth: 0, ...scale(t, 'h4'), color: c.text.primary }}>{k('nur.details.nurses')}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${k('nur.sort.title')}: ${k(SORTS.find((s) => s.id === sort)?.key ?? 'nur.sort.any')}`} onPress={() => setSheet(true)} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 22, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, opacity: pressed ? 0.85 : 1 })}>
        <Glyph name="arrows-left-right" size={16} color={c.icon.primary} />
        <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, flexShrink: 1 }}>{k(SORTS.find((s) => s.id === sort)?.key ?? 'nur.sort.any')}</Text>
      </Pressable>
    </View>
  );

  return (
    <>
      <ConsultList
        testID="nursing-service-details"
        title={title || k('nur.details.title')}
        top={top}
        data={nurses}
        status={status}
        onRetry={() => void fetchNurses(sort)}
        onRefresh={() => void fetchNurses(sort)}
        empty={{ icon: 'user-circle', title: k('nur.details.empty'), body: k('nur.details.emptyBody') }}
        keyExtractor={(n, i) => text(n.id) || String(i)}
        renderItem={(n) => {
          const available = typeof n.available_now === 'boolean' ? n.available_now : null;
          const distance = n.distance_km !== undefined && n.distance_km !== null && Number.isFinite(Number(n.distance_km)) ? k('nur.km', { n: num(Number(n.distance_km), { maximumFractionDigits: 1 }) }) : '';
          const price = n.price !== undefined && n.price !== null && Number.isFinite(Number(n.price)) ? Number(n.price) : null;
          const rating = n.rating !== undefined && n.rating !== null && Number.isFinite(Number(n.rating)) ? Number(n.rating) : null;
          return (
            <NurseCard
              testID={`nursing-nurse-${text(n.id)}`}
              name={text(pickDbField(n, 'name') ?? n.name_ar ?? n.name)}
              facility={text(n.facility_name)}
              rating={rating}
              distance={distance}
              availableLabel={available === null ? null : available ? { label: k('nur.details.availableNow'), tone: 'mint' } : { label: k('nur.details.notNow'), tone: 'neutral' }}
              price={price}
              priceFallback={k('nur.details.priceAtBooking')}
              actionLabel={k('nur.details.select')}
              onPress={() => select(text(n.id))}
            />
          );
        }}
      />
      <Sheet open={sheet} title={k('nur.sort.title')} onClose={() => setSheet(false)} closeLabel={k('nur.close')}>
        <View>
          {SORTS.map((s, i) => (
            <Radio
              key={s.id}
              theme={theme}
              label={k(s.key)}
              selected={sort === s.id}
              divider={i < SORTS.length - 1}
              onChange={() => {
                setSort(s.id);
                setSheet(false);
                void fetchNurses(s.id);
              }}
            />
          ))}
        </View>
      </Sheet>
      <Dialog open={lockFor !== null} icon="warning" title={k('nur.rx.title')} body={k('nur.rx.body')}>
        <Button
          theme={theme}
          size="lg"
          fullWidth
          label={k('nur.rx.agree')}
          onPress={() => {
            const id = lockFor;
            setLockFor(null);
            if (id) choose(id);
          }}
        />
        <Button theme={theme} size="lg" fullWidth variant="outline" label={k('nur.rx.back')} onPress={() => setLockFor(null)} />
      </Dialog>
    </>
  );
}
