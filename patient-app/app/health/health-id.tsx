// @ts-nocheck
// app/health/health-id.tsx
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Share, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { useGuestGuard } from '../../src/hooks/useGuestGuard';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

export default function HealthIDScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { isGuest, requireAuth } = useGuestGuard();
  if (isGuest) { requireAuth(); return null; }
  
  

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'بطاقة الهوية الصحية — نبض بلس\nأحمد محمد العتيبي\nفصيلة الدم: O+\nحساسية: بنسلين\nرقم الطوارئ: 0501234567',
        title: 'بطاقتي الصحية',
      });
    } catch (error) {
      // Share cancelled or not available
    }
  };

  const ALLERGIES = ['بنسلين', 'سلفا'];
  const CONDITIONS = ['ضغط الدم', 'السكري النوع الثاني'];
  const EMERGENCY_CONTACTS = [
    { name: 'سارة العتيبي', relation: 'زوجة', phone: '0501234567' },
    { name: 'عبدالله العتيبي', relation: 'أخ', phone: '0507654321' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />

      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconButton icon="share" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={handleShare} />
            <IconButton icon="download" bg={colors.surfaceSecondary} color={colors.textPrimary} />
          </View>
          <AppText variant="h3" color={colors.textPrimary}>بطاقة هويتي الصحية</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 80 }]} showsVerticalScrollIndicator={false}>
        {/* Main ID Card */}
        <View
          style={styles.idCard}
        >
          {/* Card shimmer lines */}
          <View style={styles.cardShimmer1} />
          <View style={styles.cardShimmer2} />

          <View style={styles.cardHeader}>
            <View style={styles.cardLogo}>
              <AppText variant="labelSM" color="#00C9A7" style={{ fontWeight: '800' }}>نبض+</AppText>
            </View>
            <AppText variant="caption" color="rgba(255,255,255,0.7)" style={{ fontWeight: '600' }}>بطاقة الهوية الصحية</AppText>
          </View>

          <View style={styles.cardContent}>
            {/* Avatar + name */}
            <View style={styles.cardAvatar}>
              <Icon name="user" size={32} color="#fff" />
            </View>
            <View style={styles.cardUserInfo}>
              <AppText variant="h4" color="#fff" style={{ fontWeight: '800' }}>أحمد محمد العتيبي</AppText>
              <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="calendar" size={16} color={colors.primary} /><AppText variant="caption" color="rgba(255,255,255,0.7)">1 يناير 1990 • 34 سنة</AppText></View>
              <View style={styles.bloodTypeBadge}>
                <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="bloodtype" size={16} color="#FCA5A5" /><AppText variant="labelSM" color="#FCA5A5" style={{ fontWeight: '800' }}>O+</AppText></View>
              </View>
            </View>
          </View>

          {/* QR Code placeholder */}
          <View style={styles.qrSection}>
            <View style={styles.qrBox}>
              {/* Simulated QR pattern */}
              {[...Array(5)].map((_, i) => (
                <View key={i} style={styles.qrRow}>
                  {[...Array(5)].map((_, j) => (
                    <View key={j} style={[styles.qrCell, { backgroundColor: (i + j) % 2 === 0 ? '#1E3A5F' : 'transparent' }]} />
                  ))}
                </View>
              ))}
            </View>
            <View style={styles.qrInfo}>
              <AppText variant="caption" color="rgba(255,255,255,0.6)" style={{ fontWeight: '400' }}>#NP-2024-001847</AppText>
              <AppText variant="caption" color="rgba(255,255,255,0.75)" style={{ fontWeight: '400' }}>امسح للبيانات الطبية الكاملة</AppText>
              <View style={[styles.emergencyTag, { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 } ]}>
                <Icon name="warning" size={14} color="#FCA5A5" />
                <AppText variant="labelSM" color="#FCA5A5" style={{ fontWeight: '800' }}>بطاقة طوارئ</AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Critical Info */}
        <View style={[styles.criticalCard, { backgroundColor: '#FEE2E2' } ]}>
          <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="warning" size={16} color={colors.primary} /><AppText variant="bodySM">معلومات حرجة للطوارئ</AppText></View>
          <View style={styles.criticalRow}>
            <AppText variant="bodySM">{ALLERGIES.join(', ')}</AppText>
            <AppText variant="bodySM">حساسية: </AppText>
          </View>
          <View style={styles.criticalRow}>
            <AppText variant="bodySM">{CONDITIONS.join(', ')}</AppText>
            <AppText variant="bodySM">أمراض مزمنة: </AppText>
          </View>
        </View>

        {/* Profile Summary */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">البيانات الأساسية</AppText>
          {[
            { label: 'الجنس', value: 'ذكر', icon: 'user' },
            { label: 'الطول', value: '186 سم', icon: 'trending_up' },
            { label: 'الوزن', value: '78 كجم', icon: 'weight' },
            { label: 'فصيلة الدم', value: 'O+', icon: 'bloodtype' },
          ].map((r, i) => (
            <View key={i} style={[styles.dataRow, { borderBottomColor: colors.border } ]}>
              <AppText variant="bodySM">{r.value}</AppText>
              <View style={styles.dataLeft}>
                <AppText variant="bodySM">{r.icon}</AppText>
                <AppText variant="bodySM">{r.label}</AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Emergency Contacts */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <View style={styles.cardSectionHeader}>
            <TouchableOpacity onPress={() => router.push('/health/emergency-contacts')}>
              <AppText variant="bodySM" color={colors.primary}>تعديل</AppText>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <Icon name="call" size={18} color="#F0A526" />
              <AppText variant="h6">جهات الطوارئ</AppText>
            </View>
          </View>
          {EMERGENCY_CONTACTS.map((contact, i) => (
            <View key={i} style={[styles.contactRow, { borderBottomColor: colors.border } ]}>
              <TouchableOpacity style={[styles.callContactBtn, { backgroundColor: colors.secondarySurface } ]}>
                <Icon name="call" size={16} color={colors.secondary} />
              </TouchableOpacity>
              <View style={styles.contactInfo}>
                <AppText variant="bodySM">{contact.name}</AppText>
                <AppText variant="bodySM">{contact.relation} • {contact.phone}</AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Current Medications summary */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Icon name="medication" size={18} color="#23B5CE" />
            <AppText variant="h6">الأدوية الحالية</AppText>
          </View>
          {['ميتفورمين 500mg', 'أتورفاستاتين 20mg', 'فيتامين D3 2000IU'].map((med, i) => (
            <View key={i} style={[styles.medBadge, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary } ]}>
              <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="medication" size={16} color={colors.primary} /><AppText variant="bodySM">{med}</AppText></View>
            </View>
          ))}
        </View>

        {/* Edit Button */}
        <TouchableOpacity
          onPress={() => router.push('/health/edit-profile')}
          style={[styles.editProfileBtn, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <Icon name="info" size={18} color={colors.primary} />
          <AppText variant="bodySM">تعديل البيانات الصحية</AppText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  headerBtns: { flexDirection: 'row', gap: 8 },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 12 },
  idCard: { borderRadius: 24, padding: 20, overflow: 'hidden', position: 'relative' },
  cardShimmer1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)', top: -60, left: -40 },
  cardShimmer2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(0,201,167,0.06)', bottom: -30, right: -20 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardLogo: { backgroundColor: 'rgba(0,201,167,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,201,167,0.3)' },
  cardTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  cardContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 16 },
  cardAvatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  cardUserInfo: { flex: 1, alignItems: 'flex-end', gap: 4 },
  cardName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cardDOB: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '400' },
  bloodTypeBadge: { backgroundColor: '#F0695C30', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#F0695C60' },
  bloodTypeText: { color: '#FCA5A5', fontSize: 12, fontWeight: '800' },
  qrSection: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  qrBox: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 8 },
  qrRow: { flexDirection: 'row', gap: 2, marginBottom: 2 },
  qrCell: { width: 8, height: 8, borderRadius: 1 },
  qrInfo: { flex: 1, alignItems: 'flex-end', gap: 4 },
  qrIdNum: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '400' },
  qrScan: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '400' },
  emergencyTag: { backgroundColor: '#F0695C30', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#F0695C60' },
  emergencyTagText: { color: '#FCA5A5', fontSize: 11, fontWeight: '800' },
  criticalCard: { borderRadius: 18, padding: 14, gap: 6 },
  criticalTitle: { color: '#B91C1C', fontSize: 13, fontWeight: '800', textAlign: 'right' },
  criticalRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  criticalLabel: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
  criticalVal: { color: '#7F1D1D', fontSize: 12, fontWeight: '400' },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardSectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardSectionTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 10 },
  editLink: { fontSize: 13, fontWeight: '700' },
  dataRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1 },
  dataLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  dataIcon: { fontSize: 16 },
  dataLabel: { fontSize: 13, fontWeight: '400' },
  dataVal: { fontSize: 14, fontWeight: '700' },
  contactRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  contactInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  contactName: { fontSize: 13, fontWeight: '800' },
  contactRelation: { fontSize: 11, fontWeight: '400' },
  callContactBtn: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  medBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 6 },
  medBadgeText: { fontSize: 13, fontWeight: '400', textAlign: 'right' },
  editProfileBtn: { borderRadius: 18, padding: 16, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  editProfileText: { fontSize: 15, fontWeight: '800' },
});
