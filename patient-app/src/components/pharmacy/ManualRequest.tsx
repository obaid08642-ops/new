import React, { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Button, Card, FIcon, Input, StickyFooter } from '../../../../packages/ui-native/src';
import { Notice, PHARMACY_TONE } from './PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch, newIdempotencyKey } from '../../utils/api';
import { logError } from '../../utils/logger';
import { buildPatientPharmacyDraft, extractPatientPharmacyOrderId } from '../../utils/pharmacy-draft';
import { resolveEffectiveAddress, type SelectedAddress } from '../../utils/selectedAddress';

/**
 * The "type the names" way in of "order with a prescription" (the old manual request screen): a form (the medicine's name,
 * details that help the pharmacy), the delivery location the request will use, and the sticky button that broadcasts the
 * request to nearby pharmacies. The order contract (POST /patient/pharmacy/orders, then /submit, with a stable idempotency
 * key) is unchanged. The location is the one the patient picked last (shared/location-picker), else the default saved
 * address, and it is read again when the screen comes back into focus. A request needs a real map point (lat, lng);
 * without one the button explains instead of sending.
 */

const MIN_NAME = 3;

export function useManualRequest(): { body: React.ReactNode; footer: React.ReactNode } {
  const { theme, t, c, dir, flow, k } = useScreenUi();
  // one key per screen visit: a retry of the same request is de-duplicated by the backend
  const requestKey = useRef(newIdempotencyKey());
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [address, setAddress] = useState<SelectedAddress | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<'location' | 'send' | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadingAddress(true);
      void (async () => {
        try {
          const next = await resolveEffectiveAddress();
          if (active) setAddress(next);
        } catch (e) {
          logError('pharmacy:request:address', e);
        } finally {
          if (active) setLoadingAddress(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const medicine = name.trim();
  const nameTooShort = medicine.length > 0 && medicine.length < MIN_NAME;
  const hasPoint = Boolean(address) && Number.isFinite(Number(address?.lat)) && Number.isFinite(Number(address?.lng));
  const canSend = medicine.length >= MIN_NAME && !submitting && !loadingAddress;

  const submit = async () => {
    if (!canSend) return;
    if (!address || !hasPoint) {
      setProblem('location');
      return;
    }
    setProblem(null);
    setSubmitting(true);
    try {
      const rawName = details.trim() ? `${medicine} — ${details.trim()}` : medicine;
      const draft = buildPatientPharmacyDraft([{ name: rawName, qty: 1, intake_source: 'manual' }], address);
      const created = await apiFetch<{ id?: string; data?: { id?: string } }>('/patient/pharmacy/orders', { method: 'POST', headers: { 'Idempotency-Key': requestKey.current }, body: JSON.stringify(draft) });
      const orderId = extractPatientPharmacyOrderId(created);
      if (!orderId) throw new Error('governed_pharmacy_order_id_missing');
      await apiFetch(`/patient/pharmacy/orders/${orderId}/submit`, { method: 'POST', headers: { 'Idempotency-Key': `${requestKey.current}-submit` }, body: JSON.stringify({}) });
      router.replace({ pathname: '/pharmacy/broadcast-status', params: { orderId } });
    } catch (e) {
      logError('pharmacy:request:submit', e);
      setProblem('send');
    } finally {
      setSubmitting(false);
    }
  };

  const addressLine = address ? [address.street || address.address, address.city].filter(Boolean).join(', ') : '';

  const footer = (
    <StickyFooter theme={theme} direction={dir}>
      <View style={COLUMN}>
        <Button label={k('pharmacy.request.submit')} size="lg" fullWidth disabled={!canSend} loading={submitting} onPress={() => void submit()} testID="request-submit" theme={theme} />
      </View>
    </StickyFooter>
  );

  const body = (
    <View style={{ gap: 16 }}>
      <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 21, color: c.text.secondary, ...flow }}>{k('pharmacy.request.intro')}</Text>

      <Input
        label={k('pharmacy.request.nameLabel')}
        placeholder={k('pharmacy.request.namePlaceholder')}
        value={name}
        onChange={setName}
        hint={nameTooShort ? k('pharmacy.request.nameHint') : undefined}
        invalid={nameTooShort}
        disabled={submitting}
        testID="request-name"
        theme={theme}
      />
      <Input
        label={k('pharmacy.request.detailsLabel')}
        placeholder={k('pharmacy.request.detailsPlaceholder')}
        value={details}
        onChange={setDetails}
        multiline
        rows={4}
        disabled={submitting}
        testID="request-details"
        theme={theme}
      />

      <Card theme={theme}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <FIcon icon="map-pin" tone={PHARMACY_TONE} size={40} theme={theme} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.request.addressTitle')}</Text>
            <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>
              {loadingAddress ? k('pharmacy.request.addressLoading') : address ? address.label || addressLine || k('pharmacy.request.addressUsed') : k('pharmacy.request.addressNone')}
            </Text>
            {address && address.label && addressLine ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{addressLine}</Text> : null}
          </View>
        </View>
        {!loadingAddress && !hasPoint ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.status.warning.fg, ...flow }}>{k('pharmacy.request.addressMissing')}</Text> : null}
        <Pressable accessibilityRole="link" accessibilityLabel={k('pharmacy.request.changeLocation')} onPress={() => router.push('/shared/location-picker')} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.link, ...flow }}>{k('pharmacy.request.changeLocation')}</Text>
        </Pressable>
      </Card>

      {problem === 'location' ? <Notice tone="warning" icon="map-pin" title={k('pharmacy.request.noLocation')} /> : null}
      {problem === 'send' ? <Notice tone="danger" icon="warning" title={k('pharmacy.request.failedTitle')} body={k('pharmacy.request.failedBody')} /> : null}
    </View>
  );

  return { body, footer };
}
