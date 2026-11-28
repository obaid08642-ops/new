import React, { useState, useEffect, useCallback } from 'react';
import { bookingChoiceLine } from './bookingChoice';
import { View, Text, ActivityIndicator } from 'react-native';
import client from '../../api/client';
import { NHeader, NCard, NBtn, NScroll, NInput, NBadge, NSecHeader } from '../../components/ui';
import { SignatureCanvasModal } from '../../components/SignatureCanvasModal';
import { useTheme, useLang, useToast } from '../../context';
import { FS, FW, SP } from '../../constants';
import { MAX_VISIT_FILES, PickedVisitFile, buildVisitReportBody, pickVisitFile, uploadVisitFiles } from './visitFiles';
import { useUploadsEnabled } from '../../hooks/useUploadsEnabled';
import { UploadsUnavailable } from '../../components/UploadsUnavailable';
import { announceScan } from '../../components/ScanStatusBadge';
import { scanOfStored, scanStateOfRequestError } from '../../utils/scanRegistry';

/**
 * THE single home-visit flow of the nursing app. Every entry point (home cards, quick actions, orders tab, checklist)
 * opens this screen, and every step is a server command on /nursing/visits/:id/* that verifies the approved nurse and the
 * visit relation:
 *   accept (governed job accept) → transit → arrive (real device GPS) → start-care → complete (vitals, notes, patient signature).
 * No local simulation. The older home-care booking screens (trip tracker, visit report) were removed in favour of this one.
 */
interface NursingVisitSummary {
  id?: string; state?: string; status?: string; scheduled_at?: string;
  booking_mode?: string; recurrence?: string; hours?: number; shift?: string; period?: string; sessions_count?: number;
  patient_name?: string; patient?: string; address?: string | { address?: string };
}

