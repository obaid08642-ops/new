import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Card, FIcon } from '../../../packages/ui-native/src';
import { ConsultList, StatusTag, useConsultFormat } from '../../src/components/consult/ConsultKit';
import { RAD_TONE, LAB_TONE, diagStatus, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { StatusPill } from '../../src/components/orders/OrderKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { rowsOf } from '../../src/utils/labMappers';
import { pickLocalized } from '../../src/utils/localize';

interface ResultRow {
  id: string;
  radiology: boolean;
  title: string;
  provider: string;
  at: unknown;
  state: unknown;
  hasReport: boolean;
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** One booking or report of the server as a row; null when it has no id. */
function toRow(raw: unknown, radiology: boolean): ResultRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const id = text(b.id) || text(b._id);
  if (!id) return null;
  const items = Array.isArray(b.items) ? (b.items as Array<Record<string, unknown>>) : [];
  const reports = Array.isArray(b.reports) ? b.reports : [];
  return {
    id,
    radiology,
    title: items.map((i) => text(pickLocalized(i.name_ar as string | undefined, i.name_en as string | undefined))).filter(Boolean).join(' + '),
    provider: text(b.provider_name),
    at: b.scheduled_at,
    state: b.state ?? b.status,
    hasReport: radiology ? Boolean(b.signed_report_pdf_url) || reports.length > 0 : reports.length > 0,
  };
}

/** The patient's lab results and radiology reports in one list (board Orders card); the report is opened from the booking. */
export default function MyResults() {
  const { theme, t, c, k, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'offline' | 'ready'>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    let failures = 0;
    const get = (path: string) =>
      apiFetch<unknown>(path).catch((err: unknown) => {
        failures += 1;
        logError('diagnostics:my-results', err);
        return null;
      });
    const [labs, rads] = await Promise.all([get('/labs/bookings/mine'), get('/radiology/reports/mine')]);
    const list = [...rowsOf(labs).map((r) => toRow(r, false)), ...rowsOf(rads).map((r) => toRow(r, true))].filter((r): r is ResultRow => r !== null);
    setRows(list);
    if (failures === 2) setStatus((await isOffline()) ? 'offline' : 'error');
    else setStatus('ready');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ConsultList
      testID="diagnostics-my-results"
      title={k('diag.results.title')}
      onBack={goBackDiag}
      data={rows}
      status={status}
      onRetry={() => void load()}
      onRefresh={() => void load()}
      keyExtractor={(r) => `${r.radiology ? 'r' : 'l'}-${r.id}`}
      empty={{ icon: 'file-text', title: k('diag.results.empty') }}
      renderItem={(r) => {
        const st = diagStatus(r.radiology ? 'radiology' : 'lab', r.state);
        const title = r.title || (r.radiology ? k('diag.kind.rad') : k('diag.kind.lab'));
        const meta = [r.provider, fmt.date(r.at)].filter(Boolean).join(' · ');
        return (
          <Pressable accessibilityRole="button" accessibilityLabel={[title, meta, k(st.key)].filter(Boolean).join(', ')} onPress={() => router.push({ pathname: '/diagnostics/order/[id]', params: { id: r.id } } as unknown as Href)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <Card theme={theme} padding="sm">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FIcon icon={r.radiology ? 'scan' : 'test-tube'} tone={r.radiology ? RAD_TONE : LAB_TONE} size={44} theme={theme} />
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{title}</Text>
                  {meta ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{meta}</Text> : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    <StatusPill label={k(st.key)} tone={st.tone} />
                    {r.hasReport ? <StatusTag label={k('diag.results.reportReady')} tone="success" /> : null}
                  </View>
                </View>
              </View>
            </Card>
          </Pressable>
        );
      }}
    />
  );
}
