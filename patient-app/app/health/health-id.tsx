// @ts-nocheck
// Patient health identity: only server-backed profile data; never local demo records.
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, ScrollView, TouchableOpacity, Share, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { useGuestGuard } from '../../src/hooks/useGuestGuard';
import { apiFetch } from '../../src/services/api';
import { AppText, IconButton } from '../../src/components/ui';

const asList = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  : [];

export default function HealthIDScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { isGuest, requireAuth } = useGuestGuard();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  if (isGuest) { requireAuth(); return null; }

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const data = await apiFetch<any>('/users/me/profile');
        if (mounted) setProfile(data || null);
      } catch {
        if (mounted) setLoadError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadProfile();
    return () => { mounted = false; };
  }, []);

  const allergies = useMemo(() => asList(profile?.allergies), [profile]);
  const conditions = useMemo(() => asList(profile?.chronic_conditions), [profile]);
  const emergencyContacts = useMemo(() => Array.isArray(profile?.emergency_contacts) ? profile.emergency_contacts : [], [profile]);
  const medications = useMemo(() => asList(profile?.current_medications), [profile]);
  const healthId = profile?.health_id || profile?.healthId || null;

  const handleShare = async () => {
    if (!healthId) return;
    try {
      await Share.share({
        message: `بطاقة الهوية الصحية — نبض بلس\n${profile?.full_name || ''}\n${healthId}`,
        title: 'بطاقتي الصحية',
      });
    } catch {}
  };

  const details = [
    { label: 'الجنس', value: profile?.gender, icon: 'user' },
    { label: 'الطول', value: profile?.height ? `${profile.height} سم` : null, icon: 'trending_up' },
    { label: 'الوزن', value: profile?.weight ? `${profile.weight} كجم` : null, icon: 'weight' },
    { label: 'فصيلة الدم', value: profile?.blood_type, icon: 'bloodtype' },
  ].filter((item) => item.value);

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />

      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {healthId ? <IconButton icon="share" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={handleShare} /> : null}
          </View>
          <AppText variant="h3" color={colors.textPrimary}>بطاقة هويتي الصحية</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 80 }]} showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator size="large" color={colors.primary} style={styles.loader} /> : null}
        {loadError ? <View style={[styles.notice, { backgroundColor: colors.errorSurface }]}><AppText variant="bodySM">تعذر تحميل البيانات الصحية. أعد المحاولة لاحقاً.</AppText></View> : null}

        {!loading && !loadError ? <>
          <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.idCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardLogo}><AppText variant="labelSM" color="#FFFFFF" style={{ fontWeight: '800' }}>نبض+</AppText></View>
              <AppText variant="caption" color="rgba(255,255,255,0.82)">بطاقة الهوية الصحية</AppText>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardAvatar}><Icon name="user" size={32} color="#FFFFFF" /></View>
              <View style={styles.cardUserInfo}>
                <AppText variant="h4" color="#FFFFFF" style={{ fontWeight: '800' }}>{profile?.full_name || 'الملف الصحي غير مكتمل'}</AppText>
                {profile?.blood_type ? <View style={styles.bloodTypeBadge}><AppText variant="labelSM" color="#FFFFFF">{profile.blood_type}</AppText></View> : null}
                {healthId ? <AppText variant="caption" color="rgba(255,255,255,0.82)">{healthId}</AppText> : <AppText variant="caption" color="rgba(255,255,255,0.82)">رمز الهوية الصحية غير صادر بعد</AppText>}
              </View>
            </View>
          </LinearGradient>

          <View style={[styles.criticalCard, { backgroundColor: colors.errorSurface }]}>
            <View style={styles.sectionTitle}><Icon name="warning" size={16} color={colors.error} /><AppText variant="bodySM">معلومات حرجة للطوارئ</AppText></View>
            <AppText variant="bodySM">الحساسية: {allergies.length ? allergies.join(', ') : 'لا توجد بيانات مسجلة'}</AppText>
            <AppText variant="bodySM">الأمراض المزمنة: {conditions.length ? conditions.join(', ') : 'لا توجد بيانات مسجلة'}</AppText>
          </View>

        {/* Profile Summary */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">البيانات الأساسية</AppText>
          {details.length ? details.map((r, i) => (
            <View key={i} style={[styles.dataRow, { borderBottomColor: colors.border } ]}>
              <AppText variant="bodySM">{r.value}</AppText>
              <View style={styles.dataLeft}>
                <Icon name={r.icon} size={16} color={colors.textTertiary} />
                <AppText variant="bodySM">{r.label}</AppText>
              </View>
            </View>
          )) : <AppText variant="bodySM" color={colors.textSecondary}>لا توجد بيانات أساسية مسجلة.</AppText>}
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
          {emergencyContacts.length ? emergencyContacts.map((contact, i) => (
            <View key={i} style={[styles.contactRow, { borderBottomColor: colors.border } ]}>
              <View style={[styles.callContactBtn, { backgroundColor: colors.secondarySurface }]}>
                <Icon name="call" size={16} color={colors.secondary} />
              </View>
              <View style={styles.contactInfo}>
                <AppText variant="bodySM">{contact.name || 'جهة اتصال'}</AppText>
                <AppText variant="bodySM">{[contact.relation, contact.phone].filter(Boolean).join(' • ')}</AppText>
              </View>
            </View>
          )) : <AppText variant="bodySM" color={colors.textSecondary}>لا توجد جهات طوارئ مسجلة.</AppText>}
        </View>

        {/* Current Medications summary */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Icon name="medication" size={18} color="#23B5CE" />
            <AppText variant="h6">الأدوية الحالية</AppText>
          </View>
          {medications.length ? medications.map((med, i) => (
            <View key={i} style={[styles.medBadge, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary } ]}>
              <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="medication" size={16} color={colors.primary} /><AppText variant="bodySM">{med}</AppText></View>
            </View>
          )) : <AppText variant="bodySM" color={colors.textSecondary}>لا توجد أدوية حالية مسجلة.</AppText>}
        </View>

        {/* Edit Button */}
        <TouchableOpacity
          onPress={() => router.push('/health/edit-profile')}
          style={[styles.editProfileBtn, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <Icon name="info" size={18} color={colors.primary} />
          <AppText variant="bodySM">تعديل البيانات الصحية</AppText>
        </TouchableOpacity>
        </> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  loader: { marginVertical: 48 },
  notice: { borderRadius: 16, padding: 16 },
  idCard: { borderRadius: 24, padding: 20 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardLogo: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  cardContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 16 },
  cardAvatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  cardUserInfo: { flex: 1, alignItems: 'flex-end', gap: 4 },
  bloodTypeBadge: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  criticalCard: { borderRadius: 18, padding: 14, gap: 6 },
  sectionTitle: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardSectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardSectionTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 10 },
  editLink: { fontSize: 13, fontWeight: '700' },
  dataRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1 },
  dataLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  contactRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  contactInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  callContactBtn: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  medBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 6 },
  editProfileBtn: { borderRadius: 18, padding: 16, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
});
