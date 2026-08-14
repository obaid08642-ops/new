// @ts-nocheck
// app/nutrition/food-scanner.tsx
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

const DEFAULT_SCAN = {
  name: 'صدر دجاج مشوي',
  servingSize: '100 جم',
  calories: 165,
  protein: 31,
  carbs: 0,
  fat: 3.6,
  fiber: 0,
  sodium: 74,
  healthScore: 92,
  allergens: [],
  badge: 'صحي جداً',
  badgeColor: '#5BA84F',
  suggestion: 'مصدر ممتاز للبروتين، مناسب لكل الأهداف الغذائية',
};

export default function FoodScannerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [step, setStep] = useState<'camera' | 'scanning' | 'result'>('camera');
  const [qty, setQty] = useState(1);
  const [scanResult, setScanResult] = useState<any>(DEFAULT_SCAN);
  const [adding, setAdding] = useState(false);

  const handleScan = async () => {
    setStep('scanning');
    try {
      // Simulate food scanning request via backend AI analyzer
      const res = await apiFetch<any>('/ai/analyze-meal', {
        method: 'POST',
        body: JSON.stringify({ query: 'صدر دجاج مشوي مع أرز وسلطة' }),
      });
      setScanResult({
        name: res.name || 'صدر دجاج مشوي',
        servingSize: '150 جم',
        calories: res.calories || 165,
        protein: res.protein || 31,
        carbs: res.carbs || 0,
        fat: res.fat || 3.6,
        fiber: res.fiber || 0,
        sodium: 74,
        healthScore: res.healthScore ? res.healthScore * 10 : 90,
        allergens: [],
        badge: (res.healthScore || 8) >= 8 ? 'صحي جداً' : '️ تناول باعتدال',
        badgeColor: (res.healthScore || 8) >= 8 ? '#5BA84F' : '#F0A526',
        suggestion: res.suggestions?.[0] || 'وجبة مغذية غنية بالبروتينات والعناصر الهامة.',
      });
      setStep('result');
    } catch (e) {
      setScanResult(DEFAULT_SCAN);
      setStep('result');
    }
  };

  const addScannedMeal = async () => {
    setAdding(true);
    try {
      await apiFetch('/nutrition/meals', {
        method: 'POST',
        body: JSON.stringify({
          name: scanResult.name,
          calories: scanResult.calories * qty,
          protein_g: scanResult.protein * qty,
          carbs_g: scanResult.carbs * qty,
          fat_g: scanResult.fat * qty,
          fiber_g: scanResult.fiber * qty,
          meal_type: 'lunch',
        }),
      });
      router.push('/nutrition/daily-tracker');
    } catch (e) {
      router.push('/nutrition/daily-tracker');
    } finally {
      setAdding(false);
    }
  };


  if (step === 'scanning') {
    return (
      <View style={[{ flex: 1, backgroundColor: '#0A0E1A', justifyContent: 'center', alignItems: 'center', gap: 16 } ]}>

        <AppText variant="bodySM">جاري التعرف على الطعام...</AppText>
        <AppText variant="bodySM">الذكاء الاصطناعي يحلل الصورة</AppText>
      </View>
    );
  }

  if (step === 'result') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background } ]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">نتيجة الفحص</AppText>
          <TouchableOpacity onPress={() => setStep('camera')}>
            <Icon name="back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16, gap: 12, flex: 1 }}>
          <View style={[styles.resultHero, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            <View style={styles.resultLeft}>
              <AppText variant="bodySM">{scanResult.healthScore}</AppText>
              <AppText variant="bodySM">نقاط الصحة</AppText>
            </View>
            <View style={styles.resultRight}>
              <AppText variant="bodySM">{scanResult.name}</AppText>
              <AppText variant="bodySM">{scanResult.servingSize}</AppText>
              <View style={[styles.badge, { backgroundColor: scanResult.badgeColor + '20' } ]}>
                <AppText variant="bodySM">{scanResult.badge}</AppText>
              </View>
            </View>
          </View>

          <View style={[styles.macrosRow, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            {[
              { label: 'سعرة', val: scanResult.calories * qty, color: '#F0695C' },
              { label: 'بروتين', val: `${scanResult.protein * qty}جم`, color: '#23B5CE' },
              { label: 'كارب', val: `${scanResult.carbs * qty}جم`, color: '#F0A526' },
              { label: 'دهون', val: `${scanResult.fat * qty}جم`, color: '#7A6BEA' },
            ].map((m, i) => (
              <View key={i} style={styles.macroItem}>
                <AppText variant="bodySM">{m.val}</AppText>
                <AppText variant="bodySM">{m.label}</AppText>
              </View>
            ))}
          </View>

          <View style={[styles.qtyRow, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            <TouchableOpacity onPress={addScannedMeal} disabled={adding}
              style={[styles.logBtn, { backgroundColor: '#5BA84F' } ]}>
              <AppText variant="bodySM">{adding ? 'جاري الإضافة...' : `+ أضف للوجبة (${scanResult.calories * qty} سعرة)`}</AppText>
            </TouchableOpacity>
            <View style={styles.qtyControl}>
              <TouchableOpacity onPress={() => setQty(q => Math.max(1, q - 1))} style={[styles.qtyBtn, { backgroundColor: colors.border } ]}>
                <Icon name="remove" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
              <AppText variant="bodySM">{qty}</AppText>
              <TouchableOpacity onPress={() => setQty(q => q + 1)} style={[styles.qtyBtn, { backgroundColor: '#5BA84F20' } ]}>
                <Icon name="add" size={16} color="#5BA84F" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="info" size={16} color={colors.primary} /><AppText variant="bodySM">{scanResult.suggestion}</AppText></View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={StyleSheet.absoluteFillObject} />
      <View style={[styles.camHeader, { paddingTop: insets.top + 8 } ]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
          <Icon name="back" size={22} color="#fff" />
        </TouchableOpacity>
        <AppText variant="bodySM">مسح الطعام</AppText>
        <View style={{ width: 36 }}/>
      </View>
      <View style={styles.viewfinder}>
        <View style={styles.corner} /><View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} /><View style={[styles.corner, styles.cornerBR]} />
        <AppText variant="bodySM">صوّر الطعام أو الباركود</AppText>
      </View>
      <View style={[styles.camBottom, { paddingBottom: insets.bottom + 20 } ]}>
        <TouchableOpacity onPress={handleScan} style={styles.captureBtn}>
          <View style={styles.captureBtnInner} />
        </TouchableOpacity>
        <AppText variant="bodySM">اضغط للتصوير أو ارفع من المعرض</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontSize: 17, fontWeight: '800' },
  resultHero: { borderRadius: 18, padding: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  resultLeft: { alignItems: 'center', gap: 2 },
  healthScore: { fontSize: 36, fontFamily: 'Cairo-ExtraBold' },
  healthScoreLabel: { fontSize: 10, fontWeight: '400' },
  resultRight: { flex: 1, alignItems: 'flex-end', gap: 4, marginRight: 12 },
  foodName: { fontSize: 18, fontWeight: '800' },
  serving: { fontSize: 12, fontWeight: '400' },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  macrosRow: { borderRadius: 18, padding: 14, flexDirection: 'row-reverse', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  macroItem: { flex: 1, alignItems: 'center', gap: 3 },
  macroVal: { fontSize: 16, fontFamily: 'Cairo-ExtraBold' },
  macroLabel: { fontSize: 9, fontWeight: '400' },
  qtyRow: { borderRadius: 16, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  logBtn: { flex: 1, borderRadius: 12, height: 44, justifyContent: 'center', alignItems: 'center' },
  logBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  qtyControl: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  qtyNum: { fontSize: 16, fontWeight: '800', minWidth: 24, textAlign: 'center' },
  suggestion: { fontSize: 12, fontWeight: '400', textAlign: 'right', lineHeight: 18 },
  cameraContainer: { flex: 1, backgroundColor: '#0A0E1A' },
  camHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10, zIndex: 10 },
  camTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  viewfinder: { flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, top: '25%', left: '15%', borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#5BA84F' },
  cornerTR: { left: undefined, right: '15%', borderTopWidth: 3, borderLeftWidth: 0, borderRightWidth: 3, borderColor: '#5BA84F' },
  cornerBL: { top: undefined, bottom: '25%', left: '15%', borderTopWidth: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#5BA84F' },
  cornerBR: { top: undefined, bottom: '25%', left: undefined, right: '15%', borderTopWidth: 0, borderBottomWidth: 3, borderLeftWidth: 0, borderRightWidth: 3, borderColor: '#5BA84F' },
  scanHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '400', position: 'absolute', bottom: '20%' },
  camBottom: { alignItems: 'center', gap: 16, paddingTop: 20 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#5BA84F' },
  camHint: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '400' },
});
