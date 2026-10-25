import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import * as Location from 'expo-location';

import { Button, Input } from '../../../../packages/ui-native/src';
import MapView, { PROVIDER_DEFAULT, type Region } from '../MapPrimitives';
import { Section, Sheet } from '../consult/ConsultKit';
import { Notice } from '../health/HealthKit';
import { Glyph } from '../pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { setSelectedAddress as keepSelectedAddress } from '../../utils/selectedAddress';
import { AccountScreen } from './AccountKit';

/**
 * Pick an address on the map (`/shared/location-picker`, the "pick on the map" step of the address book): the phone's position
 * or a pan of the map moves the pin (the centre of the map), the street is read from the pin, and the details are saved with
 * POST /users/me/addresses. The saved address becomes the chosen delivery address (kept on this phone) and the screen closes.
 * The list of saved addresses and the choice among them are the address book (`/profile/addresses?select=1`).
 *
 * 19.7: a Saudi National Address short code (four letters, four digits) can fill the address instead: GET /national-address/lookup
 * returns the street, district and pin from Saudi Post, and the code is saved with the address (the server checks it again).
 */

/** The map stops moving, then GET /geo/reverse is asked once (the server allows 20 a minute). */
export const REVERSE_DEBOUNCE_MS = 600;

type Place = { code: string; name: string };
type Catalogue = { code?: string; name_ar?: string; name_en?: string };
/** GET /geo/reverse: city_id / district_id are always codes of our own `locations` rows (or null). */
type Reverse = { city_id: string | null; city_name_ar: string | null; city_name_en: string | null; district_id: string | null; district_name_ar: string | null; district_name_en: string | null; street: string | null; building_no: string | null; postal_code: string | null; short_address: string | null };

const START: Region = { latitude: 24.7136, longitude: 46.6753, latitudeDelta: 0.02, longitudeDelta: 0.02 };

/** Shown in the hint and the error, so the translated text carries no Latin letters of its own. */
const SHORT_ADDRESS_EXAMPLE = 'RRRD2929';

const FIELDS = ['label', 'street', 'building', 'floor', 'notes'] as const;
type Field = (typeof FIELDS)[number];

type NationalAddress = { short_address: string; street?: string; district?: string; city?: string; lat?: number; lng?: number };

