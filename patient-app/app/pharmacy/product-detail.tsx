// @ts-nocheck
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated, Modal, Dimensions, Alert, TextInput, PanResponder
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { useCart } from '../../src/context/CartContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';
import ProductImage from '../../src/components/ProductImage';
import { resolveGallery } from '../../src/utils/imageUrl';
import { prefetchAlternatives, prefetchHotMedicines } from '../../src/utils/prefetch';
import { useTranslation } from '../../src/i18n';
import { pickLocalized, pickDbField } from '../../src/utils/localize';
import { getVisibleProductIds } from '../../src/utils/productNav';
import { LocalizedText } from '../../src/components/LocalizedText';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const { width } = Dimensions.get('window');

// ── Accordion — renders nothing when the API has no data for it ────────────
function DetailAccordion({ title, icon, content, colors, isRTL, defaultOpen = false, isWarning = false }: any) {
  const [open, setOpen] = useState(defaultOpen);
  if (!content || content === 'null' || (Array.isArray(content) && content.length === 0)) return null;
  const themeColor = isWarning ? '#F0695C' : '#23B5CE';
  const bg = isWarning ? '#FEEFED' : colors.s;
  const border = isWarning ? '#F0695C44' : colors.bd;
  return (
    <View style={[styles.accordion, { backgroundColor: bg, borderColor: border }]}>
      <TouchableOpacity style={[styles.accHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1 }}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: themeColor, fontSize: 24, marginHorizontal: 8 }}>{icon}</LocalizedText>
          <LocalizedText style={{ fontFamily: 'Cairo-Black', fontSize: 16, color: isWarning ? '#141A2A' : colors.n }}>{title}</LocalizedText>
        </View>
        <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 24 }}>{open ? 'expand_less' : 'expand_more'}</LocalizedText>
      </TouchableOpacity>
      {open && (
        <View style={[styles.accContent, { borderTopColor: border }]}>
          <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 14, lineHeight: 24, color: isWarning ? '#4C5566' : colors.t2, textAlign: isRTL ? 'right' : 'left' }}>
            {Array.isArray(content) ? content.map((c, i) => `• ${c}`).join('\n') : content}
          </LocalizedText>
        </View>
      )}
    </View>
  );
}

