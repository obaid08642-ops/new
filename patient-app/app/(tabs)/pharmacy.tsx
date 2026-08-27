// @ts-nocheck
/**
 * app/(tabs)/pharmacy.tsx
 * Main pharmacy browsing screen.
 * - Search and banners scroll up with the content.
 * - Rx Toast notification.
 * - Inline quantity controls on product cards.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Animated, Platform, FlatList, StatusBar, Image, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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


const CATEGORIES = [
  { id: 'all', label: 'الكل', icon: 'apps' },
  { id: 'مسكنات', label: 'مسكنات', icon: 'pill' },
  { id: 'فيتامينات', label: 'فيتامينات', icon: 'test-tube' },
  { id: 'مضادات', label: 'مضادات حيوية', icon: 'biotech' },
  { id: 'عناية', label: 'عناية شخصية', icon: 'face-woman' },
  { id: 'مزمنة', label: 'أمراض مزمنة', icon: 'heart-pulse' },
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
  const [categoriesData, setCategoriesData] = useState<any[]>(CATEGORIES);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewCols, setViewCols] = useState<1 | 2>(1); // 1 = wide row cards, 2 = two-per-row grid

  // Fetch categories from database
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/medicines/categories');
        if (Array.isArray(data) && data.length > 0) {
          const iconMap: any = {
            'skincare': { label: 'عناية بالبشرة', icon: 'face-woman' },
            'medications': { label: 'أدوية ومسكنات', icon: 'pill' },
            'vitamins': { label: 'فيتامينات', icon: 'test-tube' },
            'baby': { label: 'عناية بالطفل', icon: 'baby-carriage' },
            'medical_devices': { label: 'أجهزة طبية', icon: 'medical-bag' },
            'personal_care': { label: 'عناية شخصية', icon: 'spa' }
          };
          const mapped = data.map((c: any) => ({
            id: c.slug,
            label: iconMap[c.slug]?.label || c.slug,
            icon: iconMap[c.slug]?.icon || 'medication'
          }));
          setCategoriesData([{ id: 'all', label: 'الكل', icon: 'apps' }, ...mapped]);
        }
      } catch (err) {
        console.log('Categories fetch err:', err);
      }
    })();
  }, []);

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

  // Refetch when search, category, or filter params change
  useEffect(() => {
    (async () => {
      setLoading(true);
      {
        const q = new URLSearchParams();
        if (searchQuery)           q.append('search', searchQuery);
        const cat = params.filter_category || activeCat;
        if (cat && cat !== 'all') q.append('category', cat);
        if (params.filter_forms)      q.append('forms', params.filter_forms);
        if (params.filter_brands)     q.append('brands', params.filter_brands);
        if (params.filter_rx === '1') q.append('rx_only', '1');
        if (params.filter_min_price)  q.append('min_price', params.filter_min_price);
        if (params.filter_max_price)  q.append('max_price', params.filter_max_price);
        if (params.filter_sort)       q.append('sort', params.filter_sort);

        const ep = `/medicines?${q.toString()}`;
        const ck = `@nabdah_offline_cat_${q.toString()}`;
        // Offline-first: show last cached copy instantly, then refresh
        try {
          const raw = await AsyncStorage.getItem(ck);
          if (raw) setMedicines(JSON.parse(raw).data || []);
        } catch {}
        try {
          const data = await apiFetch(ep);
          const rows = Array.isArray(data) ? data : [];
          setMedicines(rows);
          AsyncStorage.setItem(ck, JSON.stringify({ data: rows, ts: Date.now() })).catch(() => {});
        } catch {
          // Offline — cached copy (if any) already shown above; never mock data
        } finally {
          setLoading(false);
        }
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
    // FAB bounce
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

  // (visible product ids feed swipe navigation on the product page)
  // Filter client-side as fallback if backend isn't filtering correctly
  const filtered = medicines.filter(m => {
    const cat = params.filter_category || activeCat;
    const matchCat = cat === 'all' || m.cat === cat || m.slug === cat || m.category === cat;
    const matchSearch = m.name?.includes(searchQuery) || m.name_ar?.includes(searchQuery) || m.activeIngredient?.includes(searchQuery);
    
    // Check extra filters from filter screen
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

    return matchCat && (searchQuery ? matchSearch : true) && matchRx && matchPrice && matchForms && matchBrands;
  }).sort((a, b) => {
    const pA = a.price || a.p || 0;
    const pB = b.price || b.p || 0;
    if (params.filter_sort === 'price_asc') return pA - pB;
    if (params.filter_sort === 'price_desc') return pB - pA;
    if (params.filter_sort === 'newest') return (b.id > a.id ? 1 : -1);
    return 0; // 'relevant' or none
  });

  useEffect(() => { setVisibleProductIds(filtered.map((x) => String(x.id))); }, [filtered]);

  const getItemQty = (id: string) => items.find(i => i.id === id)?.qty || 0;


  const renderHeader = () => (
    <View>
      {/* ─── Top Section (Scrolls with page) ─── */}
        <View style={[styles.topSection, { paddingTop: insets.top + 10 }]}>
          {/* Search Row */}
          <View style={[styles.searchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
            <View style={[styles.searchBar, { backgroundColor: colors.s, borderColor: colors.bd, flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 22 }}>search</LocalizedText>
              <TextInput
                style={[styles.searchInput, { color: colors.n, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={lang === 'ar' ? 'ابحث بالاسم أو المادة الفعالة...' : 'Search medicines...'}
                placeholderTextColor={colors.t3}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <TouchableOpacity
                style={[styles.scannerBtn, { backgroundColor: '#DEF5F9' }]}
                onPress={() => router.push('/pharmacy/barcode-scanner')}
                activeOpacity={0.7}
              >
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 20 }}>document_scanner</LocalizedText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.filterBtn, {
                backgroundColor: colors.s,
                borderColor: colors.bd,
              }]}
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

          {/* Quick-Action Banners — Premium Vector Style */}
          <View style={[styles.bannerRow, { flexDirection: 'row-reverse', gap: 10 } ]}>
            {/* وصفة طبية */}
            <TouchableOpacity
              style={[styles.bannerCard, { flex: 1, overflow: 'hidden' }]}
              onPress={() => router.push('/pharmacy/scan-prescription')}
              activeOpacity={0.85}
            >
              <View
                style={[styles.bannerGrad, { backgroundColor: '#0EA5E9' } ]}>
                {/* Decorative circle */}
                <View style={styles.bannerCircle} />
                {/* Icon bubble */}
                <View style={styles.bannerIconBubble}>
                  <Icon name="document" size={26} color="#0EA5E9" />
                </View>
                <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
                  <LocalizedText style={styles.bannerTitle}>وصفة طبية</LocalizedText>
                  <LocalizedText style={styles.bannerSub}>ارفع روشتة واطلب</LocalizedText>
                </View>
                <View style={styles.bannerArrow}>
                  <Icon name="chevronLeft" size={16} color="rgba(255,255,255,0.7)" />
                </View>
              </View>
            </TouchableOpacity>

            {/* طلباتي */}
            <TouchableOpacity
              style={[styles.bannerCard, { flex: 1, overflow: 'hidden' }]}
              onPress={() => router.push('/pharmacy/order-history')}
              activeOpacity={0.85}
            >
              <View
                style={[styles.bannerGrad, { backgroundColor: '#F59E0B' } ]}>
                <View style={[styles.bannerCircle, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
                <View style={styles.bannerIconBubble}>
                  <Icon name="receipt" size={26} color="#F59E0B" />
                </View>
                <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
                  <LocalizedText style={styles.bannerTitle}>طلباتي</LocalizedText>
                  <LocalizedText style={styles.bannerSub}>سجل طلبات الأدوية</LocalizedText>
                </View>
                <View style={styles.bannerArrow}>
                  <Icon name="chevronLeft" size={16} color="rgba(255,255,255,0.7)" />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Category Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.catsContainer, { flexDirection: 'row' } ]}>
            {categoriesData.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: activeCat === c.id ? '#23B5CE' : colors.s,
                    borderColor: activeCat === c.id ? '#23B5CE' : colors.bd
                  } ]} onPress={() => setActiveCat(c.id)}
                activeOpacity={0.8}
              >
                <Icon name={c.icon} color={activeCat === c.id ? '#fff' : colors.t2} size={18} />
                <LocalizedText style={{
                  fontFamily: activeCat === c.id ? 'Cairo-Bold' : 'Cairo-SemiBold',
                  fontSize: 13,
                  color: activeCat === c.id ? '#fff' : colors.n,
                  marginHorizontal: 6,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {c.label}
                </LocalizedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg } ]}>
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
              <ActivityIndicator size="large" color="#23B5CE" />
              <LocalizedText style={[styles.loadingText, { color: colors.t2 } ]}>جاري تحميل الأدوية...</LocalizedText>
            </View>
          ) : (
            <View style={styles.centered}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 64 }}>search_off</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 18, color: colors.n, marginTop: 12 }}>لم نجد ما تبحث عنه</LocalizedText>
              <TouchableOpacity
                style={[styles.manualBtn, { backgroundColor: '#23B5CE' }]}
                onPress={() => router.push('/pharmacy/manual-order')}
              >
                <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: '#fff' }}>طلب يدوي</LocalizedText>
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
                onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: m.id, name: pickDbField(m, 'name') || m.name } })}
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
                    <LocalizedText style={[styles.price, { color: '#23B5CE' }]}>{(m.price || m.p || 0).toFixed(2)}</LocalizedText>
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
                      }} style={[styles.addBtnGrid, { backgroundColor: '#23B5CE' }]}>
                        <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 20 }}>add_shopping_cart</LocalizedText>
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
                    onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: m.id, name: pickDbField(m, 'name') || m.name } })}
                    activeOpacity={0.85}
                  >
                    {/* Image — LEFT, large */}
                    <View style={[styles.cardImgWrap, { backgroundColor: resolveGallery(m).length ? '#fff' : (m.iconBg || m.cs || '#DEF5F9'), overflow: 'hidden' } ]}>
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

                    {/* Text — middle */}
                    <View style={styles.cardMid}>
                      <LocalizedText style={[styles.medNameRow, { color: colors.n, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                        {pickDbField(m, 'name') || m.name}
                      </LocalizedText>
                      <LocalizedText style={[styles.medDesc, { color: colors.t3, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                        {pickDbField(m, 'description') || m.d}
                      </LocalizedText>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
                        <LocalizedText style={[styles.price, { color: '#23B5CE' } ]}>{(m.price || m.p || 0).toFixed(2)}</LocalizedText>
                        <LocalizedText style={[styles.currency, { color: colors.t3 } ]}>ر.س</LocalizedText>
                      </View>
                    </View>

                    {/* Cart — RIGHT */}
                    <View style={styles.cardCartSide}>
                      {qty > 0 ? (
                        <View style={[styles.qtyControlCol, { backgroundColor: '#DEF5F9' } ]}>
                          <TouchableOpacity onPress={() => updateQty(m.id, 1)} style={styles.qtyBtnCol}>
                            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 20 }}>add</LocalizedText>
                          </TouchableOpacity>
                          <LocalizedText style={[styles.qtyNum, { color: '#23B5CE' } ]}>{qty}</LocalizedText>
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
                        }} style={[styles.addBtnRow, { backgroundColor: '#23B5CE' } ]}>
                          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 26 }}>add_shopping_cart</LocalizedText>
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
                  outputRange: [100, 0], // slide up
                }),
              },
            ],
            opacity: toastAnim,
          },
        ]}>
        <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 24, marginRight: 8 }}>receipt_long</LocalizedText>
        <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 13, flex: 1, textAlign: 'left' }}>
          هذا الدواء يتطلب وصفة طبية، يرجى إرفاقها عند الدفع
        </LocalizedText>
      </Animated.View>

      {/* ─── Floating Cart Button ─── */}
      {itemCount > 0 && (
        <Animated.View style={[styles.fabWrap, { transform: [{ scale: fabScale }] }]}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: '#141A2A' }]}
            onPress={() => router.push('/pharmacy/cart')}
            activeOpacity={0.9}
          >
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 24 }}>shopping_cart</LocalizedText>
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
  topSection: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  searchRow: { alignItems: 'center', marginBottom: 14 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 6 },
  searchInput: { flex: 1, fontFamily: 'Cairo-Regular', fontSize: 14, marginHorizontal: 8 },
  scannerBtn: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  filterBtn: { width: 50, height: 50, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginLeft: 10, position: 'relative' },
  filterBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  bannerRow: { marginBottom: 14 },
  bannerCard: { borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  bannerGrad: { padding: 16, borderRadius: 20, minHeight: 100, justifyContent: 'space-between' },
  bannerCircle: { position: 'absolute', top: -20, left: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.1)' },
  bannerIconBubble: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end' },
  bannerArrow: { position: 'absolute', bottom: 12, left: 12 },
  bannerTitle: { fontFamily: 'Cairo-Bold', fontSize: 15, color: '#fff', textAlign: 'right' },
  bannerSub: { fontFamily: 'Cairo-Regular', fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2, textAlign: 'right' },
  catsContainer: { paddingBottom: 6 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  grid: { paddingHorizontal: 20, paddingTop: 12 },
  cardsGrid: { justifyContent: 'space-between' },
  card: { width: '48%', borderRadius: 20, borderWidth: 1, padding: 10, marginBottom: 14, overflow: 'hidden' },
  iconBox: { width: '100%', height: 120, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  rxBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#F0695C', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  rxText: { fontFamily: 'Cairo-Bold', fontSize: 10, color: '#fff' },
  medName: { fontFamily: 'Cairo-Bold', fontSize: 13, marginBottom: 4 },
  medDesc: { fontFamily: 'Cairo-Regular', fontSize: 11, lineHeight: 17, marginBottom: 12 },
  cardFooter: { justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' as any },
  price: { fontFamily: 'Cairo-Black', fontSize: 16 },
  currency: { fontFamily: 'Cairo-Regular', fontSize: 10 },
  addBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#23B5CE', justifyContent: 'center', alignItems: 'center' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, height: 36, paddingHorizontal: 4 },
  qtyBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingText: { fontFamily: 'Cairo-Regular', marginTop: 12, fontSize: 14 },
  manualBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  fabWrap: { position: 'absolute', bottom: 100, right: 24 }, // Moved up so it doesn't hide behind tab bar
  fab: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 10 },
  fabBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#F0695C', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  fabBadgeText: { fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 11 },
  toast: { position: 'absolute', bottom: 180, alignSelf: 'center', backgroundColor: '#F0695C', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, width: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  qtyNum: { fontFamily: 'Cairo-Bold', fontSize: 13, color: '#1E293B' },
  // ── Horizontal product row (image LEFT / cart RIGHT) ──
  cardRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, padding: 10, marginBottom: 12, overflow: 'hidden' },
  gridCard: { flex: 1, borderRadius: 20, borderWidth: 1, marginBottom: 12, overflow: 'hidden', maxWidth: '49%' },
  gridImgWrap: { width: '100%', height: 120, justifyContent: 'center', alignItems: 'center' },
  gridName: { fontFamily: 'Cairo-Bold', fontSize: 13, lineHeight: 18 },
  qtyControlGrid: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, gap: 6 },
  addBtnGrid: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#23B5CE', justifyContent: 'center', alignItems: 'center' },
  cardImgWrap: { width: 110, height: 110, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  rxBadgeRow: { position: 'absolute', top: 6, left: 6, backgroundColor: '#F0695C', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  cardMid: { flex: 1, paddingHorizontal: 12, justifyContent: 'center' },
  medNameRow: { fontFamily: 'Cairo-Bold', fontSize: 14, lineHeight: 20, marginBottom: 4 },
  cardCartSide: { justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  addBtnRow: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#23B5CE', justifyContent: 'center', alignItems: 'center' },
  qtyControlCol: { alignItems: 'center', borderRadius: 14, paddingVertical: 4, paddingHorizontal: 6 },
  qtyBtnCol: { paddingHorizontal: 8, paddingVertical: 5 },
});
