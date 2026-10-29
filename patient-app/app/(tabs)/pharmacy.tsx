import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScopedSuggest } from '../../src/components/search/ScopedSuggest';
import { SUGGEST_SCOPES } from '../../src/utils/searchSuggest';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  FIcon,
  Icon,
  OfflineState,
  ProductCard,
  Screen,
  Search,
  useTabBarHeight,
} from '../../../packages/ui-native/src';
import { RotatingProductImage } from '../../src/components/pharmacy/RotatingProductImage';
import { FilterSheet, SORT_OPTIONS } from '../../src/components/pharmacy/FilterSheet';
import { CartButton, WishlistButton, GlyphSquare, MedAddControl, PHARMACY_TONE, useAddMedToCart } from '../../src/components/pharmacy/PharmacyKit';
import { HeaderMenuButton } from '../../src/components/nav/HeaderMenuButton';
import { ActiveFilters, type ActiveFilter } from '../../src/components/pharmacy/ActiveFilters';
import { CategoryTiles } from '../../src/components/pharmacy/CategoryTiles';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useCart } from '../../src/context/CartContext';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { setVisibleProductIds } from '../../src/utils/productNav';
import {
  PHARMACY_CATEGORIES,
  countFilters,
  canShowPromo,
  discountPercent,
  filterMeds,
  listQuery,
  medGallery,
  medMeta,
  medName,
  medPrice,
  productNote,
  type HubFilters,
  type Med,
} from '../../src/utils/pharmacyCatalog';

/**
 * Pharmacy hub — board PharmacyHub (canvas/PharmacyHub.dc.html).
 *
 * The title with "my orders" and the cart (a count on it), the search field with the barcode and the ink camera
 * square, the "upload the prescription" hero, the quick links, "order again" (only for a signed-in patient with a
 * real previous order), the category chips and the two-column grid of product cards. Everything drawn is what the
 * API returns: a price, a discount, a prescription note or a maker is hidden when the backend does not send it.
 * The filter screen opens from the first chip (the board has no other place for it); its choices come back as
 * route params, as before.
 */

type Cell = Med | { id: string; pad: true };

/** A route that is a screen of the app (the typed router only knows the generated list). */
const go = (href: string) => router.push(href as Href);

