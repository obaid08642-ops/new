import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button } from '../../../packages/ui-native/src';
import { CARE_TONE, ConsultScreen, Gate, InfoRow, ResultHero, goBack, type GateStatus } from '../../src/components/consult/ConsultKit';
import { Block, PersonRow, TrackHead } from '../../src/components/diagnostics/DiagKit';
import MapView, { Marker, PROVIDER_DEFAULT } from '../../src/components/MapPrimitives';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';

type Rec = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
const num = (v: unknown): number | null => (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * Where the nurse is (board OrderTracking): the live map with the nurse and the destination, the minutes to arrival, who it
 * is with the call button, and once the visit is done the clinical report. Polls the tracking every 15 seconds (as before).
 * `type=nurse`: the nurse comes to the patient; any other: the patient goes to the pick-up point.
 */
export default function NursingLiveTracking() {
  const { theme, t, c, k, num: fmtNum } = useScreenUi();
  const { type, bookingId } = useLocalSearchParams<{ type?: string; bookingId?: string }>();
  const [tracking, setTracking] = useState<Rec | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');
  const [files, setFiles] = useState<Array<{ id: string; name: string }>>([]);
  const [fileError, setFileError] = useState(false);

  const fetchTracking = useCallback(
    async (isStopped: () => boolean) => {
      try {
        const res = await apiFetch<Rec>(`/nursing/visits/${bookingId}/tracking`);
        if (isStopped()) return;
        setTracking(res);
        const minutes = num(res?.eta_minutes);
        if (minutes !== null) setEta(minutes);
        setStatus('ready');
      } catch (err) {
        logError('nursing:live-tracking', err);
        if (!isStopped()) setStatus((await isOffline()) ? 'offline' : 'error');
      }
    },
    [bookingId],
  );

  useEffect(() => {
    if (!bookingId) {
      setStatus('error');
      return;
    }
    let stopped = false;
    const stop = () => stopped;
    void fetchTracking(stop);
    // the live API every 15 seconds (never a local countdown)
    const interval = setInterval(() => void fetchTracking(stop), 15000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [bookingId, fetchTracking]);

  const visitDone = tracking?.status === 'COMPLETED';
  // N1: once the visit is done, the result files the nurse attached ({storage_id, name, mime, at}) come with the visit record.
  useEffect(() => {
    if (!visitDone || !bookingId) return;
    let stopped = false;
    void (async () => {
      try {
        const res = await apiFetch<Rec>(`/nursing/visits/${bookingId}`);
        const list = Array.isArray(res?.attachments) ? (res.attachments as Rec[]) : [];
        const next = list
          .filter((f) => typeof f?.storage_id === 'string')
          .slice(0, 10)
          .map((f) => ({ id: String(f.storage_id), name: str(f.name) || String(f.storage_id) }));
        if (!stopped) setFiles(next);
      } catch (err) {
        logError('nursing:visit-files', err);
      }
    })();
    return () => { stopped = true; };
  }, [visitDone, bookingId]);

  const openFile = async (id: string) => {
    setFileError(false);
    try {
      const res = await apiFetch<Rec>(`/storage/${encodeURIComponent(id)}/signed-url`);
      const url = str(res?.url);
      if (!url.startsWith('https://')) throw new Error('no_url');
      await Linking.openURL(url);
    } catch (err) {
      logError('nursing:open-file', err);
      setFileError(true);
    }
  };

  const nurseComing = type === 'nurse';
  const phone = str(tracking?.nurse_phone);
  const lat = num(tracking?.current_lat);
  const lng = num(tracking?.current_lng);
  const destLat = num(tracking?.hospital_lat);
  const destLng = num(tracking?.hospital_lng);
  const name = str(tracking?.nurse_name) || k('nur.live.team');
  const done = tracking?.status === 'COMPLETED';
  const vitals = (tracking?.vitals ?? null) as Rec | null;
  const hasReport = Boolean(tracking?.vitals || tracking?.notes);
  const dash = '—';

  const onAction = () => {
    if (nurseComing) {
      if (phone) void Linking.openURL(`tel:${phone}`);
    } else if (destLat !== null && destLng !== null) {
      void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`);
    }
  };

  if (done) {
    return (
      <ConsultScreen testID="nursing-live-tracking" title={k('nur.live.doneTitle')} onBack={() => goBack('/(tabs)' as Href)} footer={<Button theme={theme} size="lg" fullWidth label={k('nur.live.rateHome')} onPress={() => router.push('/(tabs)' as Href)} />}>
        <ResultHero icon="check-circle" tone="success" title={k('nur.live.doneHeadline')} body={k('nur.live.doneBody')} />
        <Block gap={4}>
          <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary }}>{k('nur.live.report')}</Text>
          {hasReport ? (
            <>
              <InfoRow label={k('nur.live.pulse')} value={str(vitals?.pulse) || dash} />
              <InfoRow label={k('nur.live.bp')} value={str(vitals?.bp) || dash} />
              <InfoRow label={k('nur.live.notes')} value={str(tracking?.notes) || dash} last />
            </>
          ) : (
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary }}>{k('nur.live.noReport')}</Text>
          )}
        </Block>
        {files.length > 0 ? (
          <Block gap={8}>
            <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary }}>{k('nur.live.files')}</Text>
            {files.map((f) => (
              <Button key={f.id} theme={theme} size="lg" fullWidth variant="secondary" label={f.name} onPress={() => void openFile(f.id)} />
            ))}
            {fileError ? <Text accessibilityRole="alert" style={{ ...scale(t, 'small', 'regular'), color: c.status.danger.fg }}>{k('nur.live.fileError')}</Text> : null}
          </Block>
        ) : null}
      </ConsultScreen>
    );
  }

  return (
    <ConsultScreen testID="nursing-live-tracking" title={nurseComing ? k('nur.live.title') : k('nur.live.titleGo')} onBack={() => goBack('/(tabs)' as Href)} onRefresh={() => void fetchTracking(() => false)}>
      <Gate status={status} onRetry={() => void fetchTracking(() => false)}>
        <View style={{ height: 240, borderRadius: 24, overflow: 'hidden', backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
          {lat !== null && lng !== null ? (
            <MapView provider={PROVIDER_DEFAULT} style={StyleSheet.absoluteFill} region={{ latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}>
              <Marker coordinate={{ latitude: lat, longitude: lng }} title={nurseComing ? k('nur.live.pinNurse') : k('nur.live.pinParamedic')} pinColor={c.status.info.fg} />
              {destLat !== null && destLng !== null ? <Marker coordinate={{ latitude: destLat, longitude: destLng }} title={nurseComing ? k('nur.live.pinHome') : k('nur.live.pinPickup')} pinColor={c.status.danger.fg} /> : null}
            </MapView>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
              <Glyph name="map-pin" size={32} color={c.icon.secondary} />
              <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('nur.live.noLocation')}</Text>
            </View>
          )}
        </View>
        <Block gap={16}>
          <TrackHead label={k('nur.live.eta')} value={eta !== null ? k('diag.track.minutes', { n: fmtNum(eta) }) : k('nur.live.noEta')} />
          <View style={{ gap: 4 }}>
            <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary }}>{nurseComing ? k('nur.live.onTheWay') : k('nur.live.goPick')}</Text>
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary }}>{nurseComing ? k('nur.live.arrives', { name }) : k('nur.live.goPickBody')}</Text>
          </View>
          <PersonRow
            icon="user-circle"
            tone={CARE_TONE}
            title={name}
            line={str(tracking?.nurse_title) || k('nur.live.role')}
            actionIcon={nurseComing ? (phone ? 'headset' : undefined) : destLat !== null && destLng !== null ? 'map-pin-line' : undefined}
            actionLabel={nurseComing ? k('nur.live.call') : k('nur.live.directions')}
            onAction={onAction}
          />
        </Block>
      </Gate>
    </ConsultScreen>
  );
}
