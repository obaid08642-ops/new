import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSelector } from 'react-redux';

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
import type { FillIconName, ServiceTone } from '../../../packages/ui/icons/fill';
import ProductImage from '../../src/components/ProductImage';
import { CountBadge, GlyphRound, GlyphSquare, PHARMACY_TONE, SECONDARY_TONE, useAddMedToCart } from '../../src/components/pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useCart } from '../../src/context/CartContext';
import { dateLocaleFor } from '../../src/utils/dates';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { setVisibleProductIds } from '../../src/utils/productNav';
import {
  PHARMACY_CATEGORIES,
  countFilters,
  discountPercent,
  filterMeds,
  listQuery,
  medGallery,
  medMeta,
  medName,
  medPrice,
  needsRx,
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

type PharmacyOrder = { id: string; createdAt?: string; governed_state?: string; items?: unknown[] };
type Cell = Med | { id: string; pad: true };

/** A route that is a screen of the app (the typed router only knows the generated list). */
const go = (href: string) => router.push(href as Href);

const QUICK: { key: string; label: string; icon: FillIconName; tone: ServiceTone; route: string }[] = [
  { key: 'chat', label: 'pharmacy.hub.chat', icon: 'chat-circle-text', tone: 'mint', route: '/pharmacy/pharmacist-chat' },
  { key: 'favorites', label: 'pharmacy.favorites', icon: 'heart', tone: PHARMACY_TONE, route: '/pharmacy/wishlist' },
  { key: 'reminders', label: 'pharmacy.hub.reminders', icon: 'bell', tone: 'violet', route: '/health/medication-reminder-list' },
];

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

export default function PharmacyHub() {
  const { theme, t, c, dir, flow, k, money, num, lang } = useScreenUi();
  const barHeight = useTabBarHeight();
  const { width } = useWindowDimensions();
  const cols = width >= 768 ? 3 : 2;
  const { itemCount } = useCart();
  const addToCart = useAddMedToCart();
  const isMember = useSelector((s: { auth?: { isAuthenticated?: boolean; isGuest?: boolean } }) => Boolean(s.auth?.isAuthenticated && !s.auth?.isGuest));

  // what the filter screen hands back
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

  const [medicines, setMedicines] = useState<Med[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [term, setTerm] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [lastOrder, setLastOrder] = useState<{ id: string; count: number; at: string } | null>(null);

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

  // "order again": the patient's latest real pharmacy order (a guest has none, so nothing is asked)
  useEffect(() => {
    if (!isMember) {
      setLastOrder(null);
      return;
    }
    let stale = false;
    apiFetch<PharmacyOrder[] | { data?: PharmacyOrder[] }>('/patient/pharmacy/orders')
      .then((res) => {
        if (stale) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        const latest = list
          .filter((o) => o.governed_state !== 'CART_DRAFT' && Array.isArray(o.items) && o.items.length > 0)
          .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))[0];
        setLastOrder(latest ? { id: latest.id, count: latest.items?.length ?? 0, at: latest.createdAt ?? '' } : null);
      })
      .catch(() => {
        if (!stale) setLastOrder(null);
      });
    return () => {
      stale = true;
    };
  }, [isMember]);

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

  const header = (
    <View style={{ gap: 16 }}>
      {/* title, my orders, cart */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text accessibilityRole="header" style={{ flex: 1, ...scale(t, 'h1'), letterSpacing: -0.3, color: c.text.primary, ...flow }}>{k('pharmacy.title')}</Text>
        <GlyphRound name="receipt" label={k('pharmacy.hub.orders')} onPress={() => go('/pharmacy/order-history')} />
        <GlyphRound name="package" label={k('pharmacy.cart')} onPress={() => go('/pharmacy/cart')}>
          <CountBadge count={itemCount} />
        </GlyphRound>
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
        </View>
        <GlyphSquare name="camera" label={k('pharmacy.hub.photoRx')} onPress={() => go('/pharmacy/scan-prescription')} />
      </View>

      {/* upload the prescription */}
      <Pressable accessibilityRole="link" accessibilityLabel={k('pharmacy.uploadRx')} onPress={() => go('/pharmacy/scan-prescription')}>
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

      {/* quick links */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {QUICK.map((q) => (
          <Pressable
            key={q.key}
            accessibilityRole="link"
            accessibilityLabel={k(q.label)}
            onPress={() => go(q.route)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 96,
              borderRadius: 20,
              backgroundColor: c.bg.surface,
              borderWidth: 1,
              borderColor: c.border.hairline,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingHorizontal: 6,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <FIcon icon={q.icon} tone={q.tone} size={42} theme={theme} />
            <Text style={{ ...scale(t, 'micro', 'bold'), color: c.text.primary, textAlign: 'center' }}>{k(q.label)}</Text>
          </Pressable>
        ))}
      </View>

      {/* order again */}
      {lastOrder ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={k('pharmacy.hub.reorder')}
          onPress={() => router.push({ pathname: '/pharmacy/reorder', params: { orderId: lastOrder.id } })}
          style={{ borderRadius: 22, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <FIcon icon="clock-counter-clockwise" tone={SECONDARY_TONE} size={44} theme={theme} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ ...scale(t, 'bodyStrong'), lineHeight: 21, color: c.text.primary, ...flow }}>{k('pharmacy.hub.reorder')}</Text>
            <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>
              {[lastOrder.count === 1 ? k('pharmacy.hub.oneItem') : k('pharmacy.hub.items', { n: num(lastOrder.count) }), lastOrder.at ? new Date(lastOrder.at).toLocaleDateString(dateLocaleFor(lang), { year: 'numeric', month: 'short', day: 'numeric' }) : ''].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.action.selected.bg, justifyContent: 'center' }}>
            <Text style={{ ...scale(t, 'small', 'bold'), color: c.action.selected.fg }}>{k('pharmacy.hub.order')}</Text>
          </View>
        </Pressable>
      ) : null}

      {/* the filter chip and the categories */}
      <View style={{ marginHorizontal: -16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <Chip label={k('pharmacy.hub.filter')} startIcon="sliders" count={activeFilterCount > 0 ? activeFilterCount : undefined} selected={activeFilterCount > 0} onPress={() => go('/pharmacy/filters')} theme={theme} />
          {PHARMACY_CATEGORIES.map((cat) => (
            <Chip key={cat.id} label={k(cat.labelKey)} selected={activeCat === cat.id} onPress={() => setActiveCat(cat.id)} theme={theme} />
          ))}
        </ScrollView>
      </View>
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
        onAction={() => go('/pharmacy/request')}
        theme={theme}
      />
    );
  }

  return (
    <Screen theme={theme} direction={dir} edges={['top', 'start', 'end']} testID="pharmacy-hub">
      <FlatList
        key={`cols-${cols}-${lang}`}
        style={{ flex: 1 }}
        data={cells}
        keyExtractor={(m) => String(m.id)}
        numColumns={cols}
        columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
        ListHeaderComponent={<View style={{ marginBottom: 16 }}>{header}</View>}
        ListEmptyComponent={empty}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{ width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 7, paddingBottom: barHeight + 40, flexGrow: 1 }}
        renderItem={({ item }) => {
          if ('pad' in item) return <View style={{ flex: 1 }} />;
          const price = medPrice(item);
          const pct = discountPercent(item);
          return (
            <View style={{ flex: 1, minWidth: 0 }}>
              <ProductCard
                name={medName(item)}
                meta={medMeta(item) || undefined}
                price={price ? money(price) : ''}
                currency={price ? k('pharmacy.currency') : undefined}
                image={<ProductImage uri={medGallery(item)[0]} style={{ width: '100%', height: '100%' }} iconSize={40} />}
                discountLabel={pct > 0 ? k('pharmacy.discount', { n: num(pct) }) : undefined}
                rxLabel={needsRx(item) ? k('pharmacy.needsRx') : undefined}
                addLabel={k('pharmacy.addToCart')}
                onPress={() => openProduct(item)}
                onAdd={() => addToCart(item)}
                testID={`pharmacy-card-${item.id}`}
                theme={theme}
              />
            </View>
          );
        }}
      />
    </Screen>
  );
}
