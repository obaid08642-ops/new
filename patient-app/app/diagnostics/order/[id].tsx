import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button } from '../../../../packages/ui-native/src';
import { CARE_TONE, ConsultScreen, Gate, InfoRow, Section, useConsultFormat, type GateStatus } from '../../../src/components/consult/ConsultKit';
import { Block, ListCard, PersonRow, Timeline, diagStatus, goBackDiag, type TimelineStep } from '../../../src/components/diagnostics/DiagKit';
import { showLocalizedAlert } from '../../../src/components/LocalizedAlert';
import { StatusPill } from '../../../src/components/orders/OrderKit';
import { Notice, Money } from '../../../src/components/pharmacy/OfferKit';
import { step as scale, useScreenUi } from '../../../src/components/screen/ScreenKit';
import { apiFetch } from '../../../src/utils/api';
import { isOffline } from '../../../src/utils/isOffline';
import { logError } from '../../../src/utils/logger';
import { recordOf } from '../../../src/utils/labMappers';

type Rec = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
const rec = (v: unknown): Rec | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : null);

// The stages of a booking, in the server's own state words (the old words map onto the first set for a lab).
const LAB_STAGES = [
  { key: 'NEW_REQUEST', label: 'diag.stage.requested' },
  { key: 'CONFIRMED', label: 'diag.stage.confirmed' },
  { key: 'PROCESSING', label: 'diag.stage.processing' },
  { key: 'REPORTED', label: 'diag.stage.resultReady' },
];
const RAD_STAGES = [
  { key: 'PENDING_INSURANCE', label: 'diag.stage.insurance' },
  { key: 'CONFIRMED', label: 'diag.stage.confirmed' },
  { key: 'IN_SCANNING', label: 'diag.stage.scan' },
  { key: 'REPORT_DRAFT', label: 'diag.stage.report' },
  { key: 'REPORT_READY', label: 'diag.stage.result' },
];
const LAB_STATE_MAP: Record<string, string> = {
  PENDING_INSURANCE: 'NEW_REQUEST',
  WAITING_COPAY: 'NEW_REQUEST',
  IN_TRANSIT: 'CONFIRMED',
  IN_LAB: 'PROCESSING',
  SAMPLE_COLLECTED: 'PROCESSING',
  RESULT_UPLOADED: 'REPORTED',
};
const CANCELLABLE = ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY', 'sent', 'in_review'];

