// @ts-nocheck
// app/pharmacy/filters.tsx — فلاتر الصيدلية المتقدمة (مربوطة بالـ Backend)
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useApp } from '../../src/context/AppContext';
import { resolveColor, darkColors, lightColors } from '../../src/theme/colors';
import { Icon } from '../../src/components/Icon';
import { apiFetch } from '../../src/utils/api';
import { useEffect } from 'react';
import { LocalizedText } from '../../src/components/LocalizedText';

const FALLBACK_CATEGORIES = [
  { id: 'all',     label: 'الكل',                icon: 'apps',        color: '#23B5CE' },
  { id: 'pain',    label: 'مسكنات',              icon: 'pill',        color: '#F0695C' },
  { id: 'vitamin', label: 'فيتامينات ومكملات',   icon: 'test-tube',   color: '#2BB89C' },
  { id: 'anti',    label: 'مضادات حيوية',        icon: 'biotech',     color: '#7A6BEA' },
];

const FALLBACK_FORMS = [
  { id: 'tablet',    label: 'أقراص / كبسول', icon: 'pill' },
  { id: 'syrup',     label: 'شراب',           icon: 'water' },
  { id: 'injection', label: 'حقن',            icon: 'biotech' },
  { id: 'cream',     label: 'كريم / مرهم',    icon: 'face-woman' },
];

const SORT_OPTIONS = [
  { id: 'relevant', label: 'الأكثر صلة',              icon: 'star' },
  { id: 'price_asc',label: 'السعر: من الأقل للأعلى', icon: 'trending_up' },
  { id: 'price_desc',label: 'السعر: من الأعلى للأقل', icon: 'trendingDown' },
  { id: 'newest',   label: 'الأحدث إضافةً',           icon: 'sparkles' },
];

