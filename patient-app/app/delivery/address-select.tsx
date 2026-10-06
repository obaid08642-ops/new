import React, { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';

import { AppHeader, Button, Card, EmptyState, ErrorState, FIcon, OfflineState, Screen, StickyFooter } from '../../../packages/ui-native/src';
import { Pill, goBack } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { ORDERS_TONE } from '../../src/utils/orderCenter';
import { getSelectedAddress, hasMapPoint, readAddresses, setSelectedAddress, startingSelection, type SelectedAddress } from '../../src/utils/selectedAddress';

/**
 * Delivery address — the saved addresses (GET /users/me/addresses) in the list-row look of the Account board
 * (canvas/Account.dc.html "العناوين"). The patient picks one and confirms; the choice is kept on this phone
 * (utils/selectedAddress.ts) for the pharmacy, lab and visit screens that read it. The list is read again when the screen
 * comes back into focus, so an address added on the map appears at once. Nothing is made up: a saved address without a
 * map point says so, because the pharmacy requests need one.
 */

export default function AddressSelectScreen() {
  const { theme, t, c, dir, flow, k } = useScreenUi();
  const [addresses, setAddresses] = useState<SelectedAddress[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);
  const [saving, setSaving] = useState(false);
  const hasData = useRef(false);
  const choice = useRef<string | null>(null);

  const load = useCallback(async (mode: 'first' | 'again') => {
    if (mode === 'first') setLoading(true);
    try {
      const list = readAddresses(await apiFetch('/users/me/addresses'));
      const picked = await getSelectedAddress();
      setAddresses(list);
      // keep what the patient chose on this screen, else the address picked last, else the default
      const start = startingSelection(list, choice.current, picked?.id ?? null);
      choice.current = start;
      setSelected(start);
      setFailed(null);
      hasData.current = true;
    } catch (error) {
      logError('delivery:address-select', error);
      if (!hasData.current) setFailed((await isOffline()) ? 'offline' : 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(hasData.current ? 'again' : 'first');
    }, [load]),
  );

  const confirm = async () => {
    const chosen = addresses.find((a) => a.id === selected);
    if (!chosen || saving) return;
    setSaving(true);
    try {
      await setSelectedAddress(chosen);
      goBack();
    } finally {
      setSaving(false);
    }
  };

  const toMap = () => router.push('/shared/location-picker' as Href);

  const header = (
    <View style={COLUMN}>
      <AppHeader title={k('address.title')} onBack={goBack} backLabel={k('pharmacy.back')} theme={theme} direction={dir} />
    </View>
  );
  const state = (node: React.ReactNode) => (
    <Screen theme={theme} direction={dir} header={header} scroll testID="address-select-screen">
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1, justifyContent: 'center' }}>{node}</View>
    </Screen>
  );

  if (loading) {
    return (
      <Screen theme={theme} direction={dir} header={header} scroll testID="address-select-screen">
        <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ ...COLUMN, paddingHorizontal: 16, gap: 12 }}>
          <View style={{ height: 72, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
          <View style={{ height: 72, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
        </View>
      </Screen>
    );
  }
  if (failed === 'offline') {
    return state(<OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load('first')} theme={theme} />);
  }
  if (failed === 'error') {
    return state(<ErrorState title={k('address.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load('first')} theme={theme} />);
  }
  if (!addresses.length) {
    return state(<EmptyState icon="map-pin-line" tone={ORDERS_TONE} title={k('address.empty')} body={k('address.emptyBody')} actionLabel={k('address.add')} onAction={toMap} theme={theme} />);
  }

  const footer = (
    <StickyFooter theme={theme} direction={dir}>
      <View style={COLUMN}>
        <Button label={k('address.confirm')} size="lg" fullWidth disabled={!selected || saving} loading={saving} onPress={() => void confirm()} testID="address-confirm" theme={theme} />
      </View>
    </StickyFooter>
  );

  return (
    <Screen theme={theme} direction={dir} header={header} footer={footer} scroll testID="address-select-screen">
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 16 }}>
        <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{k('address.saved')}</Text>
        <Card padding="none" theme={theme}>
          <View accessibilityRole="radiogroup" accessibilityLabel={k('address.saved')}>
            {addresses.map((a, i) => {
              const on = a.id === selected;
              const line = [a.street, a.district, a.city].filter(Boolean).join(', ');
              const name = [a.label ?? line, a.is_default ? k('address.default') : '', a.label ? line : '', hasMapPoint(a) ? '' : k('address.noPoint')].filter(Boolean).join(', ');
              return (
                <Pressable
                  key={a.id}
                  accessibilityRole="radio"
                  accessibilityLabel={name}
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    choice.current = a.id;
                    setSelected(a.id);
                  }}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 64, borderBottomWidth: i === addresses.length - 1 ? 0 : 1, borderBottomColor: c.border.subtle, opacity: pressed ? 0.85 : 1 })}
                >
                  <FIcon icon="map-pin-line" tone={ORDERS_TONE} chip="soft" size={40} theme={theme} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={{ ...scale(t, 'row', 'medium'), color: c.text.primary, ...flow }}>{a.label ?? (line || k('address.unnamed'))}</Text>
                    {a.label && line ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{line}</Text> : null}
                    {a.is_default || !hasMapPoint(a) ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 2 }}>
                        {a.is_default ? <Pill label={k('address.default')} tone="info" /> : null}
                        {!hasMapPoint(a) ? <Pill label={k('address.noPoint')} tone="warning" /> : null}
                      </View>
                    ) : null}
                  </View>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 7 : 2, borderColor: on ? c.action.primary.bg : c.control.radioOff }} />
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Button label={k('address.add')} variant="outline" size="lg" fullWidth onPress={toMap} theme={theme} />
      </View>
    </Screen>
  );
}
