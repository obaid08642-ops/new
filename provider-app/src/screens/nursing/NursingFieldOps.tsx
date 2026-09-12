import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import client from '../../api/client';
import { NHeader, NCard, NBtn, NScroll, NInput, NBadge, NSecHeader } from '../../components/ui';
import { SignatureCanvasModal } from '../../components/SignatureCanvasModal';
import { useTheme, useLang, useToast } from '../../context';
import { FS, FW, SP } from '../../constants';

/**
 * Real nursing field operations (P5-b) — replaces the disabled simulation.
 * Every action hits a server command that verifies the approved nurse and
 * visit relation: respond → transit → arrive (real device GPS) → start-care
 * → complete (clinical notes + patient signature). No local simulation.
 */
export function NursingFieldOps({ order, onBack, onRefresh }: { order: any, onBack: () => void, onRefresh: () => void }) {
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

  const act = async (path: string, body?: any, okMsg?: string) => {
    setBusy(true);
    try {
      const r = await client.post(`/nursing/visits/${visitId}/${path}`, body || {});
      setVisit(r.data || r);
      onRefresh();
      if (okMsg) show(okMsg, 'success');
      return true;
    } catch (error: any) {
      show(error?.response?.data?.message || (AR ? 'تعذر تنفيذ الإجراء' : 'Action failed'), 'error');
      return false;
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
      const pos = await getCurrentPositionAsync({ accuracy: 5 } as any);
      const ok = await act('arrive', { lat: pos.coords.latitude, lng: pos.coords.longitude },
        AR ? 'تم تسجيل الوصول' : 'Checked in');
      if (ok) void load();
    } catch (error: any) {
      show(error?.response?.data?.message || (AR ? 'تعذر تسجيل الوصول' : 'Check-in failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doComplete = async () => {
    if (!signature) {
      show(AR ? 'توقيع المريض مطلوب لإنهاء الزيارة' : 'Patient signature required to complete', 'error');
      return;
    }
    const ok = await act('complete',
      { clinical_notes: notes.trim() || undefined, signature_base64: signature },
      AR ? 'تم إنهاء الزيارة' : 'Visit completed');
    if (ok) { setSignature(null); setNotes(''); void load(); }
  };

  const state: string = String(visit?.state || visit?.status || '');
  const can = (s: string) => !busy && !!visitId;

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
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
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
            {(state === 'NEW_REQUEST') && (
              <NBtn label={AR ? 'قبول الزيارة' : 'Accept visit'} loading={busy} onPress={() => void act('respond', {}, AR ? 'تم قبول الزيارة' : 'Visit accepted').then((ok) => ok && load())} />
            )}
            {(state === 'CONFIRMED' || state === 'PROVIDER_ASSIGNED') && (
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
                <NInput label={AR ? 'ملاحظات سريرية' : 'Clinical notes'} value={notes} onChange={setNotes} />
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
      <SignatureCanvasModal visible={sigOpen} onClose={() => setSigOpen(false)} onOK={(data: any) => { setSignature(data?.signatureData || data); setSigOpen(false); }} />
    </View>
  );
}

