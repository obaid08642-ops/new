import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, FIcon, Search, type FillIconName, type ServiceTone } from '../../../../packages/ui-native/src';
import MapView, { Marker, PROVIDER_DEFAULT } from '../MapPrimitives';
import { Chevron, Sheet, goBack, RX_TONE, CARE_TONE } from '../consult/ConsultKit';
import { Notice } from '../health/HealthKit';
import { Glyph } from '../pharmacy/PharmacyKit';
import { step as scale, tint, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { pickLocalized } from '../../utils/localize';

/**
 * The providers map (`/map`, restyle): GET /providers/map?type&lat&lng&radius around the phone's position, and GET /user/insurance for the
 * "your insurance is accepted" line. A provider appears as a marker only when the server gave it a position; the rating, distance, time
 * and price are drawn only when the server sent them. The marker is a token-coloured pin per kind (no 3D shapes); a tap opens the
 * provider's sheet with directions and the way to book.
 */

type Kind = 'doctor' | 'hospital' | 'pharmacy' | 'lab' | 'nursing';
const KINDS: Kind[] = ['doctor', 'hospital', 'pharmacy', 'lab', 'nursing'];
const LOOK: Record<Kind, { icon: FillIconName; tone: ServiceTone }> = {
  doctor: { icon: 'stethoscope', tone: 'blue' },
  hospital: { icon: 'hospital', tone: 'violet' },
  pharmacy: { icon: 'pill', tone: RX_TONE },
  lab: { icon: 'test-tube', tone: 'mint' },
  nursing: { icon: 'first-aid-kit', tone: CARE_TONE },
};
/** The centre of Riyadh until the phone gives its position (the map has to open somewhere). */
const START = { latitude: 24.7136, longitude: 46.6753, latitudeDelta: 0.05, longitudeDelta: 0.05 };

interface Provider {
  id: string;
  name: string;
  kind: Kind;
  rating: number | null;
  reviews: number;
  distance: number | null;
  eta: number | null;
  isOpen: boolean | null;
  price: number | null;
  lat: number | null;
  lng: number | null;
  specialties: string[];
  insurance: string[];
}

const kindOf = (raw: unknown): Kind => (KINDS as string[]).includes(String(raw)) ? (raw as Kind) : 'doctor';
const numberOrNull = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const textList = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

function readProvider(p: Record<string, unknown>): Provider {
  const location = (p.location ?? {}) as { lat?: unknown; lng?: unknown };
  const distance = numberOrNull(p.distance_km ?? p.distance);
  return {
    id: String(p.id || p._id),
    name: pickLocalized(p.name_ar as string, (p.name || p.full_name || p.clinic_name) as string) || '',
    kind: kindOf(p.type || p.provider_type),
    rating: numberOrNull(p.rating ?? p.avg_rating),
    reviews: numberOrNull(p.reviews_count ?? p.total_reviews) ?? 0,
    distance,
    eta: numberOrNull(p.eta_minutes) ?? (distance !== null ? Math.round(distance * 4) : null),
    isOpen: typeof (p.is_available ?? p.is_open) === 'boolean' ? ((p.is_available ?? p.is_open) as boolean) : null,
    price: numberOrNull(p.consultation_fee ?? p.price),
    lat: numberOrNull(p.lat ?? p.latitude ?? location.lat),
    lng: numberOrNull(p.lng ?? p.longitude ?? location.lng),
    specialties: textList(p.specialties ?? p.services),
    insurance: textList(p.accepted_insurance ?? p.insurance_providers),
  };
}

function Pin({ kind, selected, open }: { kind: Kind; selected: boolean; open: boolean | null }) {
  const { c } = useScreenUi();
  const tone = c.service[LOOK[kind].tone];
  const size = selected ? 46 : 38;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? tone.fg : tone.bg, borderWidth: 2, borderColor: tone.fg }}>
      <Glyph name={LOOK[kind].icon} size={selected ? 22 : 18} color={selected ? tone.bg : tone.fg} />
      {open !== null ? <View style={{ position: 'absolute', top: -2, end: -2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: c.bg.surface, backgroundColor: open ? c.status.success.fill : c.status.danger.fg }} /> : null}
    </View>
  );
}

