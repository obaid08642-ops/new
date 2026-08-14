// Live location requires an authenticated visit and realtime tracking contract; no local route or clinician data is shown.
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Button } from '../../src/components/ui';

export default function LiveDoctorTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}>
        <Icon name="back" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primarySurface }]}>
          <Icon name="map-marker-radius-outline" size={38} color={colors.primary} />
        </View>
        <AppText variant="h4" align="center">التتبع الحي غير متاح حالياً</AppText>
        <AppText variant="bodySM" color={colors.textSecondary} align="center">
          لن يعرض التطبيق مساراً أو وقت وصول أو هوية مقدم خدمة محلياً قبل ربط زيارة حقيقية بخدمة تتبع وموافقة موقع مصادق عليهما.
        </AppText>
        <Button label="العودة" variant="outline" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  backButton: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingBottom: 80 },
  iconCircle: { width: 88, height: 88, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
});
