// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useApp } from '../../src/context/AppContext';
import { lightColors, darkColors, resolveColor } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';
import { router } from 'expo-router';

const cats = ['الكل', 'أطباء', 'صيدلية', 'تحاليل', 'مقالات'];
const catsEn = ['All', 'Doctors', 'Pharmacy', 'Labs', 'Articles'];

const catMap = { 'أطباء': 'دكتور', 'صيدلية': 'دواء', 'تحاليل': 'تحليل', 'مقالات': 'مقال' };
const catMapEn = { 'Doctors': 'Doctor', 'Pharmacy': 'Medicine', 'Labs': 'Lab', 'Articles': 'Article' };

export default function Search() {
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';

  const [searchCat, setSearchCat] = useState(0); // index 0 for 'All'
  const [query, setQuery] = useState('');
  const [searchData, setSearchData] = useState<any[]>([]);

  React.useEffect(() => {
    if (!query) {
      setSearchData([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      apiFetch(`/home/search?q=${encodeURIComponent(query)}`)
        .then((res: any) => setSearchData(Array.isArray(res) ? res : res?.data || []))
        .catch(console.error);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const catList = lang === 'ar' ? cats : catsEn;
  const map = lang === 'ar' ? catMap : catMapEn;
  const recent = lang === 'ar' ? ['بانادول', 'طبيب أطفال', 'تحليل سكر'] : ['Panadol', 'Pediatrician', 'Blood Sugar'];

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
    const id = r.id || '1';
    if (typeAr === 'دكتور') {
      router.push(`/consultations/doctor/${id}` as any);
    } else if (typeAr === 'باقة') {
      router.push('/(tabs)/health' as any);
    } else if (typeAr === 'دواء') {
      router.push(`/pharmacy/product/${id}` as any);
    } else if (typeAr === 'تحليل') {
      router.push('/(tabs)/diagnostics' as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg } ]}>
      <ScrollView 
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 100, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.searchInputRow, { backgroundColor: colors.s, borderColor: colors.p, flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.p, fontSize: 20 }}>search</Text>
          <TextInput 
            style={{ flex: 1, fontSize: 13, color: colors.n, textAlign: isRTL ? 'right' : 'left' }} placeholder={lang === 'ar' ? 'ابحث عن طبيب، دواء، تحليل...' : 'Search doctor, medicine, lab...'}
            placeholderTextColor={colors.t3}
            value={query}
            onChangeText={setQuery}
          />
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 18 }}>mic</Text>
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
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: searchCat === i ? '#fff' : colors.t3 }}>
                {ct}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {searchCat === 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.t2, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>
              {lang === 'ar' ? 'عمليات بحث سابقة' : 'Recent Searches'}
            </Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', marginBottom: 8 }}>
              {recent.map((r, idx) => (
                <TouchableOpacity key={idx} style={[styles.recentBtn, { backgroundColor: colors.bg, flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
                  <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 14, color: colors.t3 }}>history</Text>
                  <Text style={{ fontSize: 11, color: colors.t2 }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.t2, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>
          {lang === 'ar' ? 'النتائج' : 'Results'}
        </Text>

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
                    <Text style={{ fontSize: 8, fontWeight: '700', color: resolveColor('var(--am)', colors) }}>
                      {lang === 'ar' ? 'عرض' : 'Ad'}
                    </Text>
                  </View>
                )}
                <View style={[styles.iconWrap, { backgroundColor: itemSoft } ]}>
                  <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 24, color: itemColor}}>
                    {r.ic}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={[styles.typeBadge, { backgroundColor: itemSoft } ]}>
                      <Text style={{ fontSize: 8, fontWeight: '700', color: itemColor }}>
                        {lang === 'ar' ? r.type : r.typeEn}
                      </Text>
                    </View>
                    {r.rate ? (
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 11, color: '#F5A623'}}>star</Text>
                        <Text style={{ fontSize: 9, color: colors.t3 }}>{lang === 'ar' ? r.rate : r.rateEn}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.n, marginTop: 3 }}>
                    {lang === 'ar' ? r.name : r.nameEn}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.t3 }}>
                    {lang === 'ar' ? r.sub : r.subEn}
                  </Text>
                </View>
                {r.price ? (
                  <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: colors.p }}>{lang === 'ar' ? r.price : r.priceEn}</Text>
                    <Text style={{ fontSize: 8, color: colors.t3 }}>{lang === 'ar' ? 'ر.س' : 'SAR'}</Text>
                  </View>
                ) : (
                  <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 20 }}>
                    {isRTL ? 'chevron_left' : 'chevron_right'}
                  </Text>
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
