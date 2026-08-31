// @ts-nocheck
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../../src/context/AppContext';
import { lightColors, darkColors, resolveColor } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';
import { router } from 'expo-router';
import { LocalizedText } from '../../src/components/LocalizedText';
import { useLocalSearchParams as __useRouteParams } from "expo-router";
import PharmacyProductSearchView from "../../src/components/views/PharmacyProductSearchView";
import DoctorSearchView from "../../src/components/views/DoctorSearchView";

const RECENT_KEY = '@nabdah_recent_searches';

const cats = ['الكل', 'أطباء', 'صيدلية', 'تحاليل', 'أشعة', 'مقالات', 'أمراض', 'تأمين', 'مجتمع', 'عائلة'];
const catsEn = ['All', 'Doctors', 'Pharmacy', 'Labs', 'Radiology', 'Articles', 'Diseases', 'Insurance', 'Community', 'Family'];

const catMap = { 'أطباء': 'دكتور', 'صيدلية': 'دواء', 'تحاليل': 'تحليل', 'أشعة': 'أشعة', 'مقالات': 'مقال', 'أمراض': 'مرض', 'تأمين': 'تأمين', 'مجتمع': 'مجتمع', 'عائلة': 'عائلة' };
const catMapEn = { 'Doctors': 'Doctor', 'Pharmacy': 'Medicine', 'Labs': 'Lab', 'Radiology': 'Radiology', 'Articles': 'Article', 'Diseases': 'Disease', 'Insurance': 'Insurance', 'Community': 'Community', 'Family': 'Family' };

