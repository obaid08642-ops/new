import React from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useApp } from '../context/AppContext';
import { Icon, IconName } from './Icon';
import { AppText } from './ui';

/**
 * M1-05 — Unified screen states (Loading / Empty / Error).
 * Before this, only 17% of screens had any empty state and most failures were
 * silently swallowed behind static fake data. Wrap any data-driven screen:
 *
 *   <ScreenState loading={loading} error={error} empty={items.length === 0}
 *                onRetry={reload} emptyTitle="لا توجد مواعيد">
 *     {content}
 *   </ScreenState>
 *
 * Uses the app's actual theme keys (bg/s/t/t2/t3/p/cr/cs...).
 */

interface ScreenStateProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: IconName;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function ScreenState({
  loading,
  error,
  empty,
  emptyTitle = 'لا توجد بيانات بعد',
  emptySubtitle,
  emptyIcon = 'document',
  onRetry,
  children,
}: ScreenStateProps) {
  const { colors } = useApp() as any;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.p} />
        <AppText variant="bodySM" color={colors.t2} style={styles.hint}>
          جاري التحميل...
        </AppText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.cs }]}>
          <Icon name="error" size={34} color={colors.cr} />
        </View>
        <AppText variant="h5" color={colors.t} style={styles.title}>
          حدث خطأ
        </AppText>
        <AppText variant="bodySM" color={colors.t2} style={styles.subtitle}>
          {error}
        </AppText>
        {onRetry && (
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.p }]} onPress={onRetry}>
            <Icon name="refresh" size={18} color="#fff" />
            <AppText variant="buttonMD" color="#fff">إعادة المحاولة</AppText>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (empty) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.s }]}>
          <Icon name={emptyIcon} size={34} color={colors.t3} />
        </View>
        <AppText variant="h5" color={colors.t} style={styles.title}>
          {emptyTitle}
        </AppText>
        {!!emptySubtitle && (
          <AppText variant="bodySM" color={colors.t2} style={styles.subtitle}>
            {emptySubtitle}
          </AppText>
        )}
        {onRetry && (
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.p }]} onPress={onRetry}>
            <Icon name="refresh" size={18} color="#fff" />
            <AppText variant="buttonMD" color="#fff">تحديث</AppText>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 16, textAlign: 'center' },
  subtitle: { marginTop: 8, textAlign: 'center', maxWidth: 280 },
  hint: { marginTop: 12 },
  retryBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
});

export default ScreenState;
