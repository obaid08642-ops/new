import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, useLang, useToast } from '../../../context';
import { NBtn, NCard, NInput, NAvatar, NHeader, NScroll, NToggle } from '../../../components/ui';
import { SP, R, FS, FW } from '../../../constants';
import client from '../../../api/client';
import { buildIssueBody, endFor, issueErrorKey, issueUrl, normalizeSehaNumber, restDays, sehaUrl, type IssueProblem } from './medicalReport';

// PT-08: the doctor issues a "Medical report" with a recommended rest period (owner decision 2026-11-09: never "sick leave", official sick leave is issued only via Seha).
// After issuing, the doctor is told to register the leave on Seha and may enter its number here (optional, editable later from the list).
const DAY_CHOICES = [1, 2, 3, 5, 7, 10, 14];
const PROBLEM_KEY: Record<IssueProblem, 'medicalReport.missing.appointment' | 'medicalReport.missing.patient' | 'medicalReport.missing.from' | 'medicalReport.missing.to' | 'medicalReport.missing.order' | 'medicalReport.missing.long' | 'medicalReport.missing.reason' | 'medicalReport.missing.diagnosis'> = {
  appointment: 'medicalReport.missing.appointment', patient: 'medicalReport.missing.patient', from: 'medicalReport.missing.from', to: 'medicalReport.missing.to',
  order: 'medicalReport.missing.order', long: 'medicalReport.missing.long', reason: 'medicalReport.missing.reason', diagnosis: 'medicalReport.missing.diagnosis',
};
const today = () => new Date().toISOString().slice(0, 10);

interface Issued { id: string; serial: string; from: string; to: string; days: number }

