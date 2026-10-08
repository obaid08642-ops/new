// app/support/help-center.tsx — Phase 3.4: exposes the HelpCenter component
// (FAQs + tickets + AI assist + callback) as a real route, reachable from settings.
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText } from '../../src/components/ui';
import { HelpCenter } from '../../src/components/help/HelpCenter';

export default function HelpCenterRoute() {
  const insets = useSafeAreaInsets();
  const { colors, lang } = useApp();
  const AR = lang === 'ar';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <AppText variant="h3" color={colors.textPrimary}>
          {AR ? 'مركز المساعدة' : 'Help Center'}
        </AppText>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={AR ? 'رجوع' : 'Back'}
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surfaceSecondary }]}
        >
          <Icon name="back" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <HelpCenter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
});
