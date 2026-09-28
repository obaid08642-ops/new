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

export function NurseChecklistConsole({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    client.get('/provider/nursing/checklist').then(r => setItems(Array.isArray(r.data) ? r.data : [])).catch(() => {
      show(AR ? 'تعذر تحميل القائمة' : 'Could not load checklist', 'error');
    }).finally(() => setLoading(false));
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'قائمة مهام التمريض' : 'Nurse Checklist Console'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.sm }}>
        {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> : items.length === 0 ? (
          <NEmpty icon="checklist" title={AR ? 'لا توجد مهام' : 'No tasks'} sub={AR ? 'لا توجد عناصر في القائمة' : 'Checklist is empty'} />
        ) : items.map((it: any, i: number) => (
          <NCard key={String(it.id || i)} style={{ marginBottom: SP.sm }}>
            <Text style={{ color: theme.text }}>{it.title || it.name || it.label || String(it.id || '')}</Text>
          </NCard>
        ))}
      </ScrollView>
    </View>
  );
}

