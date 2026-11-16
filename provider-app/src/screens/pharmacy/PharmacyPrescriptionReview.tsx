/**
 * Pharmacy prescription review (needs-review #1147). Existing routes only:
 *   GET /prescriptions/pharmacy/queue and GET /prescriptions/manual-review/queue (doctor lines typed by hand are PENDING_REVIEW),
 *   POST /prescriptions/:id/verify, POST /prescriptions/:id/substitute { item_index, new_medicine_id },
 *   GET /medicines?q= (the server accepts only an approved medicine as the substitute).
 * Patient name and phone are not shown: the queue does not return them.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NCard, NHeader, NBadge, NBtn, NEmpty, NSheet, NSearch } from '../../components/ui';
import { SP, FS, FW } from '../../constants';
import client from '../../api/client';
import { toRxRow, mergeRxRows, type RxRow } from '../../utils/rxReview';

interface Med { id: string; name: string }

export function PharmacyPrescriptionReviewScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [rows, setRows] = useState<RxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [subFor, setSubFor] = useState<{ rx: string; index: number } | null>(null);
  const [query, setQuery] = useState('');
  const [meds, setMeds] = useState<Med[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const [queue, manual] = await Promise.all([
        client.get('/prescriptions/pharmacy/queue'),
        client.get('/prescriptions/manual-review/queue'),
      ]);
      const parse = (d: unknown): RxRow[] => (Array.isArray(d) ? d : []).map(x => toRxRow(x, AR)).filter((r): r is RxRow => r !== null);
      setRows(mergeRxRows(parse(manual.data), parse(queue.data)));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [AR]);
  useEffect(() => { void load(); }, [load]);

  const errText = (e: unknown, fallback: string): string => {
    const m = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    return typeof m === 'string' ? m : fallback;
  };

  const verify = async (id: string) => {
    setBusyId(id);
    try {
      await client.post(`/prescriptions/${id}/verify`, {});
      show(tt('sxj.686953e1'), 'success');
      await load();
    } catch (e) {
      show(errText(e, tt('sxj.3667e861')), 'error');
    } finally { setBusyId(null); }
  };

  const search = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await client.get('/medicines', { params: { q: query.trim(), limit: 10 } });
      const list: unknown[] = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
      setMeds(list.flatMap((m): Med[] => {
        const o = (m && typeof m === 'object' ? m : {}) as Record<string, unknown>;
        if (typeof o.id !== 'string') return [];
        const nm = (AR ? o.name_ar : o.name_en) || o.name_en || o.name_ar || o.name;
        return [{ id: o.id, name: typeof nm === 'string' ? nm : o.id }];
      }));
    } catch {
      setMeds([]);
      show(tt('sxj.8f0d9a6f'), 'error');
    } finally { setSearching(false); }
  };

  const substitute = async (m: Med) => {
    if (!subFor) return;
    setBusyId(subFor.rx);
    try {
      await client.post(`/prescriptions/${subFor.rx}/substitute`, { item_index: subFor.index, new_medicine_id: m.id });
      show(tt('sxj.2d545b04'), 'success');
      setSubFor(null); setQuery(''); setMeds([]);
      await load();
    } catch (e) {
      show(errText(e, tt('sxj.4b3941a6')), 'error');
    } finally { setBusyId(null); }
  };

  const dir = AR ? 'row-reverse' : 'row';
  const align = AR ? 'right' : 'left';

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('sxj.90618055')} onBack={onBack} />
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xxl }} />
      ) : failed ? (
        <NCard style={{ margin: SP.lg, alignItems: 'center', gap: SP.sm }}>
          <Text style={{ color: theme.text, textAlign: 'center' }}>{tt('sxj.81ef94a9')}</Text>
          <NBtn label={tt('sxj.cf333076')} size="sm" variant="outline" full={false} onPress={() => { void load(); }} />
        </NCard>
      ) : (
        <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
          {rows.length === 0 && <NEmpty icon="document" title={tt('sxj.4f5ea9b9')} sub={tt('sxj.dbfaf9e9')} />}
          {rows.map(r => (
            <NCard key={r.id} style={{ marginBottom: SP.md }}>
              <View style={{ flexDirection: dir, justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR ? `وصفة #${r.id.slice(-6)}` : `Prescription #${r.id.slice(-6)}`}</Text>
                <NBadge label={r.pendingManual > 0 ? (tt('sxj.f5064dd7')) : r.verified ? (tt('sxj.78d38d21')) : (tt('sxj.a51c8715'))} variant={r.pendingManual > 0 ? 'warning' : r.verified ? 'success' : 'info'} size="xs" />
              </View>
              {r.items.map(it => (
                <View key={it.index} style={{ flexDirection: dir, justifyContent: 'space-between', alignItems: 'center', marginTop: SP.sm, gap: SP.sm }}>
                  <Text style={{ flex: 1, color: theme.text, textAlign: align }}>{it.name}{it.dose ? ` · ${it.dose}` : ''}</Text>
                  {it.manualPending && (
                    <TouchableOpacity accessibilityRole="button" onPress={() => { setSubFor({ rx: r.id, index: it.index }); setQuery(''); setMeds([]); }}>
                      <Text style={{ color: theme.primary, fontSize: FS.sm, fontWeight: FW.bold }}>{tt('sxj.9d85816a')}</Text>
                    </TouchableOpacity>
                  )}
                  {!it.manualPending && it.substituted && <NBadge label={tt('sxj.fcbcdcec')} variant="default" size="xs" />}
                </View>
              ))}
              {!r.verified && r.pendingManual === 0 && (
                <NBtn label={tt('sxj.5b85c598')} size="sm" loading={busyId === r.id} onPress={() => { void verify(r.id); }} style={{ marginTop: SP.md }} />
              )}
            </NCard>
          ))}
        </ScrollView>
      )}
      <NSheet visible={!!subFor} onClose={() => setSubFor(null)} title={tt('sxj.ce077a01')} height={480}>
        <View style={{ padding: SP.md }}>
          <NSearch value={query} onChange={setQuery} placeholder={tt('sxj.ed61a0d6')} />
          <NBtn label={tt('sxj.f61f44ef')} size="sm" loading={searching} onPress={() => { void search(); }} style={{ marginTop: SP.sm }} />
          <ScrollView style={{ marginTop: SP.md }}>
            {meds.map(m => (
              <TouchableOpacity key={m.id} accessibilityRole="button" onPress={() => { void substitute(m); }} style={{ paddingVertical: SP.md, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ color: theme.text, textAlign: align }}>{m.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </NSheet>
    </View>
  );
}