export function ProvidersMapView() {
  const insets = useSafeAreaInsets();
  const { k, theme, t, c, flow, isRTL, num, money } = useScreenUi();
  const mapRef = useRef<MapView>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Provider | null>(null);
  const [insurance, setInsurance] = useState<string | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const fetchProviders = useCallback(
    async (lat?: number, lng?: number) => {
      try {
        const params = new URLSearchParams();
        if (lat) params.set('lat', String(lat));
        if (lng) params.set('lng', String(lng));
        params.set('radius', '15');
        const response = await apiFetch(`/providers/map?${params.toString()}`);
        const body = response as { data?: unknown; results?: unknown } | null;
        const list: unknown[] = Array.isArray(response) ? response : Array.isArray(body?.data) ? body.data : Array.isArray(body?.results) ? body.results : [];
        setProviders(list.map((row) => readProvider(row as Record<string, unknown>)));
        setFailed(false);
      } catch (e) {
        logError('map:providers', e);
        setFailed(true);
      }
    },
    [],
  );

  useEffect(() => {
    let alive = true;
    apiFetch('/user/insurance')
      .then((response) => {
        const body = (response as { data?: { provider?: unknown }; provider?: unknown } | null) ?? {};
        const provider = body.data?.provider ?? body.provider;
        if (alive && typeof provider === 'string') setInsurance(provider);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          await fetchProviders();
          return;
        }
        const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const point = { lat: here.coords.latitude, lng: here.coords.longitude };
        setPosition(point);
        mapRef.current?.animateToRegion({ latitude: point.lat, longitude: point.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 800);
        await fetchProviders(point.lat, point.lng);
      } catch (e) {
        logError('map:position', e);
        await fetchProviders();
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchProviders]);

  const shown = useMemo(
    () =>
      providers.filter((p) => {
        const typeOk = kind === 'all' || p.kind === kind;
        const text = query.trim().toLowerCase();
        return typeOk && (!text || p.name.toLowerCase().includes(text) || p.specialties.some((s) => s.toLowerCase().includes(text)));
      }),
    [providers, kind, query],
  );
  const results = query.trim() ? shown.slice(0, 6) : [];
  const withPosition = shown.filter((p) => p.lat !== null && p.lng !== null);

  const focus = (p: Provider, delta = 0.015) => {
    if (p.lat !== null && p.lng !== null) mapRef.current?.animateToRegion({ latitude: p.lat, longitude: p.lng, latitudeDelta: delta, longitudeDelta: delta }, 800);
  };
  const pick = (p: Provider) => {
    Keyboard.dismiss();
    setQuery('');
    focus(p);
    setSelected(p);
  };
  const goToMe = async () => {
    try {
      let point = position;
      if (!point) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const here = await Location.getCurrentPositionAsync({});
        point = { lat: here.coords.latitude, lng: here.coords.longitude };
        setPosition(point);
      }
      mapRef.current?.animateToRegion({ latitude: point.lat, longitude: point.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 800);
    } catch (e) {
      logError('map:go-to-me', e);
    }
  };
  const directions = (p: Provider) => {
    if (p.lat === null || p.lng === null) return;
    const url = Platform.select({ ios: `maps:0,0?q=${encodeURIComponent(p.name)}@${p.lat},${p.lng}`, android: `geo:0,0?q=${p.lat},${p.lng}(${encodeURIComponent(p.name)})` });
    if (url) void Linking.openURL(url).catch(() => undefined);
  };
  const book = (p: Provider) => {
    setSelected(null);
    if (p.kind === 'doctor') router.push({ pathname: '/consultations/doctor-profile', params: { doctorId: p.id } } as unknown as Href);
    else if (p.kind === 'pharmacy') router.push('/(tabs)/pharmacy' as Href);
    else if (p.kind === 'lab') router.push('/diagnostics/book-sample' as Href);
    else if (p.kind === 'hospital') router.push('/(tabs)/consultations' as Href);
    else router.push('/(tabs)/nursing' as Href);
  };

  const panel = tint(c.bg.surface, 0.96);
  const stats: { icon: FillIconName; value: string; label: string }[] = selected
    ? [
        ...(selected.distance !== null ? [{ icon: 'map-pin' as FillIconName, value: k('map.km', { n: num(selected.distance, { maximumFractionDigits: 1 }) }), label: k('map.distance') }] : []),
        ...(selected.eta !== null ? [{ icon: 'clock-counter-clockwise' as FillIconName, value: k('map.min', { n: num(selected.eta) }), label: k('map.eta') }] : []),
        ...(selected.rating !== null ? [{ icon: 'star' as FillIconName, value: num(selected.rating, { maximumFractionDigits: 1 }), label: k('map.reviews', { n: num(selected.reviews) }) }] : []),
        ...(selected.price !== null && selected.price > 0 ? [{ icon: 'receipt' as FillIconName, value: `${money(selected.price)} ${k('pharmacy.currency')}`, label: k('map.price') }] : []),
      ]
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg.canvas }} testID="map-screen">
      <MapView ref={mapRef} style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0 }} provider={PROVIDER_DEFAULT} initialRegion={START} userInterfaceStyle={theme} showsUserLocation showsMyLocationButton={false} showsCompass={false} moveOnMarkerPress={false} onPress={() => { Keyboard.dismiss(); setQuery(''); }}>
        {withPosition.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.lat as number, longitude: p.lng as number }} tracksViewChanges={false} onPress={(e: { stopPropagation?: () => void }) => { e.stopPropagation?.(); setSelected(p); }}>
            <Pin kind={p.kind} selected={selected?.id === p.id} open={p.isOpen} />
          </Marker>
        ))}
      </MapView>

      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, start: 0, end: 0, paddingTop: insets.top + 8, paddingBottom: 8, paddingHorizontal: 16, gap: 10, backgroundColor: panel }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={k('consult.back')} onPress={() => goBack('/(tabs)' as Href)} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
            <Chevron back={!isRTL} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Search value={query} onChange={setQuery} placeholder={k('map.search')} onClear={() => setQuery('')} clearLabel={k('map.clear')} theme={theme} testID="map-search" />
          </View>
        </View>
        {results.length > 0 ? (
          <View style={{ borderRadius: 20, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, overflow: 'hidden' }}>
            {results.map((p, i) => (
              <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`${p.name}, ${k(`map.kind.${p.kind}`)}`} onPress={() => pick(p)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, minHeight: 56, borderBottomWidth: i === results.length - 1 ? 0 : 1, borderBottomColor: c.border.hairline }}>
                <FIcon icon={LOOK[p.kind].icon} tone={LOOK[p.kind].tone} chip="soft" size={36} theme={theme} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{p.name}</Text>
                  <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary, ...flow }}>{[k(`map.kind.${p.kind}`), p.distance !== null ? k('map.km', { n: num(p.distance, { maximumFractionDigits: 1 }) }) : ''].filter(Boolean).join(' · ')}</Text>
                </View>
                <Chevron />
              </Pressable>
            ))}
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" accessibilityRole="tablist" contentContainerStyle={{ gap: 8 }}>
          <Chip label={k('map.kind.all')} selected={kind === 'all'} onPress={() => setKind('all')} theme={theme} testID="map-kind-all" />
          {KINDS.map((key) => (
            <Chip key={key} label={k(`map.kind.${key}`)} selected={kind === key} onPress={() => setKind(key)} theme={theme} testID={`map-kind-${key}`} />
          ))}
        </ScrollView>
        {failed ? (
          <View style={{ gap: 8 }}>
            <Notice tone="danger" text={k('map.loadError')} />
            <Button label={k('consult.retry')} variant="outline" size="sm" onPress={() => void fetchProviders(position?.lat, position?.lng)} theme={theme} testID="map-retry" />
          </View>
        ) : loading ? (
          <Notice tone="info" text={k('common.loading')} />
        ) : providers.length === 0 ? (
          <Notice tone="info" text={k('map.empty')} />
        ) : null}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel={k('map.myLocation')} onPress={() => void goToMe()} style={{ position: 'absolute', end: 16, bottom: insets.bottom + (shown.length > 0 && !selected ? 132 : 24), width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} testID="map-my-location">
        <Glyph name="map-pin-line" size={22} color={c.icon.primary} />
      </Pressable>

      {!selected && shown.length > 0 ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', start: 0, end: 0, bottom: 0, paddingBottom: insets.bottom + 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {shown.slice(0, 5).map((p) => (
              <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={[p.name, k(`map.kind.${p.kind}`)].join(', ')} onPress={() => pick(p)} style={{ width: 168, borderRadius: 20, padding: 12, gap: 6, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} testID={`map-card-${p.id}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <FIcon icon={LOOK[p.kind].icon} tone={LOOK[p.kind].tone} chip="soft" size={36} theme={theme} />
                  {p.isOpen !== null ? <Text style={{ ...scale(t, 'tag', 'bold'), color: p.isOpen ? c.status.success.fg : c.status.danger.fg }}>{k(p.isOpen ? 'map.open' : 'map.closed')}</Text> : null}
                </View>
                <Text numberOfLines={1} style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{p.name}</Text>
                <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...flow }}>{[p.rating !== null ? num(p.rating, { maximumFractionDigits: 1 }) : '', p.distance !== null ? k('map.km', { n: num(p.distance, { maximumFractionDigits: 1 }) }) : ''].filter(Boolean).join(' · ')}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Sheet open={selected !== null} title={selected?.name ?? ''} onClose={() => setSelected(null)} closeLabel={k('consult.close')}>
        {selected ? (
          <>
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{[k(`map.kind.${selected.kind}`), selected.specialties.join(' · ')].filter(Boolean).join(' · ')}</Text>
            {stats.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {stats.map((stat) => (
                  <View key={stat.label} style={{ minWidth: 76, alignItems: 'center', gap: 2 }}>
                    <Glyph name={stat.icon} size={20} color={c.icon.primary} />
                    <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary }}>{stat.value}</Text>
                    <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary }}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {insurance && selected.insurance.includes(insurance) ? (
              <Notice tone="success" text={k('map.insuranceOk', { name: insurance })} />
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel={k('map.insuranceSetup')} onPress={() => { setSelected(null); router.push('/profile/insurance' as Href); }}>
                <Notice tone="info" text={k('map.insuranceSetup')} />
              </Pressable>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {selected.lat !== null && selected.lng !== null ? (
                <View style={{ flex: 1 }}>
                  <Button label={k('map.directions')} variant="outline" size="lg" fullWidth onPress={() => directions(selected)} theme={theme} testID="map-directions" />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Button label={k(`map.book.${selected.kind}`)} size="lg" fullWidth onPress={() => book(selected)} theme={theme} testID="map-book" />
              </View>
            </View>
          </>
        ) : null}
      </Sheet>
    </View>
  );
}