export function LocationPickerView() {
  const { k, theme, t, c, flow, lang } = useScreenUi();
  const nameOf = (r: { name_ar?: string | null; name_en?: string | null }) => (lang === 'ar' ? r.name_ar || r.name_en : r.name_en || r.name_ar) || '';
  const mapRef = useRef<MapView>(null);
  const [pin, setPin] = useState({ lat: START.latitude, lng: START.longitude });
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<Record<Field, string>>({ label: k('picker.defaultLabel'), street: '', building: '', floor: '', notes: '' });
  const [shortCode, setShortCode] = useState('');
  const [finding, setFinding] = useState(false);
  const [codeNote, setCodeNote] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);

  const [city, setCity] = useState<Place | null>(null);
  const [district, setDistrict] = useState<Place | null>(null);
  const [cities, setCities] = useState<Place[]>([]);
  const [districts, setDistricts] = useState<Place[]>([]);
  const [sheet, setSheet] = useState<'city' | 'district' | null>(null);
  const [reversing, setReversing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const asked = useRef(0);
  const places = useCallback((rows: unknown): Place[] => (Array.isArray(rows) ? (rows as Catalogue[]).filter((r) => r.code).map((r) => ({ code: r.code as string, name: nameOf(r) })) : []), [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let live = true;
    apiFetch('/locations/cities').then((rows) => { if (live) setCities(places(rows)); }).catch((e) => logError('picker:cities', e));
    return () => { live = false; };
  }, [places]);
  useEffect(() => {
    if (!city) { setDistricts([]); return; }
    let live = true;
    apiFetch(`/locations/districts?city=${encodeURIComponent(city.code)}`).then((rows) => { if (live) setDistricts(places(rows)); }).catch((e) => logError('picker:districts', e));
    return () => { live = false; };
  }, [city, places]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const readStreet = useCallback(async (latitude: number, longitude: number) => {
    const mine = ++asked.current;
    setReversing(true);
    try {
      const found = (await apiFetch(`/geo/reverse?lat=${latitude}&lng=${longitude}`)) as Reverse | null;
      if (mine !== asked.current || !found) return;
      setMessage(null);
      setCity(found.city_id ? { code: found.city_id, name: nameOf({ name_ar: found.city_name_ar, name_en: found.city_name_en }) } : null);
      setDistrict(found.district_id ? { code: found.district_id, name: nameOf({ name_ar: found.district_name_ar, name_en: found.district_name_en }) } : null);
      setForm((current) => ({ ...current, street: found.street || current.street, building: found.building_no || current.building }));
      if (found.short_address) setShortCode(found.short_address);
    } catch (e) {
      if (mine !== asked.current) return;
      logError('picker:geo-reverse', e);
      setMessage(k(String((e as Error)?.message).includes('outside_service_area') ? 'picker.outsideArea' : 'picker.reverseFailed'));
    } finally {
      if (mine === asked.current) setReversing(false);
    }
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  /** One ask per stop of the map: every move restarts the wait. */
  const settle = useCallback((latitude: number, longitude: number) => {
    setPin({ lat: latitude, lng: longitude });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void readStreet(latitude, longitude); }, REVERSE_DEBOUNCE_MS);
  }, [readStreet]);

  const goToMe = async () => {
    setLocating(true);
    setMessage(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMessage(k('picker.permission'));
        return;
      }
      const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = here.coords;
      settle(latitude, longitude);
      mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);
    } catch (e) {
      logError('picker:position', e);
      setMessage(k('picker.locateFailed'));
    } finally {
      setLocating(false);
    }
  };

  const findShortAddress = async () => {
    setFinding(true);
    setCodeNote(null);
    try {
      const found = (await apiFetch(`/national-address/lookup?code=${encodeURIComponent(shortCode.trim())}`)) as NationalAddress | null;
      if (!found) throw new Error('short_address_not_found');
      const line = [found.street, found.district, found.city].filter(Boolean).join(', ');
      setShortCode(found.short_address);
      setForm((current) => ({ ...current, street: line || current.street }));
      if (typeof found.lat === 'number' && typeof found.lng === 'number') {
        setPin({ lat: found.lat, lng: found.lng });
        if (timer.current) clearTimeout(timer.current);
        mapRef.current?.animateToRegion({ latitude: found.lat, longitude: found.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 800);
      }
      setCodeNote({ tone: 'info', text: k('picker.shortAddress.found') });
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      logError('picker:short-address', e);
      setCodeNote({ tone: 'danger', text: k(code.includes('short_address_invalid') ? 'picker.shortAddress.invalid' : code.includes('short_address_not_found') ? 'picker.shortAddress.notFound' : 'picker.shortAddress.unavailable', { example: SHORT_ADDRESS_EXAMPLE }) });
    } finally {
      setFinding(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = { label: form.label || k('picker.defaultLabel'), street: form.street, building: form.building, floor: form.floor, notes: form.notes, ...(city ? { city: city.name } : {}), ...(district ? { district: district.name } : {}), lat: pin.lat, lng: pin.lng, is_default: false, ...(shortCode.trim() ? { short_address: shortCode.trim() } : {}) };
      const saved = (await apiFetch('/users/me/addresses', { method: 'POST', body: JSON.stringify(payload) })) as { id?: string } | null;
      // The create answer carries only the new id; the address itself is what was sent.
      await keepSelectedAddress({ ...payload, id: saved?.id || `local-${Date.now()}` });
      router.back();
    } catch (e) {
      logError('picker:save', e);
      setMessage(k('picker.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const set = (field: Field) => (value: string) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <AccountScreen
      title={k('picker.title')}
      fallback={'/profile/addresses' as Href}
      footer={<Button label={k('picker.save')} size="lg" fullWidth disabled={!form.street.trim()} loading={saving} onPress={() => void save()} theme={theme} testID="picker-save" />}
      testID="location-picker-screen"
    >
      <View style={{ height: 260, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: c.border.hairline }}>
        <MapView ref={mapRef} style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0 }} provider={PROVIDER_DEFAULT} initialRegion={START} userInterfaceStyle={theme} showsUserLocation showsMyLocationButton={false} showsCompass={false} onRegionChangeComplete={(r: Region) => settle(r.latitude, r.longitude)} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ marginBottom: 36 }}>
            <Glyph name="map-pin" size={40} color={c.action.primary.bg} />
          </View>
        </View>
      </View>
      <Button label={k('picker.useMyLocation')} variant="outline" size="lg" fullWidth startIcon="map-pin-line" loading={locating} onPress={() => void goToMe()} theme={theme} testID="picker-locate" />
      {message ? <Notice tone="danger" text={message} /> : null}
      {reversing ? <Notice tone="info" text={k('picker.reversing')} /> : null}
      <Section title={k('picker.shortAddress.title')}>
        <View style={{ gap: 12 }}>
          <Input label={k('picker.field.shortAddress')} placeholder={k('picker.placeholder.shortAddress', { example: SHORT_ADDRESS_EXAMPLE })} value={shortCode} onChange={setShortCode} theme={theme} testID="picker-short-address" />
          <Button label={k('picker.shortAddress.find')} variant="outline" size="lg" fullWidth disabled={!shortCode.trim()} loading={finding} onPress={() => void findShortAddress()} theme={theme} testID="picker-short-address-find" />
          {codeNote ? <Notice tone={codeNote.tone} text={codeNote.text} /> : null}
        </View>
      </Section>
      <Section title={k('picker.details')}>
        <View style={{ gap: 12 }}>
          {(['city', 'district'] as const).map((kind) => {
            const value = kind === 'city' ? city : district;
            const off = kind === 'district' && !city;
            return (
              <Pressable key={kind} accessibilityRole="button" accessibilityLabel={`${k(`picker.${kind}`)}: ${value?.name ?? k('picker.choose')}`} disabled={off} onPress={() => setSheet(kind)} testID={`picker-${kind}`}
                style={{ minHeight: 48, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border.hairline, justifyContent: 'center', opacity: off ? 0.5 : 1 }}>
                <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k(`picker.${kind}`)}</Text>
                <Text style={{ ...scale(t, 'row', 'medium'), color: c.text.primary, ...flow }}>{value?.name ?? k('picker.choose')}</Text>
              </Pressable>
            );
          })}
          {FIELDS.map((field) => (
            <Input key={field} label={k(`picker.field.${field}`)} placeholder={k(`picker.placeholder.${field}`)} value={form[field]} onChange={set(field)} multiline={field === 'notes'} rows={3} theme={theme} testID={`picker-${field}`} />
          ))}
        </View>
      </Section>
      <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary, ...flow }}>{k('picker.note')}</Text>
      <Sheet open={sheet !== null} title={sheet ? k(`picker.${sheet}`) : ''} onClose={() => setSheet(null)} closeLabel={k('consult.close')}>
        <View accessibilityRole="radiogroup" style={{ gap: 4 }}>
          {(sheet === 'city' ? cities : districts).map((p) => {
            const on = (sheet === 'city' ? city : district)?.code === p.code;
            return (
              <Pressable key={p.code} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={p.name} testID={`picker-option-${p.code}`}
                onPress={() => { if (sheet === 'city') { setCity(p); setDistrict(null); } else setDistrict(p); setSheet(null); }}
                style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 7 : 2, borderColor: on ? c.action.primary.bg : c.control.radioOff }} />
                <Text style={{ ...scale(t, 'row', 'regular'), color: c.text.primary, flex: 1, ...flow }}>{p.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </AccountScreen>
  );
}
