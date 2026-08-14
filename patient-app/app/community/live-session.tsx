// Community livestream is intentionally unavailable until a server-backed room contract exists.
import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Button, IconButton } from '../../src/components/ui';

export default function LiveSessionScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        <AppText variant="h4">الجلسة المباشرة</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={[styles.illustration, { backgroundColor: colors.primarySurface }]}>
          <Icon name="video" size={42} color={colors.primary} />
        </View>
        <AppText variant="h4" align="center">البث المباشر غير متاح حالياً</AppText>
        <AppText variant="bodySM" color={colors.textSecondary} align="center">
          لن نعرض فيديو أو تعليقات أو عدد مشاهدين تجريبياً. ستتاح هذه الخدمة فقط بعد ربط غرفة بث ومراسلة مصادق عليهما.
        </AppText>
        <Button label="استعرض الاستشارات المتاحة" variant="primary" icon="calendar" onPress={() => router.push('/(tabs)/consultations')} style={styles.cta} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerSpacer: { width: 40 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, gap: 14 },
  illustration: { width: 96, height: 96, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  cta: { width: '100%', marginTop: 10 },
});
