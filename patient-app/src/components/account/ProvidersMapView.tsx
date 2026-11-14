import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, FlatList, Keyboard, Linking, Platform, Pressable, ScrollView, Text, View, useWindowDimensions, type ListViewToken as ViewToken } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, FIcon, Search, type FillIconName, type ServiceTone } from '../../../../packages/ui-native/src';
import { SERVICE_ICONS } from '../../../../packages/ui/icons/fill';
import MapView, { HologramLayer, Marker, PROVIDER_DEFAULT } from '../MapPrimitives';
import { HOLO_KINDS, HOLO_LOOK, holoMotion, isHoloKind, toFeatureCollection, type HoloKind } from '../map-hologram';
import { Chevron, Sheet, goBack } from '../consult/ConsultKit';
import { Notice } from '../health/HealthKit';
import { Glyph } from '../pharmacy/PharmacyKit';
import { step as scale, tint, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { pickLocalized } from '../../utils/localize';
import { parseMapKind } from '../../utils/mapEntry';
import { getSelectedAddress } from '../../utils/selectedAddress';
import { cardWidth, filterProviders, mapPhase, pickViewable, resolveCentre, savedPoint, sortNearest, type Point } from '../map-explorer';

/**
 * The providers map (`/map`, restyle): GET /providers/map?type&lat&lng&radius around the phone's position, and GET /user/insurance for the
 * "your insurance is accepted" line. A provider appears as a marker only when the server gave it a position; the rating, distance, time
 * and price are drawn only when the server sent them. Every provider is a hologram pin in its kind's service tone, drawn by the
 * map's native clustered layers; the selected one is a React marker with a beam, a lifted icon bubble and a pulse ring. A tap opens the
 * provider's sheet with directions and the way to book.
 *
 * Full-screen map first: the type chips on top, a bottom carousel of small provider cards ordered nearest first and kept in step with the
 * markers (a tap on a marker scrolls its card in and a swipe to a card pans the map to it), and the list as a secondary toggle. The map is
 * drawn when there is nothing to show too, with a friendly card on top. Without the phone's position it is centred on the selected
 * (else default) saved address, else on the default centre.
 */

type Kind = HoloKind;
const KINDS: readonly Kind[] = HOLO_KINDS;
const ICONS: Record<Kind, FillIconName> = { doctor: 'stethoscope', hospital: 'hospital', pharmacy: 'pill', lab: 'test-tube', radiology: 'scan', nursing: 'first-aid-kit' };
const LOOK: Record<Kind, { icon: FillIconName; tone: ServiceTone }> = Object.fromEntries(KINDS.map((key) => [key, { icon: ICONS[key], tone: HOLO_LOOK[key].tone }])) as Record<Kind, { icon: FillIconName; tone: ServiceTone }>;
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

const kindOf = (raw: unknown): Kind => (isHoloKind(raw) ? raw : 'doctor');
const numberOrNull = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const textList = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

/**
 * One row of GET /providers/map, read in the server's one shape (#766): id, type, name_ar, name_en, rating, lat, lng,
 * distance_km, rating_count, accepted_insurance. The answer carries no open state or price, so those stay empty.
 */
function readProvider(p: Record<string, unknown>): Provider {
  const distance = numberOrNull(p.distance_km);
  return {
    id: String(p.id ?? ''),
    name: pickLocalized(p.name_ar as string, p.name_en as string) || '',
    kind: kindOf(p.type),
    rating: numberOrNull(p.rating),
    reviews: numberOrNull(p.rating_count) ?? 0,
    distance,
    eta: distance !== null ? Math.round(distance * 4) : null,
    isOpen: null,
    price: null,
    lat: numberOrNull(p.lat),
    lng: numberOrNull(p.lng),
    specialties: textList(p.specialties),
    insurance: textList(p.accepted_insurance),
  };
}

/** The selected provider: flattened base platform, light beam, lifted icon bubble with a glow, and a pulse ring (none under reduced motion). */
function HologramPin({ kind, name }: { kind: Kind; name: string }) {
  const { c } = useScreenUi();
  const tone = c.service[LOOK[kind].tone];
  const shape = HOLO_LOOK[kind].shape;
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => { if (alive) setReduce(on); }).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => { alive = false; sub.remove(); };
  }, []);
  const motion = holoMotion(reduce);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!motion.pulse) { pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [motion.pulse, pulse]);
  const base = shape === 'rectangle' ? { width: 52, height: 36, borderRadius: 6 } : shape === 'square' ? { width: 44, height: 44, borderRadius: 6 } : shape === 'rounded' ? { width: 44, height: 44, borderRadius: 14 } : shape === 'diamond' ? { width: 34, height: 34, borderRadius: 4 } : { width: 44, height: 44, borderRadius: 22 };
  const rotate = shape === 'diamond' ? [{ rotateX: '55deg' }, { rotateZ: '45deg' }] : [{ rotateX: '55deg' }];
  return (
    <View style={{ width: 96, height: 120, alignItems: 'center', justifyContent: 'flex-end' }} accessible accessibilityLabel={name}>
      <Text numberOfLines={1} style={{ position: 'absolute', top: 0, maxWidth: 96, color: tone.fg, backgroundColor: tint(c.bg.surface, 0.92), paddingHorizontal: 6, borderRadius: 8, fontSize: 11 }}>{name}</Text>
      {motion.pulse ? <Animated.View style={{ position: 'absolute', bottom: 38, width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: tone.fg, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ rotateX: '55deg' }, { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.4] }) }] }} /> : null}
      <View style={{ ...base, backgroundColor: tint(tone.fg, 0.32), borderWidth: 2, borderColor: tone.fg, transform: rotate, marginBottom: 38 }} />
      <View style={{ position: 'absolute', bottom: 50, width: 22, height: 40, borderTopLeftRadius: 11, borderTopRightRadius: 11, backgroundColor: tint(tone.fg, 0.22) }} />
      <View style={{ position: 'absolute', bottom: 76, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.bg, borderWidth: 2, borderColor: tone.fg, shadowColor: tone.fg, shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 }}>
        <Glyph name={LOOK[kind].icon} size={22} color={tone.fg} />
      </View>
    </View>
  );
}

