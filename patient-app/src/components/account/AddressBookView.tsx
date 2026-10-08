import React, { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, EmptyState, FIcon } from '../../../../packages/ui-native/src';
import { Gate, goBack } from '../consult/ConsultKit';
import { Notice, Pill, useRemote } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { ORDERS_TONE } from '../../utils/orderCenter';
import { getSelectedAddress, hasMapPoint, readAddresses, setSelectedAddress, startingSelection, type SelectedAddress } from '../../utils/selectedAddress';
import { AccountScreen } from './AccountKit';

/**
 * The address book (merge map section 8): `/profile/addresses` lists the saved addresses (GET /users/me/addresses); choosing one makes it the
 * default (PATCH /users/me/addresses/:id). With `?select=1` it is the delivery address picker that replaced /delivery/address-select: the
 * choice is only marked, and "Confirm address" keeps it on this phone (utils/selectedAddress.ts) for the pharmacy, lab and visit screens
 * and goes back. "Add an address on the map" opens /shared/location-picker; the list is read again when the screen comes back into focus.
 */

const MAP_PICKER = '/shared/location-picker' as Href;

export function AddressBookView() {
  const { select } = useLocalSearchParams<{ select?: string }>();
  const picking = select === '1';
  const { k, theme, t, c, flow } = useScreenUi();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const choice = useRef<string | null>(null);
  const [addresses, setAddresses] = useState<SelectedAddress[]>([]);
  const list = useRemote(async () => {
    const rows = readAddresses(await apiFetch('/users/me/addresses'));
    const picked = picking ? await getSelectedAddress() : null;
    setAddresses(rows);
    const start = startingSelection(rows, choice.current, picked?.id ?? null);
    choice.current = start;
    setSelected(start);
    return rows.length;
  }, [picking], 'account:addresses');
  const reload = list.reload;
  const seen = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (seen.current) void reload(true);
      seen.current = true;
    }, [reload]),
  );

  const choose = async (address: SelectedAddress) => {
    choice.current = address.id;
    setSelected(address.id);
    if (picking || address.is_default) return;
    // The book: the chosen address becomes the default; the list goes back if the save fails.
    const before = addresses;
    const was = selected;
    setFailed(false);
    setAddresses((rows) => rows.map((row) => ({ ...row, is_default: row.id === address.id })));
    try {
      await apiFetch(`/users/me/addresses/${address.id}`, { method: 'PATCH', body: JSON.stringify({ is_default: true }) });
    } catch (e) {
      logError('account:address-default', e);
      setAddresses(before);
      choice.current = was;
      setSelected(was);
      setFailed(true);
    }
  };
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
  const toMap = () => router.push(MAP_PICKER);

  const footer = picking && addresses.length > 0 ? <Button label={k('address.confirm')} size="lg" fullWidth disabled={!selected || saving} loading={saving} onPress={() => void confirm()} theme={theme} testID="address-confirm" /> : undefined;

  return (
    <AccountScreen title={picking ? k('address.title') : k('account.addresses')} fallback={'/profile' as Href} footer={footer} testID={picking ? 'address-select-screen' : 'addresses-screen'}>
      <Gate status={list.status} errorTitle={k('address.loadError')} onRetry={() => void reload()}>
        {addresses.length === 0 ? (
          <EmptyState icon="map-pin-line" tone={ORDERS_TONE} title={k('address.empty')} body={k('address.emptyBody')} actionLabel={k('address.add')} onAction={toMap} theme={theme} />
        ) : (
          <>
            <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{k('address.saved')}</Text>
            {failed ? <Notice tone="danger" text={k('account.defaultFailed')} /> : null}
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
                      onPress={() => void choose(a)}
                      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 64, borderBottomWidth: i === addresses.length - 1 ? 0 : 1, borderBottomColor: c.border.hairline, opacity: pressed ? 0.85 : 1 })}
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
            <Button label={k('address.add')} variant="outline" size="lg" fullWidth onPress={toMap} theme={theme} testID="address-add" />
          </>
        )}
      </Gate>
    </AccountScreen>
  );
}
