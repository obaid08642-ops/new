// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BorderRadius as R, Spacing as SP } from '../../src/theme';
import { useApp } from '../../src/context/AppContext';
import I from 'react-native-vector-icons/Feather';

export default function ActionableOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const { colors } = useApp();
  const theme = useMemo(() => ({
    bg: colors.bg,
    surface: colors.s,
    border: colors.bd,
    text: colors.n,
    textSub: colors.t2,
    primary: colors.p,
    success: colors.gr,
    successBg: colors.grs,
    warning: colors.am,
    info: colors.bl,
  }), [colors]);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const payload = useMemo(() => {
    if (typeof params.payload !== 'string') return { erx: [], labs: [], radiology: [], referral: null };
    try {
      const parsed = JSON.parse(params.payload);
      return {
        erx: Array.isArray(parsed.erx) ? parsed.erx : [],
        labs: Array.isArray(parsed.labs) ? parsed.labs : [],
        radiology: Array.isArray(parsed.radiology) ? parsed.radiology : [],
        referral: parsed.referral ?? null,
      };
    } catch {
      return { erx: [], labs: [], radiology: [], referral: null };
    }
  }, [params.payload]);

  const handleOrderMeds = () => {
    setLoading(true);
    router.push('/pharmacy');
    setLoading(false);
  };

  const handleBookLabs = () => {
    setLoading(true);
    router.push('/diagnostics');
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <I name="arrow-right" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>أوامر طبية قابلة للتنفيذ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.alertBox}>
          <I name="check-circle" size={24} color={theme.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>انتهت الاستشارة بنجاح</Text>
            <Text style={styles.alertSub}>قام الطبيب بإصدار الأوامر الطبية التالية. يمكنك تنفيذها الآن مباشرة عبر منصة نبض.</Text>
          </View>
        </View>

        {/* E-Rx Section */}
        {payload.erx && payload.erx.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <I name="file-text" size={20} color={theme.primary} />
              <Text style={styles.sectionTitle}>الوصفة الطبية (E-Rx)</Text>
            </View>
            {payload.erx.map((med: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <I name="disc" size={16} color={theme.primary} />
                <View style={{ flex: 1, marginRight: SP.sm }}>
                  <Text style={styles.itemText}>{med.name}</Text>
                  <Text style={styles.itemSub}>{med.dosage} - {med.frequency}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.actionBtn} onPress={handleOrderMeds} disabled={loading}>
              <I name="shopping-bag" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>اطلب الأدوية الآن (صيدلية نبض)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <I name="file-text" size={20} color={theme.textSub} />
              <Text style={[styles.sectionTitle, { color: theme.textSub }]}>لا توجد أدوية موصوفة</Text>
            </View>
          </View>
        )}

        {/* Labs Section */}
        {payload.labs && payload.labs.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <I name="activity" size={20} color={theme.warning} />
              <Text style={styles.sectionTitle}>التحاليل الطبية (Labs)</Text>
            </View>
            {payload.labs.map((lab: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <I name="activity" size={16} color={theme.warning} />
                <View style={{ flex: 1, marginRight: SP.sm }}>
                  <Text style={styles.itemText}>{lab.name}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.warning }]} onPress={handleBookLabs} disabled={loading}>
              <I name="home" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>حجز زيارة منزلية لسحب الدم</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Radiology Section */}
        {payload.radiology && payload.radiology.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <I name="monitor" size={20} color={theme.info} />
              <Text style={styles.sectionTitle}>طلب أشعة (Radiology)</Text>
            </View>
            {payload.radiology.map((rad: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <I name="monitor" size={16} color={theme.info} />
                <View style={{ flex: 1, marginRight: SP.sm }}>
                  <Text style={styles.itemText}>{rad.name}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.info }]} onPress={() => router.push('/diagnostics')} disabled={loading}>
              <I name="map-pin" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>استعراض المراكز القريبة</Text>
            </TouchableOpacity>
          </View>
        ) : null}

      </ScrollView>
    </View>
  );
}

const createStyles = (theme: {
  bg: string; surface: string; border: string; text: string; textSub: string;
  primary: string; success: string; successBg: string; warning: string; info: string;
}) => StyleSheet.create({
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
