// @ts-nocheck
// app/mental-health/crisis-support.tsx — Connected to GET /mental-health/crisis-contacts
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

// Hotlines fetched dynamically

const SELF_HELP = [
  { title: 'تمارين التنفس', desc: 'أسرع تقنية لتهدئة الذعر الآن', icon: 'pulse', route: '/mental-health/breathing' },
  { title: 'التأمل الآني', desc: 'جلسة 5 دقائق للهدوء الفوري', icon: 'meditation', route: '/mental-health/meditation' },
  { title: 'كتابة المشاعر', desc: 'أخرج ما بداخلك قبل كل شيء', icon: 'document', route: '/mental-health/mood-journal' },
];

const SAFETY_STEPS = [
  'إذا كنت في خطر مباشر، اتصل بـ 998 أو 997 فوراً',
  'أخبر شخصاً تثق به بما تشعر به',
  'ابتعد عن أي أدوات أو مواد قد تسبب أذى',
  'اذهب لمكان آمن ومضاء',
  'لا تكن وحدك — الدعم متاح الآن',
];

export default function CrisisSupportScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [userContacts, setUserContacts] = useState<any[]>([]);
  const [hotlines, setHotlines] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/mental-health/crisis-contacts')
      .then((res: any) => setUserContacts(Array.isArray(res) ? res : res.contacts ?? []))
      .catch(() => {});
      
    apiFetch('/mental-health/hotlines')
      .then((res: any) => setHotlines(Array.isArray(res) ? res : []))
      .catch(() => {});
  }, []);

  const call = (number: string) => Linking.openURL(`tel:${number}`);

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM">دعم الأزمات</AppText>
          <View style={{ width: 36 }}/>
        </View>
        <View style={[styles.urgentBanner, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">إذا كنت في خطر فوري — اتصل بـ 998 الآن</AppText>
          <TouchableOpacity onPress={() => call('998')} style={styles.callEmergencyBtn}>
            <Icon name="call" size={18} color="#F0695C" />
            <AppText variant="bodySM">998</AppText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Safety steps */}
        <View style={[styles.safetyCard, { backgroundColor: '#FEF3C7' } ]}>
          <AppText variant="bodySM">خطوات الأمان الآن ️</AppText>
          {SAFETY_STEPS.map((step, i) => (
            <View key={i} style={styles.safetyStep}>
              <AppText variant="bodySM">{step}</AppText>
              <View style={[styles.stepNum, { backgroundColor: '#D97706' } ]}>
                <AppText variant="bodySM">{i + 1}</AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Hotlines */}
        <AppText variant="bodySM">خطوط المساعدة المتخصصة </AppText>
        {hotlines.map((line, i) => (
          <TouchableOpacity key={i} onPress={() => call(line.number)}
            style={[styles.hotlineCard, { backgroundColor: isDark ? colors.surface : colors.white }]}
            activeOpacity={0.85}>
            <TouchableOpacity onPress={() => call(line.number)}
              style={[styles.callBtn, { backgroundColor: line.color } ]}>
              <Icon name="call" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={styles.hotlineInfo}>
              <AppText variant="bodySM">{line.name}</AppText>
              <AppText variant="bodySM">{line.org}</AppText>
              <View style={styles.hotlineMeta}>
                <View style={[styles.availBadge, { backgroundColor: '#DCFCE7' } ]}>
                  <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="check" size={16} color={colors.primary} /><AppText variant="bodySM">{line.available}</AppText></View>
                </View>
                <AppText variant="bodySM">{line.number}</AppText>
              </View>
            </View>
            <AppText variant="bodySM">{line.emoji}</AppText>
          </TouchableOpacity>
        ))}

        {/* Personal contacts from backend */}
        {userContacts.length > 0 && (
          <>
            <AppText variant="bodySM">جهات الاتصال الشخصية الخاصة بك</AppText>
            {userContacts.map((c: any, i: number) => (
              <TouchableOpacity key={i} onPress={() => call(c.phone)}
                style={[styles.hotlineCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
                <TouchableOpacity onPress={() => call(c.phone)} style={[styles.callBtn, { backgroundColor: '#7A6BEA' } ]}>
                  <Icon name="call" size={18} color="#fff" />
                </TouchableOpacity>
                <View style={styles.hotlineInfo}>
                  <AppText variant="bodySM">{c.contact_name}</AppText>
                  <AppText variant="bodySM">{c.relationship || 'جهة اتصال'}</AppText>
                  <AppText variant="bodySM">{c.phone}</AppText>
                </View>

              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Self-help tools */}
        <AppText variant="bodySM">أدوات المساعدة الذاتية الآن ️</AppText>
        {SELF_HELP.map((tool, i) => (
          <TouchableOpacity key={i} onPress={() => router.push(tool.route as any)}
            style={[styles.toolCard, { backgroundColor: isDark ? colors.surface : colors.white }]}
            activeOpacity={0.85}>
            <Icon name="chevronRight" size={18} color={colors.textTertiary} />
            <View style={styles.toolInfo}>
              <AppText variant="bodySM">{tool.title}</AppText>
              <AppText variant="bodySM">{tool.desc}</AppText>
            </View>
            <AppText variant="bodySM">{tool.icon}</AppText>
          </TouchableOpacity>
        ))}

        {/* You are not alone */}
        <View style={[styles.notAloneCard, { backgroundColor: '#EEF2FF' } ]}>
          <AppText variant="bodySM">
             أنت لست وحدك. ما تشعر به حقيقي وهناك من يريد مساعدتك. الطلب للمساعدة شجاعة وليس ضعفاً.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' } as any,
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  urgentBanner: { borderRadius: 14, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  urgent: { color: '#DC2626', fontSize: 13, fontWeight: '800', flex: 1, textAlign: 'right' },
  callEmergencyBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: '#FEE2E2', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  callEmergency: { color: '#F0695C', fontSize: 16, fontFamily: 'Cairo-ExtraBold' } as any,
  safetyCard: { borderRadius: 18, padding: 16, gap: 8 },
  safetyTitle: { color: '#92400E', fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 4 },
  safetyStep: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  safetyStepAlt: { flex: 1, color: '#78350F', fontSize: 13, fontWeight: '400', textAlign: 'right', lineHeight: 20 },
  stepNum: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  stepNumAlt: { color: '#fff', fontSize: 11, fontWeight: '800' } as any,
  sectionTitle: { fontSize: 15, fontWeight: '800', textAlign: 'right' } as any,
  hotlineCard: { borderRadius: 18, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  hotlineEmoji: { fontSize: 28 } as any,
  hotlineInfo: { flex: 1, alignItems: 'flex-end', gap: 4 },
  hotlineName: { fontSize: 14, fontWeight: '800' } as any,
  hotlineOrg: { fontSize: 11, fontWeight: '400' } as any,
  hotlineMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  availBadge: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  avail: { color: '#16A34A', fontSize: 10, fontWeight: '700' } as any,
  hotlineNum: { fontSize: 15, fontFamily: 'Cairo-ExtraBold' } as any,
  callBtn: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  toolCard: { borderRadius: 16, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  toolIcon: { fontSize: 26 } as any,
  toolInfo: { flex: 1, alignItems: 'flex-end', gap: 3 },
  toolTitle: { fontSize: 14, fontWeight: '800' } as any,
  toolDesc: { fontSize: 12, fontWeight: '400' } as any,
  notAloneCard: { borderRadius: 16, padding: 16 },
  notAlone: { color: '#23B5CE', fontSize: 13, fontWeight: '400', textAlign: 'right', lineHeight: 22 } as any,
});
