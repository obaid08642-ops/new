import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AppHeader, Button, Card, EmptyState, ErrorState, FIcon, Icon, OfflineState, Screen, StickyFooter } from '../../../packages/ui-native/src';
import { PHARMACY_TONE, Pill, goBack } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { dateLocaleFor } from '../../src/utils/dates';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';

/**
 * Prescription order — the RxUpload family (no board of its own): the prescription the patient picked (or has just
 * uploaded) with its medicines, then on to the address and the request for offers (/pharmacy/checkout, which reads the
 * prescription). Without an id it lists the patient's active prescriptions (GET /prescriptions/active).
 *
 * Only what the API sends is drawn. GET /prescriptions/:id returns the medicines as name, dose, frequency and
 * duration, with no quantity; a quantity is shown only when a line carries one.
 */

type RxItem = { name?: string | null; medicine_name_ar?: string | null; medicine_name_en?: string | null; dose?: string | null; quantity?: number | null; qty?: number | null };
type Rx = { id: string; status?: string; state?: string; items?: RxItem[]; issued_at?: string | null; createdAt?: string | null };

const STATE_TONE: Record<string, 'info' | 'success' | 'warning' | 'neutral'> = {
  UPLOADED_BY_PATIENT: 'warning',
  CREATED_BY_DOCTOR: 'info',
  SENT_TO_PHARMACY: 'info',
  PARTIALLY_EDITED: 'info',
  VERIFIED_BY_PHARMACIST: 'success',
  APPROVED: 'success',
  DISPENSED: 'neutral',
  ARCHIVED: 'neutral',
};
const STATES = Object.keys(STATE_TONE);

