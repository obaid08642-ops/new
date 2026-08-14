// Exercise plans require a server-backed, clinically reviewed plan; no local demo routines are shown.
import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Button, IconButton } from '../../src/components/ui';

export default function ExercisePlanScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={styles.headerSpacer} />
        <AppText variant="h4">خطة التمارين</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>
      <View style={styles.content}>
        <View style={[styles.iconPanel, { backgroundColor: colors.primarySurface }]}>
          <Icon name="run" size={42} color={colors.primary} />
        </View>
        <AppText variant="h4" align="center">لا توجد خطة تمارين متاحة</AppText>
        <AppText variant="bodySM" color={colors.textSecondary} align="center">
          لا تعرض نبض خطة لياقة محلية أو مولدة دون ملف صحي وعقد خدمة معتمدين. ستظهر الخطة عند توفرها من المصدر المصرح.
        </AppText>
        <Button label="العودة" variant="outline" onPress={() => router.back()} style={styles.cta} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerSpacer: { width: 40 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, gap: 14 },
  iconPanel: { width: 96, height: 96, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  cta: { width: '100%', marginTop: 10 },
});
