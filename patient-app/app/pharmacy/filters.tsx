import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { AppHeader, Button, Card, Chip, ErrorState, FIcon, Input, OfflineState, Screen, SectionHeader, Search, StickyFooter, Toggle } from '../../../packages/ui-native/src';
import { PHARMACY_TONE } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';

/**
 * Pharmacy filters — the PharmacyHub template (canvas/PharmacyHub.dc.html chips and field) as a full screen.
 * Sort, category, "prescription only", price range, dosage form and maker, all from GET /medicines/filters; "Apply"
 * hands the choices back to the hub as route params (filter_*), as before.
 */

const SORT_OPTIONS = [
  { id: 'relevant', label: 'pharmacy.filters.sortRelevant' },
  { id: 'price_asc', label: 'pharmacy.filters.sortPriceAsc' },
  { id: 'price_desc', label: 'pharmacy.filters.sortPriceDesc' },
  { id: 'newest', label: 'pharmacy.filters.sortNewest' },
] as const;

/** The catalogue's category ids that have a plain name; any other category is shown as the catalogue wrote it. */
const CATEGORY_LABELS: Record<string, string> = {
  skincare: 'pharmacy.cat.skincareShort',
  medications: 'pharmacy.cat.painkillers',
  vitamins: 'pharmacy.cat.vitaminsShort',
  baby: 'pharmacy.cat.babyCare',
  medical_devices: 'pharmacy.cat.devices',
  personal_care: 'pharmacy.cat.personalCare',
};

type FiltersPayload = { categories?: string[]; forms?: string[]; brands?: string[] };