function SearchInner() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';

  const [searchCat, setSearchCat] = useState(0); // index 0 for 'All'
  const [query, setQuery] = useState('');
  const [searchData, setSearchData] = useState<any[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  // Load the user's real recent searches
  React.useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then((raw) => { if (raw) setRecent(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const saveRecent = (term: string) => {
    const t = term.trim();
    if (t.length < 2) return;
    setRecent((prev) => {
      const next = [t, ...prev.filter((x) => x !== t)].slice(0, 8);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  React.useEffect(() => {
    if (!query) {
      setSearchData([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      apiFetch(`/home/search?q=${encodeURIComponent(query)}`)
        .then((res: any) => {
          setSearchData(Array.isArray(res) ? res : res?.data || []);
          saveRecent(query);
        })
        .catch(console.error);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const catList = lang === 'ar' ? cats : catsEn;
  const map = lang === 'ar' ? catMap : catMapEn;

  const currentCatName = catList[searchCat];
  const filterType = map[currentCatName];

  let results = searchData.filter(x => {
    const t = lang === 'ar' ? x.type : x.typeEn;
    return searchCat === 0 || t === filterType;
  });

  // Sponsored first
  results = [...results.filter(x => x.sponsored), ...results.filter(x => !x.sponsored)];

  const handleResultClick = (r: any) => {
    const typeAr = r.type;
    const id = r.id;
    if (!id) return;
    if (typeAr === 'دكتور') {
      router.push(`/consultations/doctor/${id}` as any);
    } else if (typeAr === 'باقة') {
      router.push('/(tabs)/health' as any);
    } else if (typeAr === 'دواء') {
      // M1-33: fixed broken route — the screen is product-detail, not product/[id]
      router.push({ pathname: '/pharmacy/product-detail', params: { id } } as any);
    } else if (typeAr === 'تحليل') {
      router.push({ pathname: '/diagnostics/test-detail', params: { id } } as any);
    } else if (typeAr === 'أشعة') {
      router.push({ pathname: '/diagnostics/test-detail', params: { id, type: 'radiology' } } as any);
    } else if (typeAr === 'مقال' || typeAr === 'مرض') {
      router.push(`/articles/${r.slug || id}` as any);
    } else if (typeAr === 'تأمين') {
      router.push('/insurance/hub' as any);
    } else if (typeAr === 'مجتمع') {
      router.push({ pathname: '/community/post-detail', params: { id } } as any);
    } else if (typeAr === 'عائلة') {
      router.push({ pathname: '/family/member-health', params: { id } } as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg } ]}>
      <ScrollView 
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 100, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.searchInputRow, { backgroundColor: colors.s, borderColor: colors.p, flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.p, fontSize: 20 }}>search</LocalizedText>
          <TextInput 
            style={{ flex: 1, fontSize: 13, color: colors.n, textAlign: isRTL ? 'right' : 'left' }} placeholder={lang === 'ar' ? 'ابحث عن طبيب، دواء، تحليل، مقال، تأمين...' : 'Search doctor, medicine, lab, article, insurance...'}
            placeholderTextColor={colors.t3}
            value={query}
            onChangeText={setQuery}
          />
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 18 }}>mic</LocalizedText>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ marginBottom: 7, paddingBottom: 16, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          {catList.map((ct, i) => (
            <TouchableOpacity 
              key={i} 
              onPress={() => setSearchCat(i)}
              style={[styles.catBtn, { 
                backgroundColor: searchCat === i ? colors.n : colors.s,
                borderWidth: searchCat === i ? 0 : 1.5,
                borderColor: colors.bd
              } ]}>
              <LocalizedText style={{ fontSize: 11.5, fontWeight: '600', color: searchCat === i ? '#fff' : colors.t3 }}>
                {ct}
              </LocalizedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {searchCat === 0 && recent.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <LocalizedText style={{ fontSize: 12, fontWeight: '700', color: colors.t2, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>
              {lang === 'ar' ? 'عمليات بحث سابقة' : 'Recent Searches'}
            </LocalizedText>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', marginBottom: 8 }}>
              {recent.map((r, idx) => (
                <TouchableOpacity key={idx} onPress={() => setQuery(r)} style={[styles.recentBtn, { backgroundColor: colors.bg, flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
                  <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 14, color: colors.t3 }}>history</LocalizedText>
                  <LocalizedText style={{ fontSize: 11, color: colors.t2 }}>{r}</LocalizedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <LocalizedText style={{ fontSize: 12, fontWeight: '700', color: colors.t2, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>
          {lang === 'ar' ? 'النتائج' : 'Results'}
        </LocalizedText>

        <View style={{ marginBottom: 10 }}>
          {results.map((r, idx) => {
            const itemColor = resolveColor(r.c, colors);
            const itemSoft = resolveColor(r.cs, colors);
            return (
              <TouchableOpacity 
                key={idx} 
                onPress={() => handleResultClick(r)}
                style={[styles.resultCard, { 
                  backgroundColor: colors.s, 
                  borderColor: r.sponsored ? resolveColor('var(--as)', colors) : colors.bd,
                  flexDirection: isRTL ? 'row-reverse' : 'row'
                } ]}>
                {r.sponsored && (
                  <View style={[styles.sponsoredBadge, { backgroundColor: resolveColor('var(--as)', colors), left: isRTL ? undefined : 8, right: isRTL ? 8 : undefined } ]}>
                    <LocalizedText style={{ fontSize: 8, fontWeight: '700', color: resolveColor('var(--am)', colors) }}>
                      {lang === 'ar' ? 'عرض' : 'Ad'}
                    </LocalizedText>
                  </View>
                )}
                <View style={[styles.iconWrap, { backgroundColor: itemSoft } ]}>
                  <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 24, color: itemColor}}>
                    {r.ic}
                  </LocalizedText>
                </View>
                <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={[styles.typeBadge, { backgroundColor: itemSoft } ]}>
                      <LocalizedText style={{ fontSize: 8, fontWeight: '700', color: itemColor }}>
                        {lang === 'ar' ? r.type : r.typeEn}
                      </LocalizedText>
                    </View>
                    {r.rate ? (
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 12 }}>
                        <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 11, color: '#F5A623'}}>star</LocalizedText>
                        <LocalizedText style={{ fontSize: 9, color: colors.t3 }}>{lang === 'ar' ? r.rate : r.rateEn}</LocalizedText>
                      </View>
                    ) : null}
                  </View>
                  <LocalizedText style={{ fontSize: 13, fontWeight: '700', color: colors.n, marginTop: 3 }}>
                    {lang === 'ar' ? r.name : r.nameEn}
                  </LocalizedText>
                  <LocalizedText style={{ fontSize: 10, color: colors.t3 }}>
                    {lang === 'ar' ? r.sub : r.subEn}
                  </LocalizedText>
                </View>
                {r.price ? (
                  <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                    <LocalizedText style={{ fontSize: 14, fontWeight: '900', color: colors.p }}>{lang === 'ar' ? r.price : r.priceEn}</LocalizedText>
                    <LocalizedText style={{ fontSize: 8, color: colors.t3 }}>{lang === 'ar' ? 'ر.س' : 'SAR'}</LocalizedText>
                  </View>
                ) : (
                  <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 20 }}>
                    {isRTL ? 'chevron_left' : 'chevron_right'}
                  </LocalizedText>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchInputRow: { borderRadius: 16, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', marginBottom: 14 },
  catBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 40, alignItems: 'center' },
  recentBtn: { alignItems: 'center', marginBottom: 5, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 40 },
  resultCard: { position: 'relative', alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderRadius: 16, padding: 12 },
  sponsoredBadge: { position: 'absolute', top: 8, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 5 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  typeBadge: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 5 }
});

// __RouteGuard: Phase 2.8 global search (view=pharmacy|doctors|default)
export default function SearchInnerRoute() {
  const __p = __useRouteParams() as any;
  if (__p?.view === "pharmacy") return <PharmacyProductSearchView />;
  if (__p?.view === "doctors") return <DoctorSearchView />;
  return <SearchInner />;
}