export function SickLeaveScreen({ apt, onBack }: { apt: any; onBack: () => void }) {
  const { theme } = useTheme();
  const { isRTL, t } = useLang();
  const { show } = useToast();
  const align = isRTL ? 'right' : 'left';
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(endFor(today(), 3) ?? today());
  const [reason, setReason] = useState('');
  const [diag, setDiag] = useState('');
  const [showDiag, setShowDiag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [seha, setSeha] = useState('');
  const [sehaSaved, setSehaSaved] = useState<string | null>(null);
  const [sehaBusy, setSehaBusy] = useState(false);
  const days = restDays(from, to);
  const appointmentId = apt?.id || apt?.raw?.id;
  const requested = apt?.sick_leave_requested === true || apt?.raw?.sick_leave_requested === true;

  const issue = async () => {
    const built = buildIssueBody({ appointmentId, patientId: apt?.patient_id || apt?.raw?.patient_id, from, to, reason, diagnosis: diag, showDiagnosis: showDiag });
    if ('problem' in built) { show(t(PROBLEM_KEY[built.problem]), 'warning'); return; }
    setBusy(true);
    try {
      const res = await client.post(issueUrl(String(appointmentId)), built.body);
      const d = res.data || {};
      setIssued({ id: String(d.id), serial: String(d.serial ?? ''), from: String(d.start_date ?? from), to: String(d.end_date ?? to), days: Number(d.days ?? days) });
      show(t('medicalReport.issued'), 'success');
    } catch (err: any) {
      const key = issueErrorKey(err?.response?.data?.message);
      show(key ? t(key as any) : t('medicalReport.failed'), 'error');
    } finally { setBusy(false); }
  };

  const saveSeha = async () => {
    if (!issued) return;
    const n = normalizeSehaNumber(seha);
    if ('invalid' in n) { show(t('medicalReport.seha.invalid'), 'warning'); return; }
    setSehaBusy(true);
    try {
      await client.put(sehaUrl(issued.id), { seha_number: n.value });
      setSehaSaved(n.value);
      show(t('medicalReport.seha.saved'), 'success');
    } catch { show(t('medicalReport.seha.failed'), 'error'); } finally { setSehaBusy(false); }
  };

  if (issued) {
    return (
      <NScroll>
        <NHeader title={t('medicalReport.issuedTitle')} onBack={onBack} />
        <NCard style={{ marginBottom: SP.lg, backgroundColor: theme.successBg }}>
          <Text style={{ color: theme.success, fontWeight: FW.bold, fontSize: FS.md, textAlign: align }}>{t('medicalReport.serial', { serial: issued.serial })}</Text>
          <Text style={{ color: theme.text, fontSize: FS.sm, textAlign: align, marginTop: SP.xs }}>{t('medicalReport.period', { from: issued.from, to: issued.to, days: issued.days })}</Text>
          <Text style={{ color: theme.textSub, fontSize: FS.xs, textAlign: align, marginTop: SP.xs }}>{t('medicalReport.sentToPatient')}</Text>
        </NCard>
        <NCard style={{ marginBottom: SP.lg, backgroundColor: sehaSaved ? theme.successBg : theme.warnBg }}>
          <Text style={{ color: theme.text, fontWeight: FW.semi, fontSize: FS.sm, textAlign: align }}>
            {sehaSaved ? t('medicalReport.seha.registered', { number: sehaSaved }) : t('medicalReport.seha.pending')}
          </Text>
          {!sehaSaved && <Text style={{ color: theme.textSub, fontSize: FS.sm, textAlign: align, marginTop: SP.sm, lineHeight: 20 }}>{t('medicalReport.seha.notice')}</Text>}
        </NCard>
        {!sehaSaved && (
          <>
            <NInput label={t('medicalReport.seha.label')} hint={t('medicalReport.seha.hint')} value={seha} onChange={setSeha} caps="characters" maxLen={30} />
            <NBtn label={t('medicalReport.seha.save')} loading={sehaBusy} disabled={sehaBusy || !seha.trim()} onPress={saveSeha} style={{ marginBottom: SP.md }} />
          </>
        )}
        <NBtn label={t('medicalReport.back')} variant="outline" onPress={onBack} />
      </NScroll>
    );
  }

  return (
    <NScroll>
      <NHeader title={t('medicalReport.title')} onBack={onBack} />
      <NCard style={{ marginBottom: SP.xl, flexDirection: isRTL ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
        <NAvatar name={apt?.patient ?? t('medicalReport.patient')} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: FW.bold, color: theme.text, textAlign: align }}>{apt?.patient ?? '—'}</Text>
          {requested && <Text style={{ fontSize: FS.xs, color: theme.info, textAlign: align }}>{t('medicalReport.requestedByPatient')}</Text>}
        </View>
      </NCard>

      <NInput label={t('medicalReport.from')} placeholder="YYYY-MM-DD" value={from} onChange={setFrom} kbType="numbers-and-punctuation" />
      <NInput label={t('medicalReport.to')} placeholder="YYYY-MM-DD" value={to} onChange={setTo} kbType="numbers-and-punctuation"
        hint={days !== null && days >= 1 ? t('medicalReport.daysCount', { days }) : undefined} />
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: SP.sm, flexWrap: 'wrap', marginBottom: SP.lg }}>
        {DAY_CHOICES.map((d) => {
          const on = days === d;
          return (
            <TouchableOpacity key={d} accessibilityRole="button" accessibilityLabel={t('medicalReport.daysCount', { days: d })}
              onPress={() => setTo(endFor(from, d) ?? to)}
              style={{ paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.lg, borderWidth: 1.5, backgroundColor: on ? theme.primary : theme.surface2, borderColor: on ? theme.primary : theme.border }}>
              <Text style={{ color: on ? theme.textInv : theme.text, fontWeight: FW.bold }}>{t('medicalReport.daysCount', { days: d })}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <NInput label={t('medicalReport.reason')} placeholder={t('medicalReport.reasonHint')} value={reason} onChange={setReason} multi lines={3} maxLen={500} required />
      <NToggle label={t('medicalReport.showDiagnosis')} sub={t('medicalReport.showDiagnosisSub')} value={showDiag} onChange={setShowDiag} />
      <NInput label={t('medicalReport.diagnosis')} value={diag} onChange={setDiag} multi lines={2} />

      <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
        <Text style={{ fontSize: FS.sm, color: theme.info, textAlign: align, lineHeight: 20 }}>{t('medicalReport.sehaOnly')}</Text>
      </NCard>
      <NBtn label={t('medicalReport.issue')} loading={busy} disabled={busy || !reason.trim()} onPress={issue} />
    </NScroll>
  );
}
