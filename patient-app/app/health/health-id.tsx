// @ts-nocheck
// app/health/health-id.tsx — بطاقة الهوية الصحية (بيانات حقيقية من ملف المريض)
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Share, StatusBar, ActivityIndicator, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { useGuestGuard } from '../../src/hooks/useGuestGuard';
import { apiFetch } from '../../src/utils/api';
import { AppText, IconButton } from '../../src/components/ui';

function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const age = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return age >= 0 && age < 130 ? age : null;
}

export default function HealthIDScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { isGuest, requireAuth } = useGuestGuard();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [meds, setMeds] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [p, ec, cm] = await Promise.all([
          apiFetch('/users/me/profile').catch(() => null),
          apiFetch('/health/emergency-contacts').catch(() => []),
          apiFetch('/health/chronic-meds').catch(() => []),
        ]);
        setProfile(p || null);
        setContacts(Array.isArray(ec) ? ec : []);
        setMeds(Array.isArray(cm) ? cm : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Guests CAN view their health ID — device-bound guest account.

  const name = profile?.full_name || null;
  const dob = profile?.dob || null;
  const age = ageFromDob(dob);
  const bloodType = profile?.blood_type || null;
  const allergies: string[] = Array.isArray(profile?.allergies) ? profile.allergies : [];
  const conditions: string[] = Array.isArray(profile?.chronic_conditions)
    ? profile.chronic_conditions
    : (Array.isArray(profile?.chronic_diseases) ? profile.chronic_diseases : []);
  const gender = profile?.gender || null;
  const height = profile?.height ? `${profile.height} سم` : null;
  const weight = profile?.weight ? `${profile.weight} كجم` : null;
  const nationalId = profile?.national_id || null;
  const qrValue = nationalId ? `nabd:health-id:${nationalId}` : (profile?.user_id ? `nabd:patient:${profile.user_id}` : null);

  const handleShare = async () => {
    const lines = ['بطاقة الهوية الصحية — نبض بلس'];
    if (name) lines.push(name);
    if (bloodType) lines.push(`فصيلة الدم: ${bloodType}`);
    if (allergies.length) lines.push(`حساسية: ${allergies.join('، ')}`);
    const primary = contacts.find((c) => c.isPrimary) || contacts[0];
    if (primary?.phone) lines.push(`رقم الطوارئ: ${primary.phone}`);
    try {
      await Share.share({ message: lines.join('\n'), title: 'بطاقتي الصحية' });
    } catch (error) {
      // Share cancelled or not available
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="share" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={handleShare} />
          <AppText variant="h3" color={colors.textPrimary}>بطاقة هويتي الصحية</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 80 }]} showsVerticalScrollIndicator={false}>
        {/* Main ID Card */}
        <View style={[styles.idCard, { backgroundColor: '#1E3A5F' }]}>
          <View style={styles.cardShimmer1} />
          <View style={styles.cardShimmer2} />

          <View style={styles.cardHeader}>
            <View style={styles.cardLogo}>
              <AppText variant="labelSM" color="#00C9A7" style={{ fontWeight: '800' }}>نبض+</AppText>
            </View>
            <AppText variant="caption" color="rgba(255,255,255,0.7)" style={{ fontWeight: '600' }}>بطاقة الهوية الصحية</AppText>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardAvatar}>
              <Icon name="user" size={32} color="#fff" />
            </View>
            <View style={styles.cardUserInfo}>
              <AppText variant="h4" color="#fff" style={{ fontWeight: '800' }}>{name || 'أكمل ملفك الصحي'}</AppText>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <Icon name="calendar" size={16} color="#00C9A7" />
                <AppText variant="caption" color="rgba(255,255,255,0.7)">
                  {dob ? `${dob}${age !== null ? ` • ${age} سنة` : ''}` : 'تاريخ الميلاد غير مسجّل'}
                </AppText>
              </View>
              {bloodType && (
                <View style={styles.bloodTypeBadge}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                    <Icon name="bloodtype" size={16} color="#FCA5A5" />
                    <AppText variant="labelSM" color="#FCA5A5" style={{ fontWeight: '800' }}>{bloodType}</AppText>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* QR — encodes the patient's real national id / user id */}
          {qrValue && (
            <View style={styles.qrSection}>
              <View style={styles.qrBox}>
                <QRCode value={qrValue} size={72} color="#1E3A5F" backgroundColor="white" />
              </View>
              <View style={styles.qrInfo}>
                {nationalId && (
                  <AppText variant="caption" color="rgba(255,255,255,0.6)" style={{ fontWeight: '400' }}>{nationalId}</AppText>
                )}
                <AppText variant="caption" color="rgba(255,255,255,0.75)" style={{ fontWeight: '400' }}>رمز تعريفي لبياناتك الصحية</AppText>
                {(allergies.length > 0 || conditions.length > 0) && (
                  <View style={[styles.emergencyTag, { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }]}>
                    <Icon name="warning" size={14} color="#FCA5A5" />
                    <AppText variant="labelSM" color="#FCA5A5" style={{ fontWeight: '800' }}>بطاقة طوارئ</AppText>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Critical Info — only real recorded data */}
        {(allergies.length > 0 || conditions.length > 0) && (
          <View style={[styles.criticalCard, { backgroundColor: '#FEE2E2' }]}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <Icon name="warning" size={16} color="#B91C1C" />
              <AppText variant="bodySM" color="#B91C1C" style={{ fontWeight: '800' }}>معلومات حرجة للطوارئ</AppText>
            </View>
            {allergies.length > 0 && (
              <View style={styles.criticalRow}>
                <AppText variant="bodySM">{allergies.join('، ')}</AppText>
                <AppText variant="bodySM" style={{ fontWeight: '700' }}>حساسية:</AppText>
              </View>
            )}
            {conditions.length > 0 && (
              <View style={styles.criticalRow}>
                <AppText variant="bodySM">{conditions.join('، ')}</AppText>
                <AppText variant="bodySM" style={{ fontWeight: '700' }}>أمراض مزمنة:</AppText>
              </View>
            )}
          </View>
        )}

        {/* Profile Summary */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white }]}>
          <AppText variant="bodySM" style={{ fontWeight: '800', marginBottom: 4 }}>البيانات الأساسية</AppText>
          {[
            { label: 'الجنس', value: gender, icon: 'user' },
            { label: 'الطول', value: height, icon: 'trending_up' },
            { label: 'الوزن', value: weight, icon: 'weight' },
            { label: 'فصيلة الدم', value: bloodType, icon: 'bloodtype' },
          ].map((r, i) => (
            <View key={i} style={[styles.dataRow, { borderBottomColor: colors.border }]}>
              <AppText variant="bodySM" color={r.value ? colors.textPrimary : colors.textTertiary}>{r.value || '—'}</AppText>
              <View style={styles.dataLeft}>
                <Icon name={r.icon} size={16} color={colors.textTertiary} />
                <AppText variant="bodySM" color={colors.textSecondary}>{r.label}</AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Emergency Contacts */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white }]}>
          <View style={styles.cardSectionHeader}>
            <TouchableOpacity onPress={() => router.push('/health/emergency-contacts')}>
              <AppText variant="bodySM" color={colors.primary}>إدارة</AppText>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <Icon name="call" size={18} color="#F0A526" />
              <AppText variant="h6">جهات الطوارئ</AppText>
            </View>
          </View>
          {contacts.length === 0 ? (
            <AppText variant="bodySM" color={colors.textTertiary}>لم تُضف جهات طوارئ بعد</AppText>
          ) : contacts.map((contact, i) => (
            <View key={contact.id || i} style={[styles.contactRow, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.callContactBtn, { backgroundColor: colors.secondarySurface }]}
                onPress={() => contact.phone && Linking.openURL(`tel:${contact.phone}`)}>
                <Icon name="call" size={16} color={colors.secondary} />
              </TouchableOpacity>
              <View style={styles.contactInfo}>
                <AppText variant="bodySM" style={{ fontWeight: '700' }}>{contact.name}</AppText>
                <AppText variant="bodySM" color={colors.textSecondary}>
                  {[contact.relation, contact.phone].filter(Boolean).join(' • ')}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Current Medications */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white }]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Icon name="medication" size={18} color="#23B5CE" />
            <AppText variant="h6">الأدوية المزمنة</AppText>
          </View>
          {meds.length === 0 ? (
            <AppText variant="bodySM" color={colors.textTertiary}>لا توجد أدوية مزمنة مسجّلة</AppText>
          ) : meds.map((med, i) => (
            <View key={med.id || i} style={[styles.medBadge, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary }]}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <Icon name="medication" size={16} color={colors.primary} />
                <AppText variant="bodySM">{[med.name, med.dose].filter(Boolean).join(' — ')}</AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Edit Button */}
        <TouchableOpacity
          onPress={() => router.push('/health/edit-profile')}
          style={[styles.editProfileBtn, { backgroundColor: isDark ? colors.surface : colors.white }]}>
          <Icon name="info" size={18} color={colors.primary} />
          <AppText variant="bodySM" color={colors.primary} style={{ fontWeight: '700' }}>تعديل البيانات الصحية</AppText>
        </TouchableOpacity>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  idCard: { borderRadius: 24, padding: 20, overflow: 'hidden', position: 'relative' },
  cardShimmer1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)', top: -60, left: -40 },
  cardShimmer2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(0,201,167,0.06)', bottom: -30, right: -20 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardLogo: { backgroundColor: 'rgba(0,201,167,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,201,167,0.3)' },
  cardContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 16 },
  cardAvatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  cardUserInfo: { flex: 1, alignItems: 'flex-end', gap: 4 },
  bloodTypeBadge: { backgroundColor: '#F0695C30', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#F0695C60' },
  qrSection: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  qrBox: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: 8 },
  qrInfo: { flex: 1, alignItems: 'flex-end', gap: 4 },
  emergencyTag: { backgroundColor: '#F0695C30', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#F0695C60' },
  criticalCard: { borderRadius: 18, padding: 14, gap: 6 },
  criticalRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardSectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dataRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1 },
  dataLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  contactRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  contactInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  callContactBtn: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  medBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 6 },
  editProfileBtn: { borderRadius: 18, padding: 16, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
});
