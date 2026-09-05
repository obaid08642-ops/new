// @ts-nocheck
/**
 * app/(tabs)/pharmacy.tsx
 * Main pharmacy browsing screen with:
 * - Direct medication search bar at top
 * - Luxury Pharmacy Hero Banner with trust badges
 * - Horizontal medium category card rail with distinct 3D vector illustrations
 * - Immediate product listing under categories (default: 'all' dynamically ranked)
 * - Zero mock data, direct backend API binding
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Animated, Platform, FlatList, StatusBar, Image, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../src/components/Icon';
import { useApp } from '../../src/context/AppContext';
import { useCart } from '../../src/context/CartContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import { apiFetch, BASE_URL } from '../../src/utils/api';
import ProductImage from '@/components/ProductImage';
import RotatingCardImage from '@/components/RotatingCardImage';
import { resolveGallery } from '@/utils/imageUrl';
import { setVisibleProductIds } from '@/utils/productNav';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickLocalized, pickDbField } from '../../src/utils/localize';
import { LocalizedText } from '../../src/components/LocalizedText';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { getCategoryVector } from '../../src/components/CategoryVectorIcons';

const PHARMACY_CATEGORIES = [
  { id: 'all', label: 'الكل', dbName: 'all' },
  { id: 'medications', label: 'أدوية وعلاجات', dbName: 'الأدوية والعلاج' },
  { id: 'hair-care', label: 'عناية بالشعر', dbName: 'العناية بالشعر' },
  { id: 'cosmetics', label: 'مكياج وإكسسوارات', dbName: 'المكياج والإكسسوارات' },
  { id: 'skincare', label: 'العناية بالبشرة', dbName: 'العناية بالبشرة' },
  { id: 'baby', label: 'الأم والطفل', dbName: 'الأم والطفل' },
  { id: 'vitamins', label: 'فيتامينات ومكملات', dbName: 'الفيتامينات والتغذية الصحية' },
  { id: 'personal-care', label: 'عناية شخصية', dbName: 'العناية الشخصية' },
];

export default function PharmacyTab() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';
  const { items, addItem, updateQty, itemCount } = useCart();

  // ── Receive filters from filter screen ──────────────────────
  const params = useLocalSearchParams<{
    filter_category?: string;
    filter_forms?: string;
    filter_brands?: string;
    filter_rx?: string;
    filter_min_price?: string;
    filter_max_price?: string;
    filter_sort?: string;
  }>();

  const [activeCat, setActiveCat] = useState('all');
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewCols, setViewCols] = useState<1 | 2>(1); // 1 = wide row cards, 2 = two-per-row grid

  // Count active filters for badge on filter button
  const activeFilterCount = [
    params.filter_category && params.filter_category !== 'all' ? 1 : 0,
    params.filter_forms ? params.filter_forms.split(',').filter(Boolean).length : 0,
    params.filter_brands ? params.filter_brands.split(',').filter(Boolean).length : 0,
    params.filter_rx === '1' ? 1 : 0,
    (params.filter_min_price || params.filter_max_price) ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Toast animation state
  const toastAnim = useRef(new Animated.Value(0)).current;

  // FAB bounce
  const fabScale = useRef(new Animated.Value(1)).current;

  // Fetch medicines when search, category, or filter params change
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const q = new URLSearchParams();
        if (searchQuery) q.append('search', searchQuery);
        const cat = params.filter_category || activeCat;
        const targetCat = PHARMACY_CATEGORIES.find(c => c.id === cat)?.dbName || cat;
        if (targetCat && targetCat !== 'all') q.append('category', targetCat);
        if (params.filter_forms) q.append('forms', params.filter_forms);
        if (params.filter_brands) q.append('brands', params.filter_brands);
        if (params.filter_rx === '1') q.append('rx_only', '1');
        if (params.filter_min_price) q.append('min_price', params.filter_min_price);
        if (params.filter_max_price) q.append('max_price', params.filter_max_price);
        if (params.filter_sort) q.append('sort', params.filter_sort);

        const ep = `/medicines?${q.toString()}`;
        const ck = `@nabdah_offline_cat_${q.toString()}`;
        try {
          const raw = await AsyncStorage.getItem(ck);
          if (raw) setMedicines(JSON.parse(raw).data || []);
        } catch {}

        const data = await apiFetch(ep);
        const rows = Array.isArray(data) ? data : (data?.data || []);
        setMedicines(rows);
        AsyncStorage.setItem(ck, JSON.stringify({ data: rows, ts: Date.now() })).catch(() => {});
      } catch (err) {
        console.log('Medicines fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchQuery, activeCat, params.filter_category, params.filter_forms, params.filter_brands, params.filter_rx, params.filter_min_price, params.filter_max_price, params.filter_sort]);

  const showRxToast = () => {
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 6 }),
      Animated.delay(2500),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleAdd = useCallback((m: any) => {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 4, tension: 300, useNativeDriver: true }),
    ]).start();

    if (m.rx || m.requires_prescription) {
      showRxToast();
    }

    addItem({
      id: m.id,
      name: pickDbField(m, 'name') || m.name,
      price: m.price || m.p || 0,
      rx: m.rx || m.requires_prescription || false,
      image: m.image,
      icon: m.icon || m.ic || 'medication',
      iconColor: m.iconColor || m.c || '#23B5CE',
      iconBg: m.iconBg || m.cs || '#DEF5F9',
      activeIngredient: m.active_ingredient || m.activeIngredient,
    });
  }, [addItem, fabScale]);

  // Client-side filtering & sorting
  const filtered = medicines.filter(m => {
    const cat = params.filter_category || activeCat;
    const matchCat =
      cat === 'all' ||
      m.cat === cat ||
      m.slug === cat ||
      m.category === cat ||
      (cat === 'medications' && (m.category === 'أدوية وعلاجات' || m.category === 'medications' || m.category === 'أدوية ومسكنات')) ||
      (cat === 'hair-care' && (m.category === 'عناية بالشعر' || m.category === 'hair-care')) ||
      (cat === 'cosmetics' && (m.category === 'مكياج وإكسسوارات' || m.category === 'cosmetics')) ||
      (cat === 'skincare' && (m.category === 'العناية بالبشرة' || m.category === 'skincare')) ||
      (cat === 'baby' && (m.category === 'الأم والطفل' || m.category === 'عناية بالطفل' || m.category === 'baby')) ||
      (cat === 'vitamins' && (m.category === 'فيتامينات ومكملات' || m.category === 'فيتامينات' || m.category === 'vitamins')) ||
      (cat === 'personal-care' && (m.category === 'عناية شخصية' || m.category === 'personal-care'));

    const matchSearch =
      !searchQuery ||
      m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.name_ar?.includes(searchQuery) ||
      m.activeIngredient?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchRx = true;
    if (params.filter_rx === '1') matchRx = m.rx === true || m.requires_prescription === true;

    let matchPrice = true;
    const priceVal = m.price || m.p || 0;
    if (params.filter_min_price) matchPrice = matchPrice && priceVal >= parseFloat(params.filter_min_price);
    if (params.filter_max_price) matchPrice = matchPrice && priceVal <= parseFloat(params.filter_max_price);

    let matchForms = true;
    if (params.filter_forms) {
      const formsArr = params.filter_forms.split(',');
      matchForms = formsArr.some(f => m.form?.includes(f) || m.name?.includes(f) || m.name_ar?.includes(f)) || !m.form;
    }

    let matchBrands = true;
    if (params.filter_brands) {
      const brandsArr = params.filter_brands.split(',');
      matchBrands = brandsArr.some(b => m.brand?.includes(b) || m.manufacturer?.includes(b) || m.name_ar?.includes(b)) || (!m.brand && !m.manufacturer);
    }

    return matchCat && matchSearch && matchRx && matchPrice && matchForms && matchBrands;
  }).sort((a, b) => {
    const pA = a.price || a.p || 0;
    const pB = b.price || b.p || 0;
    if (params.filter_sort === 'price_asc') return pA - pB;
    if (params.filter_sort === 'price_desc') return pB - pA;
    if (params.filter_sort === 'newest') return (b.id > a.id ? 1 : -1);
    return 0;
  });

  useEffect(() => {
    setVisibleProductIds(filtered.map((x) => String(x.id)));
  }, [filtered]);

  const getItemQty = (id: string) => items.find(i => i.id === id)?.qty || 0;

  const renderHeader = () => (
    <View style={styles.headerWrap}>
      {/* ─── 1. Top Search Bar ─── */}
      <View style={[styles.searchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.s, borderColor: colors.bd, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 22 }}>search</LocalizedText>
          <TextInput
            style={[styles.searchInput, { color: colors.n, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={lang === 'ar' ? 'ابحث عن دواء أو مادة فعالة...' : 'Search medicines or active ingredients...'}
            placeholderTextColor={colors.t3}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 18, marginHorizontal: 4 }}>close</LocalizedText>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.scannerBtn, { backgroundColor: '#DEF5F9' }]}
            onPress={() => router.push('/pharmacy/barcode-scanner')}
            activeOpacity={0.7}
          >
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 20 }}>document_scanner</LocalizedText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: colors.s, borderColor: colors.bd }]}
          onPress={() => setViewCols(v => (v === 1 ? 2 : 1))}
          activeOpacity={0.7}
        >
          <Icon name={viewCols === 1 ? 'grid_view' : 'view_agenda'} color={colors.n} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, {
            backgroundColor: activeFilterCount > 0 ? '#23B5CE' : colors.s,
            borderColor: activeFilterCount > 0 ? '#23B5CE' : colors.bd,
          }]}
          onPress={() => router.push('/pharmacy/filters')}
          activeOpacity={0.7}
        >
          <Icon name="tune" color={activeFilterCount > 0 ? '#fff' : colors.n} size={20} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <LocalizedText style={{ fontSize: 9, color: '#fff', fontWeight: '900' }}>{activeFilterCount}</LocalizedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── 2. Luxury Pharmacy Hero Banner ─── */}
      <View style={styles.heroContainer}>
        <LinearGradient
          colors={['#0B1527', '#064E3B', '#092E2B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.heroGlowCircle} />
          <View style={styles.heroContent}>
            <View style={[styles.heroHeaderBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#00E599', fontSize: 16 }}>verified</LocalizedText>
              <LocalizedText style={styles.heroBadgeText}>صيدلية نبض المعتمدة</LocalizedText>
            </View>
            <LocalizedText style={styles.heroTitle}>أدوية ومستلزمات أصلية 100%</LocalizedText>
            <LocalizedText style={styles.heroSubtitle}>توصيل مباشر وموثوق بإشراف صيادلة متخصصين</LocalizedText>

            {/* Trust Badges */}
            <View style={[styles.trustRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.trustBadge}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#00E599', fontSize: 13 }}>shield</LocalizedText>
                <LocalizedText style={styles.trustText}>مرخصة SFDA</LocalizedText>
              </View>
              <View style={styles.trustBadge}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#00E599', fontSize: 13 }}>bolt</LocalizedText>
                <LocalizedText style={styles.trustText}>توصيل 60 دقيقة</LocalizedText>
              </View>
              <View style={styles.trustBadge}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#00E599', fontSize: 13 }}>lock</LocalizedText>
                <LocalizedText style={styles.trustText}>تغليف آمن</LocalizedText>
              </View>
            </View>

            {/* Quick Action Links */}
            <View style={[styles.heroActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={styles.heroActionBtn}
                onPress={() => router.push('/pharmacy/scan-prescription')}
                activeOpacity={0.85}
              >
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#00E599', fontSize: 18 }}>receipt_long</LocalizedText>
                <LocalizedText style={styles.heroActionText}>ارفع وصفة طبية</LocalizedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.heroActionBtn, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }]}
                onPress={() => router.push('/pharmacy/order-history')}
                activeOpacity={0.85}
              >
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 18 }}>history</LocalizedText>
                <LocalizedText style={[styles.heroActionText, { color: '#fff' }]}>سجل طلباتي</LocalizedText>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ─── 3. Horizontal Scrollable Category Rail (مربعات وسطية تتسحب يمين وشمال) ─── */}
      <View style={styles.categoriesSection}>
        <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <LocalizedText style={[styles.sectionTitle, { color: colors.n }]}>تصفح الفئات</LocalizedText>
          <LocalizedText style={[styles.sectionSub, { color: colors.t3 }]}>اختر فئة لعرض الأدوية مباشرة</LocalizedText>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categoryRail, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          {PHARMACY_CATEGORIES.map((cat) => {
            const isSelected = activeCat === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: isSelected ? (isDark ? '#0B2922' : '#E8FAF2') : colors.s,
                    borderColor: isSelected ? '#00E599' : (isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'),
                  },
                  isSelected && styles.categoryCardSelected,
                ]}
                onPress={() => setActiveCat(cat.id)}
                activeOpacity={0.8}
              >
                <View style={styles.categoryVectorWrap}>
                  {getCategoryVector(cat.id, 40)}
                </View>
                <LocalizedText
                  numberOfLines={2}
                  style={[
                    styles.categoryCardTitle,
                    {
                      color: isSelected ? '#00A86B' : colors.n,
                      fontFamily: isSelected ? 'Cairo-Bold' : 'Cairo-SemiBold',
                    },
                  ]}
                >
                  {cat.label}
                </LocalizedText>
                {isSelected && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── 4. Products Section Header ─── */}
      <View style={[styles.productsSectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
          <LocalizedText style={[styles.productsTitle, { color: colors.n }]}>
            {activeCat === 'all'
              ? 'جميع الأدوية والمستلزمات'
              : PHARMACY_CATEGORIES.find(c => c.id === activeCat)?.label || 'الأدوية'}
          </LocalizedText>
          <View style={styles.countPill}>
            <LocalizedText style={styles.countText}>{filtered.length}</LocalizedText>
          </View>
        </View>
        <LocalizedText style={[styles.rankingHint, { color: colors.t3 }]}>ترتيب ذكي ومحدث</LocalizedText>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <FlatList
        key={`cols-${viewCols}`}
        data={filtered}
        keyExtractor={item => item.id.toString()}
        numColumns={viewCols}
        columnWrapperStyle={viewCols === 2 ? { gap: 10 } : undefined}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#00E599" />
              <LocalizedText style={[styles.loadingText, { color: colors.t2 }]}>جاري تحميل الأدوية والمستلزمات...</LocalizedText>
            </View>
          ) : (
            <View style={styles.centered}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 64 }}>search_off</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 18, color: colors.n, marginTop: 12 }}>لم نجد أدوية مطابقة لبحثك</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: colors.t3, marginTop: 4, textAlign: 'center' }}>
                يمكنك رفع الروشتة أو إرسال طلب يدوي وسيقوم الصيدلي بتوفيره فوراً
              </LocalizedText>
              <TouchableOpacity
                style={[styles.manualBtn, { backgroundColor: '#00E599' }]}
                onPress={() => router.push('/pharmacy/request')}
              >
                <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: '#0B1527' }}>طلب دواء خاص</LocalizedText>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item: m }) => {
          const qty = getItemQty(m.id);
          const gallery = resolveGallery(m);

          // ── Two-per-row square grid card ──────────────────────────────
          if (viewCols === 2) {
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.gridCard, { backgroundColor: colors.s, borderColor: colors.bd }]}
                onPress={() => {
                  apiFetch('/medicines/events', {
                    method: 'POST',
                    body: JSON.stringify({ event_type: 'product_clicked', drug_id: m.id })
                  }).catch(() => {});
                  router.push({ pathname: '/pharmacy/product-detail', params: { id: m.id, name: pickDbField(m, 'name') || m.name } });
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.gridImgWrap, { backgroundColor: gallery.length ? '#fff' : (m.iconBg || m.cs || '#DEF5F9'), overflow: 'hidden' }]}>
                  {gallery.length ? (
                    <RotatingCardImage images={gallery} style={{ width: '100%', height: '100%' }} iconSize={40} />
                  ) : (
                    <Icon name={m.icon || m.ic || 'pill'} size={40} color={m.iconColor || m.c || '#23B5CE'} />
                  )}
                  {(m.rx || m.requires_prescription) && (
                    <View style={styles.rxBadgeRow}><LocalizedText style={styles.rxText}>Rx</LocalizedText></View>
                  )}
                </View>
                <View style={{ padding: 10, flex: 1 }}>
                  <LocalizedText style={[styles.gridName, { color: colors.n, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                    {pickDbField(m, 'name') || m.name}
                  </LocalizedText>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: isRTL ? 'flex-end' : 'flex-start', marginTop: 4 }}>
                    <LocalizedText style={[styles.price, { color: '#00A86B' }]}>{(m.price || m.p || 0).toFixed(2)}</LocalizedText>
                    <LocalizedText style={[styles.currency, { color: colors.t3 }]}>ر.س</LocalizedText>
                  </View>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                    {qty > 0 ? (
                      <View style={[styles.qtyControlGrid, { backgroundColor: '#DEF5F9' }]}>
                        <TouchableOpacity onPress={() => updateQty(m.id, 1)} style={styles.qtyBtnCol}>
                          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 18 }}>add</LocalizedText>
                        </TouchableOpacity>
                        <LocalizedText style={[styles.qtyNum, { color: '#23B5CE' }]}>{qty}</LocalizedText>
                        <TouchableOpacity onPress={() => updateQty(m.id, -1)} style={styles.qtyBtnCol}>
                          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 18 }}>remove</LocalizedText>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => {
                        if (m.rx || m.requires_prescription) {
                          showLocalizedAlert(
                            isRTL ? 'مطلوب وصفة طبية' : 'Prescription Required',
                            isRTL ? 'هذا الدواء يتطلب إرفاق روشتة طبية سارية. سيُطلب منك رفعها في سلة المشتريات لإتمام الطلب.' : 'This medicine requires a valid prescription. You will be asked to upload it in the cart.',
                            [{ text: isRTL ? 'موافق' : 'OK' }]
                          );
                        }
                        addItem({...m, rx: m.rx || m.requires_prescription});
                      }} style={[styles.addBtnGrid, { backgroundColor: '#00E599' }]}>
                        <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#0B1527', fontSize: 20 }}>add_shopping_cart</LocalizedText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          // Horizontal card: BIG image on the LEFT, cart control on the RIGHT.
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.cardRow, { backgroundColor: colors.s, borderColor: colors.bd }]}
              onPress={() => {
                apiFetch('/medicines/events', {
                  method: 'POST',
                  body: JSON.stringify({ event_type: 'product_clicked', drug_id: m.id })
                }).catch(() => {});
                router.push({ pathname: '/pharmacy/product-detail', params: { id: m.id, name: pickDbField(m, 'name') || m.name } });
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.cardImgWrap, { backgroundColor: resolveGallery(m).length ? '#fff' : (m.iconBg || m.cs || '#DEF5F9'), overflow: 'hidden' }]}>
                {resolveGallery(m).length ? (
                  <RotatingCardImage images={resolveGallery(m)} style={{ width: '100%', height: '100%' }} iconSize={44} />
                ) : (
                  <Icon name={m.icon || m.ic || 'pill'} size={44} color={m.iconColor || m.c || '#23B5CE'} />
                )}
                {(m.rx || m.requires_prescription) && (
                  <View style={styles.rxBadgeRow}>
                    <LocalizedText style={styles.rxText}>Rx</LocalizedText>
                  </View>
                )}
              </View>

              <View style={styles.cardMid}>
                <LocalizedText style={[styles.medNameRow, { color: colors.n, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                  {pickDbField(m, 'name') || m.name}
                </LocalizedText>
                <LocalizedText style={[styles.medDesc, { color: colors.t3, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                  {pickDbField(m, 'description') || m.d}
                </LocalizedText>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
                  <LocalizedText style={[styles.price, { color: '#00A86B' }]}>{(m.price || m.p || 0).toFixed(2)}</LocalizedText>
                  <LocalizedText style={[styles.currency, { color: colors.t3 }]}>ر.س</LocalizedText>
                </View>
              </View>

              <View style={styles.cardCartSide}>
                {qty > 0 ? (
                  <View style={[styles.qtyControlCol, { backgroundColor: '#DEF5F9' }]}>
                    <TouchableOpacity onPress={() => updateQty(m.id, 1)} style={styles.qtyBtnCol}>
                      <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 20 }}>add</LocalizedText>
                    </TouchableOpacity>
                    <LocalizedText style={[styles.qtyNum, { color: '#23B5CE' }]}>{qty}</LocalizedText>
                    <TouchableOpacity onPress={() => updateQty(m.id, -1)} style={styles.qtyBtnCol}>
                      <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 20 }}>remove</LocalizedText>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => {
                    if (m.rx || m.requires_prescription) {
                      showLocalizedAlert(
                        isRTL ? 'مطلوب وصفة طبية' : 'Prescription Required',
                        isRTL ? 'هذا الدواء يتطلب إرفاق روشتة طبية سارية. سيُطلب منك رفعها في سلة المشتريات لإتمام الطلب.' : 'This medicine requires a valid prescription. You will be asked to upload it in the cart.',
                        [{ text: isRTL ? 'موافق' : 'OK' }]
                      );
                    }
                    addItem({...m, rx: m.rx || m.requires_prescription});
                  }} style={[styles.addBtnRow, { backgroundColor: '#00E599' }]}>
                    <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#0B1527', fontSize: 24 }}>add_shopping_cart</LocalizedText>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ─── Rx Toast ─── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          {
            transform: [
              {
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
            opacity: toastAnim,
          },
        ]}
      >
        <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 24, marginRight: 8 }}>receipt_long</LocalizedText>
        <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 13, flex: 1, textAlign: 'left' }}>
          هذا الدواء يتطلب وصفة طبية، يرجى إرفاقها عند الدفع
        </LocalizedText>
      </Animated.View>

      {/* ─── Floating Cart Button ─── */}
      {itemCount > 0 && (
        <Animated.View style={[styles.fabWrap, { transform: [{ scale: fabScale }] }]}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: '#0B1527' }]}
            onPress={() => router.push('/pharmacy/cart')}
            activeOpacity={0.9}
          >
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#00E599', fontSize: 26 }}>shopping_cart</LocalizedText>
            <View style={styles.fabBadge}>
              <LocalizedText style={styles.fabBadgeText}>{itemCount}</LocalizedText>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { paddingTop: 8, paddingBottom: 12 },
  
  // Search Bar
  searchRow: { alignItems: 'center', marginBottom: 16 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 6 },
  searchInput: { flex: 1, fontFamily: 'Cairo-Regular', fontSize: 14, marginHorizontal: 8 },
  scannerBtn: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  filterBtn: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginLeft: 8, position: 'relative' },
  filterBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },

  // Luxury Hero Banner
  heroContainer: { marginBottom: 20, borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
  heroGradient: { padding: 20, position: 'relative', overflow: 'hidden' },
  heroGlowCircle: { position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(0,229,153,0.15)' },
  heroContent: { zIndex: 2 },
  heroHeaderBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,229,153,0.15)', borderWidth: 1, borderColor: 'rgba(0,229,153,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, gap: 6, alignItems: 'center', marginBottom: 10 },
  heroBadgeText: { fontFamily: 'Cairo-Bold', fontSize: 11, color: '#00E599' },
  heroTitle: { fontFamily: 'Cairo-Bold', fontSize: 20, color: '#FFFFFF', textAlign: 'right', marginBottom: 4 },
  heroSubtitle: { fontFamily: 'Cairo-Regular', fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginBottom: 14, lineHeight: 18 },
  trustRow: { gap: 8, marginBottom: 16 },
  trustBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  trustText: { fontFamily: 'Cairo-SemiBold', fontSize: 10, color: 'rgba(255,255,255,0.9)' },
  heroActionsRow: { gap: 10 },
  heroActionBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(0,229,153,0.18)', borderWidth: 1, borderColor: 'rgba(0,229,153,0.35)', paddingVertical: 10, borderRadius: 14 },
  heroActionText: { fontFamily: 'Cairo-Bold', fontSize: 13, color: '#00E599' },

  // Horizontal Category Rail (مربعات وسطية)
  categoriesSection: { marginBottom: 20 },
  sectionTitleRow: { justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  sectionTitle: { fontFamily: 'Cairo-Bold', fontSize: 17 },
  sectionSub: { fontFamily: 'Cairo-Regular', fontSize: 11 },
  categoryRail: { paddingVertical: 4, gap: 10 },
  categoryCard: {
    width: 96,
    height: 112,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  categoryCardSelected: {
    shadowColor: '#00E599',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  categoryVectorWrap: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  categoryCardTitle: { fontSize: 11, textAlign: 'center', lineHeight: 15 },
  activeDot: { position: 'absolute', bottom: 6, width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#00E599' },

  // Products Header
  productsSectionHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  productsTitle: { fontFamily: 'Cairo-Bold', fontSize: 17 },
  countPill: { backgroundColor: '#DEF5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontFamily: 'Cairo-Bold', fontSize: 11, color: '#23B5CE' },
  rankingHint: { fontFamily: 'Cairo-Medium', fontSize: 11 },

  // Product Cards
  cardRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, padding: 12, marginBottom: 12, overflow: 'hidden' },
  gridCard: { flex: 1, borderRadius: 20, borderWidth: 1, marginBottom: 12, overflow: 'hidden', maxWidth: '49%' },
  gridImgWrap: { width: '100%', height: 120, justifyContent: 'center', alignItems: 'center' },
  gridName: { fontFamily: 'Cairo-Bold', fontSize: 13, lineHeight: 18 },
  qtyControlGrid: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, gap: 6 },
  addBtnGrid: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardImgWrap: { width: 100, height: 100, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  rxBadgeRow: { position: 'absolute', top: 6, left: 6, backgroundColor: '#F0695C', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  rxText: { fontFamily: 'Cairo-Bold', fontSize: 10, color: '#fff' },
  cardMid: { flex: 1, paddingHorizontal: 12, justifyContent: 'center' },
  medNameRow: { fontFamily: 'Cairo-Bold', fontSize: 14, lineHeight: 20, marginBottom: 4 },
  medDesc: { fontFamily: 'Cairo-Regular', fontSize: 11, lineHeight: 16, marginBottom: 8 },
  price: { fontFamily: 'Cairo-Black', fontSize: 16 },
  currency: { fontFamily: 'Cairo-Regular', fontSize: 10, marginHorizontal: 2 },
  cardCartSide: { justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  addBtnRow: { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center', shadowColor: '#00E599', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  qtyControlCol: { alignItems: 'center', borderRadius: 14, paddingVertical: 4, paddingHorizontal: 6 },
  qtyBtnCol: { paddingHorizontal: 8, paddingVertical: 5 },
  qtyNum: { fontFamily: 'Cairo-Bold', fontSize: 13, color: '#1E293B' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 20 },
  loadingText: { fontFamily: 'Cairo-Regular', marginTop: 12, fontSize: 14 },
  manualBtn: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  fabWrap: { position: 'absolute', bottom: 100, right: 24 },
  fab: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10 },
  fabBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  fabBadgeText: { fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 11 },
  toast: { position: 'absolute', bottom: 180, alignSelf: 'center', backgroundColor: '#F0695C', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, width: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
});
