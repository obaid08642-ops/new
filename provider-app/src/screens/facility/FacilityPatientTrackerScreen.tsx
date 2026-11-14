import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme, useLang } from '../../context';
import { NHeader, NCard, NScroll, NBadge, NEmpty } from '../../components/ui';
import { localeTag } from '../../i18n';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';

export function FacilityPatientTrackerScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate?: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  const { lang, t, isRTL } = useLang();
  const AR = lang === 'ar';

  const [patients, setPatients] = useState<any[]>([]);

  React.useEffect(() => {
    client.get('/provider/facility/patients/active')
      .then(res => setPatients(res.data || []))
      .catch(() => setPatients([]));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'تتبع المرضى (Patient Tracker)' : 'Patient Tracker'} onBack={onBack} />
      
      <View style={{ padding: SP.md, backgroundColor: theme.surface }}>
        <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center' }}>
          {AR ? 'مراقبة حية للمرضى المنومين وحالات الطوارئ' : 'Live monitoring for inpatients and ER cases'}
        </Text>
      </View>

      <NScroll>
        <View style={{ padding: SP.xl }}>
          {patients.length === 0 && <NEmpty icon="users" title={t('tracker.empty.title')} sub={t('tracker.empty.sub')} />}
          {patients.map(patient => {
            const inpatient = patient.kind === 'inpatient';
            const where = patient.ward_name ? t('tracker.bed', { ward: patient.ward_name, bed: patient.bed_number || '—' }) : null;
            const since = inpatient ? patient.admitted_at : patient.appointment_at;
            const doctor = lang === 'ar' ? patient.doctor_name : (patient.doctor_name_en || patient.doctor_name);
            const row = (label: string, value?: string | null) => !!value && (
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
                <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{label}</Text>
                <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text }}>{value}</Text>
              </View>
            );
            return (
              <NCard key={patient.id} style={{ marginBottom: SP.md }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SP.sm }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: isRTL ? 'right' : 'left' }}>{patient.name}</Text>
                  <NBadge label={t(inpatient ? 'tracker.inpatient' : 'tracker.booked')} variant={inpatient ? 'info' : 'default'} />
                </View>
                {(where || since || doctor) && (
                  <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.sm, marginTop: SP.sm }}>
                    {row(t('tracker.location'), where)}
                    {row(t('tracker.doctor'), doctor)}
                    {row(t(inpatient ? 'tracker.admitted' : 'tracker.nextVisit'), since ? new Date(since).toLocaleDateString(localeTag(lang)) : null)}
                  </View>
                )}
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md }}>
                  {inpatient && (
                    <TouchableOpacity onPress={() => onNavigate?.('discharge_summary', patient)}>
                      <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{t('tracker.discharge')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => onNavigate?.('prescription', { patient: patient.name, patient_id: patient.id })}>
                    <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold }}>{t('tracker.prescription')}</Text>
                  </TouchableOpacity>
                </View>
              </NCard>
            );
          })}
        </View>
      </NScroll>
    </View>
  );
}
