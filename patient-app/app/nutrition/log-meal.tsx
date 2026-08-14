// @ts-nocheck
// app/nutrition/log-meal.tsx — Connected to POST /nutrition/meals
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { LocalizedTextInput as TextInput } from '@/components/LocalizedTextInput';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'الإفطار', icon: 'food', time: '8:00 ص' },
  { id: 'lunch', label: 'الغداء', icon: 'food', time: '1:00 م' },
  { id: 'dinner', label: 'العشاء', icon: 'moon', time: '7:00 م' },
  { id: 'snack', label: 'وجبة خفيفة', icon: 'food', time: 'أي وقت' },
];

// Foods fetched dynamically

export default function LogMealScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  
  const [mealType, setMealType] = useState('lunch');
  const [addedFoods, setAddedFoods] = useState<any[]>([]);
  const [commonFoods, setCommonFoods] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  React.useEffect(() => {
    apiFetch('/nutrition/foods')
      .then(res => setCommonFoods(Array.isArray(res) ? res : []))
      .catch(() => setCommonFoods([]));
  }, []);

  const addFood = (food: any) => {
    setAddedFoods(p => [...p, food]);
  };
  const removeFood = (i: number) => setAddedFoods(p => p.filter((_, idx) => idx !== i));

  const totalCal = addedFoods.reduce((s, f) => s + f.cal, 0);
  const totalProtein = addedFoods.reduce((s, f) => s + f.protein, 0);

  const handleSave = async () => {
    if (addedFoods.length === 0) return;
    setIsSaving(true);
    try {
      // Log each food as a meal entry
      await apiFetch('/nutrition/meals', {
        method: 'POST',
        body: JSON.stringify({
          name: addedFoods.map(f => f.name).join(' + '),
          meal_type: mealType,
          calories: totalCal,
          protein_g: totalProtein,
          carbs_g: addedFoods.reduce((s, f) => s + ((f as any).carbs ?? 0), 0),
          fat_g: addedFoods.reduce((s, f) => s + ((f as any).fat ?? 0), 0),
        }),
      });
      router.replace('/nutrition/daily-tracker');
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ الوجبة. تأكد من اتصالك بالإنترنت.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredFoods = commonFoods.filter(f => f.name.includes(search) || !search);

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? colors.surface : colors.white } ]}>
        <AppText variant="bodySM">تسجيل وجبة</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Meal type */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">نوع الوجبة</AppText>
          <View style={styles.mealTypesRow}>
            {MEAL_TYPES.map(m => (
              <TouchableOpacity key={m.id} onPress={() => setMealType(m.id)}
                style={[styles.mealTypeBtn, mealType === m.id && { backgroundColor: '#5BA84F', borderColor: '#5BA84F' } ]}>
                <AppText variant="bodySM">{m.icon}</AppText>
                <AppText variant="bodySM">{m.label}</AppText>
                <AppText variant="bodySM">{m.time}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Added foods */}
        {addedFoods.length > 0 && (
          <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            <View style={styles.cardHeader}>
              <View style={[styles.totalBadge, { backgroundColor: '#DCFCE7' } ]}>
                <AppText variant="bodySM">{totalCal} سعرة</AppText>
              </View>
              <AppText variant="bodySM">الأطعمة المضافة</AppText>
            </View>
            {addedFoods.map((food, i) => (
              <View key={i} style={[styles.addedFoodRow, { borderBottomColor: colors.border } ]}>
                <TouchableOpacity onPress={() => removeFood(i)} style={[styles.removeBtn, { backgroundColor: '#FEE2E2' } ]}>
                  <Icon name="trash" size={14} color="#F0695C" />
                </TouchableOpacity>
                <View style={styles.addedFoodInfo}>
                  <AppText variant="bodySM">{food.name}</AppText>
                  <AppText variant="bodySM">{food.cal} سعرة • {food.protein}جم بروتين • {food.per}</AppText>
                </View>
                <AppText variant="bodySM">{food.emoji}</AppText>
              </View>
            ))}
            <View style={[styles.totalRow, { borderTopColor: colors.border } ]}>
              <AppText variant="bodySM">{totalProtein}جم بروتين</AppText>
              <AppText variant="bodySM">{totalCal} سعرة حرارية</AppText>
            </View>
          </View>
        )}

        {/* Scan shortcut */}
        <TouchableOpacity onPress={() => router.push('/nutrition/food-scanner')}
          style={[styles.scanShortcut, { backgroundColor: isDark ? colors.surface : '#DCFCE7', borderColor: '#5BA84F40' } ]}>
          <AppText variant="bodySM">مسح الطعام بالكاميرا</AppText>
          <Icon name="camera" size={20} color="#5BA84F" />
        </TouchableOpacity>

        {/* Search & common foods */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">إضافة من القائمة</AppText>
          <View style={[styles.searchBox, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary, borderColor: colors.border } ]}>
            <Icon name="search" size={16} color={colors.textTertiary} />
            <TextInput style={[styles.searchInput, { color: colors.textPrimary }]} value={search} onChangeText={setSearch}
              placeholder="ابحث عن طعام..." placeholderTextColor={colors.textTertiary} textAlign="right" />
          </View>
          {filteredFoods.map((food, i) => (
            <TouchableOpacity key={i} onPress={() => addFood(food)}
              style={[styles.foodRow, { borderBottomColor: colors.border } ]}>
              <TouchableOpacity onPress={() => addFood(food)}
                style={[styles.addBtn, { backgroundColor: '#DCFCE7' } ]}>
                <Icon name="add" size={16} color="#5BA84F" />
              </TouchableOpacity>
              <View style={styles.foodInfo}>
                <AppText variant="bodySM">{food.name}</AppText>
                <AppText variant="bodySM">{food.cal} سعرة • {food.protein}جم بروتين • {food.per}</AppText>
              </View>
              <AppText variant="bodySM">{food.emoji}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8, backgroundColor: isDark ? colors.surface : colors.white } ]}>
        <TouchableOpacity onPress={handleSave} disabled={addedFoods.length === 0 || isSaving}
          activeOpacity={0.85} style={{ opacity: addedFoods.length === 0 ? 0.5 : 1 }}>
          <View style={styles.saveBtn}>
            <AppText variant="bodySM">
              {isSaving ? 'جاري الحفظ...' : ` حفظ الوجبة (${totalCal} سعرة)`}
            </AppText>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontSize: 17, fontWeight: '800' },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 12 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  mealTypesRow: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap' },
  mealTypeBtn: { borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', padding: 10, alignItems: 'center', gap: 3, minWidth: 80 },
  mealTypeIcon: { fontSize: 22 },
  mealTypeLabel: { fontSize: 11, fontWeight: '800' },
  mealTypeTime: { fontSize: 9, fontWeight: '400' },
  totalBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  totalBadgeText: { color: '#16A34A', fontSize: 12, fontWeight: '800' },
  addedFoodRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  addedFoodEmoji: { fontSize: 22 },
  addedFoodInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  addedFoodName: { fontSize: 13, fontWeight: '700' },
  addedFoodMeta: { fontSize: 10, fontWeight: '400' },
  removeBtn: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1 },
  totalCal: { fontSize: 15, fontFamily: 'Cairo-ExtraBold' },
  totalProtein: { fontSize: 13, fontWeight: '800' },
  scanShortcut: { borderRadius: 16, borderWidth: 1.5, padding: 14, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  scanShortcutText: { color: '#16A34A', fontSize: 14, fontWeight: '700' },
  searchBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, height: 42, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '400' },
  foodRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  foodInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  foodName: { fontSize: 13, fontWeight: '700' },
  foodMeta: { fontSize: 10, fontWeight: '400' },
  addBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12 },
  saveBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
