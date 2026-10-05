import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppHeader,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  FIcon,
  Icon,
  Input,
  OfflineState,
  Radio,
  Screen,
  SectionHeader,
  Stepper,
  StickyFooter,
} from '../../../packages/ui-native/src';
import ProductImage from '../../src/components/ProductImage';
import { CountBadge, Glyph, PHARMACY_TONE, useAddMedToCart } from '../../src/components/pharmacy/PharmacyKit';
import { DetailAccordion, FactsGrid, MiniProduct, Pill, SafetyCard, type AccordionSection } from '../../src/components/pharmacy/ProductSections';
import { COLUMN, step as scale, tint, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useCart } from '../../src/context/CartContext';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { apiFetch } from '../../src/utils/api';
import { dateLocaleFor } from '../../src/utils/dates';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { currentDbLang } from '../../src/utils/localize';
import { prefetchAlternatives, prefetchHotMedicines } from '../../src/utils/prefetch';
import { getVisibleProductIds } from '../../src/utils/productNav';
import { discountPercent, medField, medGallery, medMeta, medName, medPrice, needsRx, type Med } from '../../src/utils/pharmacyCatalog';

/**
 * Product page — board ProductFull (canvas/ProductFull.dc.html), field mapping in SPEC_PRODUCT_DOCTOR_DETAIL §A.
 *
 * Gallery with dots and the discount / online-only badges, then the sheet: Rx, category and cold-chain chips, the
 * name block, the price card with the quantity stepper and availability, the shortage note, the key facts, the
 * alternatives, safety, the details accordion, related products, "ask a pharmacist" and the identifiers, with the
 * glass footer (total, add to cart, buy now). Every field is hidden when the API does not send it; nothing is made up.
 */

type Detail = Med & {
  country_of_origin?: string | null;
  cold_chain?: boolean;
  controlled?: boolean;
  online_exclusive?: boolean;
  potentially_unavailable?: boolean;
  discontinued?: boolean;
  shortage_notes?: string | null;
  pharmacies_count?: number;
  stock_status?: { pharmacies_count?: number };
  sku?: number | string | null;
  barcode?: string | null;
  medical_review_status?: string;
  last_reviewed?: string | null;
  alternatives?: Med[];
  related_product_ids?: string[];
  interactions?: string[];
};

/** A field as a list of lines: an array as it is, a text split at its line breaks, nothing when empty. */
const linesOf = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim() && v !== 'null') return v.split('\n').map((x) => x.trim()).filter(Boolean);
  return [];
};
const textOf = (v: unknown): string => (typeof v === 'string' && v.trim() && v !== 'null' ? v.trim() : '');

/** A 44 round glass button over the gallery (board: white 72% with a hairline ring). */
function GlassButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  const { c } = useScreenUi();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: c.glass.bgStrong, borderWidth: 1, borderColor: c.border.onGlass, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
    >
      {children}
    </Pressable>
  );
}

