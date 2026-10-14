import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, EmptyState } from '../../../packages/ui-native/src';
import { CARE_TONE, ConsultScreen, Gate, InfoRow, ResultHero, type GateStatus } from '../../src/components/consult/ConsultKit';
import { AmountLine, Block, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { nursingStatus } from '../../src/components/nursing/NursingKit';
import { useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';

type Rec = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');

/** The states in which the visit can already be followed live. */
const TRACKABLE = ['CONFIRMED', 'IN_PROGRESS', 'APPROVED_FULL'];

/** Where the insurance approval of a home-nursing booking stands: the state, the decision, the co-pay and the way on (board ServiceHub, insurance). */
export default function NursingInsuranceStatusScreen() {
  const { theme, k } = useScreenUi();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const id = Array.isArray(bookingId) ? bookingId[0] : bookingId;
  const [booking, setBooking] = useState<Rec | null>(null);
  const [status, setStatus] = useState<GateStatus | 'none'>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      let found: Rec | null = null;
      if (id) {
        const one = await apiFetch<Rec | { data?: Rec }>(`/home-care/bookings/${encodeURIComponent(id)}`).catch(() => null);
        found = ((one as { data?: Rec } | null)?.data ?? (one as Rec | null)) as Rec | null;
      }
      if (!found?.id) {
        const list = await apiFetch<unknown>('/home-care/bookings/my?limit=5').catch(() => null);
        const arr = (list as { data?: unknown } | null)?.data ?? list;
        found = Array.isArray(arr) ? ((arr as Rec[]).find((b) => b?.payment_method === 'insurance') ?? (arr[0] as Rec | undefined) ?? null) : null;
      }
      setBooking(found?.id ? found : null);
      setStatus(found?.id ? 'ready' : 'none');
    } catch (err) {
      logError('nursing:insurance-status', err);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const state = str(booking?.state ?? booking?.status);
  const look = nursingStatus(state);
  const copay = Number(booking?.copay_amount ?? booking?.patient_share ?? NaN);
  const decisionRec = (booking?.insurance_decision ?? booking?.coverage_decision ?? null) as Rec | null;
  const decisionCode = decisionRec ? str(decisionRec.outcome ?? decisionRec.decision) : '';
  const decision = decisionCode ? k(nursingStatus(decisionCode).key) : '';
  const icon = look.tone === 'success' ? 'check-circle' : look.tone === 'danger' ? 'x-circle' : 'shield-check';
  const canTrack = TRACKABLE.includes(state) && Boolean(booking?.id);

  const footer = canTrack ? (
    <Button theme={theme} size="lg" fullWidth label={k('nur.ins.openTracking')} onPress={() => router.push({ pathname: '/nursing/live-tracking', params: { bookingId: str(booking?.id) } } as unknown as Href)} />
  ) : undefined;

  return (
    <ConsultScreen testID="nursing-insurance-status" title={k('nur.ins.title')} onBack={goBackDiag} footer={footer} onRefresh={() => void load()}>
      {status === 'none' ? (
        <View style={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 24 }}>
          <EmptyState icon="shield-check" tone={CARE_TONE} title={k('nur.ins.none')} body={k('nur.ins.noneBody')} actionLabel={k('nur.visits.title')} onAction={() => router.push('/nursing/visits' as Href)} theme={theme} />
        </View>
      ) : (
        <Gate status={status} onRetry={() => void load()}>
          <ResultHero icon={icon} tone={look.tone} title={k(look.key)} body={k('nur.ins.note')} />
          {decision || (Number.isFinite(copay) && copay > 0) ? (
            <Block gap={4}>
              {decision ? <InfoRow label={k('nur.ins.decision')} value={decision} last={!(Number.isFinite(copay) && copay > 0)} /> : null}
              {Number.isFinite(copay) && copay > 0 ? <AmountLine label={k('nur.ins.copay')} amount={copay} strong /> : null}
            </Block>
          ) : null}
        </Gate>
      )}
    </ConsultScreen>
  );
}
