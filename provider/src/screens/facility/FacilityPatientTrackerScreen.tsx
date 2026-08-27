import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme, useLang } from '../../context';
import { NHeader, NCard, NScroll, NBadge } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';

export function FacilityPatientTrackerScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
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
          {patients.map(patient => (
            <NCard key={patient.id} style={{ marginBottom: SP.md, borderLeftWidth: 4, borderLeftColor: patient.status === 'critical' ? theme.danger : patient.status === 'observation' ? theme.warn : theme.success }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SP.sm }}>
                <View>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                    {patient.name}
                  </Text>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2, textAlign: AR ? 'right' : 'left' }}>
                    {patient.mrn}
                  </Text>
                </View>
                <NBadge 
                  label={patient.status === 'critical' ? (AR ? 'حرج' : 'Critical') : patient.status === 'observation' ? (AR ? 'تحت الملاحظة' : 'Observation') : (AR ? 'مستقر' : 'Stable')} 
                  variant={patient.status === 'critical' ? 'danger' : patient.status === 'observation' ? 'warning' : 'success'} 
                />
              </View>
              
              <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.sm, marginTop: SP.sm }}>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? 'الموقع:' : 'Location:'}</Text>
                  <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text }}>{patient.location}</Text>
                </View>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? 'الطبيب المعالج:' : 'Attending:'}</Text>
                  <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text }}>{patient.doctor}</Text>
                </View>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? 'تاريخ الدخول:' : 'Admission:'}</Text>
                  <Text style={{ fontSize: FS.xs, color: theme.text }}>{patient.admissionDate}</Text>
                </View>
              </View>

              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md }}>
                <TouchableOpacity>
                  <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold }}>{AR ? 'سجل الإحالات' : 'Referral Log'}</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? 'ملخص الخروج' : 'Discharge Summary'}</Text>
                </TouchableOpacity>
              </View>
            </NCard>
          ))}
        </View>
      </NScroll>
    </View>
  );
}
