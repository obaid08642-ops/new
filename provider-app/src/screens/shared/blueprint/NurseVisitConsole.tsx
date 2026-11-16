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

type VisitRow = { id: string; raw: unknown; patient: string; when: string };

function toVisit(x: unknown): VisitRow | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : '';
  if (!id) return null;
  const patient = typeof o.patient_name === 'string' ? o.patient_name : typeof o.patient === 'string' ? o.patient : '';
  const when = typeof o.scheduled_at === 'string' ? o.scheduled_at : typeof o.date === 'string' ? o.date : '';
  return { id, raw: x, patient, when };
}

// Active nursing visits from the same queue the nurse dashboard uses; a tap opens the field-ops screen
// (transit, GPS arrival, care, signature), which is the one visit flow.
export function NurseVisitConsole({ onBack, onNavigate }: { onBack: () => void; onNavigate: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const AR = lang === 'ar';
  const [rows, setRows] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const res = await client.get('/provider/jobs/queue?kind=nursing&status=active');
      const list: unknown[] = Array.isArray(res.data) ? res.data : [];
      setRows(list.map(toVisit).filter((r): r is VisitRow => r !== null));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('rrcz.455cc0db')} onBack={onBack} />
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xxl }} />
      ) : failed ? (
        <NCard style={{ margin: SP.lg, alignItems: 'center', gap: SP.sm }}>
          <Text style={{ color: theme.text, textAlign: 'center' }}>{tt('rrcz.e9989504')}</Text>
          <NBtn label={tt('rrcz.cf333076')} size="sm" variant="outline" full={false} onPress={() => { void load(); }} />
        </NCard>
      ) : (
        <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.sm }}>
          {rows.length === 0 && <NEmpty icon="calendar" title={tt('rrcz.3c63394e')} sub={tt('rrcz.0c6f5c88')} />}
          {rows.map(r => (
            <NCard key={r.id} onPress={() => onNavigate('order_detail', r.raw)}>
              <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>{r.patient || (tt('rrcz.c8b7f288'))}</Text>
              {!!r.when && <Text style={{ color: theme.textSub, fontSize: FS.sm, marginTop: SP.xs, textAlign: AR ? 'right' : 'left' }}>{r.when}</Text>}
            </NCard>
          ))}
          <NBtn label={tt('rrcz.fe2d9ea6')} variant="outline" onPress={() => onNavigate('nurse_checklist')} style={{ marginTop: SP.md }} />
        </ScrollView>
      )}
    </View>
  );
}
