// @ts-nocheck
// app/maternity/baby-growth.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge } from '../../src/components/ui';
import Svg, { Path, Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { apiFetch } from '../../src/utils/api';
import { BlurView } from 'expo-blur';

// Arabic number helper
const ar = (num: number | string) => {
  const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, w => arabicNums[+w]);
};

export default function BabyGrowthScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [vaccines, setVaccines] = useState<any[]>([]);

  const [growthData, setGrowthData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newGrowth, setNewGrowth] = useState({ month: '', weight: '', height: '', head: '' });
  const [savingGrowth, setSavingGrowth] = useState(false);

  const handleSaveGrowth = async () => {
    if (!newGrowth.month) {
      alert('الرجاء إدخال عمر الطفل بالأشهر');
      return;
    }
    try {
      setSavingGrowth(true);
      const res = await apiFetch('/maternity/infant-growth', {
        method: 'POST',
        body: JSON.stringify({
          month: Number(newGrowth.month),
          weight_kg: Number(newGrowth.weight) || undefined,
          height_cm: Number(newGrowth.height) || undefined,
          head_circ_cm: Number(newGrowth.head) || undefined,
        })
      });
      if (res) {
        setGrowthData(res.infant_growth.sort((a: any, b: any) => b.month - a.month));
        setShowAddModal(false);
        setNewGrowth({ month: '', weight: '', height: '', head: '' });
      }
    } catch(err) {
      console.log(err);
    } finally {
      setSavingGrowth(false);
    }
  };


  React.useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/maternity/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.infant_growth) {
          setGrowthData(data.infant_growth.sort((a: any, b: any) => b.month - a.month));
        }
        if (data.vaccines) {
          setVaccines(data.vaccines);
        }
      }
      
      // Attempt to fetch vaccines from specific endpoint if not in profile
      const vacRes = await apiFetch('/maternity/vaccines').catch(() => null);
      if (vacRes && Array.isArray(vacRes)) {
        setVaccines(vacRes);
      } else if (vacRes?.data && Array.isArray(vacRes.data)) {
        setVaccines(vacRes.data);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVaccine = (index: number) => {
    const updated = [...vaccines];
    updated[index].done = !updated[index].done;
    setVaccines(updated);
  };

  const cardBg = isDark ? colors.surface : colors.white;
  const adaptivePinkBg = isDark ? '#4D0E2B' : '#FDF2F8';

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="h5" color="#fff">نمو وتطعيمات الطفل</AppText>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.hBtn}>
            <Icon name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Baby stats banner */}
        <View style={[styles.statsBanner, { backgroundColor: 'rgba(255,255,255,0.12)' } ]}>
          <View style={styles.statItem}>
            <AppText variant="h2" color="#FFF">{growthData.length > 0 ? ar(growthData[0].weight_kg) : ar(8.2)}</AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.8)">الوزن (كجم)</AppText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={styles.statItem}>
            <AppText variant="h2" color="#FFF">{growthData.length > 0 ? ar(growthData[0].height_cm) : ar(68)}</AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.8)">الطول (سم)</AppText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={styles.statItem}>
            <AppText variant="h2" color="#FFF">{growthData.length > 0 ? ar(growthData[0].month) : ar(7)}</AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.8)">العمر (أشهر)</AppText>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* Growth Curve Chart */}
        <Card style={{ backgroundColor: cardBg }}>
          <AppText variant="h6" style={styles.cardTitle}>منحنى نمو الطفل (الوزن)</AppText>
          
          <View style={styles.chartWrapper}>
            
            {/* Custom SVG Line Chart */}
            <Svg viewBox="0 0 300 130" style={styles.chartSvg}>
              {/* Grid Lines */}
              <Line x1="40" y1="10" x2="280" y2="10" stroke={colors.border} strokeWidth="1" strokeDasharray="3 3" />
              <Line x1="40" y1="40" x2="280" y2="40" stroke={colors.border} strokeWidth="1" strokeDasharray="3 3" />
              <Line x1="40" y1="70" x2="280" y2="70" stroke={colors.border} strokeWidth="1" strokeDasharray="3 3" />
              <Line x1="40" y1="100" x2="280" y2="100" stroke={colors.border} strokeWidth="1" strokeDasharray="3 3" />

              {/* Standard Percentile Curve (Light pink dashed) */}
              <Path 
                d="M 40 100 Q 120 70 200 45 T 280 20" 
                fill="none" 
                stroke="#EC4899" 
                strokeWidth="2" 
                strokeDasharray="4 4" 
                opacity="0.4"
              />

              {/* Baby's Actual Growth Curve (Solid pink) */}
              {growthData.length > 0 && (
                <>
                  <Path 
                    d={growthData.sort((a,b)=>a.month-b.month).reduce((acc, pt, i) => {
                      const cx = 40 + Math.min(pt.month / 24, 1) * 240;
                      const cy = 100 - Math.min((pt.weight_kg || 0) / 12, 1) * 90;
                      return acc + (i === 0 ? `M ${cx} ${cy}` : ` L ${cx} ${cy}`);
                    }, "")}
                    fill="none" 
                    stroke="#EC4899" 
                    strokeWidth="3.5" 
                  />
                  {growthData.map((pt, i) => {
                    const cx = 40 + Math.min(pt.month / 24, 1) * 240;
                    const cy = 100 - Math.min((pt.weight_kg || 0) / 12, 1) * 90;
                    return (
                      <Circle key={i} cx={cx} cy={cy} r="4.5" fill="#EC4899" stroke="#FFF" strokeWidth={1.5} />
                    );
                  })}
                </>
              )}

              {/* Chart Labels */}
              <G>
                {/* Y-Axis weights */}
                <SvgText x="10" y="12" fontSize="10" fill="#9CA3AF">{ar(12)}</SvgText>
                <SvgText x="10" y="42" fontSize="10" fill="#9CA3AF">{ar(8)}</SvgText>
                <SvgText x="10" y="72" fontSize="10" fill="#9CA3AF">{ar(4)}</SvgText>
                <SvgText x="10" y="102" fontSize="10" fill="#9CA3AF">{ar(0)}</SvgText>
              </G>
            </Svg>


            
            {/* X-Axis ages */}
            <View style={styles.xAxisRow}>
              <AppText variant="caption" color={colors.textTertiary}>{ar(24)} ش</AppText>
              <AppText variant="caption" color={colors.textTertiary}>{ar(18)} ش</AppText>
              <AppText variant="caption" color={colors.textTertiary}>{ar(12)} ش</AppText>
              <AppText variant="caption" color={colors.textTertiary}>{ar(6)} ش</AppText>
              <AppText variant="caption" color={colors.textTertiary}>0</AppText>
            </View>

          </View>

          {/* Chart Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EC4899', borderRadius: 1 }]} />
              <AppText variant="caption" color={colors.textSecondary}>منحنى طفلك</AppText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EC4899', opacity: 0.4 }]} />
              <AppText variant="caption" color={colors.textSecondary}>المعدل الطبيعي العالمي</AppText>
            </View>
          </View>
        </Card>

        {/* Vaccines Timeline Card */}
        <Card style={{ backgroundColor: cardBg }}>
          <AppText variant="h6" style={styles.cardTitle}>جدول ومواعيد التطعيمات</AppText>
          
          <View style={styles.vaccineTimeline}>
            {vaccines.map((v, i) => (
              <View key={i} style={styles.vaccineRow}>
                {/* Connecting Line */}
                {i < vaccines.length - 1 && (
                  <View 
                    style={[
                      styles.timelineLine, 
                      { backgroundColor: v.done ? '#EC4899' : colors.border }
                    ]} />
                )}

                {/* Circle Checkmark Button */}
                <TouchableOpacity 
                  onPress={() => handleToggleVaccine(i)}
                  style={[
                    styles.timelineCircle, 
                    { 
                      backgroundColor: v.done ? '#EC4899' : isDark ? colors.backgroundSecondary : '#F1F5F9',
                      borderColor: v.done ? '#EC4899' : colors.border
                    } ]}>
                  {v.done ? (
                    <Icon name="check" size={14} color="#FFF" />
                  ) : (
                    <View style={[styles.todoDot, { backgroundColor: colors.textTertiary }]} />
                  )}
                </TouchableOpacity>

                {/* Text Details */}
                <View style={styles.vaccineDetails}>
                  <AppText variant="bodySM" style={{ fontWeight: '800' }}>{v.name}</AppText>
                  <AppText variant="caption" color={colors.textSecondary}>{v.date}</AppText>
                </View>

                {/* Age Badge */}
                <Badge label={v.age} color={v.done ? '#FFF' : '#EC4899'} bg={v.done ? '#EC4899' : adaptivePinkBg} />
              </View>
            ))}
          </View>
        </Card>

        {/* Doctor Consult CTA */}
        <View style={[styles.ctaBox, { backgroundColor: adaptivePinkBg } ]}>
          <View style={styles.ctaTextContainer}>
            <AppText variant="labelLG" color={isDark ? '#FFF' : '#9D174D'} style={{ fontWeight: '800' }}>هل لديك استفسار عن نمو طفلك؟</AppText>
            <AppText variant="caption" color={isDark ? '#FBCFE8' : '#BE185D'}>احجز استشارة فورية مع طبيب أطفال متخصص للاطمئنان.</AppText>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/consultations')}
            style={[styles.ctaBtn, { backgroundColor: isDark ? '#EC4899' : '#9D174D' } ]}>
            <AppText variant="caption" color="#FFF" style={{ fontWeight: '800' }}>تحدث مع طبيب</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    
      {/* Add Growth Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <AppText variant="h6" style={{ fontWeight: '800' }}>تسجيل قياس جديد</AppText>
              <View style={{ width: 24 }}/>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputWrap}>
                <AppText variant="caption" color={colors.textSecondary}>العمر (أشهر) *</AppText>
                <TextInput 
                  style={[styles.inputField, { backgroundColor: isDark ? colors.backgroundSecondary : '#F8FAFC', color: colors.textPrimary }]}
                  keyboardType="numeric"
                  value={newGrowth.month}
                  onChangeText={(t) => setNewGrowth({...newGrowth, month: t})}
                  placeholder="مثال: 6"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <View style={styles.inputWrap}>
                <AppText variant="caption" color={colors.textSecondary}>الوزن (كجم)</AppText>
                <TextInput 
                  style={[styles.inputField, { backgroundColor: isDark ? colors.backgroundSecondary : '#F8FAFC', color: colors.textPrimary }]}
                  keyboardType="decimal-pad"
                  value={newGrowth.weight}
                  onChangeText={(t) => setNewGrowth({...newGrowth, weight: t})}
                  placeholder="مثال: 7.5"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <View style={styles.inputWrap}>
                <AppText variant="caption" color={colors.textSecondary}>الطول (سم)</AppText>
                <TextInput 
                  style={[styles.inputField, { backgroundColor: isDark ? colors.backgroundSecondary : '#F8FAFC', color: colors.textPrimary }]}
                  keyboardType="numeric"
                  value={newGrowth.height}
                  onChangeText={(t) => setNewGrowth({...newGrowth, height: t})}
                  placeholder="مثال: 65"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <View style={styles.inputWrap}>
                <AppText variant="caption" color={colors.textSecondary}>محيط الرأس (سم)</AppText>
                <TextInput 
                  style={[styles.inputField, { backgroundColor: isDark ? colors.backgroundSecondary : '#F8FAFC', color: colors.textPrimary }]}
                  keyboardType="numeric"
                  value={newGrowth.head}
                  onChangeText={(t) => setNewGrowth({...newGrowth, head: t})}
                  placeholder="مثال: 42"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <TouchableOpacity 
              onPress={handleSaveGrowth}
              disabled={savingGrowth}
              style={[styles.saveBtn, savingGrowth && { opacity: 0.7 } ]}>
              <AppText variant="bodySM" color="#FFF" style={{ fontWeight: '800' }}>
                {savingGrowth ? 'جاري الحفظ...' : 'حفظ القياس'}
              </AppText>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
</View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  
  statsBanner: { flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 6 },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 36 },

  cardTitle: { fontWeight: '800', textAlign: 'right', marginBottom: 14 },
  
  // Chart styles
  chartWrapper: { width: '100%', alignItems: 'center', marginVertical: 8 },
  chartSvg: { width: '100%', height: 130 },
  axisText: { position: 'absolute', fontSize: 10, fontWeight: '400', color: '#9CA3AF' },
  xAxisRow: { flexDirection: 'row', justifyContent: 'space-between', width: '80%', marginTop: 6, marginLeft: 20 },
  
  legendRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 18, marginTop: 12 },
  legendItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 4 },

  // Vaccine Timeline styles
  vaccineTimeline: { marginVertical: 6 },
  vaccineRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 12, position: 'relative' },
  timelineLine: { position: 'absolute', right: 16, top: 40, width: 2, height: '70%', zIndex: 0 },
  timelineCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  todoDot: { width: 8, height: 8, borderRadius: 4 },
  vaccineDetails: { flex: 1, alignItems: 'flex-end', gap: 2 },

  // CTA Box styles
  ctaBox: { borderRadius: 20, padding: 16, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  ctaTextContainer: { flex: 1, alignItems: 'flex-end', gap: 4 },
  ctaBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },

  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalBody: { gap: 14, marginBottom: 24 },
  inputWrap: { gap: 6, alignItems: 'flex-end' },
  inputField: { width: '100%', height: 48, borderRadius: 12, paddingHorizontal: 16, textAlign: 'right', fontFamily: 'Cairo-Regular', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  saveBtn: { backgroundColor: '#EC4899', height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

});
