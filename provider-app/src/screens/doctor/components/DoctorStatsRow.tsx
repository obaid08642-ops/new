import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme, useLang } from '../../../context';
import { NStatCard } from '../../../components/ui';
import { SP } from '../../../constants';

interface DoctorStatsRowProps {
  stats: {
    todayCount: number;
    revenue: number;
    pendingCount: number;
  };
}

export function DoctorStatsRow({ stats }: DoctorStatsRowProps) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const AR = lang === 'ar';

  return (
    <View style={styles.container}>
      <View style={[styles.grid, { flexDirection: AR ? 'row-reverse' : 'row' }]}>
        <NStatCard
          label={tt('rrs.1cd17909')}
          value={String(stats.todayCount || 0)}
          icon="calendar"
          color={theme.primary}
          style={styles.card}
        />
        <NStatCard
          label={tt('rrs.6c3e3fcd')}
          value={String(stats.pendingCount || 0)}
          icon="time"
          color={theme.warn}
          style={styles.card}
        />
        <NStatCard
          label={tt('rrs.73d06215')}
          value={`${stats.revenue || 0} ر.س`}
          icon="wallet"
          color={theme.success}
          style={styles.card}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SP.lg,
    paddingVertical: SP.md,
  },
  grid: {
    justifyContent: 'space-between',
    gap: SP.xs,
  },
  card: {
    flex: 1,
  },
});
