import React, { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useTheme, useLang, useToast } from '../../../context';
import { NBtn, NCard, NInput, NHeader, NScroll, NEmpty, NBadge } from '../../../components/ui';
import { SP, FS, FW } from '../../../constants';
import client from '../../../api/client';
import { MEDICAL_REPORTS_URL, normalizeSehaNumber, revokeUrl, sehaStatusOf, sehaUrl } from './medicalReport';

// PT-08: the doctor's issued medical reports: Seha state (pending / registered), enter or fix the Seha number, withdraw a report with a reason.
export function MedicalReportsListScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { isRTL, t } = useLang();
  const { show } = useToast();
  const align = isRTL ? 'right' : 'left';
  const [rows, setRows] = useState<any[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [seha, setSeha] = useState('');
  const [why, setWhy] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try { const r = await client.get(MEDICAL_REPORTS_URL); setRows(Array.isArray(r.data) ? r.data : []); } catch { setFailed(true); setRows([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = (id: string, current?: string | null) => { setOpen(open === id ? null : id); setSeha(current ?? ''); setWhy(''); };

  const saveSeha = async (id: string) => {
    const n = normalizeSehaNumber(seha);
    if ('invalid' in n) { show(t('medicalReport.seha.invalid'), 'warning'); return; }
    setBusy(true);
    try { await client.put(sehaUrl(id), { seha_number: n.value }); show(t('medicalReport.seha.saved'), 'success'); setOpen(null); await load(); }
    catch { show(t('medicalReport.seha.failed'), 'error'); } finally { setBusy(false); }
  };
  const revoke = async (id: string) => {
    if (!why.trim()) { show(t('medicalReport.revoke.needReason'), 'warning'); return; }
    setBusy(true);
    try { await client.post(revokeUrl(id), { reason: why.trim() }); show(t('medicalReport.revoke.done'), 'success'); setOpen(null); await load(); }
    catch { show(t('medicalReport.revoke.failed'), 'error'); } finally { setBusy(false); }
  };

  return (
    <NScroll>
      <NHeader title={t('medicalReport.list.title')} onBack={onBack} />
      {failed && <NBtn label={t('medicalReport.list.retry')} variant="outline" onPress={load} style={{ marginBottom: SP.md }} />}
      {rows && !failed && rows.length === 0 && <NEmpty icon="" title={t('medicalReport.list.empty')} />}
      {(rows ?? []).map((r) => {
        const revoked = r.status === 'revoked';
        const registered = sehaStatusOf(r) === 'registered';
        return (
          <NCard key={r.id} style={{ marginBottom: SP.md }}>
            <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: align }}>{r.serial ?? '—'} · {r.patient_name ?? '—'}</Text>
            <Text style={{ color: theme.textSub, fontSize: FS.sm, textAlign: align, marginVertical: SP.xs }}>{t('medicalReport.period', { from: r.from ?? '—', to: r.to ?? '—', days: r.days ?? '—' })}</Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: SP.sm }}>
              {revoked ? <NBadge label={t('medicalReport.status.revoked')} variant="danger" />
                : <NBadge label={registered ? t('medicalReport.seha.registered', { number: r.seha_number ?? '' }) : t('medicalReport.seha.pending')} variant={registered ? "success" : "warning"} />}
            </View>
            {!revoked && (
              <NBtn label={open === r.id ? t('medicalReport.list.close') : t('medicalReport.list.manage')} variant="outline" size="sm" onPress={() => toggle(r.id, r.seha_number)} style={{ marginTop: SP.md }} />
            )}
            {open === r.id && !revoked && (
              <View style={{ marginTop: SP.md }}>
                <NInput label={t('medicalReport.seha.label')} hint={t('medicalReport.seha.hint')} value={seha} onChange={setSeha} caps="characters" maxLen={30} />
                <NBtn label={t('medicalReport.seha.save')} loading={busy} disabled={busy || !seha.trim()} onPress={() => saveSeha(r.id)} style={{ marginBottom: SP.lg }} />
                <NInput label={t('medicalReport.revoke.reason')} value={why} onChange={setWhy} multi lines={2} maxLen={500} />
                <NBtn label={t('medicalReport.revoke.action')} variant="danger" loading={busy} disabled={busy || !why.trim()} onPress={() => revoke(r.id)} />
              </View>
            )}
          </NCard>
        );
      })}
    </NScroll>
  );
}
