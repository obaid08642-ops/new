import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme, useLang } from '../../../context';
import { NBadge, NBtn, NCard, NHeader, NScroll } from '../../../components/ui';
import { SP, FS, FW } from '../../../constants';
import client from '../../../api/client';
import { parseVisits, type VisitRow } from './medicalOrderLogic';

/**
 * "Write an order" list (Ord22 entry): the doctor's own recent visits an order can still be written for,
 * GET /medical-orders/visits (in progress, or completed within the window). The endpoint carries no patient data,
 * so a row shows the visit date and status only. A row opens the composer.
 */
export function MedicalOrderVisitsScreen({ onBack, onOpen }: { onBack: () => void; onOpen: (visit: VisitRow) => void }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const AR = lang === 'ar';
  const dir = AR ? 'row-reverse' : 'row';
  const align = AR ? 'right' : 'left';
  const [rows, setRows] = useState<VisitRow[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(() => {
    setState('loading');
    client.get('/medical-orders/visits')
      .then((r) => { setRows(parseVisits(r.data)); setState('ready'); })
      .catch(() => setState('error'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const dateOf = (iso: string | null) => {
    if (!iso) return tt('rrag.9fd72b65');
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? (tt('rrag.9fd72b65')) : d.toLocaleDateString(AR ? 'ar' : 'en', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('rrag.57fe2513')} sub={tt('rrag.ce58a379')} onBack={onBack} />
      <NScroll>
        {state === 'loading' ? <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} /> : null}
        {state === 'error' ? (
          <NCard>
            <Text accessibilityRole="alert" style={{ color: theme.text, fontSize: FS.sm, textAlign: align }}>{tt('rrag.4ec89192')}</Text>
            <NBtn label={tt('rrag.96cbdad3')} variant="outline" onPress={load} style={{ marginTop: SP.md }} />
          </NCard>
        ) : null}
        {state === 'ready' && rows.length === 0 ? (
          <NCard>
            <Text style={{ color: theme.textSub, fontSize: FS.sm, textAlign: align }}>
              {tt('rrag.ed338346')}
            </Text>
          </NCard>
        ) : null}
        {state === 'ready' ? rows.map((v) => (
          <TouchableOpacity key={v.id} accessibilityRole="button" accessibilityLabel={`${dateOf(v.date)}`} onPress={() => onOpen(v)} style={{ minHeight: 44, marginBottom: SP.sm }}>
            <NCard>
              <View style={{ flexDirection: dir, alignItems: 'center', justifyContent: 'space-between', gap: SP.md }}>
                <Text style={{ color: theme.text, fontSize: FS.md, fontWeight: FW.med, textAlign: align, flex: 1 }}>{dateOf(v.date)}</Text>
                <NBadge label={v.status === 'in_progress' ? (tt('rrag.ff89b134')) : (tt('rrag.1e93e805'))} variant={v.status === 'in_progress' ? 'info' : 'success'} />
              </View>
            </NCard>
          </TouchableOpacity>
        )) : null}
      </NScroll>
    </View>
  );
}
