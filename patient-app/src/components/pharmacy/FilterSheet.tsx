import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Card, Chip, ErrorState, FIcon, Input, OfflineState, SectionHeader, Search, Toggle } from '../../../../packages/ui-native/src';
import { Sheet } from '../consult/ConsultKit';
import { PHARMACY_TONE } from './PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { isOffline } from '../../utils/isOffline';
import { logError } from '../../utils/logger';

/**
 * The catalogue's filters as a sheet (second pass, section 3: the old pharmacy/filters page). Sort, category, "prescription only",
 * price range, dosage form and maker, all from GET /medicines/filters. "Apply" hands the choices to the catalogue as the same
 * `filter_*` route params as before, so the filters live in the URL.
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

export type FilterParams = {
  filter_category: string;
  filter_forms: string;
  filter_brands: string;
  filter_rx: string;
  filter_min_price: string;
  filter_max_price: string;
  filter_sort: string;
};

export type FilterInitial = { filter_category?: string; filter_forms?: string; filter_brands?: string; filter_rx?: string; filter_min_price?: string; filter_max_price?: string; filter_sort?: string };

const toggled = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const splitList = (v?: string): string[] => (v ? v.split(',').filter(Boolean) : []);

export function FilterSheet({ open, onClose, initial, onApply }: { open: boolean; onClose: () => void; initial: FilterInitial; onApply: (params: FilterParams) => void }) {
  const { theme, t, c, flow, k, num } = useScreenUi();

  const [activeCat, setActiveCat] = useState(initial.filter_category || 'all');
  const [activeForm, setActiveForm] = useState<string[]>(splitList(initial.filter_forms));
  const [activeBrand, setActiveBrand] = useState<string[]>(splitList(initial.filter_brands));
  const [rxOnly, setRxOnly] = useState(initial.filter_rx === '1');
  const [activeSort, setActiveSort] = useState(initial.filter_sort || 'relevant');
  const [brandSearch, setBrandSearch] = useState('');
  const [minPrice, setMinPrice] = useState(initial.filter_min_price || '');
  const [maxPrice, setMaxPrice] = useState(initial.filter_max_price || '');

  const [categories, setCategories] = useState<string[]>([]);
  const [forms, setForms] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);

  // each time the sheet opens it starts from what the URL says
  useEffect(() => {
    if (!open) return;
    setActiveCat(initial.filter_category || 'all');
    setActiveForm(splitList(initial.filter_forms));
    setActiveBrand(splitList(initial.filter_brands));
    setRxOnly(initial.filter_rx === '1');
    setActiveSort(initial.filter_sort || 'relevant');
    setMinPrice(initial.filter_min_price || '');
    setMaxPrice(initial.filter_max_price || '');
    setBrandSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    if (open) void load();
  }, [open, load]);

  const shownBrands = brands.filter((b) => b.includes(brandSearch));
  const activeCount = (activeCat !== 'all' ? 1 : 0) + activeForm.length + activeBrand.length + (rxOnly ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);

  const apply = () => {
    onApply({
      filter_category: activeCat,
      filter_forms: activeForm.join(','),
      filter_brands: activeBrand.join(','),
      filter_rx: rxOnly ? '1' : '0',
      filter_min_price: minPrice,
      filter_max_price: maxPrice,
      filter_sort: activeSort,
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

  return (
    <Sheet open={open} title={k('pharmacy.filters.title')} onClose={onClose} closeLabel={k('consult.close')}>
      {failed ? (
        failed === 'offline' ? (
          <OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />
        ) : (
          <ErrorState title={k('pharmacy.filters.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />
        )
      ) : (
        <View style={{ gap: 24 }}>
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

          {activeCount > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel={k('pharmacy.filters.reset')} onPress={reset} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ ...scale(t, 'caption', 'bold'), color: c.text.link }}>{k('pharmacy.filters.reset')}</Text>
            </Pressable>
          ) : null}
          <Button label={activeCount > 0 ? k('pharmacy.filters.applyCount', { n: num(activeCount) }) : k('pharmacy.filters.apply')} size="lg" fullWidth startIcon="sliders" onPress={apply} theme={theme} />
        </View>
      )}
    </Sheet>
  );
}