function ProductSkeleton({ cols }: { cols: number }) {
  const { c, k } = useScreenUi();
  return (
    <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ gap: 10 }}>
      {[0, 1].map((row) => (
        <View key={row} style={{ flexDirection: 'row', gap: 10 }}>
          {Array.from({ length: cols }).map((_, i) => (
            <View key={i} style={{ flex: 1, borderRadius: 24, padding: 10, gap: 8, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
              <View style={{ height: 132, borderRadius: 18, backgroundColor: c.bg.media }} />
              <View style={{ height: 12, borderRadius: 6, width: '80%', backgroundColor: c.bg.sunken }} />
              <View style={{ height: 10, borderRadius: 5, width: '55%', backgroundColor: c.bg.sunken }} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const VIEWABLE = { itemVisiblePercentThreshold: 60 };

export default function PharmacyHub() {
  const { theme, t, c, dir, flow, k, money, num, lang } = useScreenUi();
  const barHeight = useTabBarHeight();
  const { width } = useWindowDimensions();
  const cols = width >= 768 ? 3 : 2;
  const { itemCount } = useCart();
  const addToCart = useAddMedToCart();
  // the cards on screen turn through their pictures; the ones scrolled away stop (the list tells us which are viewable)
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set());
  const onViewable = useRef(({ viewableItems }: { viewableItems: Array<{ item: { id?: unknown } }> }) => {
    setVisibleIds(new Set(viewableItems.map((v) => String(v.item?.id ?? ''))));
  }).current;

  // what the filter sheet hands back (the filters live in the URL)
  const params = useLocalSearchParams<{
    filter_category?: string;
    filter_forms?: string;
    filter_brands?: string;
    filter_rx?: string;
    filter_min_price?: string;
    filter_max_price?: string;
    filter_sort?: string;
  }>();
  const [activeCat, setActiveCat] = useState<string>(params.filter_category || 'all');
  // a category chosen on the filter screen becomes the active chip; a tap on a chip then overrides it
  useEffect(() => {
    if (params.filter_category) setActiveCat(params.filter_category);
  }, [params.filter_category]);

  const filters = useMemo<HubFilters>(
    () => ({ forms: params.filter_forms, brands: params.filter_brands, rx: params.filter_rx, minPrice: params.filter_min_price, maxPrice: params.filter_max_price, sort: params.filter_sort }),
    [params.filter_forms, params.filter_brands, params.filter_rx, params.filter_min_price, params.filter_max_price, params.filter_sort],
  );
  const activeFilterCount = countFilters({ ...filters, category: params.filter_category && params.filter_category === activeCat ? activeCat : undefined });

  const [filterOpen, setFilterOpen] = useState(false);
  const [medicines, setMedicines] = useState<Med[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [term, setTerm] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  /** #451: the catalogue's own categories (GET /medicines/categories); a chip whose category has no item is not drawn. */
  const [catalogCats, setCatalogCats] = useState<Set<string> | null>(null);
  useEffect(() => {
    let stale = false;
    apiFetch<Array<{ slug?: string; count?: number }>>('/medicines/categories')
      .then((rows) => {
        if (!stale && Array.isArray(rows)) setCatalogCats(new Set(rows.filter((r) => (r.count ?? 0) > 0).map((r) => String(r.slug))));
      })
      .catch(() => {
        /* the chips stay as they are */
      });
    return () => {
      stale = true;
    };
  }, []);

  // the search words are sent to the server once typing pauses
  useEffect(() => {
    const timer = setTimeout(() => setTerm(searchQuery.trim()), searchQuery ? 350 : 0);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // GET /medicines for the search, the category and the filters (the last answer is kept on the phone for offline use)
  useEffect(() => {
    let stale = false;
    (async () => {
      setLoading(true);
      setFailed(null);
      const qs = listQuery(term, activeCat, filters);
      const cacheKey = `@nabdah_offline_cat_${qs}`;
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        if (raw && !stale) setMedicines((JSON.parse(raw) as { data?: Med[] }).data || []);
      } catch {
        /* no cached answer */
      }
      try {
        const data = await apiFetch<Med[] | { data?: Med[] }>(`/medicines?${qs}`);
        const rows = Array.isArray(data) ? data : data?.data || [];
        if (stale) return;
        setMedicines(rows);
        AsyncStorage.setItem(cacheKey, JSON.stringify({ data: rows, ts: Date.now() })).catch(() => {});
      } catch (err) {
        logError('pharmacy:tab', err);
        if (!stale) setFailed((await isOffline()) ? 'offline' : 'error');
      } finally {
        if (!stale) setLoading(false);
      }
    })();
    return () => {
      stale = true;
    };
  }, [term, activeCat, filters, reloadKey]);

  const filtered = useMemo(() => filterMeds(medicines, { activeCat, search: term, filters }), [medicines, activeCat, term, filters]);
  useEffect(() => {
    setVisibleProductIds(filtered.map((x) => String(x.id)));
  }, [filtered]);

  // pad the last row so a lone card keeps one column's width
  const cells = useMemo<Cell[]>(() => {
    const out: Cell[] = [...filtered];
    while (out.length % cols) out.push({ id: `pad-${out.length}`, pad: true });
    return out;
  }, [filtered, cols]);

  const openProduct = useCallback((m: Med) => {
    apiFetch('/medicines/events', { method: 'POST', body: JSON.stringify({ event_type: 'product_clicked', drug_id: m.id }) }).catch(() => {});
    router.push({ pathname: '/pharmacy/product-detail', params: { id: m.id, name: medName(m) } });
  }, []);

  const caretIcon = dir === 'rtl' ? 'caret-left' : 'caret-right';
  const chevron = <Icon name={caretIcon} size={18} theme={theme} tone="secondary" />;

  const FILTER_PARAMS = ['filter_category', 'filter_forms', 'filter_brands', 'filter_rx', 'filter_min_price', 'filter_max_price', 'filter_sort'] as const;
  const clearAll = () => {
    router.setParams(Object.fromEntries(FILTER_PARAMS.map((p) => [p, ''])));
    setActiveCat('all');
  };
  const csv = (v?: string) => (v ? v.split(',').filter(Boolean) : []);
  const without = (v: string | undefined, one: string) => csv(v).filter((x) => x !== one).join(',');
  const SORT_LABELS: Record<string, string> = { relevant: 'pharmacy.filters.sortRelevant', price_asc: 'pharmacy.filters.sortPriceAsc', price_desc: 'pharmacy.filters.sortPriceDesc', newest: 'pharmacy.filters.sortNewest' };
  // the filters that are on, each removable (owner layout addition a)
  const activeItems: ActiveFilter[] = [];
  if (activeCat !== 'all') {
    const cat = PHARMACY_CATEGORIES.find((x) => x.id === activeCat);
    activeItems.push({ key: 'cat', label: cat ? k(cat.labelKey) : activeCat, onRemove: () => { router.setParams({ filter_category: '' }); setActiveCat('all'); } });
  }
  csv(filters.forms).forEach((f) => activeItems.push({ key: `form-${f}`, label: f, onRemove: () => router.setParams({ filter_forms: without(filters.forms, f) }) }));
  csv(filters.brands).forEach((b) => activeItems.push({ key: `brand-${b}`, label: b, onRemove: () => router.setParams({ filter_brands: without(filters.brands, b) }) }));
  if (filters.rx === '1') activeItems.push({ key: 'rx', label: k('pharmacy.filters.rxOnly'), onRemove: () => router.setParams({ filter_rx: '' }) });
  if (filters.minPrice || filters.maxPrice) {
    activeItems.push({ key: 'price', label: [filters.minPrice ? num(Number(filters.minPrice)) : '', filters.maxPrice ? num(Number(filters.maxPrice)) : ''].join(' - ').trim(), onRemove: () => router.setParams({ filter_min_price: '', filter_max_price: '' }) });
  }
  if (filters.sort && SORT_LABELS[filters.sort]) activeItems.push({ key: 'sort', label: k(SORT_LABELS[filters.sort]), onRemove: () => router.setParams({ filter_sort: '' }) });

  // fixed under the top of the screen while the list scrolls (owner layout addition b): the title row and the search
  const pinned = (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 7, paddingBottom: 10, width: '100%', maxWidth: 720, alignSelf: 'center', backgroundColor: c.bg.canvas }}>
      {/* title, favourites, cart (the map lives on Home; my orders and reminders are tiles on Home) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text accessibilityRole="header" style={{ flex: 1, ...scale(t, 'h1'), letterSpacing: -0.3, color: c.text.primary, ...flow }}>{k('pharmacy.title')}</Text>
        <WishlistButton />
        <CartButton />
        <HeaderMenuButton testID="pharmacy-menu-button" />
      </View>

      {/* search with the barcode, and the ink camera square */}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Search
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={k('pharmacy.hub.searchPlaceholder')}
            label={k('pharmacy.search')}
            onClear={() => setSearchQuery('')}
            clearLabel={k('pharmacy.clear')}
            onScanPress={() => go('/pharmacy/barcode-scanner')}
            scanLabel={k('pharmacy.hub.scanBarcode')}
            testID="pharmacy-search"
            theme={theme}
          />
          <ScopedSuggest query={searchQuery} scope={SUGGEST_SCOPES.pharmacy} />
        </View>
        <GlyphSquare name="camera" label={k('pharmacy.hub.photoRx')} onPress={() => go('/pharmacy/rx-order?via=photo')} />
      </View>
    </View>
  );

  const header = (
    <View style={{ gap: 16 }}>
      {/* upload the prescription */}
      <Pressable accessibilityRole="link" accessibilityLabel={k('pharmacy.uploadRx')} onPress={() => go('/pharmacy/rx-order?via=photo')}>
        <Card tint={PHARMACY_TONE} padding="md" elevation="flat" theme={theme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <FIcon icon="prescription" tone={PHARMACY_TONE} chip="solid" size={56} theme={theme} />
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('pharmacy.uploadRx')}</Text>
              <Text style={{ ...scale(t, 'label', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k('pharmacy.hub.rxHero')}</Text>
            </View>
            {chevron}
          </View>
        </Card>
      </Pressable>

      {/* the categories: large tiles, two rows */}
      <CategoryTiles
        items={PHARMACY_CATEGORIES.filter((cat) => cat.id === 'all' || !catalogCats || catalogCats.has(cat.dbName)).map((cat) => ({ id: cat.id, label: k(cat.labelKey) }))}
        activeId={activeCat}
        onSelect={setActiveCat}
      />

      {/* sort: no chip selected = the ranking ("Recommended"); the same values the filter sheet sends */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} accessibilityLabel={`${k('pharmacy.filters.sort')}: ${filters.sort && SORT_LABELS[filters.sort] ? k(SORT_LABELS[filters.sort]) : k('pharmacy.filters.sortRecommended')}`} testID="pharmacy-sort-row">
        {SORT_OPTIONS.map((o) => (
          <Chip key={o.id} label={k(o.label)} selected={filters.sort === o.id} onPress={() => router.setParams({ filter_sort: filters.sort === o.id ? '' : o.id })} theme={theme} />
        ))}
      </ScrollView>

      {/* filter results, then the filters that are on */}
      <View style={{ flexDirection: 'row' }}>
        <Chip label={k('pharmacy.hub.filter')} startIcon="sliders" count={activeFilterCount > 0 ? activeFilterCount : undefined} selected={activeFilterCount > 0} onPress={() => setFilterOpen(true)} theme={theme} />
      </View>
      <ActiveFilters items={activeItems} onClearAll={clearAll} />
    </View>
  );

  const searching = Boolean(term) || activeFilterCount > 0 || activeCat !== 'all';
  let empty: React.ReactNode = null;
  if (loading && !medicines.length) {
    empty = <ProductSkeleton cols={cols} />;
  } else if (failed && !medicines.length) {
    empty =
      failed === 'offline' ? (
        <OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => setReloadKey((k) => k + 1)} theme={theme} />
      ) : (
        <ErrorState title={k('pharmacy.hub.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => setReloadKey((k) => k + 1)} theme={theme} />
      );
  } else if (!filtered.length) {
    empty = (
      <EmptyState
        icon="magnifying-glass"
        tone={PHARMACY_TONE}
        title={k(searching ? 'pharmacy.hub.noMatch' : 'pharmacy.hub.noProducts')}
        body={k('pharmacy.hub.emptyBody')}
        actionLabel={k('pharmacy.hub.manualRequest')}
        onAction={() => go('/pharmacy/rx-order?via=type')}
        theme={theme}
      />
    );
  }

  return (
    <Screen theme={theme} direction={dir} edges={['top', 'start', 'end']} testID="pharmacy-hub">
      {pinned}
      <FlatList
        key={`cols-${cols}-${lang}`}
        style={{ flex: 1 }}
        data={cells}
        keyExtractor={(m) => String(m.id)}
        numColumns={cols}
        columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
        ListHeaderComponent={<View style={{ marginBottom: 16 }}>{header}</View>}
        ListEmptyComponent={empty ?? undefined}
        keyboardShouldPersistTaps="handled"
        // pull down to reload the list (the same reload the retry button asks for)
        refreshControl={<RefreshControl refreshing={loading && medicines.length > 0} onRefresh={() => setReloadKey((n) => n + 1)} tintColor={c.text.primary} />}
        initialNumToRender={8}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={VIEWABLE}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{ width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: barHeight + 40, flexGrow: 1 }}
        renderItem={({ item }) => {
          if ('pad' in item) return <View style={{ flex: 1 }} />;
          const price = medPrice(item);
          const pct = canShowPromo(item) ? discountPercent(item) : 0;
          return (
            <View style={{ flex: 1, minWidth: 0 }}>
              <ProductCard
                name={medName(item)}
                meta={medMeta(item) || undefined}
                price={price ? money(price) : ''}
                currency={price ? k('pharmacy.currency') : undefined}
                image={<RotatingProductImage uris={medGallery(item)} active={visibleIds.has(String(item.id))} iconSize={40} />}
                discountLabel={pct > 0 ? k('pharmacy.discount', { n: num(pct) }) : undefined}
                rxLabel={productNote(item, { rx: k('pharmacy.needsRx'), online: k('pharmacy.product.exclusive') })}
                addLabel={k('pharmacy.addToCart')}
                onPress={() => openProduct(item)}
                onAdd={() => addToCart(item)}
                addControl={<MedAddControl med={item} size={40} disabled={!price} addLabel={k('pharmacy.addToCart')} />}
                testID={`pharmacy-card-${item.id}`}
                theme={theme}
              />
            </View>
          );
        }}
      />
      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        initial={params}
        onApply={(next) => {
          router.setParams(next);
          setFilterOpen(false);
        }}
      />
    </Screen>
  );
}