// ── Small labelled fact chip ───────────────────────────────────────────────
function Fact({ icon, title, value, colors, isRTL }: any) {
  if (!value) return null;
  return (
    <View style={[styles.fact, { backgroundColor: colors.s, borderColor: colors.bd, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 20, marginHorizontal: 8 }}>{icon}</LocalizedText>
      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
        <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 11, color: colors.t3 }}>{title}</LocalizedText>
        <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: colors.n }} numberOfLines={2}>{value}</LocalizedText>
      </View>
    </View>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';
  const t = useTranslation(lang as any);
  const { addItem, updateQty, items } = useCart();

  // ── Swipe between products — EDGE ONLY ──────────────────────────────────
  // Previously the PanResponder sat on the root view and stole ANY horizontal
  // drag (including scrolling the image gallery), jumping to another product.
  // Now: the gesture must START within 28px of the screen edge AND travel
  // ≥110px horizontally — gallery swipes and normal touches never trigger it.
  const navIdsRef = useRef<string[]>([]);
  if (!navIdsRef.current.length) navIdsRef.current = getVisibleProductIds();
  const goSibling = (dir: 1 | -1) => {
    const ids = navIdsRef.current;
    const i = ids.indexOf(String(id));
    const next = ids[i + dir];
    if (i >= 0 && next) router.push({ pathname: '/pharmacy/product-detail', params: { id: next } });
  };
  const swipeRef = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (e, g) => {
        const startX = e.nativeEvent.pageX - g.dx; // gesture origin
        const fromEdge = startX <= 28 || startX >= width - 28;
        return fromEdge && Math.abs(g.dx) > 70 && Math.abs(g.dy) < 30;
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dx <= -110) goSibling(1);   // edge swipe left  → next product
        else if (g.dx >= 110) goSibling(-1); // edge swipe right → previous product
      },
    })
  ).current;

  const [med, setMed] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [isZoomVisible, setIsZoomVisible] = useState(false);
  const [suggestVisible, setSuggestVisible] = useState(false);
  const [suggestType, setSuggestType] = useState('field_edit');
  const [suggestField, setSuggestField] = useState('description_ar');
  const [suggestValue, setSuggestValue] = useState('');
  const [suggestNote, setSuggestNote] = useState('');
  const [suggestSending, setSuggestSending] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const qty = items.find(i => i.id === id)?.qty || 0;
  const inCart = qty > 0;

  useEffect(() => {
    (async () => {
      try {
        // Enriched endpoint: ALL fields + gallery + discount + alternatives + stock
        // ?lang= lets the server localize structured fields (form/category/package size)
        const { currentDbLang } = require('../../src/utils/localize');
        const data = await apiFetch(`/medicines/${id}/details?lang=${currentDbLang()}`);
        if (data && data.id) {
          setMed(data);
          setImages(resolveGallery(data));
          // Predictive: preload alternatives (user's next likely taps) + hot list
          prefetchAlternatives(data.alternatives || []);
          prefetchHotMedicines();
        }
      } catch {
        setMed(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const rx = !!(med?.requires_prescription || med?.rx);
  const onlineExclusive = !!med?.online_exclusive;
  const potentiallyUnavailable = !!med?.potentially_unavailable;
  const discount = med?.discount_percent || 0;
  const oldPrice = med?.old_price || 0;

  const SUGGEST_TYPES = [
    { k: 'field_edit', ar: 'تعديل بيانات (وصف/مادة فعالة/استخدام)' },
    { k: 'image_remove', ar: 'الصورة غير صحيحة — إزالتها' },
    { k: 'shortage_badge', ar: 'الصنف ناقص في السوق' },
    { k: 'duplicate_remove', ar: 'صنف مكرر — حذفه' },
    { k: 'other', ar: 'ملاحظة أخرى' },
  ];
  const SUGGEST_FIELDS = [
    { k: 'description_ar', ar: 'الوصف' }, { k: 'active_ingredient', ar: 'المادة الفعالة' },
    { k: 'usage_instructions_ar', ar: 'إرشادات الاستخدام' }, { k: 'dosage_ar', ar: 'الجرعة' },
    { k: 'manufacturer', ar: 'الشركة المصنعة' }, { k: 'name_ar', ar: 'الاسم' },
  ];
  const submitSuggestion = async () => {
    if (suggestSending) return;
    if (suggestType === 'field_edit' && !suggestValue.trim()) { showLocalizedAlert('', isRTL ? 'اكتب القيمة الصحيحة المقترحة' : 'Enter the suggested value'); return; }
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
      setSuggestVisible(false); setSuggestValue(''); setSuggestNote('');
      showLocalizedAlert(isRTL ? 'تم الإرسال' : 'Sent', isRTL ? 'وصل اقتراحك للإدارة وسيُطبَّق بعد الاعتماد. شكراً لك.' : 'Your suggestion reached the admin and will go live after approval.');
    } catch (e) {
      showLocalizedAlert(isRTL ? 'تعذر الإرسال' : 'Failed', isRTL ? 'حاول مرة أخرى لاحقاً' : 'Please try again later');
    } finally { setSuggestSending(false); }
  };

  const handleAdd = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();
    if (!med) return;

    if (rx) {
      showLocalizedAlert(
        t('pd.rx_alert_title'),
        isRTL ? 'هذا الدواء يتطلب إرفاق روشتة طبية سارية — سيُطلب رفعها في السلة قبل إتمام الدفع.' : 'This medicine requires a valid prescription — you will upload it in the cart before checkout.',
        [{ text: t('pd.ok') }]
      );
    }
    // online_exclusive is only a badge — it must not restrict delivery or pickup.

    addItem({
      id: med.id,
      name: pickDbField(med, 'name') || med.name_en || med.name,
      price: med.price || 0,
      rx,
      online_exclusive: onlineExclusive,
      image: images[0] || med.image,
      icon: med.icon || 'medication',
      iconColor: med.iconColor || '#23B5CE',
      iconBg: med.iconBg || '#DEF5F9',
    });
  }, [med, addItem, scaleAnim, isRTL, rx, onlineExclusive, images]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color="#23B5CE" />
      </View>
    );
  }

  if (!med) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 18, color: colors.t2 }}>
          {t('pd.not_found')}
        </LocalizedText>
      </View>
    );
  }

  const name = pickDbField(med, 'name') || med.name_en || med.name;
  const pick = (_ar: any, _en: any, base?: string) => base ? pickDbField(med, base) : pickLocalized(_ar, _en);
  const alternatives = Array.isArray(med.alternatives) ? med.alternatives : [];
  const seoTitle = `${name} | ${med.active_ingredient || ''} | صيدلية نبض`;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]} {...swipeRef.panHandlers}>
      <Stack.Screen options={{ title: seoTitle, headerShown: false }} />

      {/* Header overlay */}
      <View style={[styles.headerOverlay, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#141A2A', fontSize: 26 }}>{isRTL ? 'arrow_forward' : 'arrow_back'}</LocalizedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/pharmacy/cart')}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#141A2A', fontSize: 26 }}>shopping_cart</LocalizedText>
          {items.length > 0 && (
            <View style={styles.cartBadge}><LocalizedText style={{ fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 10 }}>{items.length}</LocalizedText></View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 170 }} showsVerticalScrollIndicator={false}>

        {/* ── Gallery: swipe + pagination + tap-to-zoom ── */}
        <View style={[styles.galleryContainer, { marginTop: insets.top }]}>
          {images.length > 0 ? (
            <ScrollView
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
              style={{ width, height: width }}
            >
              {images.map((img, i) => (
                <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => { setActiveImage(i); setIsZoomVisible(true); }}>
                  <ProductImage uri={img} style={{ width, height: width, backgroundColor: '#fff' }} iconSize={90} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.placeholderHero, { backgroundColor: med.iconBg || '#DEF5F9', width, height: width }]}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 110, color: med.iconColor || '#23B5CE' }}>{med.icon || 'medication'}</LocalizedText>
            </View>
          )}
          {images.length > 1 && (
            <View style={styles.pagination}>
              {images.map((_, i) => <View key={i} style={[styles.dot, { backgroundColor: i === activeImage ? '#23B5CE' : '#CBD5E1' }]} />)}
            </View>
          )}
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <LocalizedText style={{ fontFamily: 'Cairo-Black', color: '#fff', fontSize: 14 }}>-{discount}%</LocalizedText>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* ── Badges: RX / Online Exclusive / Potentially Unavailable ── */}
          <View style={[styles.badgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {rx && (
              <View style={[styles.badge, { backgroundColor: '#FEEFED', borderColor: '#F0695C44' }]}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#F0695C', fontSize: 14, marginRight: 4 }}>prescriptions</LocalizedText>
                <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: '#F0695C', fontSize: 11 }}>{t('pd.rx_required')}</LocalizedText>
              </View>
            )}
            {onlineExclusive && (
              <View style={[styles.badge, { backgroundColor: '#EBE8FC', borderColor: '#7A6BEA44' }]}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#7A6BEA', fontSize: 14, marginRight: 4 }}>storefront</LocalizedText>
                <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: '#7A6BEA', fontSize: 11 }}>{t('pd.online_exclusive')}</LocalizedText>
              </View>
            )}
            {potentiallyUnavailable && (
              <View style={[styles.badge, { backgroundColor: '#FEF4E0', borderColor: '#F0A52644' }]}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#F0A526', fontSize: 14, marginRight: 4 }}>error</LocalizedText>
                <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: '#B87714', fontSize: 11 }}>{t('pd.potentially_unavailable')}</LocalizedText>
              </View>
            )}
          </View>

          {/* ── Shortage warning (product stays purchasable) ── */}
          {potentiallyUnavailable && (
            <View style={[styles.warnBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#B87714', fontSize: 20, marginHorizontal: 8 }}>info</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', color: '#7A5A10', fontSize: 12, flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                {med.shortage_notes || (isRTL
                  ? 'أفاد مزودون بأن هذا الصنف قد يكون غير متوفر حالياً لدى بعض الصيدليات — يمكنك إتمام الطلب وقد يتأخر التوفر.'
                  : 'Providers reported this item may be unavailable at some pharmacies — you can still order; fulfillment may be delayed.')}
              </LocalizedText>
            </View>
          )}

          {/* ── Name / manufacturer / price — elevated hero card ── */}
          <View style={[styles.heroCard, { backgroundColor: colors.s, borderColor: colors.bd, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            {med.manufacturer && (
              <View style={[styles.brandChip, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 14, marginHorizontal: 4 }}>verified</LocalizedText>
                <LocalizedText style={[styles.manufacturer, { color: '#23B5CE', marginBottom: 0 }]}>{med.manufacturer}</LocalizedText>
              </View>
            )}
            <LocalizedText style={[styles.medName, { color: colors.n, textAlign: isRTL ? 'right' : 'left' }]}>{name}</LocalizedText>
            {med.generic_name && <LocalizedText style={[styles.genericName, { color: colors.t3 }]}>{med.generic_name}</LocalizedText>}
            <View style={[styles.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', width: '100%' }]}>
              <View style={[styles.pricePill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <LocalizedText style={[styles.price, { color: '#F0695C' }]}>{(med.price || 0).toFixed(2)}</LocalizedText>
                <LocalizedText style={[styles.currency, { color: '#F0695C' }]}>ر.س</LocalizedText>
              </View>
              {discount > 0 && oldPrice > 0 && (
                <View style={{ alignItems: 'center' }}>
                  <LocalizedText style={styles.oldPrice}>{oldPrice.toFixed(2)} ر.س</LocalizedText>
                  <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 11, color: '#059669' }}>{isRTL ? `وفّر ${(oldPrice - (med.price || 0)).toFixed(2)} ر.س` : `Save ${(oldPrice - (med.price || 0)).toFixed(2)} SAR`}</LocalizedText>
                </View>
              )}
            </View>
          </View>

          {/* ── Product details heading ── */}
          <View style={[styles.sectionHead, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.sectionAccent} />
            <LocalizedText style={[styles.sectionTitle, { color: colors.n, marginBottom: 0 }]}>{isRTL ? 'تفاصيل المنتج' : 'Product Details'}</LocalizedText>
          </View>

          {/* ── Fact grid: every structured field the API provides ── */}
          <View style={[styles.factsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Fact icon="pill" title={isRTL ? 'شكل الجرعة' : 'Dosage Form'} value={pickDbField(med, 'form') || med.form} colors={colors} isRTL={isRTL} />
            <Fact icon="scale" title={isRTL ? 'التركيز' : 'Strength'} value={pickDbField(med, 'strength') || med.strength} colors={colors} isRTL={isRTL} />
            <Fact icon="science" title={isRTL ? 'المادة الفعالة' : 'Active Ingredient'} value={pickDbField(med, 'active_ingredient') || med.active_ingredient} colors={colors} isRTL={isRTL} />
            <Fact icon="package_2" title={isRTL ? 'حجم العبوة' : 'Package Size'} value={med.package_size} colors={colors} isRTL={isRTL} />
            <Fact icon="barcode" title={isRTL ? 'الباركود' : 'Barcode'} value={med.barcode} colors={colors} isRTL={isRTL} />
            <Fact icon="shapes" title={isRTL ? 'الفئة' : 'Category'} value={pickDbField(med, 'category') || med.category} colors={colors} isRTL={isRTL} />
            <Fact icon="shape_line" title={isRTL ? 'الفئة الفرعية' : 'Sub Category'} value={pickDbField(med, 'sub_category') || med.sub_category} colors={colors} isRTL={isRTL} />
            <Fact icon="snowflake" title={isRTL ? 'التخزين' : 'Storage'} value={pick(med.storage_conditions_ar, med.storage_conditions_en, 'storage_conditions')} colors={colors} isRTL={isRTL} />
          </View>

          {/* ── Alternatives (same active ingredient — backend API) ── */}
          {alternatives.length > 0 && (
            <View style={styles.altSection}>
              <LocalizedText style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' }]}>{t('pd.alternatives')}</LocalizedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.altScroll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {alternatives.map((alt: any) => {
                  const altName = pickDbField(alt, 'name') || alt.name_en || alt.name;
                  return (
                    <TouchableOpacity key={alt.id} style={[styles.altCard, { backgroundColor: colors.s, borderColor: colors.bd }]} onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: alt.id } })}>
                      <View style={styles.altImgWrap}>
                        <ProductImage uri={(Array.isArray(alt.images) && alt.images[0]) || alt.image} style={{ width: 64, height: 64 }} iconSize={28} />
                      </View>
                      <LocalizedText style={[styles.altName, { color: colors.n }]} numberOfLines={1}>{altName}</LocalizedText>
                      <LocalizedText style={[styles.altCompany, { color: colors.t3 }]} numberOfLines={1}>{alt.manufacturer || '---'}</LocalizedText>
                      <LocalizedText style={[styles.altPrice, { color: '#23B5CE' }]}>{(alt.price || 0).toFixed(2)} ر.س</LocalizedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Similar products (no active ingredient → by use/category/name) ── */}
          {Array.isArray(med.similar) && med.similar.length > 0 && (
            <View style={styles.altSection}>
              <LocalizedText style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' }]}>{isRTL ? 'أصناف مشابهة' : 'Similar Items'}</LocalizedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.altScroll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {med.similar.map((alt: any) => {
                  const altName = pickDbField(alt, 'name') || alt.name_en || alt.name;
                  return (
                    <TouchableOpacity key={alt.id} style={[styles.altCard, { backgroundColor: colors.s, borderColor: colors.bd }]} onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: alt.id } })}>
                      <View style={styles.altImgWrap}>
                        <ProductImage uri={(Array.isArray(alt.images) && alt.images[0]) || alt.image} style={{ width: 64, height: 64 }} iconSize={28} />
                      </View>
                      <LocalizedText style={[styles.altName, { color: colors.n }]} numberOfLines={1}>{altName}</LocalizedText>
                      <LocalizedText style={[styles.altCompany, { color: colors.t3 }]} numberOfLines={1}>{alt.manufacturer || alt.sub_category || alt.category || '---'}</LocalizedText>
                      <LocalizedText style={[styles.altPrice, { color: '#23B5CE' }]}>{(alt.price || 0).toFixed(2)} ر.س</LocalizedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Every informational section from the API ── */}
          <View style={styles.detailsGroup}>
            <DetailAccordion title={isRTL ? 'الوصف' : 'Description'} icon="info" content={pick(med.description_ar, med.description_en, 'description')} colors={colors} isRTL={isRTL} defaultOpen={true} />
            <DetailAccordion title={isRTL ? 'دواعي الاستعمال' : 'Indications'} icon="healing" content={pick(med.indications_ar, med.indications_en, 'indications')} colors={colors} isRTL={isRTL} />
            <DetailAccordion title={isRTL ? 'الجرعة وطريقة الاستخدام' : 'Dosage & Usage'} icon="medication" content={pick(med.dosage_ar, med.dosage_en, 'dosage') || pick(med.usage_instructions_ar, med.usage_instructions_en, 'usage_instructions')} colors={colors} isRTL={isRTL} />
            <DetailAccordion title={isRTL ? 'إرشادات الاستخدام' : 'Usage Instructions'} icon="menu_book" content={pick(med.usage_instructions_ar, med.usage_instructions_en, 'usage_instructions')} colors={colors} isRTL={isRTL} />
            <DetailAccordion title={isRTL ? 'تحذيرات' : 'Warnings'} icon="warning" content={pick(med.warnings_ar, med.warnings_en, 'warnings')} colors={colors} isRTL={isRTL} isWarning={true} />
            <DetailAccordion title={isRTL ? 'احتياطات' : 'Precautions'} icon="shield" content={pick(med.precautions_ar, med.precautions_en, 'precautions')} colors={colors} isRTL={isRTL} isWarning={true} />
            <DetailAccordion title={isRTL ? 'موانع الاستخدام' : 'Contraindications'} icon="block" content={pick(med.contraindications_ar, med.contraindications_en)} colors={colors} isRTL={isRTL} isWarning={true} />
            <DetailAccordion title={isRTL ? 'الأعراض الجانبية' : 'Side Effects'} icon="sick" content={pick(med.side_effects_ar, med.side_effects_en, 'side_effects')} colors={colors} isRTL={isRTL} />
            <DetailAccordion title={isRTL ? 'التفاعلات الدوائية' : 'Interactions'} icon="sync_alt" content={med.interactions} colors={colors} isRTL={isRTL} isWarning={true} />
            <DetailAccordion title={isRTL ? 'الحمل' : 'Pregnancy'} icon="pregnancy" content={pick(med.pregnancy_info_ar, med.pregnancy_info_en)} colors={colors} isRTL={isRTL} />
            <DetailAccordion title={isRTL ? 'الرضاعة' : 'Breastfeeding'} icon="child_care" content={pick(med.breastfeeding_info_ar, med.breastfeeding_info_en)} colors={colors} isRTL={isRTL} />
            <DetailAccordion title={isRTL ? 'شروط التخزين' : 'Storage Conditions'} icon="ac_unit" content={pick(med.storage_conditions_ar, med.storage_conditions_en, 'storage_conditions')} colors={colors} isRTL={isRTL} />
            <DetailAccordion title={isRTL ? 'معلومات إضافية' : 'More Information'} icon="more_horiz" content={pick(med.more_info_ar, med.more_info_en, 'more_info')} colors={colors} isRTL={isRTL} />
          </View>
        </View>
      </ScrollView>

      {/* ── Suggest an edit (اقتراح تعديل) — reaches admin approval queue ── */}
      <TouchableOpacity
        onPress={() => setSuggestVisible(true)}
        style={{ marginHorizontal: 16, marginBottom: 10, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.bd, backgroundColor: colors.s, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center' }}
        activeOpacity={0.8}
      >
        <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 20, marginHorizontal: 6 }}>rate_review</LocalizedText>
        <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: colors.t2 }}>{isRTL ? 'اقتراح تعديل على هذا الصنف' : 'Suggest an edit'}</LocalizedText>
      </TouchableOpacity>

      <Modal visible={suggestVisible} transparent animationType="slide" onRequestClose={() => setSuggestVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Math.max(insets.bottom, 16) }}>
            <LocalizedText style={{ fontFamily: 'Cairo-Black', fontSize: 17, color: colors.n, textAlign: isRTL ? 'right' : 'left', marginBottom: 12 }}>{isRTL ? 'اقتراح تعديل' : 'Suggest an edit'}</LocalizedText>
            {SUGGEST_TYPES.map((tp) => (
              <TouchableOpacity key={tp.k} onPress={() => setSuggestType(tp.k)} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingVertical: 8 }}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 22, color: suggestType === tp.k ? '#23B5CE' : colors.t3, marginHorizontal: 6 }}>{suggestType === tp.k ? 'radio_button_checked' : 'radio_button_unchecked'}</LocalizedText>
                <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 14, color: colors.n }}>{tp.ar}</LocalizedText>
              </TouchableOpacity>
            ))}
            {suggestType === 'field_edit' && (
              <>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', marginTop: 8 }}>
                  {SUGGEST_FIELDS.map((f) => (
                    <TouchableOpacity key={f.k} onPress={() => setSuggestField(f.k)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, margin: 3, borderWidth: 1, borderColor: suggestField === f.k ? '#23B5CE' : colors.bd, backgroundColor: suggestField === f.k ? '#23B5CE22' : colors.s }}>
                      <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: suggestField === f.k ? '#23B5CE' : colors.t2 }}>{f.ar}</LocalizedText>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput value={suggestValue} onChangeText={setSuggestValue} placeholder={isRTL ? 'القيمة الصحيحة المقترحة' : 'Suggested correct value'} placeholderTextColor={colors.t3} style={{ borderWidth: 1, borderColor: colors.bd, borderRadius: 10, padding: 10, marginTop: 10, color: colors.n, fontFamily: 'Cairo-Regular', textAlign: isRTL ? 'right' : 'left' }} />
              </>
            )}
            <TextInput value={suggestNote} onChangeText={setSuggestNote} placeholder={isRTL ? 'ملاحظة إضافية (اختياري)' : 'Extra note (optional)'} placeholderTextColor={colors.t3} style={{ borderWidth: 1, borderColor: colors.bd, borderRadius: 10, padding: 10, marginTop: 10, color: colors.n, fontFamily: 'Cairo-Regular', textAlign: isRTL ? 'right' : 'left' }} />
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 14, gap: 10 }}>
              <TouchableOpacity onPress={submitSuggestion} disabled={suggestSending} style={{ flex: 1, backgroundColor: '#23B5CE', borderRadius: 12, paddingVertical: 12, alignItems: 'center', opacity: suggestSending ? 0.6 : 1 }}>
                <LocalizedText style={{ fontFamily: 'Cairo-Black', color: '#fff', fontSize: 15 }}>{suggestSending ? (isRTL ? 'جارٍ الإرسال…' : 'Sending…') : (isRTL ? 'إرسال الاقتراح' : 'Send suggestion')}</LocalizedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSuggestVisible(false)} style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: colors.bd }}>
                <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: colors.t2, fontSize: 14 }}>{isRTL ? 'إلغاء' : 'Cancel'}</LocalizedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Sticky bottom bar ── */}
      <View style={[styles.bottomBar, { backgroundColor: colors.s, borderTopColor: colors.bd, paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        {inCart ? (
          <View style={[styles.qtyControlFull, { backgroundColor: colors.bg, borderColor: colors.bd }]}>
            <TouchableOpacity onPress={() => updateQty(med.id, 1)} style={[styles.qtyBtnFull, { backgroundColor: colors.s }]}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 28 }}>add</LocalizedText>
            </TouchableOpacity>
            <LocalizedText style={{ fontFamily: 'Cairo-Black', color: '#23B5CE', fontSize: 22, marginHorizontal: 20 }}>{qty}</LocalizedText>
            <TouchableOpacity onPress={() => updateQty(med.id, -1)} style={[styles.qtyBtnFull, { backgroundColor: colors.s }]}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 28 }}>remove</LocalizedText>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={[styles.addCartBtnWrap, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity style={[styles.addCartBtn, { backgroundColor: '#23B5CE' }]} onPress={handleAdd} activeOpacity={0.85}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 22, marginRight: 10 }}>add_shopping_cart</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Black', color: '#fff', fontSize: 16 }}>{t('pd.add_to_cart')}</LocalizedText>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* ── Zoom modal (pinch via ScrollView zoom) ── */}
      <Modal visible={isZoomVisible} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: Math.max(insets.top, 20), right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }} onPress={() => setIsZoomVisible(false)}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 28 }}>close</LocalizedText>
          </TouchableOpacity>
          <ScrollView
            maximumZoomScale={4} minimumZoomScale={1}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', width, height: '100%' }}
            showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}
          >
            <ProductImage uri={images[activeImage]} style={{ width, height: width }} iconSize={90} />
          </ScrollView>
          {images.length > 1 && (
            <View style={{ position: 'absolute', bottom: 40, flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity disabled={activeImage === 0} onPress={() => setActiveImage(i => Math.max(0, i - 1))} style={[styles.zoomNav, { opacity: activeImage === 0 ? 0.3 : 1 }]}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 30 }}>chevron_left</LocalizedText>
              </TouchableOpacity>
              <LocalizedText style={{ color: '#fff', fontFamily: 'Cairo-Bold', alignSelf: 'center' }}>{activeImage + 1} / {images.length}</LocalizedText>
              <TouchableOpacity disabled={activeImage === images.length - 1} onPress={() => setActiveImage(i => Math.min(images.length - 1, i + 1))} style={[styles.zoomNav, { opacity: activeImage === images.length - 1 ? 0.3 : 1 }]}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 30 }}>chevron_right</LocalizedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cartBadge: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#F0695C', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff' },
  galleryContainer: { width, height: width, backgroundColor: '#fff', position: 'relative', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  placeholderHero: { justifyContent: 'center', alignItems: 'center' },
  pagination: { position: 'absolute', bottom: 16, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 8, width: 8, borderRadius: 4 },
  discountBadge: { position: 'absolute', top: 60, left: 16, backgroundColor: '#F0695C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  content: { paddingHorizontal: 20, paddingTop: 0, marginTop: -26 },
  badgeRow: { flexWrap: 'wrap', gap: 8, marginBottom: 12, zIndex: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  warnBox: { backgroundColor: '#FEF4E0', borderRadius: 14, padding: 12, marginBottom: 16, alignItems: 'center' },
  medName: { fontFamily: 'Cairo-Black', fontSize: 24, lineHeight: 34 },
  genericName: { fontFamily: 'Cairo-Regular', fontSize: 13, marginTop: 2 },
  manufacturer: { fontFamily: 'Cairo-Bold', fontSize: 15, marginBottom: 4 },
  priceRow: { alignItems: 'center', marginTop: 12 },
  price: { fontFamily: 'Cairo-Black', fontSize: 32 },
  currency: { fontFamily: 'Cairo-Bold', fontSize: 15, marginHorizontal: 4, marginTop: 10 },
  oldPrice: { fontFamily: 'Cairo-Bold', fontSize: 15, color: '#94A3B8', textDecorationLine: 'line-through', marginLeft: 12, marginTop: 10 },
  heroCard: { borderRadius: 22, borderWidth: 1, padding: 18, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5 },
  brandChip: { alignItems: 'center', backgroundColor: '#23B5CE14', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 8 },
  pricePill: { alignItems: 'center', backgroundColor: '#FEEFED', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
  sectionHead: { alignItems: 'center', marginBottom: 14, gap: 8 },
  sectionAccent: { width: 4, height: 20, borderRadius: 2, backgroundColor: '#23B5CE' },
  factsGrid: { flexWrap: 'wrap', marginBottom: 20 },
  fact: { width: '48%', borderRadius: 14, borderWidth: 1, padding: 10, marginBottom: 10, marginRight: '2%', alignItems: 'center' },
  detailsGroup: { gap: 14, marginBottom: 24 },
  accordion: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  accHeader: { justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  accContent: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, borderTopWidth: 1 },
  altSection: { marginBottom: 24, marginTop: 4 },
  sectionTitle: { fontFamily: 'Cairo-Black', fontSize: 18, marginBottom: 14 },
  altScroll: { paddingBottom: 8 },
  altCard: { width: 140, padding: 14, borderRadius: 18, borderWidth: 1, marginRight: 12, alignItems: 'center' },
  altImgWrap: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 10, overflow: 'hidden' },
  altName: { fontFamily: 'Cairo-Bold', fontSize: 13, marginBottom: 4, textAlign: 'center' },
  altCompany: { fontFamily: 'Cairo-Regular', fontSize: 11, marginBottom: 8, textAlign: 'center' },
  altPrice: { fontFamily: 'Cairo-Black', fontSize: 15 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 14, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 10 },
  addCartBtnWrap: {},
  addCartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 20, shadowColor: '#23B5CE', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  qtyControlFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  qtyBtnFull: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  zoomNav: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 22, padding: 4 },
});