/** One booking: its status and stages, the technician, the results or report, the facts and the cancel (board OrderTracking + Orders card). */
export default function OrderDetails() {
  const { theme, t, c, k, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = String(rawId ?? '');
  const [order, setOrder] = useState<Rec | null>(null);
  const [kind, setKind] = useState<'lab' | 'radiology' | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');
  const [canceling, setCanceling] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      // radiology first, then lab (the booking's kind is not in its id)
      let data: Rec | null = null;
      let found: 'lab' | 'radiology' | null = null;
      try {
        data = recordOf(await apiFetch<unknown>(`/radiology/bookings/${id}`));
        if (data && !data.message) found = 'radiology';
      } catch {
        /* try lab */
      }
      if (!data || data.message) {
        data = recordOf(await apiFetch<unknown>(`/labs/bookings/${id}`));
        found = 'lab';
      }
      setKind(found);
      setOrder(data);
      setStatus(data ? 'ready' : 'error');
    } catch (err) {
      logError('diagnostics:order-detail', err);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = () => {
    showLocalizedAlert(k('diag.order.cancelTitle'), k('diag.order.cancelBody'), [
      { text: k('diag.order.cancelBack'), style: 'cancel' },
      {
        text: k('diag.order.cancelYes'),
        style: 'destructive',
        onPress: async () => {
          setCanceling(true);
          try {
            const base = kind === 'radiology' ? '/radiology' : '/labs';
            const response = await apiFetch<unknown>(`${base}/bookings/${id}/cancel`, { method: 'POST' });
            setOrder(recordOf(response) ?? order);
            showLocalizedAlert(k('diag.order.cancelDone'));
          } catch (e: unknown) {
            showLocalizedAlert(k('diag.order.cancelFailed'), e instanceof Error && e.message ? e.message : k('diag.order.cancelError'));
          } finally {
            setCanceling(false);
          }
        },
      },
    ]);
  };

  const handleDownload = () => {
    // Never open a raw report/CDN URL supplied in a booking payload. A report is viewed only by its
    // server-owned identifier through the protected report API.
    const reports = Array.isArray(order?.reports) ? (order?.reports as unknown[]) : [];
    const reportId = str(order?.report_id) || str(rec(order?.report)?.id) || str(rec(reports[0])?.id);
    if (reportId) {
      router.push({ pathname: '/reports/view-report', params: { id: reportId } } as unknown as Href);
      return;
    }
    showLocalizedAlert(k('diag.order.noReportTitle'), k('diag.order.noReportBody'));
  };

  const o = order ?? {};
  const isRadiology = kind === 'radiology' || o.type === 'radiology' || o.serviceCategory === 'radiology';
  const orderState = str(o.state) || str(o.status);
  const home = (str(o.location_type) || (o.type === 'home_visit' ? 'home' : 'facility')) === 'home';
  const stages = isRadiology ? RAD_STAGES : LAB_STAGES;
  const normalized = isRadiology ? orderState : LAB_STATE_MAP[orderState] || orderState;
  const current = stages.findIndex((s) => s.key === normalized);
  const cancelled = orderState === 'CANCELLED' || orderState === 'cancelled' || orderState === 'SCAN_ABORTED';
  const steps: TimelineStep[] = stages.map((s, i) => ({ key: s.key, title: k(s.label), state: i < current ? 'done' : i === current ? 'current' : 'todo' }));
  const st = diagStatus(isRadiology ? 'radiology' : 'lab', orderState);
  const tech = rec(o.technician);
  const hasResult = orderState === 'REPORTED' || orderState === 'RESULT_UPLOADED' || orderState === 'REPORT_READY';
  const results = Array.isArray(o.results) ? (o.results as unknown[]).map(rec).filter((r): r is Rec => r !== null) : [];
  const viewer = str(o.images_url) || str(o.dicom_url) || str(rec(o.report)?.images_url);
  const when = fmt.date(o.scheduled_at ?? o.createdAt);
  const total = Number(o.total ?? o.total_price);

  return (
    <ConsultScreen testID="diagnostics-order" title={k('diag.order.title')} onBack={goBackDiag} onRefresh={() => void load()}>
      <Gate status={status} onRetry={() => void load()}>
        {order ? (
          <>
            <Block gap={14}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('diag.order.status')}</Text>
                <StatusPill label={k(st.key)} tone={st.tone} />
              </View>
              {cancelled ? <Notice tone="danger" text={k('diag.order.cancelled')} /> : <Timeline steps={steps} />}
            </Block>

            {!cancelled && !hasResult && home && tech ? (
              <Block>
                <PersonRow
                  icon="user"
                  tone={CARE_TONE}
                  title={str(tech.name)}
                  line={[k('diag.order.technician'), str(tech.eta) ? k('diag.order.eta', { eta: str(tech.eta) }) : ''].filter(Boolean).join(' · ')}
                  actionIcon={str(tech.phone) ? 'headset' : undefined}
                  actionLabel={k('diag.order.call')}
                  onAction={() => void Linking.openURL(`tel:${str(tech.phone)}`)}
                />
              </Block>
            ) : null}

            {hasResult ? (
              <Section title={isRadiology ? k('diag.order.reports') : k('diag.order.results')} actionLabel={k('diag.order.pdf')} onAction={handleDownload}>
                {isRadiology && viewer ? (
                  <Button theme={theme} size="md" variant="outline" startIcon="image" label={k('diag.order.viewer')} onPress={() => Linking.openURL(viewer).catch(() => showLocalizedAlert(k('diag.order.viewerFailed')))} />
                ) : null}
                {!isRadiology
                  ? results.map((res, i) => {
                      const abnormal = Boolean(res.isAbnormal);
                      return (
                        <Block key={str(res.id) || String(i)} gap={6}>
                          <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{str(res.name)}</Text>
                          <View style={{ flexDirection: 'row', gap: 16 }}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...flow }}>{k('diag.order.result')}</Text>
                              <Text style={{ ...scale(t, 'h4'), color: abnormal ? c.status.danger.fg : c.status.success.fg, ...flow }}>{str(res.result)}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...flow }}>{k('diag.order.reference')}</Text>
                              <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{str(res.reference)}</Text>
                            </View>
                          </View>
                        </Block>
                      );
                    })
                  : null}
              </Section>
            ) : null}

            <Section title={k('diag.order.info')}>
              <ListCard>
                <View style={{ paddingHorizontal: 14 }}>
                  <InfoRow label={k('diag.order.date')} value={when} />
                  <InfoRow label={k('diag.order.type')} value={home ? k('diag.order.typeHome') : isRadiology ? k('diag.order.typeCentre') : k('diag.order.typeLab')} last={!Number.isFinite(total)} />
                  {Number.isFinite(total) ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
                      <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary }}>{k('diag.order.total')}</Text>
                      <Money amount={total} currency={null} size="bodyStrong" unit="tag" />
                    </View>
                  ) : null}
                </View>
              </ListCard>
            </Section>

            {CANCELLABLE.includes(orderState) && !cancelled ? <Button theme={theme} size="lg" fullWidth variant="danger" loading={canceling} label={k('diag.order.cancel')} onPress={handleCancel} /> : null}
          </>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
