import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, FIcon } from '../../../packages/ui-native/src';
import { RX_TONE, ConsultScreen, Gate, InfoRow, Section, useConsultFormat, type GateStatus } from '../../src/components/consult/ConsultKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { toMedicationViews, reminderPayload, type MedicationView } from '../../src/utils/prescription-view';

/**
 * Prescription from the doctor — board Consult's card language. Everything is what GET /prescriptions/active returns
 * (the one issued for this appointment when the screen was opened from one): the doctor, the diagnosis, the medicines
 * with their dose, duration and instructions, the requested labs and the doctor's notes. A line the server did not send
 * is not drawn. Reminders are created through POST /health/reminders, the order goes to the pharmacy's prescription flow.
 */

interface Lab {
  id?: string;
  name?: string;
  instructions?: string;
}
interface Prescription {
  id?: string;
  doctor?: string;
  spec?: string;
  date?: string;
  diagnosis?: string;
  notes?: string;
  labs?: Lab[];
  [key: string]: unknown;
}

export default function PrescriptionFromDoctorScreen() {
  const { theme, t, c, flow, k, num } = useScreenUi();
  const { date } = useConsultFormat();
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const [added, setAdded] = useState<string[]>([]);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      // Real backend prescriptions; prefer the one issued for this appointment.
      const response = await apiFetch<unknown>('/prescriptions/active');
      const body = response as { data?: unknown } | unknown[] | null;
      const raw = Array.isArray(body) ? body : (body as { data?: unknown } | null)?.data;
      const list = (Array.isArray(raw) ? raw : []) as Prescription[];
      const match = list.find((p) => (appointmentId ? String(p.appointment_id ?? p.appointmentId ?? '') === String(appointmentId) : true)) ?? null;
      setPrescription(match);
      setStatus(match ? 'ready' : 'missing');
    } catch (e) {
      logError('consultations:prescription-from-doctor', e);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  // The API returns `items`; the screen shows mapped medicine views (src/utils/prescription-view).
  const medications: MedicationView[] = useMemo(() => toMedicationViews(prescription), [prescription]);

  /** Creates the reminder on the server; the row is marked added only when that succeeded. */
  const createReminder = async (med: MedicationView): Promise<boolean> => {
    try {
      await apiFetch('/health/reminders', { method: 'POST', body: JSON.stringify(reminderPayload(med, prescription?.id)) });
      setAdded((p) => (p.includes(med.id) ? p : [...p, med.id]));
      return true;
    } catch (e) {
      logError('consultations:prescription:reminder', e);
      return false;
    }
  };

  const addOne = async (med: MedicationView) => {
    if (!(await createReminder(med))) showLocalizedAlert(k('consult.rx.reminderFailed'), k('consult.rx.tryAgain'));
  };

  const addAll = async () => {
    const pending = medications.filter((m) => !added.includes(m.id));
    let failed = 0;
    for (const med of pending) if (!(await createReminder(med))) failed += 1;
    if (failed) showLocalizedAlert(k('consult.rx.someFailedTitle'), k('consult.rx.someFailedBody', { n: num(failed), total: num(pending.length) }));
  };

  const labs = Array.isArray(prescription?.labs) ? prescription.labs : [];
  const ready = status === 'ready' && prescription;
  const footer = ready ? (
    <>
      {prescription.id ? <Button label={k('consult.rx.order')} size="lg" fullWidth startIcon="package" onPress={() => router.push({ pathname: '/pharmacy/rx-order', params: { prescriptionId: String(prescription.id) } } as unknown as Href)} theme={theme} testID="rx-order" /> : null}
      {labs.length > 0 ? <Button label={k('consult.rx.bookLab')} variant="outline" size="md" fullWidth onPress={() => router.push('/diagnostics/search' as Href)} theme={theme} /> : null}
    </>
  ) : undefined;

  return (
    <ConsultScreen title={k('consult.rx.title')} footer={footer} testID="prescription-from-doctor-screen">
      <Gate status={status} onRetry={() => void load()} missingTitle={k('consult.rx.empty')} missingBody={k('consult.rx.emptyBody')}>
        {prescription ? (
          <>
            <Card theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FIcon icon="prescription" tone={RX_TONE} size={48} theme={theme} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  {prescription.doctor ? <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{prescription.doctor}</Text> : null}
                  {prescription.spec ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{prescription.spec}</Text> : null}
                  {prescription.date ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.tertiary, ...flow }}>{date(prescription.date)}</Text> : null}
                </View>
              </View>
            </Card>

            {prescription.diagnosis ? (
              <Section title={k('consult.rx.diagnosis')}>
                <Card theme={theme}>
                  <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{prescription.diagnosis}</Text>
                </Card>
              </Section>
            ) : null}

            <Section title={k('consult.rx.medicines', { n: num(medications.length) })} actionLabel={medications.length > 0 ? k('consult.rx.addAll') : undefined} onAction={() => void addAll()}>
              {medications.map((med) => {
                const done = added.includes(med.id);
                return (
                  <Card key={med.id} theme={theme}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <FIcon icon="pill" tone={RX_TONE} size={44} theme={theme} />
                      <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, flex: 1, minWidth: 0, ...flow }}>{med.name}</Text>
                    </View>
                    <View style={{ marginTop: 6 }}>
                      <InfoRow label={k('consult.rx.dose')} value={med.dose} />
                      <InfoRow label={k('consult.rx.duration')} value={med.duration_days ? k('consult.rx.days', { n: num(med.duration_days) }) : ''} />
                      <InfoRow label={k('consult.rx.instructions')} value={med.instruction} last />
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      <Button label={done ? k('consult.rx.reminderAdded') : k('consult.rx.addReminder')} variant="outline" size="sm" startIcon={done ? 'check-circle' : 'bell'} disabled={done} onPress={() => void addOne(med)} theme={theme} />
                      {/* catalog medicines only: a manually written line has no product page */}
                      {med.medicine_id ? <Button label={k('consult.rx.details')} variant="ghost" size="sm" startIcon="info" onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { productId: med.medicine_id } } as unknown as Href)} theme={theme} /> : null}
                    </View>
                  </Card>
                );
              })}
            </Section>

            {labs.length > 0 ? (
              <Section title={k('consult.rx.labs', { n: num(labs.length) })}>
                {labs.map((lab, i) => (
                  <Card key={lab.id ?? i} theme={theme}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <FIcon icon="test-tube" tone="mint" size={44} theme={theme} />
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{lab.name}</Text>
                        {lab.instructions ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{lab.instructions}</Text> : null}
                      </View>
                    </View>
                  </Card>
                ))}
              </Section>
            ) : null}

            {prescription.notes ? (
              <Section title={k('consult.rx.notes')}>
                <Card theme={theme}>
                  <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{prescription.notes}</Text>
                </Card>
              </Section>
            ) : null}

            <Button label={k('consult.rx.followUp')} variant="outline" size="md" fullWidth startIcon="calendar-dots" onPress={() => router.push('/consultations/follow-up' as Href)} theme={theme} />
          </>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