const toggled = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function PharmacyFiltersScreen() {
  const { theme, t, c, dir, flow, k, num } = useScreenUi();
  const params = useLocalSearchParams<{ filter_category?: string; filter_forms?: string; filter_brands?: string; filter_rx?: string; filter_min_price?: string; filter_max_price?: string; filter_sort?: string }>();

  const [activeCat, setActiveCat] = useState(params.filter_category || 'all');
  const [activeForm, setActiveForm] = useState<string[]>(params.filter_forms ? params.filter_forms.split(',').filter(Boolean) : []);
  const [activeBrand, setActiveBrand] = useState<string[]>(params.filter_brands ? params.filter_brands.split(',').filter(Boolean) : []);
  const [rxOnly, setRxOnly] = useState(params.filter_rx === '1');
  const [activeSort, setActiveSort] = useState(params.filter_sort || 'relevant');
  const [brandSearch, setBrandSearch] = useState('');
  const [minPrice, setMinPrice] = useState(params.filter_min_price || '');
  const [maxPrice, setMaxPrice] = useState(params.filter_max_price || '');

  const [categories, setCategories] = useState<string[]>([]);
  const [forms, setForms] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(null);
    try {
      const data = await apiFetch<FiltersPayload>('/medicines/filters');
      setCategories(Array.isArray(data?.categories) ? data.categories : []);
      setForms(Array.isArray(data?.forms) ? data.forms : []);
      setBrands(Array.isArray(data?.brands) ? data.brands : []);
    } catch (e) {
      logError('pharmacy:filters', e);
      setFailed((await isOffline()) ? 'offline' : 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shownBrands = brands.filter((b) => b.includes(brandSearch));
  const activeCount = (activeCat !== 'all' ? 1 : 0) + activeForm.length + activeBrand.length + (rxOnly ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);

  const apply = () => {
    router.replace({
      pathname: '/(tabs)/pharmacy',
      params: {
        filter_category: activeCat,
        filter_forms: activeForm.join(','),
        filter_brands: activeBrand.join(','),
        filter_rx: rxOnly ? '1' : '0',
        filter_min_price: minPrice,
        filter_max_price: maxPrice,
        filter_sort: activeSort,
      },
    });
  };

  const reset = () => {
    setActiveCat('all');
    setActiveForm([]);
    setActiveBrand([]);
    setRxOnly(false);
    setActiveSort('relevant');
    setMinPrice('');
    setMaxPrice('');
    setBrandSearch('');
  };

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/pharmacy' as Href);
  };

  const header = (
    <View style={COLUMN}>
      <AppHeader
        title={k('pharmacy.filters.title')}
        onBack={back}
        backLabel={k('pharmacy.back')}
        theme={theme}
        direction={dir}
        trailing={
          activeCount > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel={k('pharmacy.filters.reset')} onPress={reset} hitSlop={6} style={{ minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' }}>
              <Text style={{ ...scale(t, 'caption', 'bold'), color: c.text.link }}>{k('pharmacy.filters.reset')}</Text>
            </Pressable>
          ) : undefined
        }
      />
    </View>
  );

  const footer = (
    <StickyFooter theme={theme} direction={dir}>
      <View style={COLUMN}>
        <Button label={activeCount > 0 ? k('pharmacy.filters.applyCount', { n: num(activeCount) }) : k('pharmacy.filters.apply')} size="lg" fullWidth startIcon="sliders" onPress={apply} theme={theme} />
      </View>
    </StickyFooter>
  );

  let body: React.ReactNode;
  if (failed) {
    body = (
      <View style={{ ...COLUMN, flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16 }}>
        {failed === 'offline' ? (
          <OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />
        ) : (
          <ErrorState title={k('pharmacy.filters.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />
        )}
      </View>
    );
  } else {
    body = (
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 24 }}>
        <View style={{ gap: 10 }}>
          <SectionHeader title={k('pharmacy.filters.sort')} theme={theme} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SORT_OPTIONS.map((o) => (
              <Chip key={o.id} label={k(o.label)} selected={activeSort === o.id} onPress={() => setActiveSort(o.id)} theme={theme} />
            ))}
          </View>
        </View>

        {!loading && categories.length ? (
          <View style={{ gap: 10 }}>
            <SectionHeader title={k('pharmacy.filters.category')} theme={theme} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['all', ...categories].map((cat) => (
                <Chip key={cat} label={cat === 'all' ? k('pharmacy.all') : CATEGORY_LABELS[cat] ? k(CATEGORY_LABELS[cat]) : cat} selected={activeCat === cat} onPress={() => setActiveCat(cat)} theme={theme} />
              ))}
            </View>
          </View>
        ) : null}

        <Card padding="sm" theme={theme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <FIcon icon="prescription" tone={PHARMACY_TONE} size={44} theme={theme} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={{ ...scale(t, 'control'), color: c.text.primary, ...flow }}>{k('pharmacy.filters.rxOnly')}</Text>
              <Text style={{ ...scale(t, 'label', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.filters.rxOnlyBody')}</Text>
            </View>
            <Toggle value={rxOnly} onChange={setRxOnly} label={k('pharmacy.filters.rxOnly')} theme={theme} />
          </View>
        </Card>

        <View style={{ gap: 10 }}>
          <SectionHeader title={k('pharmacy.filters.priceRange')} theme={theme} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input placeholder={k('pharmacy.filters.min')} value={minPrice} onChange={setMinPrice} keyboardType="decimal" theme={theme} />
            </View>
            <View style={{ flex: 1 }}>
              <Input placeholder={k('pharmacy.filters.max')} value={maxPrice} onChange={setMaxPrice} keyboardType="decimal" theme={theme} />
            </View>
          </View>
        </View>

        {!loading && forms.length ? (
          <View style={{ gap: 10 }}>
            <SectionHeader title={k('pharmacy.filters.form')} theme={theme} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {forms.map((f) => (
                <Chip key={f} label={f} selected={activeForm.includes(f)} onPress={() => setActiveForm((p) => toggled(p, f))} theme={theme} />
              ))}
            </View>
          </View>
        ) : null}

        {!loading && brands.length ? (
          <View style={{ gap: 10 }}>
            <SectionHeader title={k('pharmacy.filters.maker')} theme={theme} />
            <Search value={brandSearch} onChange={setBrandSearch} placeholder={k('pharmacy.filters.makerSearch')} label={k('pharmacy.filters.makerSearch')} onClear={() => setBrandSearch('')} clearLabel={k('pharmacy.clear')} theme={theme} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {shownBrands.map((b) => (
                <Chip key={b} label={b} selected={activeBrand.includes(b)} onPress={() => setActiveBrand((p) => toggled(p, b))} theme={theme} />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <Screen theme={theme} direction={dir} header={header} footer={footer} keyboard scroll testID="pharmacy-filters">
      {body}
    </Screen>
  );
}
