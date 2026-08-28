import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context';

/**
 * Shared provider home deliberately contains no clinical/chat/call command.
 * Per-sector dashboards may be enabled only after their server-authoritative
 * ownership, payment, capacity, audit, and integration contracts are reviewed.
 */
export const ProviderHome = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}> 
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
        <Text style={[styles.title, { color: theme.text }]}>واجهة المزوّد غير متاحة حالياً</Text>
        <Text style={[styles.body, { color: theme.textSub }]}>لا توجد رحلة مشتركة معتمدة للمكالمات أو المحادثات أو الطلبات من هذه الصفحة. استخدم فقط لوحة القطاع التي يثبت خادمها الملكية والسعة والدفع والتدقيق.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { padding: 20, borderRadius: 12, borderWidth: 1 },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'right', marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 24, textAlign: 'right' },
});