export function NursingFieldOps({ order, onBack, onRefresh, onNavigate }: { order: NursingVisitSummary | null | undefined, onBack: () => void, onRefresh: () => void, onNavigate?: (s: string, p?: unknown) => void }) {
  const uploadsOn = useUploadsEnabled();
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
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
  const [files, setFiles] = useState<PickedVisitFile[]>([]);

  const load = useCallback(async () => {
    if (!visitId) { setLoading(false); return; }
    try {
      const r = await client.get(`/nursing/visits/${visitId}`);
      setVisit(r.data || r);
    } catch {
      show(tt('nfo.abdf05c8'), 'error');
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
      show(errMsg(error, tt('nfo.b1ec89a1')), 'error');
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
      show(kind === 'accept' ? (tt('nfo.e7c3a7ac')) : (tt('nfo.91447f9b')), kind === 'accept' ? 'success' : 'info');
      if (kind === 'reject') { onBack(); return; }
      await load();
    } catch (error) {
      show(errMsg(error, tt('nfo.b1ec89a1')), 'error');
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
        show(tt('nfo.81da760d'), 'error');
        return;
      }
      const pos = await getCurrentPositionAsync({});
      const ok = await act('arrive', { lat: pos.coords.latitude, lng: pos.coords.longitude },
        tt('nfo.dc4851e1'));
      if (ok) void load();
    } catch (error) {
      show(errMsg(error, tt('nfo.4f996b46')), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doComplete = async () => {
    if (!signature) {
      show(tt('nfo.7e400624'), 'error');
      return;
    }
    const vitals: Record<string, unknown> = {};
    if (bp.trim()) vitals.bp = bp.trim();
    if (pulse.trim()) vitals.pulse = parseInt(pulse, 10);
    if (temp.trim()) vitals.temp = parseFloat(temp);
    if (glucose.trim()) vitals.glucose = parseInt(glucose, 10);
    // N1: with result files, upload each one then complete through the visit report (the only route that stores attachments).
    if (files.length) {
      setBusy(true);
      try {
        const attachments = await uploadVisitFiles(files);
        // a file the scan has not passed yet is told to the provider (the visit report still goes through; the patient sees it once it passes)
        for (const att of attachments) announceScan(show, lang, scanOfStored(att.storage_id));
        await client.post(`/home-care/bookings/${visitId}/visit-report`,
          buildVisitReportBody({ attachments, vitals, notes, followUp, signature }));
        show(tt('nfo.cffe9758'), 'success');
        setSignature(null); setNotes(''); setBp(''); setGlucose(''); setPulse(''); setTemp(''); setFollowUp(''); setFiles([]);
        onRefresh(); void load();
      } catch (error) {
        if (scanStateOfRequestError(error) === 'rejected') announceScan(show, lang, 'rejected');
        else show(errMsg(error, tt('nfo.b560e711')), 'error');
      } finally {
        setBusy(false);
      }
      return;
    }
    const ok = await act('complete',
      {
        clinical_notes: notes.trim() || undefined,
        ...(Object.keys(vitals).length ? { vitals } : {}),
        ...(followUp.trim() ? { recommendations: [followUp.trim()] } : {}),
        signature_base64: signature,
      },
      tt('nfo.b86f363b'));
    if (ok) { setSignature(null); setNotes(''); setBp(''); setGlucose(''); setPulse(''); setTemp(''); setFollowUp(''); void load(); }
  };

  const state: string = String(visit?.state || visit?.status || '');
  const isNewOrAssigned = state === 'NEW_REQUEST' || state === 'PROVIDER_ASSIGNED';
  const isConfirmedState = state === 'CONFIRMED';
  const isInTransitState = state === 'IN_TRANSIT';
  const isArrivedState = state === 'ARRIVED';
  const isCareInProgress = state === 'CARE_IN_PROGRESS' || state === 'IN_PROGRESS';

  // Live position for the patient's map while on the way (state-free ping on the same booking).
  useEffect(() => {
    if (state !== 'IN_TRANSIT' || !visitId) return;
    const timer = setInterval(async () => {
      try {
        const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
        const perm = await requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') return;
        const pos = await getCurrentPositionAsync({});
        await client.post(`/nursing/visits/${visitId}/position`, { lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch { /* the next tick tries again */ }
    }, 5000);
    return () => clearInterval(timer);
  }, [state, visitId]);

  const patientName = String(order?.patient_name || order?.patient || '');
  const addr = typeof order?.address === 'string' ? order.address : (order?.address?.address || '');

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('nfo.6b75d828')} onBack={onBack} />
      <NScroll>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : !visit ? (
          <NCard><Text style={{ color: theme.textSub }}>{tt('nfo.9b0a16cd')}</Text></NCard>
        ) : (
          <>
            <NCard style={{ gap: SP.sm }}>
              {patientName ? <Text style={{ color: theme.text, fontWeight: FW.bold, fontSize: FS.lg, textAlign: AR ? 'right' : 'left' }}>{patientName}</Text> : null}
              {addr ? <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{addr}</Text> : null}
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: theme.text, fontWeight: FW.bold, fontSize: FS.md }}>
                  {tt('nfo.73538330')} #{String(visitId).slice(-6)}
                </Text>
                <NBadge label={state} />
              </View>
              {bookingChoiceLine(visit, AR) ? <Text style={{ color: theme.text, fontWeight: FW.bold }}>{bookingChoiceLine(visit, AR)}</Text> : null}
              {visit?.scheduled_at ? (
                <Text style={{ color: theme.textSub }}>{new Date(visit.scheduled_at).toLocaleString(AR ? 'ar-SA' : 'en-US')}</Text>
              ) : null}
            </NCard>

            <NSecHeader title={tt('nfo.0d7ee11c')} />
            {isNewOrAssigned && (
              <>
                <NBtn label={tt('nfo.8a6e9842')} loading={busy} onPress={() => void decide('accept')} />
                <NBtn label={tt('nfo.9cf13816')} variant="danger" disabled={busy} onPress={() => void decide('reject')} />
              </>
            )}
            {isConfirmedState && (
              <NBtn label={tt('nfo.438d3a9d')} loading={busy} onPress={() => void act('transit', {}, tt('nfo.149ca35e')).then((ok) => ok && load())} />
            )}
            {isInTransitState && (
              <NBtn label={tt('nfo.26623bc9')} loading={busy} onPress={() => void doArrive()} />
            )}
            {isArrivedState && (
              <NBtn label={tt('nfo.829cd0b0')} loading={busy} onPress={() => void act('start-care', {}, tt('nfo.144091ea')).then((ok) => ok && load())} />
            )}
            {isCareInProgress && (
              <NCard style={{ gap: SP.md }}>
                <NInput label={tt('nfo.6f62e156')} value={bp} onChange={setBp} />
                <NInput label={tt('nfo.34a7ced9')} value={glucose} onChange={setGlucose} kbType="numeric" />
                <NInput label={tt('nfo.6f6bf8ad')} value={temp} onChange={setTemp} kbType="numeric" />
                <NInput label={tt('nfo.dded75e8')} value={pulse} onChange={setPulse} kbType="numeric" />
                <NInput label={tt('nfo.bc8d92c0')} value={notes} onChange={setNotes} multi lines={4} />
                <NInput label={tt('nfo.0d0cd336')} value={followUp} onChange={setFollowUp} multi lines={3} />
                <NBtn
                  label={signature ? (tt('nfo.d904e855')) : (tt('nfo.6152deae'))}
                  variant="outline"
                  onPress={() => setSigOpen(true)}
                />
                {signature ? (
                  <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{tt('nfo.602133d5')}</Text>
                ) : null}
                <NSecHeader title={tt('nfo.6d839fd9')} />
                {files.map((f, i) => (
                  <View key={`${f.uri}-${i}`} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: SP.sm }}>
                    <Text numberOfLines={1} style={{ color: theme.text, fontSize: FS.sm, flex: 1, textAlign: AR ? 'right' : 'left' }}>{f.name}</Text>
                    <NBtn label={tt('nfo.c91a997c')} variant="outline" disabled={busy} onPress={() => setFiles((cur) => cur.filter((_, j) => j !== i))} />
                  </View>
                ))}
                {files.length < MAX_VISIT_FILES ? (
                  (uploadsOn ? <NBtn label={tt('nfo.07d5eb73')} variant="outline" disabled={busy}
                    onPress={async () => {
                      try {
                        const f = await pickVisitFile();
                        if (f) setFiles((cur) => [...cur, f].slice(0, MAX_VISIT_FILES));
                      } catch { show(tt('nfo.f4c75f0a'), 'error'); }
                    }} /> : <UploadsUnavailable />)
                ) : (
                  <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{tt('nfo.d653f866')}</Text>
                )}
                <NBtn label={tt('nfo.df42d4f4')} loading={busy} onPress={() => void doComplete()} />
              </NCard>
            )}
            {onNavigate && ['CONFIRMED', 'IN_TRANSIT', 'ARRIVED', 'CARE_IN_PROGRESS', 'IN_PROGRESS'].includes(state) && (
              <>
                <NBtn label={tt('nfo.7799a498')} variant="outline" onPress={() => onNavigate('checklist', { ...order, id: visitId })} />
                <NBtn label={tt('nfo.f76e559f')} variant="outline" onPress={() => onNavigate('progress', { ...order, id: visitId })} />
              </>
            )}
            {['COMPLETED'].includes(state) && (
              <NCard><Text style={{ color: theme.text }}>{tt('nfo.6e0603b1')}</Text></NCard>
            )}

            {/* the server allows no-show only once the nurse has arrived (home-care.controller triggerNoShow) and an emergency abort only on the road, arrived or in care */}
            {['IN_TRANSIT', 'ARRIVED', 'CARE_IN_PROGRESS'].includes(state) && (
              <>
                <NSecHeader title={tt('nfo.3f85e2bb')} />
                {state === 'ARRIVED' ? (
                  <NBtn label={tt('nfo.df01ea04')} variant="outline" loading={busy}
                    onPress={() => void act('no-show', {}, tt('nfo.931c9340')).then((ok) => ok && load())} />
                ) : null}
                {!showAbort ? (
                  <NBtn label={tt('nfo.52129bde')} variant="outline" onPress={() => setShowAbort(true)} />
                ) : (
                  <NCard style={{ gap: SP.md }}>
                    <NInput label={tt('nfo.96b5c734')} value={abortReason} onChange={setAbortReason} />
                    <NBtn label={tt('nfo.07447de3')} loading={busy}
                      onPress={async () => {
                        if (!abortReason.trim()) {
                          show(tt('nfo.6d87f1f3'), 'error');
                          return;
                        }
                        const ok = await act('emergency-abort', { reason: abortReason.trim() }, tt('nfo.afa81980'));
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

