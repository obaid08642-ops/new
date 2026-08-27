// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

import { apiFetch } from '../../src/utils/api';
import { useLocalSearchParams } from 'expo-router';
import { pickLocalized } from '../../src/utils/localize';

const COMPARE_ROWS = [
  { label: 'المادة الفعالة', key: 'ingredient', icon: 'science' },
  { label: 'التركيز', key: 'strength', icon: 'run' },
  { label: 'الشكل', key: 'form', icon: 'medication' },
  { label: 'الكمية', key: 'qty', icon: 'shopping_cart', suffix: ' حبة' },
  { label: 'السعر', key: 'price', icon: 'wallet', suffix: ' ريال' },
  { label: 'التقييم', key: 'rating', icon: 'star' },
  { label: 'يحتاج وصفة', key: 'requiresRx', icon: 'document', bool: true },
  { label: 'الآثار الجانبية', key: 'sideEffects', icon: 'warning' },
];

export default function MedicineCompareScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams<{ ids?: string }>();
  
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const ids = params.ids ? params.ids.split(',') : ['1', '2']; // Fallback to test ids if not provided
        const data = await apiFetch('/medicines/compare', 'POST', { ids });
        if (data && Array.isArray(data)) setMedicines(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.ids]);

  const getBetter = (key: string) => {
    if (medicines.length < 2) return -1;
    if (key === 'price') return (medicines[0].price || 0) < (medicines[1].price || 0) ? 0 : 1;
    if (key === 'rating') return (medicines[0].rating || 0) > (medicines[1].rating || 0) ? 0 : 1;
    return -1;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? colors.surface : colors.white } ]}>
        <AppText variant="bodySM">مقارنة الأدوية</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Product Headers */}
        <View style={[styles.productHeaders, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <View style={styles.labelCol} />
          {medicines.map((m, i) => (
            <View key={m.id} style={styles.productCol}>
              <View style={[styles.productEmoji, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary } ]}>
                <AppText variant="bodySM">{m.emoji}</AppText>
              </View>
              <AppText variant="bodySM">{pickLocalized(m.name_ar, m.name)}</AppText>
              <AppText variant="bodySM">{m.manufacturer || m.brand}</AppText>
            </View>
          ))}
        </View>

        {/* Compare Rows */}
        {COMPARE_ROWS.map((row, rowIdx) => {
          const betterIdx = getBetter(row.key);
          return (
            <View key={row.key} style={[styles.compareRow, { backgroundColor: rowIdx % 2 === 0 ? (isDark ? colors.surface : colors.white) : 'transparent' } ]}>
              <View style={styles.labelCol}>
                <AppText variant="bodySM">{row.icon}</AppText>
                <AppText variant="bodySM">{row.label}</AppText>
              </View>
              {medicines.map((m, i) => {
                const mappedKey = row.key === 'name' ? 'name_ar' : (row.key === 'ingredient' ? 'active_ingredient' : (row.key === 'brand' ? 'manufacturer' : row.key));
                const val = m[mappedKey as keyof typeof m] || m[row.key as keyof typeof m] || 'غير متوفر';
                const isBetter = betterIdx === i;
                const display = row.bool
                  ? (val ? ' نعم' : ' لا')
                  : `${val}${row.suffix || ''}`;
                return (
                  <View key={m.id} style={[styles.productCol, isBetter && { backgroundColor: colors.secondarySurface + '80' } ]}>
                    <AppText variant="bodySM">
                      {display}
                    </AppText>
                    {isBetter && <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="sparkles" size={16} color={colors.primary} /><AppText variant="bodySM">أفضل</AppText></View>}
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Add to Cart Row */}
        <View style={[styles.compareRow, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <View style={styles.labelCol} />
          {medicines.map((m) => (
            <TouchableOpacity key={m.id} style={[styles.productCol, { paddingVertical: 12 }]}
              onPress={() => { /* Requires backend API integration */ }}>
              <View style={[styles.addBtn, { backgroundColor: colors.secondary } ]}>
                <Icon name="shopping_cart" size={16} color="#fff" />
                <AppText variant="bodySM">أضف للسلة</AppText>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontSize: 18, fontWeight: '800' },
  productHeaders: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 8, marginBottom: 2 },
  labelCol: { width: 90, justifyContent: 'center', alignItems: 'center' },
  productCol: { flex: 1, alignItems: 'center', gap: 4, borderRadius: 12, paddingVertical: 8 },
  productEmoji: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  productName: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  productBrand: { fontSize: 10, fontWeight: '400' },
  compareRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
  rowIcon: { fontSize: 14, marginBottom: 2 },
  rowLabel: { fontSize: 10, fontWeight: '400', textAlign: 'center' },
  rowVal: { fontSize: 12, textAlign: 'center' },
  betterBadge: { fontSize: 9, color: '#00977D', fontWeight: '700' },
  addBtn: { flexDirection: 'row-reverse', gap: 4, alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