// ── Global filter state (passed via router params on apply) ─────
export default function PharmacyFiltersScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';
  const p = resolveColor('var(--p)');

  const params = useLocalSearchParams<any>();

  const [activeCat,   setActiveCat]   = useState(params.filter_category || 'all');
  const [activeForm,  setActiveForm]  = useState<string[]>(params.filter_forms ? params.filter_forms.split(',') : []);
  const [activeBrand, setActiveBrand] = useState<string[]>(params.filter_brands ? params.filter_brands.split(',') : []);
  const [rxOnly,      setRxOnly]      = useState(params.filter_rx === '1');
  const [activeSort,  setActiveSort]  = useState(params.filter_sort || 'relevant');
  const [brandSearch, setBrandSearch] = useState('');
  const [minPrice,    setMinPrice]    = useState(params.filter_min_price || '');
  const [maxPrice,    setMaxPrice]    = useState(params.filter_max_price || '');

  const [categoriesData, setCategoriesData] = useState<any[]>(FALLBACK_CATEGORIES);
  const [formsData, setFormsData] = useState<any[]>(FALLBACK_FORMS);
  const [brandsData, setBrandsData] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/medicines/filters');
        if (data) {
          if (data.categories && Array.isArray(data.categories)) {
            const iconMap: any = {
              'skincare': { label: 'عناية بالبشرة', icon: 'face-woman', color: '#E8568E' },
              'medications': { label: 'أدوية ومسكنات', icon: 'pill', color: '#F0695C' },
              'vitamins': { label: 'فيتامينات', icon: 'test-tube', color: '#2BB89C' },
              'baby': { label: 'عناية بالطفل', icon: 'baby-carriage', color: '#F0A526' },
              'medical_devices': { label: 'أجهزة طبية', icon: 'medical-bag', color: '#5BA84F' },
              'personal_care': { label: 'عناية شخصية', icon: 'spa', color: '#7A6BEA' }
            };
            const mapped = data.categories.map((c: string) => ({
              id: c,
              label: iconMap[c]?.label || c,
              icon: iconMap[c]?.icon || 'medication',
              color: iconMap[c]?.color || '#23B5CE'
            }));
            setCategoriesData([{ id: 'all', label: 'الكل', icon: 'apps', color: '#23B5CE' }, ...mapped]);
          }
          if (data.forms && Array.isArray(data.forms)) {
            setFormsData(data.forms.map((f: string) => ({ id: f, label: f, icon: 'medication' })));
          }
          if (data.brands && Array.isArray(data.brands)) {
            setBrandsData(data.brands);
          }
        }
      } catch (err) {}
    })();
  }, []);

  const toggleArr = (arr: string[], set: any, val: string) =>
    set((prev: string[]) => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);

  const filteredBrands = brandsData.filter(b => b.includes(brandSearch));

  const activeCount = [
    activeCat !== 'all' ? 1 : 0,
    activeForm.length,
    activeBrand.length,
    rxOnly ? 1 : 0,
    (minPrice || maxPrice) ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // ── Apply: navigate back with filter params ──────────────────
  const handleApply = () => {
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

  const handleReset = () => {
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
    <View style={[st.root, { backgroundColor: colors.bg } ]}>

      {/* ── Header ── */}
      <View style={[st.header, { paddingTop: insets.top + 10, borderBottomColor: colors.bd } ]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(9,14,26,0.95)' : 'rgba(248,250,254,0.97)' }]} />
        )}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[st.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' } ]}>
            <Icon name="close" size={20} color={colors.n} />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <LocalizedText style={{ fontSize: 17, fontFamily: 'Cairo-Bold', color: colors.n }}>تصفية النتائج</LocalizedText>
            {activeCount > 0 && (
              <View style={[st.countBadge, { backgroundColor: p } ]}>
                <LocalizedText style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>{activeCount} فلتر نشط</LocalizedText>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={handleReset}>
            <LocalizedText style={{ fontSize: 13, fontFamily: 'Cairo-SemiBold', color: p }}>إعادة تعيين</LocalizedText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 24, paddingTop: insets.top + 80, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── Sort ── */}
        <View>
          <SectionTitle title="ترتيب حسب" />
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
            {SORT_OPTIONS.map(opt => {
              const active = activeSort === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setActiveSort(opt.id)}
                  style={[st.chip, {
                    backgroundColor: active ? p : colors.s,
                    borderColor: active ? p : colors.bd,
                    flexDirection: 'row-reverse', gap: 6,
                  } ]}>
                  <Icon name={opt.icon} size={15} color={active ? '#fff' : colors.t2} />
                  <LocalizedText style={{ fontSize: 13, fontFamily: 'Cairo-SemiBold', color: active ? '#fff' : colors.t2 }}>{opt.label}</LocalizedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Categories ── */}
        <View>
          <SectionTitle title="التصنيف" />
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
            {categoriesData.map(cat => {
              const active = activeCat === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setActiveCat(cat.id)}
                  style={[st.chip, {
                    backgroundColor: active ? cat.color + '20' : colors.s,
                    borderColor: active ? cat.color : colors.bd,
                    flexDirection: 'row-reverse', gap: 6,
                  } ]}>
                  <Icon name={cat.icon} size={15} color={active ? cat.color : colors.t2} />
                  <LocalizedText style={{ fontSize: 13, fontFamily: 'Cairo-SemiBold', color: active ? cat.color : colors.t2 }}>{cat.label}</LocalizedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Rx Toggle ── */}
        <TouchableOpacity
          onPress={() => setRxOnly(!rxOnly)}
          activeOpacity={0.8}
          style={[st.rxRow, {
            backgroundColor: rxOnly ? '#FEF2F2' : colors.s,
            borderColor: rxOnly ? '#EF4444' : colors.bd,
          } ]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={[st.rxIcon, { backgroundColor: rxOnly ? '#FEE2E2' : colors.bg } ]}>
              <Icon name="document" size={22} color={rxOnly ? '#EF4444' : colors.t2} />
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <LocalizedText style={{ fontSize: 15, fontFamily: 'Cairo-Bold', color: rxOnly ? '#EF4444' : colors.n }}>
                يحتاج وصفة طبية فقط (Rx)
              </LocalizedText>
              <LocalizedText style={{ fontSize: 12, fontFamily: 'Cairo-Regular', color: colors.t2 }}>
                عرض الأدوية التي تتطلب روشتة
              </LocalizedText>
            </View>
          </View>
          <View style={[st.toggle, {
            backgroundColor: rxOnly ? '#EF4444' : colors.bd,
          } ]}>
            <View style={[st.toggleThumb, { alignSelf: rxOnly ? 'flex-start' : 'flex-end' }]} />
          </View>
        </TouchableOpacity>

        {/* ── Price Range ── */}
        <View>
          <SectionTitle title="نطاق السعر (ر.س)" />
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
            <View style={[st.priceInput, { backgroundColor: colors.s, borderColor: colors.bd } ]}>
              <TextInput
                placeholder="الحد الأدنى"
                placeholderTextColor={colors.t3}
                keyboardType="numeric"
                value={minPrice}
                onChangeText={setMinPrice}
                style={{ flex: 1, color: colors.n, textAlign: 'center', fontFamily: 'Cairo-SemiBold', fontSize: 15 }}/>
            </View>
            <LocalizedText style={{ color: colors.t2, fontSize: 20, fontWeight: '300' }}>—</LocalizedText>
            <View style={[st.priceInput, { backgroundColor: colors.s, borderColor: colors.bd } ]}>
              <TextInput
                placeholder="الحد الأقصى"
                placeholderTextColor={colors.t3}
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={setMaxPrice}
                style={{ flex: 1, color: colors.n, textAlign: 'center', fontFamily: 'Cairo-SemiBold', fontSize: 15 }}/>
            </View>
          </View>
        </View>

        {/* ── Drug Form ── */}
        <View>
          <SectionTitle title="الشكل الدوائي" />
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
            {formsData.map(f => {
              const active = activeForm.includes(f.id);
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => toggleArr(activeForm, setActiveForm, f.id)}
                  style={[st.chip, {
                    backgroundColor: active ? p + '18' : colors.s,
                    borderColor: active ? p : colors.bd,
                    flexDirection: 'row-reverse', gap: 6,
                  } ]}>
                  <Icon name={f.icon} size={15} color={active ? p : colors.t2} />
                  <LocalizedText style={{ fontSize: 13, fontFamily: 'Cairo-SemiBold', color: active ? p : colors.t2 }}>{f.label}</LocalizedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Brands ── */}
        <View>
          <SectionTitle title="الشركة المصنعة" />
          <View style={[st.searchBox, { backgroundColor: colors.s, borderColor: colors.bd } ]}>
            <Icon name="search" size={18} color={colors.t3} />
            <TextInput
              placeholder="ابحث عن شركة..."
              placeholderTextColor={colors.t3}
              value={brandSearch}
              onChangeText={setBrandSearch}
              style={{ flex: 1, color: colors.n, textAlign: 'right', fontFamily: 'Cairo-Regular', fontSize: 14 }}/>
          </View>
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
            {filteredBrands.map(b => {
              const active = activeBrand.includes(b);
              return (
                <TouchableOpacity
                  key={b}
                  onPress={() => toggleArr(activeBrand, setActiveBrand, b)}
                  style={[st.chip, {
                    backgroundColor: active ? p + '18' : colors.s,
                    borderColor: active ? p : colors.bd,
                  } ]}>
                  <LocalizedText style={{ fontSize: 13, fontFamily: 'Cairo-SemiBold', color: active ? p : colors.t2 }}>{b}</LocalizedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      </ScrollView>

      {/* ── Apply Button ── */}
      <View style={[st.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.bg, borderTopColor: colors.bd } ]}>
        <TouchableOpacity onPress={handleApply} activeOpacity={0.88} style={{ borderRadius: 20, overflow: 'hidden' }}>
          <View style={[st.applyBtn, { backgroundColor: '#23C5E0' }]}>
            <Icon name="tune" size={20} color="#fff" />
            <LocalizedText style={{ fontSize: 16, fontFamily: 'Cairo-Bold', color: '#fff' }}>
              تطبيق الفلاتر{activeCount > 0 ? ` (${activeCount})` : ''}
            </LocalizedText>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Helper component ─────────────────────────────────────────────
function SectionTitle({ title }: { title: string }) {
  return <LocalizedText style={st.sectionTitle}>{title}</LocalizedText>;
}

// ── Styles ───────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, borderBottomWidth: 1 },
  closeBtn: { width: 38, height: 38, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 2 },

  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },

  rxRow: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 18, borderWidth: 1,
  },
  rxIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  toggle: {
    width: 48, height: 26, borderRadius: 13, padding: 3,
    justifyContent: 'center',
  },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },

  priceInput: {
    flex: 1, height: 50, borderRadius: 14, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
  },

  searchBox: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, height: 46, borderRadius: 14, borderWidth: 1, marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 16, fontFamily: 'Cairo-Bold', color: '#1E293B',
    textAlign: 'right', marginBottom: 12,
  },

  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  applyBtn: { paddingVertical: 16, borderRadius: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
