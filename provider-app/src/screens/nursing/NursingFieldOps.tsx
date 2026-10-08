import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import client from '../../api/client';
import { NHeader, NCard, NBtn, NScroll, NInput, NBadge, NSecHeader } from '../../components/ui';
import { SignatureCanvasModal } from '../../components/SignatureCanvasModal';
import { useTheme, useLang, useToast } from '../../context';
import { FS, FW, SP } from '../../constants';

/**
 * THE single home-visit flow of the nursing app. Every entry point (home cards, quick actions, orders tab, checklist)
 * opens this screen, and every step is a server command on /nursing/visits/:id/* that verifies the approved nurse and the
 * visit relation:
 *   accept (governed job accept) → transit → arrive (real device GPS) → start-care → complete (vitals, notes, patient signature).
 * No local simulation. The older home-care booking screens (trip tracker, visit report) were removed in favour of this one.
 */
interface NursingVisitSummary {
  id?: string; state?: string; status?: string; scheduled_at?: string;
  patient_name?: string; patient?: string; address?: string | { address?: string };
}

export function NursingFieldOps({ order, onBack, onRefresh, onNavigate }: { order: NursingVisitSummary | null | undefined, onBack: () => void, onRefresh: () => void, onNavigate?: (s: string, p?: unknown) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const visitId = order?.id;
  const [visit, setVisit] = useState<any>(order || null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [sigOpen, setSigOpen] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [abortReason, setAbortReason] = useState('');
  const [showAbort, setShowAbort] = useState(false);
  const [bp, setBp] = useState('');
  const [glucose, setGlucose] = useState('');
  const [pulse, setPulse] = useState('');
  const [temp, setTemp] = useState('');
  const [followUp, setFollowUp] = useState('');

  const load = useCallback(async () => {
    if (!visitId) { setLoading(false); return; }
    try {
      const r = await client.get(`/nursing/visits/${visitId}`);
      setVisit(r.data || r);
    } catch {
      show(AR ? 'تعذر تحميل الزيارة' : 'Failed to load visit', 'error');
    } finally {
      setLoading(false);
    }
  }, [visitId, AR, show]);

  useEffect(() => { void load(); }, [load]);

  const errMsg = (error: unknown, fallback: string) =>
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

  const act = async (path: string, body?: Record<string, unknown>, okMsg?: string) => {
    setBusy(true);
    try {
      const r = await client.post(`/nursing/visits/${visitId}/${path}`, body || {});
      setVisit(r.data || r);
      onRefresh();
      if (okMsg) show(okMsg, 'success');
      return true;
    } catch (error) {
      show(errMsg(error, AR ? 'تعذر تنفيذ الإجراء' : 'Action failed'), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Governed accept / decline of a new request (same commands as the home sheet; a card visit must be paid first,
  // an insurance visit needs a coverage decision). The old /nursing/visits/:id/respond always answers 503.
  const decide = async (kind: 'accept' | 'reject') => {
    setBusy(true);
    try {
      await client.post(`/provider/jobs/nursing/${visitId}/${kind}`, kind === 'reject' ? { reason: 'provider_declined' } : {});
      onRefresh();
      show(kind === 'accept' ? (AR ? 'تم قبول الزيارة' : 'Visit accepted') : (AR ? 'تم رفض الطلب' : 'Request rejected'), kind === 'accept' ? 'success' : 'info');
      if (kind === 'reject') { onBack(); return; }
      await load();
    } catch (error) {
      show(errMsg(error, AR ? 'تعذر تنفيذ الإجراء' : 'Action failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doArrive = async () => {
    setBusy(true);
    try {
      const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
      const perm = await requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        show(AR ? 'صلاحية الموقع مطلوبة لتسجيل الوصول' : 'Location permission required for check-in', 'error');
        return;
      }
      const pos = await getCurrentPositionAsync({});
      const ok = await act('arrive', { lat: pos.coords.latitude, lng: pos.coords.longitude },
        AR ? 'تم تسجيل الوصول' : 'Checked in');
      if (ok) void load();
    } catch (error) {
      show(errMsg(error, AR ? 'تعذر تسجيل الوصول' : 'Check-in failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doComplete = async () => {
    if (!signature) {
      show(AR ? 'توقيع المريض مطلوب لإنهاء الزيارة' : 'Patient signature required to complete', 'error');
      return;
    }
    const vitals: Record<string, unknown> = {};
    if (bp.trim()) vitals.bp = bp.trim();
    if (pulse.trim()) vitals.pulse = parseInt(pulse, 10);
    if (temp.trim()) vitals.temp = parseFloat(temp);
    if (glucose.trim()) vitals.glucose = parseInt(glucose, 10);
    const ok = await act('complete',
      {
        clinical_notes: notes.trim() || undefined,
        ...(Object.keys(vitals).length ? { vitals } : {}),
        ...(followUp.trim() ? { recommendations: [followUp.trim()] } : {}),
        signature_base64: signature,
      },
      AR ? 'تم إنهاء الزيارة' : 'Visit completed');
    if (ok) { setSignature(null); setNotes(''); setBp(''); setGlucose(''); setPulse(''); setTemp(''); setFollowUp(''); void load(); }
  };

  const state: string = String(visit?.state || visit?.status || '');

  // Live position for the patient's map while on the way (state-free ping on the same booking).
  useEffect(() => {
    if (state !== 'IN_TRANSIT' || !visitId) return;
    const timer = setInterval(async () => {
      try {
        const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
        const perm = await requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') return;
        const pos = await getCurrentPositionAsync({});
        await client.post(`/home-care/bookings/${visitId}/gps`, { lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch { /* the next tick tries again */ }
    }, 5000);
    return () => clearInterval(timer);
  }, [state, visitId]);

  const patientName = String(order?.patient_name || order?.patient || '');
  const addr = typeof order?.address === 'string' ? order.address : (order?.address?.address || '');

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'العمليات الميدانية' : 'Field Operations'} onBack={onBack} />
      <NScroll>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : !visit ? (
          <NCard><Text style={{ color: theme.textSub }}>{AR ? 'تعذر تحميل الزيارة' : 'Visit unavailable'}</Text></NCard>
        ) : (
          <>
            <NCard style={{ gap: SP.sm }}>
              {patientName ? <Text style={{ color: theme.text, fontWeight: FW.bold, fontSize: FS.lg, textAlign: AR ? 'right' : 'left' }}>{patientName}</Text> : null}
              {addr ? <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{addr}</Text> : null}
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: theme.text, fontWeight: FW.bold, fontSize: FS.md }}>
                  {AR ? 'زيارة' : 'Visit'} #{String(visitId).slice(-6)}
                </Text>
                <NBadge label={state} />
              </View>
              {visit?.scheduled_at ? (
                <Text style={{ color: theme.textSub }}>{new Date(visit.scheduled_at).toLocaleString(AR ? 'ar-SA' : 'en-US')}</Text>
              ) : null}
            </NCard>

            <NSecHeader title={AR ? 'إجراءات الزيارة' : 'Visit actions'} />
            {(state === 'NEW_REQUEST' || state === 'PROVIDER_ASSIGNED') && (
              <>
                <NBtn label={AR ? 'قبول الزيارة' : 'Accept visit'} loading={busy} onPress={() => void decide('accept')} />
                <NBtn label={AR ? 'اعتذار عن الزيارة' : 'Decline visit'} variant="danger" disabled={busy} onPress={() => void decide('reject')} />
              </>
            )}
            {state === 'CONFIRMED' && (
              <NBtn label={AR ? 'بدء التحرك للموقع' : 'Start transit'} loading={busy} onPress={() => void act('transit', {}, AR ? 'تم بدء التحرك' : 'Transit started').then((ok) => ok && load())} />
            )}
            {state === 'IN_TRANSIT' && (
              <NBtn label={AR ? 'تسجيل الوصول (GPS)' : 'Check in (GPS)'} loading={busy} onPress={() => void doArrive()} />
            )}
            {state === 'ARRIVED' && (
              <NBtn label={AR ? 'بدء تقديم الرعاية' : 'Start care'} loading={busy} onPress={() => void act('start-care', {}, AR ? 'بدأت الرعاية' : 'Care started').then((ok) => ok && load())} />
            )}
            {(state === 'CARE_IN_PROGRESS' || state === 'IN_PROGRESS') && (
              <NCard style={{ gap: SP.md }}>
                <NInput label={AR ? 'ضغط الدم (BP)' : 'Blood Pressure (BP)'} value={bp} onChange={setBp} />
                <NInput label={AR ? 'مستوى السكر (Glucose)' : 'Blood Glucose'} value={glucose} onChange={setGlucose} kbType="numeric" />
                <NInput label={AR ? 'درجة الحرارة (Temp)' : 'Temperature (C)'} value={temp} onChange={setTemp} kbType="numeric" />
                <NInput label={AR ? 'النبض (Pulse)' : 'Pulse Rate'} value={pulse} onChange={setPulse} kbType="numeric" />
                <NInput label={AR ? 'ملاحظات سريرية' : 'Clinical notes'} value={notes} onChange={setNotes} multi lines={4} />
                <NInput label={AR ? 'التوصيات والمتابعة' : 'Recommendations & follow-up'} value={followUp} onChange={setFollowUp} multi lines={3} />
                <NBtn
                  label={signature ? (AR ? 'إعادة التوقيع' : 'Re-sign') : (AR ? 'توقيع المريض' : 'Patient signature')}
                  variant="outline"
                  onPress={() => setSigOpen(true)}
                />
                {signature ? (
                  <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{AR ? 'تم التقاط التوقيع' : 'Signature captured'}</Text>
                ) : null}
                <NBtn label={AR ? 'إنهاء الزيارة' : 'Complete visit'} loading={busy} onPress={() => void doComplete()} />
              </NCard>
            )}
            {onNavigate && ['CONFIRMED', 'IN_TRANSIT', 'ARRIVED', 'CARE_IN_PROGRESS', 'IN_PROGRESS'].includes(state) && (
              <>
                <NBtn label={AR ? 'قائمة مهام الزيارة' : 'Visit checklist'} variant="outline" onPress={() => onNavigate('checklist', { ...order, id: visitId })} />
                <NBtn label={AR ? 'ملاحظات يومية' : 'Progress notes'} variant="outline" onPress={() => onNavigate('progress', { ...order, id: visitId })} />
              </>
            )}
            {['COMPLETED'].includes(state) && (
              <NCard><Text style={{ color: theme.text }}>{AR ? 'اكتملت الزيارة وسُجلت' : 'Visit completed and recorded'}</Text></NCard>
            )}

            {!['COMPLETED', 'CANCELLED', 'NO_SHOW', 'ESCALATED_EMERGENCY'].includes(state) && (
              <>
                <NSecHeader title={AR ? 'استثناءات' : 'Exceptions'} />
                <NBtn label={AR ? 'المريض لم يحضر' : 'Patient no-show'} variant="outline" loading={busy}
                  onPress={() => void act('no-show', {}, AR ? 'سُجل عدم الحضور' : 'No-show recorded').then((ok) => ok && load())} />
                {!showAbort ? (
                  <NBtn label={AR ? 'إيقاف طارئ' : 'Emergency abort'} variant="outline" onPress={() => setShowAbort(true)} />
                ) : (
                  <NCard style={{ gap: SP.md }}>
                    <NInput label={AR ? 'سبب الإيقاف (إلزامي)' : 'Reason (required)'} value={abortReason} onChange={setAbortReason} />
                    <NBtn label={AR ? 'تأكيد الإيقاف الطارئ' : 'Confirm emergency abort'} loading={busy}
                      onPress={async () => {
                        if (!abortReason.trim()) {
                          show(AR ? 'السبب إلزامي' : 'Reason required', 'error');
                          return;
                        }
                        const ok = await act('emergency-abort', { reason: abortReason.trim() }, AR ? 'تم الإيقاف' : 'Aborted');
                        if (ok) { setShowAbort(false); setAbortReason(''); void load(); }
                      }} />
                  </NCard>
                )}
              </>
            )}
          </>
        )}
      </NScroll>
      <SignatureCanvasModal visible={sigOpen} onClose={() => setSigOpen(false)} onOK={(data: string | { signatureData?: string }) => { setSignature(typeof data === 'string' ? data : data?.signatureData || null); setSigOpen(false); }} />
    </View>
  );
}

