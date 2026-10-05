import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { AppHeader, Button, EmptyState, ErrorState, OfflineState, Screen, StatusChip } from '../../../packages/ui-native/src';
import ProductImage from '../../src/components/ProductImage';
import { SECONDARY_TONE, useAddMedToCart } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { medField, medGallery, medName, medPrice, needsRx, type Med } from '../../src/utils/pharmacyCatalog';

/**
 * Medicine comparison — the PharmacyHub template (canvas/PharmacyHub.dc.html, "قارن البدائل"). The medicines are the ones
 * POST /medicines/compare returns for the ids in the route; each row is a field the catalogue really holds, and a row
 * no medicine has a value for is not drawn. The lowest real price is marked. "Add to cart" puts the medicine in the cart.
 */

const MISSING = '—';
const text = (v: unknown): string => (typeof v === 'string' && v.trim() ? v.trim() : '');

/** What a row needs to write a value in the language of the screen. */
interface Ui {
  k: (key: string, vars?: Record<string, string | number>) => string;
  money: (n: number) => string;
}

interface Row {
  key: string;
  label: string;
  value: (m: Med, ui: Ui) => string;
}

const ROWS: Row[] = [
  { key: 'ingredient', label: 'pharmacy.compare.ingredient', value: (m) => text(medField(m, 'active_ingredient')) },
  { key: 'strength', label: 'pharmacy.compare.strength', value: (m) => text(medField(m, 'strength')) },
  { key: 'form', label: 'pharmacy.compare.form', value: (m) => text(medField(m, 'form')) },
  { key: 'pack', label: 'pharmacy.compare.pack', value: (m) => text(m.package_size) },
  { key: 'price', label: 'pharmacy.compare.price', value: (m, { k, money }) => (medPrice(m) ? k('pharmacy.price', { n: money(medPrice(m) as number) }) : '') },
  { key: 'rx', label: 'pharmacy.compare.rx', value: (m, { k }) => (typeof m.requires_prescription === 'boolean' ? (needsRx(m) ? k('pharmacy.compare.yes') : k('pharmacy.compare.no')) : '') },
  {
    key: 'side',
    label: 'pharmacy.compare.sideEffects',
    value: (m, { k }) => {
      const v = medField<unknown>(m, 'side_effects');
      return Array.isArray(v) ? v.map(String).filter(Boolean).join(k('pharmacy.compare.listSeparator')) : text(v);
    },
  },
];

export default function MedicineCompareScreen() {
  const { theme, t, c, dir, flow, k, money, lang } = useScreenUi();
  const params = useLocalSearchParams<{ ids?: string }>();
  const { width } = useWindowDimensions();
  const addToCart = useAddMedToCart();

  const [medicines, setMedicines] = useState<Med[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(null);
    try {
      const ids = params.ids ? params.ids.split(',').filter(Boolean) : [];
      // nothing selected: the empty state, never a comparison of invented ids
      if (!ids.length) {
        setMedicines([]);
        return;
      }
      // POST /medicines/compare { ids }
      const data = await apiFetch<Med[]>('/medicines/compare', { method: 'POST', body: JSON.stringify({ ids }) });
      setMedicines(Array.isArray(data) ? data : []);
    } catch (e) {
      logError('pharmacy:medicine-compare', e);
      setFailed((await isOffline()) ? 'offline' : 'error');
    } finally {
      setLoading(false);
    }
  }, [params.ids]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => ROWS.filter((r) => medicines.some((m) => r.value(m, { k, money }))), [medicines, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  // the lowest real price, marked only when the prices differ
  const prices = medicines.map(medPrice).filter((p): p is number => p !== null);
  const lowest = prices.length > 1 && Math.min(...prices) < Math.max(...prices) ? Math.min(...prices) : null;

  const columnWidth = Math.max(140, Math.floor((Math.min(width, 440) - 32) / Math.max(medicines.length, 1)));
  const open = (m: Med) => router.push({ pathname: '/pharmacy/product-detail', params: { id: m.id, name: medName(m) } });
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/pharmacy' as Href);
  };

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ ...COLUMN, paddingHorizontal: 16, gap: 12 }}>
        <View style={{ height: 180, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
        <View style={{ height: 120, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
      </View>
    );
  } else if (failed === 'offline') {
    body = <OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />;
  } else if (failed === 'error') {
    body = <ErrorState title={k('pharmacy.compare.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />;
  } else if (!medicines.length) {
    body = <EmptyState icon="arrows-left-right" tone={SECONDARY_TONE} title={k('pharmacy.compare.empty')} theme={theme} />;
  } else {
    body = (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        <View style={{ width: columnWidth * medicines.length, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, overflow: 'hidden' }}>
          {/* the medicines */}
          <View style={{ flexDirection: 'row' }}>
            {medicines.map((m) => (
              <Pressable key={String(m.id)} accessibilityRole="link" accessibilityLabel={medName(m)} onPress={() => open(m)} style={{ width: columnWidth, padding: 12, gap: 8, alignItems: 'center' }}>
                <View style={{ width: 88, height: 88, borderRadius: 18, backgroundColor: c.bg.media, overflow: 'hidden' }}>
                  <ProductImage uri={medGallery(m)[0]} style={{ width: '100%', height: '100%' }} iconSize={40} />
                </View>
                <Text numberOfLines={3} style={{ ...scale(t, 'small', 'medium'), lineHeight: 19, color: c.text.primary, textAlign: 'center' }}>{medName(m)}</Text>
                {text(m.manufacturer) ? <Text numberOfLines={1} style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{text(m.manufacturer)}</Text> : null}
              </Pressable>
            ))}
          </View>
          {/* one block per field: its name, then each medicine's value */}
          {rows.map((r) => (
            <View key={r.key} style={{ borderTopWidth: 1, borderTopColor: c.border.subtle, paddingVertical: 10 }}>
              <Text style={{ ...scale(t, 'micro', 'regular'), color: c.text.secondary, paddingHorizontal: 12, paddingBottom: 4, ...flow }}>{k(r.label)}</Text>
              <View style={{ flexDirection: 'row' }}>
                {medicines.map((m) => {
                  const best = r.key === 'price' && lowest !== null && medPrice(m) === lowest;
                  return (
                    <View key={String(m.id)} style={{ width: columnWidth, paddingHorizontal: 12, gap: 6, alignItems: 'flex-start' }}>
                      <Text style={{ ...scale(t, 'control', best ? 'bold' : 'regular'), color: c.text.primary, ...flow }}>{r.value(m, { k, money }) || MISSING}</Text>
                      {best ? <StatusChip label={k('pharmacy.compare.lowest')} tone="mint" theme={theme} /> : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
          {/* add to cart */}
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.border.subtle, paddingVertical: 12 }}>
            {medicines.map((m) => (
              <View key={String(m.id)} style={{ width: columnWidth, paddingHorizontal: 12 }}>
                <Button label={k('pharmacy.addToCart')} size="sm" variant="outline" fullWidth onPress={() => addToCart(m)} theme={theme} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <Screen theme={theme} direction={dir} header={<View style={COLUMN}><AppHeader title={k('pharmacy.compare.title')} onBack={back} backLabel={k('pharmacy.back')} theme={theme} direction={dir} /></View>} scroll testID="medicine-compare">
      <View style={{ ...COLUMN, paddingTop: 8, paddingBottom: 40, alignSelf: 'center' }}>{body}</View>
    </Screen>
  );
}
