// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing as SP, BorderRadius as R } from '../../src/theme';
import { Icon as I } from '../../src/components/Icon';
import { LocalizedText } from '../../src/components/LocalizedText';

// Theme facade over the real design tokens (light palette — screen is static-styled)
const theme = {
  bg: Colors.light.background,
  surface: Colors.light.surface,
  border: Colors.light.border,
  text: Colors.light.textPrimary,
  textSub: Colors.light.textSecondary,
  primary: Colors.light.primary,
  success: Colors.light.success,
  successBg: Colors.light.successSurface,
  warning: Colors.light.warning,
  info: Colors.light.info,
};

export default function ActionableOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  // Parse payload pushed from the consultation end
  const payload = typeof params.payload === 'string' ? JSON.parse(params.payload) : {
    erx: [],
    labs: [],
    radiology: [],
    referral: null
  };

  const handleOrderMeds = () => {
    router.push('/(tabs)/pharmacy');
  };

  const handleBookLabs = () => {
    // M1-33: fixed broken route — /labs does not exist; labs live under /diagnostics
    router.push('/diagnostics/search');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <I name="arrow-right" size={24} color={theme.text} />
        </TouchableOpacity>
        <LocalizedText style={styles.headerTitle}>أوامر طبية قابلة للتنفيذ</LocalizedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.alertBox}>
          <I name="check-circle" size={24} color={theme.success} />
          <View style={{ flex: 1 }}>
            <LocalizedText style={styles.alertTitle}>انتهت الاستشارة بنجاح</LocalizedText>
            <LocalizedText style={styles.alertSub}>قام الطبيب بإصدار الأوامر الطبية التالية. يمكنك تنفيذها الآن مباشرة عبر منصة نبض.</LocalizedText>
          </View>
        </View>

        {/* E-Rx Section */}
        {payload.erx && payload.erx.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <I name="document" size={20} color={theme.primary} />
              <LocalizedText style={styles.sectionTitle}>الوصفة الطبية (E-Rx)</LocalizedText>
            </View>
            {payload.erx.map((med: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <I name="disc" size={16} color={theme.primary} />
                <View style={{ flex: 1, marginRight: SP.sm }}>
                  <LocalizedText style={styles.itemText}>{med.name}</LocalizedText>
                  <LocalizedText style={styles.itemSub}>{med.dosage} - {med.frequency}</LocalizedText>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.actionBtn} onPress={handleOrderMeds} disabled={loading}>
              <I name="shopping_cart" size={20} color="#fff" />
              <LocalizedText style={styles.actionBtnText}>اطلب الأدوية الآن (صيدلية نبض)</LocalizedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <I name="document" size={20} color={theme.textSub} />
              <LocalizedText style={[styles.sectionTitle, { color: theme.textSub }]}>لا توجد أدوية موصوفة</LocalizedText>
            </View>
          </View>
        )}

        {/* Labs Section */}
        {payload.labs && payload.labs.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <I name="pulse" size={20} color={theme.warning} />
              <LocalizedText style={styles.sectionTitle}>التحاليل الطبية (Labs)</LocalizedText>
            </View>
            {payload.labs.map((lab: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <I name="pulse" size={16} color={theme.warning} />
                <View style={{ flex: 1, marginRight: SP.sm }}>
                  <LocalizedText style={styles.itemText}>{lab.name}</LocalizedText>
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.warning }]} onPress={handleBookLabs} disabled={loading}>
              <I name="home" size={20} color="#fff" />
              <LocalizedText style={styles.actionBtnText}>حجز زيارة منزلية لسحب الدم</LocalizedText>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Radiology Section */}
        {payload.radiology && payload.radiology.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <I name="monitor" size={20} color={theme.info} />
              <LocalizedText style={styles.sectionTitle}>طلب أشعة (Radiology)</LocalizedText>
            </View>
            {payload.radiology.map((rad: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <I name="monitor" size={16} color={theme.info} />
                <View style={{ flex: 1, marginRight: SP.sm }}>
                  <LocalizedText style={styles.itemText}>{rad.name}</LocalizedText>
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.info }]} onPress={() => router.push('/diagnostics/search')}>
              <I name="location" size={20} color="#fff" />
              <LocalizedText style={styles.actionBtnText}>استعراض مراكز الأشعة</LocalizedText>
            </TouchableOpacity>
          </View>
        ) : null}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: SP.lg, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { padding: SP.xs },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text },
  content: { padding: SP.lg, paddingBottom: 100 },
  alertBox: { flexDirection: 'row-reverse', backgroundColor: theme.successBg, padding: SP.lg, borderRadius: R.md, marginBottom: SP.xl, alignItems: 'center', gap: SP.md },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: theme.success, textAlign: 'right' },
  alertSub: { fontSize: 14, color: theme.success, textAlign: 'right', marginTop: 4 },
  section: { backgroundColor: theme.surface, borderRadius: R.md, padding: SP.lg, marginBottom: SP.lg, borderWidth: 1, borderColor: theme.border },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: SP.sm, marginBottom: SP.md, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: SP.sm },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text },
  itemRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: SP.sm, borderBottomWidth: 1, borderBottomColor: theme.border },
  itemText: { fontSize: 14, fontWeight: 'bold', color: theme.text, textAlign: 'right' },
  itemSub: { fontSize: 12, color: theme.textSub, textAlign: 'right', marginTop: 2 },
  actionBtn: { flexDirection: 'row-reverse', backgroundColor: theme.primary, padding: SP.md, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', gap: SP.sm, marginTop: SP.lg },
  actionBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