const SUGGEST_TYPES = [
  { id: 'field_edit', label: 'pharmacy.suggest.fieldEdit' },
  { id: 'image_remove', label: 'pharmacy.suggest.imageRemove' },
  { id: 'shortage_badge', label: 'pharmacy.suggest.shortage' },
  { id: 'duplicate_remove', label: 'pharmacy.suggest.duplicate' },
  { id: 'other', label: 'pharmacy.suggest.other' },
] as const;
const SUGGEST_FIELDS = [
  { id: 'description_ar', label: 'pharmacy.suggest.fieldDescription' },
  { id: 'active_ingredient', label: 'pharmacy.suggest.fieldIngredient' },
  { id: 'usage_instructions_ar', label: 'pharmacy.suggest.fieldUsage' },
  { id: 'dosage_ar', label: 'pharmacy.suggest.fieldDosage' },
  { id: 'manufacturer', label: 'pharmacy.suggest.fieldMaker' },
  { id: 'name_ar', label: 'pharmacy.suggest.fieldName' },
] as const;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, t, c, dir, flow, k, num, money, lang } = useScreenUi();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const colWidth = Math.min(width, 440);
  const { items, updateQty, itemCount } = useCart();
  const addToCart = useAddMedToCart();

  // ── Swipe between products — from the screen edge only ──────────────────
  // The gesture must start within 28 of the edge AND travel 110 sideways, so the gallery's own swipe and normal
  // touches never trigger it.
  const widthRef = useRef(width);
  widthRef.current = width;
  const navIdsRef = useRef<string[]>([]);
  if (!navIdsRef.current.length) navIdsRef.current = getVisibleProductIds();
  const goSibling = (step: 1 | -1) => {
    const ids = navIdsRef.current;
    const i = ids.indexOf(String(id));
    const next = ids[i + step];
    if (i >= 0 && next) router.push({ pathname: '/pharmacy/product-detail', params: { id: next } });
  };
  const goSiblingRef = useRef(goSibling);
  goSiblingRef.current = goSibling;
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (e, g) => {
        const startX = e.nativeEvent.pageX - g.dx;
        const fromEdge = startX <= 28 || startX >= widthRef.current - 28;
        return fromEdge && Math.abs(g.dx) > 70 && Math.abs(g.dy) < 30;
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dx <= -110) goSiblingRef.current(1);
        else if (g.dx >= 110) goSiblingRef.current(-1);
      },
    }),
  ).current;

  const [med, setMed] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [qty, setQty] = useState(1);
  const [related, setRelated] = useState<Med[]>([]);
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestType, setSuggestType] = useState<string>('field_edit');
  const [suggestField, setSuggestField] = useState<string>('description_ar');
  const [suggestValue, setSuggestValue] = useState('');
  const [suggestNote, setSuggestNote] = useState('');
  const [suggestSending, setSuggestSending] = useState(false);

  const line = items.find((i) => String(i.id) === String(id));
  const inCartQty = line?.qty ?? 0;
  const shownQty = inCartQty > 0 ? inCartQty : qty;

  useEffect(() => {
    let active = true;
    apiFetch<Med[] | { data?: Med[] }>('/users/me/wishlist')
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : rows?.data || [];
        if (active) setInWishlist(list.some((r) => String(r.id) === String(id)));
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [id]);

  const toggleWishlist = async () => {
    if (wishlistBusy) return;
    setWishlistBusy(true);
    try {
      const res = await apiFetch<{ in_wishlist?: boolean }>(`/users/me/wishlist/${id}`, { method: 'POST' });
      setInWishlist(res?.in_wishlist ?? !inWishlist);
    } catch {
      // honest failure: leave the icon unchanged
    } finally {
      setWishlistBusy(false);
    }
  };

  // GET /medicines/:id/details — the enriched row: every field, the gallery, the discount, alternatives and stock
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setFailed(null);
      try {
        const data = await apiFetch<Detail>(`/medicines/${id}/details?lang=${currentDbLang()}`);
        if (!active) return;
        if (data && data.id) {
          setMed(data);
          setImages(medGallery(data));
          apiFetch('/medicines/events', { method: 'POST', body: JSON.stringify({ event_type: 'product_viewed', drug_id: id }) }).catch(() => {});
          prefetchAlternatives(data.alternatives || []);
          prefetchHotMedicines();
        } else {
          setMed(null);
        }
      } catch (e) {
        logError('pharmacy:product-detail', e);
        if (active) {
          setMed(null);
          setFailed((await isOffline()) ? 'offline' : 'error');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  // related products: the row only holds ids, so the real rows come from the catalogue's batch lookup
  useEffect(() => {
    const ids = (med?.related_product_ids ?? []).slice(0, 8);
    if (!ids.length) {
      setRelated([]);
      return;
    }
    let active = true;
    apiFetch<Med[]>('/medicines/compare', { method: 'POST', body: JSON.stringify({ ids }) })
      .then((rows) => {
        if (active) setRelated(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (active) setRelated([]);
      });
    return () => {
      active = false;
    };
  }, [med]);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first && typeof first.index === 'number') setActiveImage(first.index);
  }).current;

  const submitSuggestion = async () => {
    if (suggestSending) return;
    if (suggestType === 'field_edit' && !suggestValue.trim()) {
      showLocalizedAlert('', k('pharmacy.suggest.valueRequired'));
      return;
    }
    setSuggestSending(true);
    try {
      await apiFetch(`/medicines/${id}/suggest-change`, {
        method: 'POST',
        body: JSON.stringify({
          type: suggestType,
          changes: suggestType === 'field_edit' ? { [suggestField]: suggestValue.trim() } : {},
          note: suggestNote.trim() || undefined,
        }),
      });
      setSuggestOpen(false);
      setSuggestValue('');
      setSuggestNote('');
      showLocalizedAlert(k('pharmacy.suggest.sentTitle'), k('pharmacy.suggest.sentBody'));
    } catch {
      showLocalizedAlert(k('pharmacy.suggest.failTitle'), k('pharmacy.suggest.failBody'));
    } finally {
      setSuggestSending(false);
    }
  };

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/pharmacy' as Href);
  };
  const go = (href: Href) => router.push(href);

  // ── the product the page draws ──────────────────────────────────────────
  const view = useMemo(() => {
    if (!med) return null;
    const name = medName(med);
    const price = medPrice(med);
    const pct = discountPercent(med);
    const rx = needsRx(med);
    const lastReviewed = med.last_reviewed ? new Date(med.last_reviewed) : null;
    const stock = med.pharmacies_count ?? med.stock_status?.pharmacies_count ?? 0;
    const storage = textOf(medField(med, 'storage_conditions'));
    // `label` is a translation key; `value` is data, or a key when `valueIsKey`
    const shortFacts: { key: string; icon: 'pill' | 'scales' | 'package' | 'thermometer' | 'globe' | 'file-text'; label: string; value: string; valueIsKey?: boolean }[] = [];
    const add = (key: string, icon: (typeof shortFacts)[number]['icon'], label: string, value: string) => value && shortFacts.push({ key, icon, label, value });
    add('form', 'pill', 'pharmacy.fact.form', textOf(medField(med, 'form')));
    add('strength', 'scales', 'pharmacy.fact.strength', textOf(medField(med, 'strength')));
    add('pack', 'package', 'pharmacy.fact.pack', textOf(med.package_size));
    add('storage', 'thermometer', 'pharmacy.fact.storage', storage && storage.length <= 28 ? storage : '');
    add('origin', 'globe', 'pharmacy.fact.origin', textOf(med.country_of_origin));
    shortFacts.push({ key: 'rx', icon: 'file-text', label: 'pharmacy.fact.rx', value: rx ? 'pharmacy.fact.rxRequired' : 'pharmacy.fact.rxNotRequired', valueIsKey: true });

    const pregnancy = textOf(medField(med, 'pregnancy_info'));
    const breastfeeding = textOf(medField(med, 'breastfeeding_info'));
    const sections: AccordionSection[] = [
      { key: 'description', title: 'pharmacy.section.description', items: linesOf(medField(med, 'description')) },
      { key: 'indications', title: 'pharmacy.section.indications', items: linesOf(medField(med, 'indications')) },
      { key: 'dosage', title: 'pharmacy.section.dosage', items: linesOf(medField(med, 'dosage')) },
      { key: 'usage', title: 'pharmacy.section.usage', items: linesOf(medField(med, 'usage_instructions')) },
      { key: 'warnings', title: 'pharmacy.section.warnings', items: linesOf(medField(med, 'warnings')) },
      { key: 'precautions', title: 'pharmacy.section.precautions', items: linesOf(medField(med, 'precautions')) },
      { key: 'side', title: 'pharmacy.section.sideEffects', items: linesOf(medField(med, 'side_effects')) },
      { key: 'contra', title: 'pharmacy.section.contra', items: linesOf(medField(med, 'contraindications')) },
      { key: 'interactions', title: 'pharmacy.section.interactions', items: linesOf(med.interactions) },
      { key: 'pregnancy', title: 'pharmacy.section.pregnancyBreastfeeding', items: [...linesOf(pregnancy), ...linesOf(breastfeeding)] },
      { key: 'storage', title: 'pharmacy.section.storage', items: linesOf(storage) },
      { key: 'more', title: 'pharmacy.section.more', items: linesOf(medField(med, 'more_info')) },
    ].filter((s) => s.items.length > 0);

    return {
      name,
      price,
      pct,
      rx,
      enName: lang !== 'en' && med.name_en && med.name_en !== name ? med.name_en : '',
      ingredient: textOf(medField(med, 'active_ingredient')),
      generic: textOf(med.generic_name),
      maker: textOf(med.manufacturer),
      origin: textOf(med.country_of_origin),
      category: textOf(medField(med, 'category')),
      subCategory: textOf(medField(med, 'sub_category')),
      categoryRaw: textOf(med.category),
      facts: shortFacts,
      stock,
      limited: Boolean(med.potentially_unavailable),
      discontinued: Boolean(med.discontinued),
      pregnancy,
      breastfeeding,
      sections,
      reviewed: med.medical_review_status === 'approved',
      reviewedOn: lastReviewed && !Number.isNaN(lastReviewed.getTime()) ? lastReviewed.toLocaleDateString(dateLocaleFor(lang), { year: 'numeric', month: 'short', day: 'numeric' }) : '',
      alternatives: Array.isArray(med.alternatives) ? med.alternatives : [],
    };
  }, [med, lang]);

  const cartBadge = <CountBadge count={itemCount} />;

  // ── loading, failure, not found ─────────────────────────────────────────
  if (loading || !med || !view) {
    const stateBody = loading ? (
      <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ ...COLUMN, gap: 12 }}>
        <View style={{ height: 300, backgroundColor: c.bg.surface }} />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <View style={{ height: 28, width: '70%', borderRadius: 8, backgroundColor: c.bg.sunken }} />
          <View style={{ height: 14, width: '40%', borderRadius: 7, backgroundColor: c.bg.sunken }} />
          <View style={{ height: 110, borderRadius: 24, backgroundColor: c.bg.surface }} />
        </View>
      </View>
    ) : failed === 'offline' ? (
      <OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => setReloadKey((k) => k + 1)} theme={theme} />
    ) : failed === 'error' ? (
      <ErrorState title={k('pharmacy.product.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => setReloadKey((k) => k + 1)} theme={theme} />
    ) : (
      <EmptyState icon="magnifying-glass" tone={PHARMACY_TONE} title={k('pharmacy.product.notFound')} actionLabel={k('pharmacy.title')} onAction={() => router.replace('/(tabs)/pharmacy' as Href)} theme={theme} />
    );
    return (
      <Screen theme={theme} direction={dir} header={<View style={COLUMN}><AppHeader onBack={back} backLabel={k('pharmacy.back')} theme={theme} direction={dir} /></View>} scroll testID="product-detail">
        {stateBody}
      </Screen>
    );
  }

  const stockLine = view.stock > 0 ? (view.stock === 1 ? k('pharmacy.product.stockOne') : k('pharmacy.product.stockMany', { n: num(view.stock) })) : '';
  const compareIds = [String(med.id), ...view.alternatives.map((a) => String(a.id))].slice(0, 4);

  const safetyRows = [
    view.pregnancy ? { key: 'pregnancy', icon: 'baby' as const, tone: 'amber' as const, title: k('pharmacy.safety.pregnancy'), text: view.pregnancy } : null,
    view.breastfeeding ? { key: 'breastfeeding', icon: 'baby-carriage' as const, tone: 'violet' as const, title: k('pharmacy.safety.breastfeeding'), text: view.breastfeeding } : null,
    med.cold_chain ? { key: 'cold', icon: 'thermometer' as const, tone: 'blue' as const, title: k('pharmacy.safety.cold'), text: k('pharmacy.safety.coldBody') } : null,
    med.controlled ? { key: 'controlled', icon: 'warning' as const, tone: PHARMACY_TONE, title: k('pharmacy.safety.controlled'), text: k('pharmacy.safety.controlledBody') } : null,
  ].filter((r): r is NonNullable<typeof r> => r !== null);

  const alternativesBlock = view.alternatives.length ? (
    <View style={{ gap: 10 }}>
      <SectionHeader title={k('pharmacy.product.alternatives')} actionLabel={k('pharmacy.viewAll')} onActionPress={() => router.push({ pathname: '/pharmacy/medicine-compare', params: { ids: compareIds.join(',') } })} theme={theme} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }} style={{ marginHorizontal: -16 }}>
        {view.alternatives.map((alt) => {
          const p = medPrice(alt);
          const badge = p && view.price ? (p < view.price ? { label: k('pharmacy.product.cheaper'), tone: 'success' as const } : p === view.price ? { label: k('pharmacy.product.samePrice'), tone: 'neutral' as const } : undefined) : undefined;
          return (
            <MiniProduct
              key={String(alt.id)}
              name={medName(alt)}
              meta={medMeta(alt)}
              price={p ? money(p) : undefined}
              currency={p ? k('pharmacy.currency') : undefined}
              uri={medGallery(alt)[0]}
              badge={badge}
              onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: alt.id } })}
            />
          );
        })}
      </ScrollView>
    </View>
  ) : null;

  const share = async () => {
    try {
      const url = `https://app.nabdahplus.com/s/medicine/${med.slug || med.id}`;
      await Share.share({ message: `${view.name}\n${url}`, url });
    } catch (e) {
      logError('pharmacy:product-detail:share', e);
    }
  };

  const buyNow = () => {
    if (inCartQty === 0) addToCart(med, qty);
    go('/pharmacy/cart' as Href);
  };
  const addOrOpenCart = () => {
    if (inCartQty > 0) go('/pharmacy/cart' as Href);
    else addToCart(med, qty);
  };

  const footer = view.discontinued ? undefined : (
    <StickyFooter theme={theme} direction={dir}>
      <View style={{ ...COLUMN, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {view.price ? (
          <View style={{ minWidth: 84 }}>
            <Text style={{ ...scale(t, 'micro', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.product.total')}</Text>
            <Text style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>
              {money(view.price * shownQty)} <Text style={{ ...scale(t, 'meta', 'regular') }}>{k('pharmacy.currency')}</Text>
            </Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={inCartQty > 0 ? k('pharmacy.viewCart') : k('pharmacy.addToCart')}
          onPress={addOrOpenCart}
          style={({ pressed }) => ({ width: 56, height: 56, borderRadius: 18, borderWidth: 1.5, borderColor: c.text.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
        >
          <Icon name="cart" size={24} theme={theme} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Button label={k('pharmacy.product.buyNow')} size="lg" fullWidth onPress={buyNow} theme={theme} />
        </View>
      </View>
    </StickyFooter>
  );

  const pageWidth = colWidth;

  return (
    <View style={{ flex: 1 }} {...swipe.panHandlers}>
      <Screen theme={theme} direction={dir} scroll edges={[]} footer={footer} contentContainerStyle={{ paddingBottom: 24 }} testID="product-detail">
        {/* gallery */}
        <View style={{ height: 380, backgroundColor: c.bg.surface, alignItems: 'center' }}>
          <View style={{ width: pageWidth, height: 380 }}>
            {images.length ? (
              <FlatList
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                data={images}
                keyExtractor={(u, i) => `${i}-${u}`}
                onViewableItemsChanged={onViewable}
                viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
                getItemLayout={(_d, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
                renderItem={({ item, index }) => (
                  <Pressable
                    accessibilityRole="imagebutton"
                    accessibilityLabel={`${view.name} ${index + 1}/${images.length}`}
                    onPress={() => {
                      setActiveImage(index);
                      setZoom(true);
                    }}
                    style={{ width: pageWidth, height: 380, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ProductImage uri={item} style={{ width: 236, height: 236, borderRadius: 40 }} iconSize={120} />
                  </Pressable>
                )}
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <FIcon icon="pill" tone={PHARMACY_TONE} chip="none" size={120} theme={theme} />
              </View>
            )}
            <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 58, start: 16, gap: 6, alignItems: 'flex-start' }}>
              {view.pct > 0 ? (
                <View style={{ height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: c.action.primary.bg, justifyContent: 'center' }}>
                  <Text style={{ ...scale(t, 'label', 'bold'), color: c.action.primary.fg }}>{k('pharmacy.discount', { n: num(view.pct) })}</Text>
                </View>
              ) : null}
              {med.online_exclusive ? (
                <View style={{ height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: c.action.selected.bg, justifyContent: 'center' }}>
                  <Text style={{ ...scale(t, 'meta'), color: c.action.selected.fg }}>{k('pharmacy.product.exclusive')}</Text>
                </View>
              ) : null}
            </View>
            {images.length > 1 ? (
              <View pointerEvents="none" style={{ position: 'absolute', bottom: 44, start: 0, end: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                {images.map((_, k) => (
                  <View key={k} style={{ width: activeImage === k ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: activeImage === k ? c.text.primary : c.border.strong }} />
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {/* the sheet */}
        <View style={{ marginTop: -28, borderTopStartRadius: 28, borderTopEndRadius: 28, backgroundColor: c.bg.canvas, paddingTop: 22 }}>
          <View style={{ ...COLUMN, paddingHorizontal: 16, gap: 14 }}>
            {/* chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {view.rx ? <Pill tone="warning" glyph="prescription" label={k('pharmacy.needsRx')} /> : <Pill tone="success" glyph="check-circle" label={k('pharmacy.noRx')} />}
              {view.category ? (
                <Pill
                  tone="plain"
                  label={view.subCategory ? `${view.category} › ${view.subCategory}` : view.category}
                  onPress={() => router.push({ pathname: '/(tabs)/pharmacy', params: { filter_category: view.categoryRaw || view.category } })}
                />
              ) : null}
              {med.cold_chain ? <Pill tone="info" glyph="thermometer" label={k('pharmacy.product.cold')} /> : null}
            </View>

            {/* the name block */}
            <View style={{ gap: 4 }}>
              <Text accessibilityRole="header" style={{ ...scale(t, 'h2'), color: c.text.primary, ...flow }}>{view.name}</Text>
              {view.enName ? <Text style={{ ...scale(t, 'control', 'regular'), color: c.text.secondary, writingDirection: 'ltr', textAlign: dir === 'rtl' ? 'right' : 'left' }}>{view.enName}</Text> : null}
              {view.ingredient || view.generic ? (
                <Text style={{ ...scale(t, 'control', 'regular'), color: c.text.tertiary, ...flow }}>
                  {[view.ingredient ? k('pharmacy.product.ingredient', { v: view.ingredient }) : '', view.generic ? k('pharmacy.product.scientific', { v: view.generic }) : ''].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              {view.maker || view.origin ? (
                <Text style={{ ...scale(t, 'caption', 'regular'), color: c.text.secondary, ...flow }}>
                  {[view.maker, view.origin ? k('pharmacy.product.madeIn', { v: view.origin }) : ''].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>

            {/* price, quantity, availability */}
            <Card padding="md" theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  {view.price ? (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ ...scale(t, 'authTitle', 'bold'), color: c.text.primary }}>{money(view.price)}</Text>
                      <Text style={{ ...scale(t, 'control', 'regular'), color: c.text.primary }}>{k('pharmacy.currency')}</Text>
                      {view.pct > 0 && Number(med.old_price) > 0 ? (
                        <Text style={{ ...scale(t, 'control', 'regular'), color: c.text.secondary, textDecorationLine: 'line-through' }}>{money(Number(med.old_price))}</Text>
                      ) : null}
                    </View>
                  ) : null}
                  {view.price ? (
                    <Text style={{ ...scale(t, 'label', 'regular'), color: c.text.secondary, ...flow }}>
                      {[k('pharmacy.product.taxIncluded'), textOf(med.package_size)].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                {!view.discontinued ? (
                  <Stepper
                    value={shownQty}
                    min={1}
                    max={10}
                    label={k('pharmacy.product.quantity')}
                    format={(v) => num(v)}
                    decrementLabel={k('pharmacy.product.decrease')}
                    incrementLabel={k('pharmacy.product.increase')}
                    onChange={(v) => {
                      if (inCartQty > 0) void updateQty(String(med.id), v - inCartQty);
                      else setQty(v);
                    }}
                    theme={theme}
                  />
                ) : null}
              </View>
              {stockLine ? (
                <View style={{ borderTopWidth: 1, borderTopColor: c.border.subtle, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.status.success.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Glyph name="storefront" size={20} color={c.status.success.fg} />
                  </View>
                  <Text style={{ flex: 1, ...scale(t, 'control'), color: c.text.primary, ...flow }}>{stockLine}</Text>
                </View>
              ) : null}
            </Card>

            {/* shortage / discontinued */}
            {view.discontinued || view.limited ? (
              <View accessibilityRole="alert" style={{ borderRadius: 20, backgroundColor: view.discontinued ? c.status.danger.bg : c.status.warning.bg, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Glyph name="warning" size={20} color={view.discontinued ? c.status.danger.fg : c.status.warning.fg} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={{ ...scale(t, 'small', 'bold'), color: view.discontinued ? c.status.danger.fg : c.status.warning.fg, ...flow }}>
                    {view.discontinued ? k('pharmacy.product.discontinued') : k('pharmacy.product.limited')}
                  </Text>
                  {textOf(med.shortage_notes) ? <Text style={{ ...scale(t, 'label', 'regular'), color: view.discontinued ? c.status.danger.fg : c.status.warning.fg, ...flow }}>{textOf(med.shortage_notes)}</Text> : null}
                </View>
              </View>
            ) : null}

            {/* a prescription medicine: the upload sits above the buy buttons */}
            {view.rx && !view.discontinued ? (
              <Pressable accessibilityRole="link" accessibilityLabel={k('pharmacy.uploadRx')} onPress={() => go('/pharmacy/scan-prescription' as Href)}>
                <Card padding="sm" elevation="flat" theme={theme}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <FIcon icon="prescription" tone={PHARMACY_TONE} size={40} theme={theme} />
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text style={{ ...scale(t, 'control'), color: c.text.primary, ...flow }}>{k('pharmacy.uploadRx')}</Text>
                      <Text style={{ ...scale(t, 'label', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.product.rxCard')}</Text>
                    </View>
                    <Icon name={dir === 'rtl' ? 'caret-left' : 'caret-right'} size={18} theme={theme} tone="secondary" />
                  </View>
                </Card>
              </Pressable>
            ) : null}

            {/* a discontinued product shows its alternatives first */}
            {view.discontinued ? alternativesBlock : null}

            {view.facts.length >= 1 ? (
              <View style={{ gap: 10 }}>
                <SectionHeader title={k('pharmacy.product.facts')} theme={theme} />
                <FactsGrid facts={view.facts.map((f) => ({ key: f.key, icon: f.icon, label: k(f.label), value: f.valueIsKey ? k(f.value) : f.value }))} />
              </View>
            ) : null}

            {!view.discontinued ? alternativesBlock : null}

            {safetyRows.length ? (
              <View style={{ gap: 10 }}>
                <SectionHeader title={k('pharmacy.product.safety')} theme={theme} />
                <SafetyCard rows={safetyRows} />
              </View>
            ) : null}

            {view.sections.length ? (
              <View style={{ gap: 10 }}>
                <SectionHeader title={k('pharmacy.product.details')} theme={theme} />
                <DetailAccordion sections={view.sections.map((s) => ({ ...s, title: k(s.title) }))} />
                {view.reviewed ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
                    <Glyph name="shield-check" size={16} color={c.status.success.fg} />
                    <Text style={{ flex: 1, ...scale(t, 'label', 'regular'), color: c.text.secondary, ...flow }}>
                      {`${view.reviewedOn ? k('pharmacy.product.reviewedOn', { date: view.reviewedOn }) : k('pharmacy.product.reviewed')} · ${k('pharmacy.product.disclaimer')}`}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {related.length ? (
              <View style={{ gap: 10 }}>
                <SectionHeader title={k('pharmacy.product.related')} theme={theme} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }} style={{ marginHorizontal: -16 }}>
                  {related.map((r) => {
                    const p = medPrice(r);
                    return (
                      <MiniProduct
                        key={String(r.id)}
                        name={medName(r)}
                        price={p ? money(p) : undefined}
                        currency={p ? k('pharmacy.currency') : undefined}
                        uri={medGallery(r)[0]}
                        onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: r.id } })}
                        onAdd={() => addToCart(r)}
                        addLabel={k('pharmacy.addToCart')}
                      />
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* ask a pharmacist */}
            <Pressable accessibilityRole="link" accessibilityLabel={k('pharmacy.product.askPharmacist')} onPress={() => go('/pharmacy/pharmacist-chat' as Href)}>
              <Card padding="md" theme={theme}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <FIcon icon="chat-circle-text" tone={PHARMACY_TONE} size={48} theme={theme} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={{ ...scale(t, 'bodyStrong'), lineHeight: 21, color: c.text.primary, ...flow }}>{k('pharmacy.product.askPharmacist')}</Text>
                    <Text style={{ ...scale(t, 'label', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.product.askPharmacistBody')}</Text>
                  </View>
                  <Icon name={dir === 'rtl' ? 'caret-left' : 'caret-right'} size={18} theme={theme} tone="secondary" />
                </View>
              </Card>
            </Pressable>

            {/* suggest an edit (reaches the admin approval queue) */}
            <Pressable accessibilityRole="button" accessibilityLabel={k('pharmacy.product.suggest')} onPress={() => setSuggestOpen(true)} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.link }}>{k('pharmacy.product.suggest')}</Text>
            </Pressable>

            {textOf(med.sku) || textOf(med.barcode) ? (
              <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {med.sku ? <Text style={{ ...scale(t, 'micro', 'regular'), color: c.text.secondary }}>{k('pharmacy.product.sku', { v: String(med.sku) })}</Text> : null}
                {med.sku && med.barcode ? <Text style={{ ...scale(t, 'micro', 'regular'), color: c.text.secondary }}>·</Text> : null}
                {med.barcode ? <Text style={{ ...scale(t, 'micro', 'regular'), color: c.text.secondary, writingDirection: 'ltr' }}>{med.barcode}</Text> : null}
              </View>
            ) : null}
          </View>
        </View>
      </Screen>

      {/* back, share, favourite, cart over the gallery */}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, start: 0, end: 0, zIndex: 20, paddingTop: insets.top + 7, paddingHorizontal: 16 }}>
        <View pointerEvents="box-none" style={{ ...COLUMN, paddingHorizontal: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <GlassButton label={k('pharmacy.back')} onPress={back}>
            <Icon name={dir === 'rtl' ? 'caret-right' : 'caret-left'} size={22} theme={theme} />
          </GlassButton>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <GlassButton label={k('pharmacy.product.share')} onPress={share}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M12 15V3 M7 8l5-5 5 5 M5 13v7h14v-7" stroke={c.icon.primary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </GlassButton>
            <GlassButton label={inWishlist ? k('pharmacy.product.favRemove') : k('pharmacy.product.favAdd')} onPress={toggleWishlist}>
              {inWishlist ? <Glyph name="heart" size={20} color={c.icon.favorite} /> : <Icon name="heart" size={20} theme={theme} color={c.icon.favorite} />}
            </GlassButton>
            <View>
              <GlassButton label={k('pharmacy.cart')} onPress={() => go('/pharmacy/cart' as Href)}>
                <Icon name="cart" size={21} theme={theme} />
              </GlassButton>
              {cartBadge}
            </View>
          </View>
        </View>
      </View>

      {/* zoom */}
      <Modal visible={zoom} transparent animationType="fade" onRequestClose={() => setZoom(false)}>
        <View style={{ flex: 1, backgroundColor: c.bg.inverse, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: Math.max(insets.top, 20), end: 20, zIndex: 10 }}>
            <GlassButton label={k('pharmacy.product.close')} onPress={() => setZoom(false)}>
              <Icon name="close" size={22} theme={theme} />
            </GlassButton>
          </View>
          <ScrollView maximumZoomScale={4} minimumZoomScale={1} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', width, height: '100%' }} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
            <ProductImage uri={images[activeImage]} style={{ width, height: width }} iconSize={90} />
          </ScrollView>
          {images.length > 1 ? (
            <View style={{ position: 'absolute', bottom: Math.max(insets.bottom, 20) + 20, flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              <GlassButton label={k('pharmacy.product.prev')} onPress={() => setActiveImage((i) => Math.max(0, i - 1))}>
                <Icon name={dir === 'rtl' ? 'caret-right' : 'caret-left'} size={22} theme={theme} />
              </GlassButton>
              <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.onInverse }}>{num(activeImage + 1)} / {num(images.length)}</Text>
              <GlassButton label={k('pharmacy.product.next')} onPress={() => setActiveImage((i) => Math.min(images.length - 1, i + 1))}>
                <Icon name={dir === 'rtl' ? 'caret-left' : 'caret-right'} size={22} theme={theme} />
              </GlassButton>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* suggest an edit */}
      <Modal visible={suggestOpen} transparent animationType="slide" onRequestClose={() => setSuggestOpen(false)}>
        <View style={{ flex: 1, backgroundColor: tint(c.bg.inverse, 0.55), justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.bg.canvas, borderTopStartRadius: 28, borderTopEndRadius: 28, maxHeight: '90%', paddingBottom: Math.max(insets.bottom, 16) }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ ...COLUMN, padding: 20, gap: 12 }}>
              <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('pharmacy.suggest.title')}</Text>
              <View style={{ borderRadius: 22, backgroundColor: c.bg.surface, overflow: 'hidden' }}>
                {SUGGEST_TYPES.map((tp, i) => (
                  <Radio key={tp.id} label={k(tp.label)} selected={suggestType === tp.id} onChange={() => setSuggestType(tp.id)} divider={i < SUGGEST_TYPES.length - 1} direction={dir} theme={theme} />
                ))}
              </View>
              {suggestType === 'field_edit' ? (
                <>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {SUGGEST_FIELDS.map((f) => (
                      <Chip key={f.id} label={k(f.label)} selected={suggestField === f.id} onPress={() => setSuggestField(f.id)} theme={theme} />
                    ))}
                  </View>
                  <Input placeholder={k('pharmacy.suggest.valuePlaceholder')} value={suggestValue} onChange={setSuggestValue} theme={theme} />
                </>
              ) : null}
              <Input placeholder={k('pharmacy.suggest.notePlaceholder')} value={suggestNote} onChange={setSuggestNote} theme={theme} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button label={k('pharmacy.suggest.send')} size="lg" fullWidth loading={suggestSending} onPress={submitSuggestion} theme={theme} />
                </View>
                <Button label={k('pharmacy.cancel')} size="lg" variant="outline" onPress={() => setSuggestOpen(false)} theme={theme} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
