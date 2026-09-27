import { buildHeaders } from '../../../security/Security';
import { API_BASE } from '../../../constants';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Dimensions, Switch, Platform, Alert, Vibration,
 ActivityIndicator, TextInput, Linking
} from 'react-native';
import { useTheme, useLang, useToast } from '../../../context';
import client from '../../../api/client';
import { useServicesCatalog } from '../../../api/catalogs';
import {
 NBtn, NCard, NInput, NBadge, NHeader, NScroll, NDivider,
 NPriceInput, NToggle, NSearch, NSecHeader, NStatCard, NAvatar,
 NSheet, NEmpty
} from '../../../components/ui';
import { I, IBg } from '../../../components/icons';
import { SP, R, FS, FW, C } from '../../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function InventoryExpiryMonitor({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    client.get('/pharmacy/inventory/expiry').then(r => {
      const d = r?.data;
      setItems(Array.isArray(d?.expiringSoon) ? d.expiringSoon : Array.isArray(d) ? d : []);
    }).catch(() => {
      show(AR ? 'تعذر تحميل الأصناف' : 'Could not load items', 'error');
    }).finally(() => setLoading(false));
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'مراقبة الصلاحية' : 'Inventory Expiry Monitor'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.sm }}>
        {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> : items.length === 0 ? (
          <NEmpty icon="calendar" title={AR ? 'لا أصناف قريبة الانتهاء' : 'No expiring items'} />
        ) : items.map((it: any, i: number) => (
          <NCard key={String(it.id || it.sku || i)} style={{ marginBottom: SP.sm }}>
            <Text style={{ color: theme.text, fontWeight: FW.bold }}>{it.name_ar || it.name_en || it.sku || ''}</Text>
            <Text style={{ color: theme.warn, fontSize: FS.xs }}>{it.expiry_date || it.expiry || ''}</Text>
          </NCard>
        ))}
      </ScrollView>
    </View>
  );
}

