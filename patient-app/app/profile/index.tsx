// @ts-nocheck
// app/profile/index.tsx — الملف الشخصي
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../src/store/slices/authSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, Avatar } from '../../src/components/ui';
import { useGuestGuard } from '../../src/hooks/useGuestGuard';
import { apiFetch } from '../../src/utils/api';

const MENU: { icon: IconName; label: string; route: string; color: string; badge?: string }[] = [
  { icon: 'favorite', label: 'صحتي', route: '/(tabs)/health', color: '#E11D48' },
  { icon: 'medication', label: 'أدويتي', route: '/health/medications', color: '#16A34A' },
  { icon: 'prescriptions', label: 'وصفاتي', route: '/health/prescriptions', color: '#7A6BEA' },
  { icon: 'document', label: 'تقاريري', route: '/health/reports', color: '#F0A526' },
  { icon: 'calendar', label: 'مواعيدي', route: '/consultations/appointments', color: '#0284C7' },
  { icon: 'shopping_cart', label: 'طلباتي', route: '/orders', color: '#D97706' },
  { icon: 'shield', label: 'التأمين الطبي', route: '/profile/insurance', color: '#4F46E5' },
  { icon: 'location', label: 'عناويني', route: '/profile/addresses', color: '#DB2777' },
  { icon: 'users', label: 'عائلتي', route: '/health/family-hub', color: '#0D9488' },
  { icon: 'trophy', label: 'النقاط', route: '/loyalty/hub', color: '#F59E0B' },
  { icon: 'settings', label: 'الإعدادات', route: '/settings', color: '#64748B' },
];

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const handleLogout = () => {
    dispatch(logout());
    router.replace('/(auth)/welcome');
  };
  const insets = useSafeAreaInsets();
  const { isGuest, requireAuth } = useGuestGuard();
  const { colors, isDark } = useApp();
  const user = useSelector((state: any) => state.auth.user);
  // E2: real loyalty balance for the points badge (was hardcoded '1,250')
  const [loyaltyPoints, setLoyaltyPoints] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (isGuest) return;
    apiFetch('/loyalty/account')
      .then((acc: any) => setLoyaltyPoints(Number(acc?.points ?? 0)))
      .catch(() => setLoyaltyPoints(null));
  }, [isGuest]);

  const menu = React.useMemo(
    () => MENU.map((m) => m.icon === 'trophy' && loyaltyPoints != null
      ? { ...m, badge: loyaltyPoints.toLocaleString('en-US') }
      : m),
    [loyaltyPoints],
  );

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          {!isGuest && <IconButton icon="edit" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/health/edit-profile')} />}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1, paddingRight: 12 }}>
            <Avatar size={36} icon="user" bg={colors.surfaceSecondary} iconColor={colors.textPrimary} />
            <View style={{ alignItems: 'flex-end', flex: 1 }}>
              <AppText variant="h4" color={colors.textPrimary}>{isGuest ? 'مرحباً بك، زائر' : (user?.name || user?.full_name || 'مريض نبض')}</AppText>
            </View>
          </View>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}>
        
        {isGuest && (
          <View style={{ backgroundColor: colors.surface, padding: 16, borderRadius: 16, alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Icon name="user" size={32} color={colors.primary} />
            <AppText variant="h5" align="center">سجل دخولك الآن</AppText>
            <AppText variant="bodySM" color={colors.textSecondary} align="center">تمتع بكامل ميزات النبض بلس من استشارات ووصفات ومتابعة طبية دقيقة.</AppText>
            <Button label="تسجيل الدخول / إنشاء حساب" variant="primary" onPress={handleLogout} style={{ width: '100%', marginTop: 8 }}/>
          </View>
        )}

        <View style={st.grid}>
          {menu.map((item, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.85}
              onPress={() => {
                // Guests can open everything EXCEPT insurance & family routes.
                const r = String(item.route || '');
                const guestBlocked = r.includes('insurance') || r.includes('family');
                if (isGuest && guestBlocked) {
                  requireAuth(r.includes('insurance') ? 'insurance' : 'family');
                } else {
                  router.push(item.route as any);
                }
              }}
              style={st.gridItem}
            >
              <Card padding={0} style={{ alignItems: 'center', paddingVertical: 16, gap: 8, overflow: 'visible' }}>
                {item.badge && (
                  <View style={{ position: 'absolute', top: -6, right: -6, zIndex: 10 }}>
                    <Badge label={item.badge} color="#fff" bg={item.color} style={{ paddingHorizontal: 4, paddingVertical: 2 }}/>
                  </View>
                )}
                <View style={[st.gridIcon, { backgroundColor: item.color + '18' } ]}>
                  <Icon name={item.icon} size={24} color={item.color} />
                </View>
                <AppText variant="labelSM" align="center">{item.label}</AppText>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {!isGuest && <Button label="تسجيل الخروج" variant="outline" icon="logout" onPress={handleLogout} style={{ borderColor: colors.error }}/>}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  profileCard: { alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '31.3%' },
  gridIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