/** A card counts as on screen when 80% of it is (a stable object: the list refuses a new one on the fly). */
const CARD_VIEWABILITY = { itemVisiblePercentThreshold: 80 } as const;

/** A small provider card: the carousel's item and the list's row. The rating and the distance are drawn only when the server sent them. */
function ProviderCard({ p, width, on, onPress }: { p: Provider; width: number | undefined; on: boolean; onPress: () => void }) {
  const { k, theme, t, c, flow, num } = useScreenUi();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={[p.name, k(`map.kind.${p.kind}`)].join(', ')} onPress={onPress} style={{ width, borderRadius: 20, padding: 12, gap: 6, backgroundColor: c.bg.surface, borderWidth: on ? 2 : 1, borderColor: on ? c.action.primary.bg : c.border.hairline }} testID={`map-card-${p.id}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <FIcon icon={LOOK[p.kind].icon} tone={LOOK[p.kind].tone} chip="soft" size={36} theme={theme} />
        {p.isOpen !== null ? <Text style={{ ...scale(t, 'tag', 'bold'), color: p.isOpen ? c.status.success.fg : c.status.danger.fg }}>{k(p.isOpen ? 'map.open' : 'map.closed')}</Text> : null}
      </View>
      <Text numberOfLines={1} style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{p.name}</Text>
      <Text numberOfLines={1} style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...flow }}>{[k(`map.kind.${p.kind}`), p.rating !== null ? num(p.rating, { maximumFractionDigits: 1 }) : '', p.distance !== null ? k('map.km', { n: num(p.distance, { maximumFractionDigits: 1 }) }) : ''].filter(Boolean).join(' · ')}</Text>
    </Pressable>
  );
}

export function ProvidersMapView() {
  const insets = useSafeAreaInsets();
  const { k, theme, t, c, flow, isRTL, num, money } = useScreenUi();
  const mapRef = useRef<MapView>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  // `/map?type=pharmacy` opens the map filtered to that kind (the entries on Home and the provider lists pass it)
  const params = useLocalSearchParams<{ type?: string | string[] }>();
  const typeParam = parseMapKind(params.type);
  const [kind, setKind] = useState<Kind | 'all'>(typeParam ?? 'all');
  useEffect(() => {
    setKind(typeParam ?? 'all');
  }, [typeParam]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Provider | null>(null);
  // the sheet with directions and booking: opened from a card, not by the marker, so the carousel stays in view
  const [detail, setDetail] = useState<Provider | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [headerH, setHeaderH] = useState(160);
  const [saved, setSaved] = useState<Point | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const cardRef = useRef<FlatList<Provider>>(null);
  const selectedId = useRef<string | null>(null);
  const [insurance, setInsurance] = useState<string | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [noLocation, setNoLocation] = useState(false);

  const fetchProviders = useCallback(
    async (lat?: number, lng?: number) => {
      try {
        const params = new URLSearchParams();
        if (lat) params.set('lat', String(lat));
        if (lng) params.set('lng', String(lng));
        params.set('radius_km', '15');
        const response = await apiFetch(`/providers/map?${params.toString()}`);
        const list: unknown[] = Array.isArray(response) ? response : [];
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
          setNoLocation(true);
          // no position: the selected (else default) saved address centres the map and the area read
          const here = savedPoint(await getSelectedAddress());
          setSaved(here);
          if (here) mapRef.current?.animateToRegion({ latitude: here.lat, longitude: here.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }, 800);
          await fetchProviders(here?.lat, here?.lng);
          return;
        }
        const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const point = { lat: here.coords.latitude, lng: here.coords.longitude };
        setPosition(point);
        mapRef.current?.animateToRegion({ latitude: point.lat, longitude: point.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 800);
        await fetchProviders(point.lat, point.lng);
      } catch (e) {
        logError('map:position', e);
        const here = savedPoint(await getSelectedAddress());
        setSaved(here);
        if (here) mapRef.current?.animateToRegion({ latitude: here.lat, longitude: here.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }, 800);
        await fetchProviders(here?.lat, here?.lng);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchProviders]);

  const centre = useMemo(() => resolveCentre(position, saved).point, [position, saved]);
  const shown = useMemo(() => sortNearest(filterProviders(providers, kind, query), centre), [providers, kind, query, centre]);
  const phase = mapPhase({ loading, failed, total: providers.length, shown: shown.length, filtered: kind !== 'all' || query.trim() !== '' });
  const results = query.trim() ? shown.slice(0, 6) : [];
  const features = useMemo(() => toFeatureCollection(shown), [shown]);
  const viewDelta = useRef(START.latitudeDelta);
  const shownRef = useRef<Provider[]>([]);
  shownRef.current = shown;

  const focus = (p: Provider, delta = 0.015) => {
    if (p.lat !== null && p.lng !== null) mapRef.current?.animateToRegion({ latitude: p.lat, longitude: p.lng, latitudeDelta: delta, longitudeDelta: delta }, 800);
  };
  const choose = (p: Provider) => {
    selectedId.current = p.id;
    setSelected(p);
    focus(p);
  };
  /** A search hit or a marker: select it, pan to it and scroll its card in. */
  const pick = (p: Provider) => {
    Keyboard.dismiss();
    setQuery('');
    choose(p);
    const index = shown.findIndex((row) => row.id === p.id);
    if (index >= 0 && view === 'map') {
      cardRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  };
  /** The cards on screen right now (kept by the list); a swipe that comes to rest on exactly one of them selects its provider. */
  const viewableNow = useRef<ViewToken[]>([]);
  const onCardsViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => { viewableNow.current = viewableItems; }).current;
  const onSwipeSettled = () => {
    const key = pickViewable(viewableNow.current.map((v) => ({ key: String(v.key), isViewable: v.isViewable })));
    if (!key || key === selectedId.current) return;
    const next = shownRef.current.find((row) => row.id === key);
    if (next) choose(next);
  };
  const goToMe = async () => {
    try {
      let point = position;
      if (!point) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setNoLocation(true);
          return;
        }
        setNoLocation(false);
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
    setDetail(null);
    if (p.kind === 'doctor') router.push({ pathname: '/consultations/doctor-profile', params: { doctorId: p.id } } as unknown as Href);
    else if (p.kind === 'pharmacy') router.push('/(tabs)/pharmacy' as Href);
    else if (p.kind === 'lab' || p.kind === 'radiology') router.push('/diagnostics/book-sample' as Href);
    // radiology shares the diagnostics booking until it has its own entry (needs-review)
    // 767: a hospital opens its facility page (GET /care/facilities/:id), not the consultations tab
    else if (p.kind === 'hospital') router.push({ pathname: '/consultations/clinic/[id]', params: { id: p.id } } as unknown as Href);
    else router.push('/(tabs)/nursing' as Href);
  };

  const panel = tint(c.bg.surface, 0.96);
  const stats: { icon: FillIconName; value: string; label: string }[] = detail
    ? [
        ...(detail.distance !== null ? [{ icon: 'map-pin' as FillIconName, value: k('map.km', { n: num(detail.distance, { maximumFractionDigits: 1 }) }), label: k('map.distance') }] : []),
        ...(detail.eta !== null ? [{ icon: 'clock-counter-clockwise' as FillIconName, value: k('map.min', { n: num(detail.eta) }), label: k('map.eta') }] : []),
        ...(detail.rating !== null ? [{ icon: 'star' as FillIconName, value: num(detail.rating, { maximumFractionDigits: 1 }), label: k('map.reviews', { n: num(detail.reviews) }) }] : []),
        ...(detail.price !== null && detail.price > 0 ? [{ icon: 'receipt' as FillIconName, value: `${money(detail.price)} ${k('pharmacy.currency')}`, label: k('map.price') }] : []),
      ]
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg.canvas }} testID="map-screen">
      <MapView ref={mapRef} style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0 }} provider={PROVIDER_DEFAULT} initialRegion={START} userInterfaceStyle={theme} showsUserLocation showsMyLocationButton={false} showsCompass={false} moveOnMarkerPress={false} onRegionChangeComplete={(r) => { viewDelta.current = r.latitudeDelta; }} onPress={() => { Keyboard.dismiss(); setQuery(''); }}>
        <HologramLayer
          data={features}
          selectedId={selected?.id ?? null}
          onSelect={(id) => { const p = providers.find((row) => row.id === id); if (p) pick(p); }}
          onCluster={([lng, lat]) => mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: viewDelta.current / 3, longitudeDelta: viewDelta.current / 3 }, 500)}
        />
        {selected && selected.lat !== null && selected.lng !== null ? (
          <Marker coordinate={{ latitude: selected.lat, longitude: selected.lng }} tracksViewChanges={false} onPress={() => setDetail(selected)}>
            <HologramPin kind={selected.kind} name={selected.name} />
          </Marker>
        ) : null}
      </MapView>

      <View pointerEvents="box-none" onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} style={{ position: 'absolute', top: 0, start: 0, end: 0, paddingTop: insets.top + 8, paddingBottom: 8, paddingHorizontal: 16, gap: 10, backgroundColor: panel }}>
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
          <Chip label={k(view === 'map' ? 'map.viewList' : 'map.viewMap')} selected={false} onPress={() => setView(view === 'map' ? 'list' : 'map')} theme={theme} testID="map-view-toggle" />
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
        ) : noLocation && !position ? (
          <Notice tone="warning" text={k('picker.permission')} />
        ) : null}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel={k('map.myLocation')} onPress={() => void goToMe()} style={{ position: 'absolute', end: 16, bottom: insets.bottom + (view === 'map' && shown.length > 0 ? 148 : phase === 'empty' || phase === 'emptyFiltered' ? 190 : 24), width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} testID="map-my-location">
        <Glyph name="map-pin-line" size={22} color={c.service.map.glyph} />
      </Pressable>

      {view === 'map' && shown.length > 0 ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', start: 0, end: 0, bottom: 0, paddingBottom: insets.bottom + 8 }}>
          <FlatList
            ref={cardRef}
            horizontal
            data={shown.slice(0, 40)}
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            snapToInterval={cardWidth(screenWidth) + 12}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            getItemLayout={(_, index) => ({ length: cardWidth(screenWidth) + 12, offset: 16 + index * (cardWidth(screenWidth) + 12), index })}
            viewabilityConfig={CARD_VIEWABILITY}
            onViewableItemsChanged={onCardsViewable}
            onMomentumScrollEnd={onSwipeSettled}
            onScrollEndDrag={(e) => { if (Math.abs(e.nativeEvent.velocity?.x ?? 0) < 0.05) onSwipeSettled(); }}
            testID="map-carousel"
            renderItem={({ item: p }) => <ProviderCard p={p} width={cardWidth(screenWidth)} on={selected?.id === p.id} onPress={() => { choose(p); setDetail(p); }} />}
          />
        </View>
      ) : null}

      {view === 'list' ? (
        <View style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: c.bg.canvas, paddingTop: headerH + 12 }} testID="map-list">
          <FlatList
            data={shown}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
            ListEmptyComponent={<Notice tone="info" text={k('map.empty')} />}
            renderItem={({ item: p }) => <ProviderCard p={p} width={undefined} on={selected?.id === p.id} onPress={() => { choose(p); setDetail(p); }} />}
          />
        </View>
      ) : null}

      {phase === 'empty' || phase === 'emptyFiltered' ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', start: 16, end: 16, bottom: insets.bottom + 16 }} testID="map-empty-card">
          <View style={{ borderRadius: 24, padding: 16, gap: 8, alignItems: 'center', backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
            <FIcon icon={SERVICE_ICONS.map.icon} tone={SERVICE_ICONS.map.tone} chip="soft" size={44} theme={theme} />
            <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, textAlign: 'center' }}>{k(phase === 'empty' ? 'map.emptyNearTitle' : 'map.emptyKindTitle')}</Text>
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k(phase === 'empty' ? 'map.emptyNearBody' : 'map.emptyKindBody')}</Text>
            {phase === 'emptyFiltered' ? <Button label={k('map.showAll')} variant="outline" size="sm" onPress={() => { setKind('all'); setQuery(''); }} theme={theme} testID="map-show-all" /> : null}
          </View>
        </View>
      ) : null}

      <Sheet open={detail !== null} title={detail?.name ?? ''} onClose={() => setDetail(null)} closeLabel={k('consult.close')}>
        {detail ? (
          <>
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{[k(`map.kind.${detail.kind}`), detail.specialties.join(' · ')].filter(Boolean).join(' · ')}</Text>
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
            {insurance && detail.insurance.includes(insurance) ? (
              <Notice tone="success" text={k('map.insuranceOk', { name: insurance })} />
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel={k('map.insuranceSetup')} onPress={() => { setDetail(null); router.push('/profile/insurance' as Href); }}>
                <Notice tone="info" text={k('map.insuranceSetup')} />
              </Pressable>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {detail.lat !== null && detail.lng !== null ? (
                <View style={{ flex: 1 }}>
                  <Button label={k('map.directions')} variant="outline" size="lg" fullWidth onPress={() => directions(detail)} theme={theme} testID="map-directions" />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Button label={k(`map.book.${detail.kind}`)} size="lg" fullWidth onPress={() => book(detail)} theme={theme} testID="map-book" />
              </View>
            </View>
          </>
        ) : null}
      </Sheet>
    </View>
  );
}
