import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import { NBtn, NCard, NInput, NHeader, NScroll } from '../../../components/ui';
import { SP, R, FS, FW } from '../../../constants';
import client from '../../../api/client';
import { useServicesCatalog } from '../../../api/catalogs';
import { buildIssueReferralBody, ISSUE_REFERRAL_URL } from './issueReferral';
import { styles } from './_shared';

// PT-05: the doctor refers the patient of a visit to lab tests / radiology scans (plus home-care notes). The patient sees the referral
// in the visit outcomes and books it from there.
const KIND_LABEL = { lab: 'issueReferral.kind.lab', radiology: 'issueReferral.kind.radiology' } as const;
const MISSING_LABEL = {
  visit: 'issueReferral.missing.visit',
  patient: 'issueReferral.missing.patient',
  doctor: 'issueReferral.missing.doctor',
  items: 'issueReferral.missing.items',
} as const;

export function IssueReferralScreen({ apt, onBack }: { apt: any; onBack: () => void }) {
  const { theme } = useTheme();
  const { lang, isRTL, t } = useLang();
  const { user } = useAuth();
  const { show } = useToast();
  const rtl = isRTL;
  const [kind, setKind] = useState<'lab' | 'radiology'>('lab');
  const [lab, setLab] = useState<string[]>([]);
  const [rad, setRad] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const items = useServicesCatalog(kind);
  const selected = kind === 'lab' ? lab : rad;
  const setSelected = kind === 'lab' ? setLab : setRad;
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const align = rtl ? 'right' : 'left';

  const send = async () => {
    const built = buildIssueReferralBody({
      appointmentId: apt?.id || apt?.appointment_id,
      patientId: apt?.patient_id,
      doctorId: user?.id,
      labTests: lab,
      radScans: rad,
      homeCareNotes: notes,
    });
    if ('missing' in built) {
      show(t(MISSING_LABEL[built.missing]), 'warning');
      return;
    }
    setBusy(true);
    try {
      await client.post(ISSUE_REFERRAL_URL, built.body);
      show(t('issueReferral.sent'), 'success');
      onBack();
    } catch {
      show(t('issueReferral.failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <NScroll>
      <NHeader title={t('issueReferral.title')} onBack={onBack} />
      <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.lg }}>
        {(['lab', 'radiology'] as const).map((k) => (
          <TouchableOpacity
            key={k}
            accessibilityRole="button"
            accessibilityLabel={t(KIND_LABEL[k])}
            onPress={() => setKind(k)}
            style={{ flex: 1, paddingVertical: SP.md, borderRadius: R.lg, borderWidth: 1.5, alignItems: 'center',
              backgroundColor: kind === k ? theme.primary : theme.surface2, borderColor: kind === k ? theme.primary : theme.border }}>
            <Text style={{ color: kind === k ? theme.textInv : theme.text, fontWeight: FW.semi, fontSize: FS.sm }}>{t(KIND_LABEL[k])}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={{ color: theme.textSub, fontSize: FS.sm, textAlign: align, marginBottom: SP.md }}>
        {t('issueReferral.selected', { n: lab.length + rad.length })}
      </Text>
      {items.map((item: any) => {
        const on = selected.includes(item.id);
        return (
          <TouchableOpacity key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(item.id)}>
            <NCard style={{ marginBottom: SP.sm }}>
              <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
                <View style={[styles.insureCheck, { backgroundColor: on ? theme.primary : 'transparent', borderColor: on ? theme.primary : theme.border }]} />
                <Text style={{ flex: 1, fontSize: FS.md, color: theme.text, fontWeight: FW.med, textAlign: align }}>{lang === 'ar' ? item.ar : item.en}</Text>
              </View>
            </NCard>
          </TouchableOpacity>
        );
      })}
      <View style={{ height: SP.lg }} />
      <NInput label={t('issueReferral.notes')} value={notes} onChange={setNotes} multi lines={3} icon="" />
      <NBtn label={t('issueReferral.send')} loading={busy} disabled={busy} onPress={send} />
    </NScroll>
  );
}
