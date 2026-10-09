import React, { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import * as Location from 'expo-location';

import { Button, Input } from '../../../../packages/ui-native/src';
import MapView, { PROVIDER_DEFAULT, type Region } from '../MapPrimitives';
import { Section } from '../consult/ConsultKit';
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
 */

const START: Region = { latitude: 24.7136, longitude: 46.6753, latitudeDelta: 0.02, longitudeDelta: 0.02 };

const FIELDS = ['label', 'street', 'building', 'floor', 'notes'] as const;
type Field = (typeof FIELDS)[number];

export function LocationPickerView() {
  const { k, theme, t, c, flow } = useScreenUi();
  const mapRef = useRef<MapView>(null);
  const [pin, setPin] = useState({ lat: START.latitude, lng: START.longitude });
  const [reverse, setReverse] = useState('');
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<Record<Field, string>>({ label: k('picker.defaultLabel'), street: '', building: '', floor: '', notes: '' });

  const readStreet = useCallback(async (latitude: number, longitude: number) => {
    try {
      const found = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = found[0];
      if (!place) return;
      const line = [place.street, place.district, place.city].filter(Boolean).join(', ');
      setReverse(line);
      setForm((current) => ({ ...current, street: line || current.street }));
    } catch (e) {
      logError('picker:reverse-geocode', e);
    }
  }, []);

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
      setPin({ lat: latitude, lng: longitude });
      mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);
      await readStreet(latitude, longitude);
    } catch (e) {
      logError('picker:position', e);
      setMessage(k('picker.locateFailed'));
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = { label: form.label || k('picker.defaultLabel'), street: form.street, building: form.building, floor: form.floor, notes: form.notes, lat: pin.lat, lng: pin.lng, is_default: false };
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
        <MapView ref={mapRef} style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0 }} provider={PROVIDER_DEFAULT} initialRegion={START} userInterfaceStyle={theme} showsUserLocation showsMyLocationButton={false} showsCompass={false} onRegionChangeComplete={(r: Region) => { setPin({ lat: r.latitude, lng: r.longitude }); void readStreet(r.latitude, r.longitude); }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ marginBottom: 36 }}>
            <Glyph name="map-pin" size={40} color={c.action.primary.bg} />
          </View>
        </View>
      </View>
      <Button label={k('picker.useMyLocation')} variant="outline" size="lg" fullWidth startIcon="map-pin-line" loading={locating} onPress={() => void goToMe()} theme={theme} testID="picker-locate" />
      {message ? <Notice tone="danger" text={message} /> : null}
      {reverse ? <Notice tone="info" text={reverse} /> : null}
      <Section title={k('picker.details')}>
        <View style={{ gap: 12 }}>
          {FIELDS.map((field) => (
            <Input key={field} label={k(`picker.field.${field}`)} placeholder={k(`picker.placeholder.${field}`)} value={form[field]} onChange={set(field)} multiline={field === 'notes'} rows={3} theme={theme} testID={`picker-${field}`} />
          ))}
        </View>
      </Section>
      <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary, ...flow }}>{k('picker.note')}</Text>
    </AccountScreen>
  );
}