const itemName = (i: RxItem) => String(i.name || i.medicine_name_ar || i.medicine_name_en || '').trim();
const itemQty = (i: RxItem) => {
  const n = Number(i.quantity ?? i.qty);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export default function PharmacyPrescriptionOrderScreen() {
  const { theme, t, c, dir, flow, lang, k, num } = useScreenUi();
  const { prescriptionId } = useLocalSearchParams<{ prescriptionId?: string }>();
  const requestedId = Array.isArray(prescriptionId) ? prescriptionId[0] : prescriptionId;
  const [prescription, setPrescription] = useState<Rx | null>(null);
  const [active, setActive] = useState<Rx[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(null);
    try {
      if (requestedId) {
        const response = await apiFetch<Rx | { data?: Rx }>(`/prescriptions/${requestedId}`);
        setPrescription(response && 'data' in response && response.data ? response.data : (response as Rx));
        setActive([]);
      } else {
        const response = await apiFetch<Rx[] | { data?: Rx[] }>('/prescriptions/active');
        const list = Array.isArray(response) ? response : response?.data;
        setActive(Array.isArray(list) ? list : []);
        setPrescription(null);
      }
    } catch (e) {
      logError('pharmacy:rx-order', e);
      setFailed((await isOffline()) ? 'offline' : 'error');
    } finally {
      setLoading(false);
    }
  }, [requestedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dateOf = (rx: Rx) => {
    const at = rx.issued_at || rx.createdAt;
    return at ? new Date(at).toLocaleDateString(dateLocaleFor(lang), { year: 'numeric', month: 'short', day: 'numeric', numberingSystem: 'latn' }) : '';
  };
  const stateLabel = (rx: Rx) => {
    const s = rx.status || rx.state || '';
    return STATES.includes(s) ? { label: k(`pharmacy.rx.state.${s}`), tone: STATE_TONE[s] } : null;
  };
  const shortId = (rx: Rx) => String(rx.id).slice(-6).toUpperCase();

  const header = (
    <View style={COLUMN}>
      <AppHeader title={k('pharmacy.rx.title')} onBack={goBack} backLabel={k('pharmacy.back')} theme={theme} direction={dir} />
    </View>
  );

  // the lines the checkout will order are the named ones
  const items = (prescription?.items || []).filter((i) => itemName(i));
  const footer =
    prescription && items.length ? (
      <StickyFooter theme={theme} direction={dir}>
        <View style={COLUMN}>
          <Button
            label={k('pharmacy.rx.continue')}
            size="lg"
            fullWidth
            onPress={() => router.replace({ pathname: '/pharmacy/checkout', params: { prescriptionId: String(prescription.id) } })}
            testID="rx-continue"
            theme={theme}
          />
        </View>
      </StickyFooter>
    ) : undefined;

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ height: 84, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
        ))}
      </View>
    );
  } else if (failed === 'offline') {
    body = <OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />;
  } else if (failed === 'error') {
    body = <ErrorState title={requestedId ? k('pharmacy.rx.loadError') : k('pharmacy.rx.listError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />;
  } else if (requestedId && prescription) {
    const st = stateLabel(prescription);
    body = (
      <View style={{ gap: 16 }}>
        <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k('pharmacy.rx.intro')}</Text>
        <Card padding="md" theme={theme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <FIcon icon="prescription" tone={PHARMACY_TONE} size={48} theme={theme} />
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{k('pharmacy.rx.number', { id: shortId(prescription) })}</Text>
              {dateOf(prescription) ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{dateOf(prescription)}</Text> : null}
              {st ? <Pill label={st.label} tone={st.tone} /> : null}
            </View>
          </View>
        </Card>
        {items.length ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('pharmacy.rx.itemsTitle')}</Text>
            <Card padding="none" theme={theme}>
              <View style={{ paddingHorizontal: 16 }}>
                {items.map((item, i) => {
                  const q = itemQty(item);
                  return (
                    <View key={`${itemName(item)}-${i}`} style={{ paddingVertical: 12, gap: 3, borderBottomWidth: i === items.length - 1 ? 0 : 1, borderBottomColor: c.border.subtle }}>
                      <Text style={{ ...scale(t, 'row', 'medium'), color: c.text.primary, ...flow }}>{itemName(item)}</Text>
                      {item.dose ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{item.dose}</Text> : null}
                      {q ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.rx.qty', { n: num(q) })}</Text> : null}
                    </View>
                  );
                })}
              </View>
            </Card>
          </View>
        ) : null}
        {!items.length ? (
          <EmptyState icon="prescription" tone={PHARMACY_TONE} title={k('pharmacy.rx.noLines')} actionLabel={k('pharmacy.rx.uploadNew')} onAction={() => router.replace('/pharmacy/scan-prescription')} theme={theme} />
        ) : null}
      </View>
    );
  } else if (!active.length) {
    body = (
      <EmptyState icon="prescription" tone={PHARMACY_TONE} title={k('pharmacy.rx.empty')} body={k('pharmacy.rx.emptyBody')} actionLabel={k('pharmacy.rx.uploadNew')} onAction={() => router.push('/pharmacy/scan-prescription')} theme={theme} />
    );
  } else {
    body = (
      <View style={{ gap: 12 }}>
        <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k('pharmacy.rx.listIntro')}</Text>
        {active.map((rx) => {
          const st = stateLabel(rx);
          const count = Array.isArray(rx.items) ? rx.items.length : 0;
          return (
            <Pressable
              key={rx.id}
              accessibilityRole="button"
              accessibilityLabel={k('pharmacy.rx.number', { id: shortId(rx) })}
              onPress={() => router.replace({ pathname: '/pharmacy/rx-order', params: { prescriptionId: String(rx.id) } })}
            >
              <Card padding="sm" theme={theme}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <FIcon icon="prescription" tone={PHARMACY_TONE} size={44} theme={theme} />
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <Text style={{ ...scale(t, 'row', 'medium'), color: c.text.primary, ...flow }}>{k('pharmacy.rx.number', { id: shortId(rx) })}</Text>
                    <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>
                      {[count === 1 ? k('pharmacy.hub.oneItem') : count > 1 ? k('pharmacy.hub.items', { n: num(count) }) : '', dateOf(rx)].filter(Boolean).join(' · ')}
                    </Text>
                    {st ? <Pill label={st.label} tone={st.tone} /> : null}
                  </View>
                  <Icon name={dir === 'rtl' ? 'caret-left' : 'caret-right'} size={18} theme={theme} tone="secondary" />
                </View>
              </Card>
            </Pressable>
          );
        })}
        <Button label={k('pharmacy.rx.uploadNew')} variant="outline" size="md" fullWidth onPress={() => router.push('/pharmacy/scan-prescription')} theme={theme} />
      </View>
    );
  }

  return (
    <Screen theme={theme} direction={dir} header={header} footer={footer} testID="rx-order-screen">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, flexGrow: 1 }}>
        {body}
      </ScrollView>
    </Screen>
  );
}
