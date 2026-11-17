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

export function LabSampleScannerScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate?: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [barcode, setBarcode] = useState('');
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const fetchSamples = useCallback(async () => {
    try {
      const res = await client.get('/labs/samples');
      setSamples(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSamples([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSamples(); }, [fetchSamples]);

  const q = barcode.trim().toLowerCase();
  const matches = q
    ? samples.filter((s: any) =>
        String(s.barcode || '').toLowerCase().includes(q) ||
        String(s.id || '').toLowerCase().includes(q))
    : samples;

  const startAnalysis = async (sam: any) => {
    setBusy(true);
    try {
      await client.patch(`/labs/samples/${sam.id}/stage`, { stage: 'analyzing' });
      show(tt('rrcw.d6f3a141'), 'success');
      fetchSamples();
    } catch {
      show(tt('rrcw.325f035a'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('rrcw.4125cf15')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.xl, paddingBottom: 60 }}>
        <NInput
          label={tt('rrcw.88d4a262')}
          placeholder={tt('phx.65269c6e')}
          value={barcode}
          onChange={setBarcode}
          icon="scan"
        />
        {loading ? (
          <Text style={{ color: theme.textSub, textAlign: 'center', marginTop: SP.xl, fontSize: FS.sm }}>
            {tt('rrcw.ce209c13')}
          </Text>
        ) : matches.length === 0 ? (
          <Text style={{ color: theme.textSub, textAlign: 'center', marginTop: SP.xl, fontSize: FS.sm }}>
            {tt('rrcw.db32c672')}
          </Text>
        ) : matches.map((sam: any) => (
          <NCard key={sam.id} style={{ marginTop: SP.lg }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{sam.barcode || sam.id}</Text>
              <NBadge label={String(sam.stage || '')} variant="info" size="xs" />
            </View>
            {!!sam.patient_name && (
              <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{sam.patient_name}</Text>
            )}
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginTop: SP.md }}>
              {!['analyzing', 'result_ready', 'result_uploaded'].includes(sam.stage) && (
                <NBtn label={tt('rrcw.a1a74336')} size="sm" disabled={busy} onPress={() => startAnalysis(sam)} style={{ flex: 1 }} />
              )}
              {sam.stage === 'analyzing' && onNavigate && (
                <NBtn label={tt('rrcw.fd60025b')} size="sm" disabled={busy} onPress={() => onNavigate('sample_tracking', sam)} style={{ flex: 1 }} />
              )}
            </View>
          </NCard>
        ))}
      </ScrollView>
    </View>
  );
}
