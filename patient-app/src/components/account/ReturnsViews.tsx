import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, Chip, EmptyState, FIcon, Input, Timeline, type FillIconName, type ServiceTone } from '../../../../packages/ui-native/src';
import { Gate, InfoRow, ResultHero, Section, StatusTag, goBack, useConsultFormat, type GateStatus } from '../consult/ConsultKit';
import { MetricGrid, MetricTile, Notice, Panel, bodyOf, rowsOf, useRemote } from '../health/HealthKit';
import { Money } from '../pharmacy/OfferKit';
import { Glyph } from '../pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { AccountScreen } from './AccountKit';
import { PolicyCard } from './PolicyText';

/**
 * Returns (board Orders, restyle only): the list with the status filter, one request, and the three-step form
 * (type, details, confirm). Calls: GET/POST /pharmacy/returns, GET /pharmacy/returns/:id, GET /pharmacy/returns/eligible/:type,
 * POST /media/upload for the photos. The cancellation and returns policy is the server's (see PolicyText). Nothing here
 * decides an amount or a deadline: the amount is the order's, the timing is what the server recorded.
 */

const RETURNS_HOME = '/returns/hub' as Href;
const TYPES = ['pharmacy', 'consultation', 'diagnostics', 'nursing', 'insurance'] as const;
type ServiceType = (typeof TYPES)[number];
const TYPE_LOOK: Record<ServiceType, { icon: FillIconName; tone: ServiceTone }> = {
  pharmacy: { icon: 'pill', tone: 'coral' },
  consultation: { icon: 'stethoscope', tone: 'blue' },
  diagnostics: { icon: 'test-tube', tone: 'mint' },
  nursing: { icon: 'first-aid-kit', tone: 'teal' },
  insurance: { icon: 'shield-check', tone: 'blue' },
};
const REASONS: Record<ServiceType, readonly string[]> = {
  pharmacy: ['damaged', 'wrongOrder', 'wrongItem', 'notArrived', 'missing', 'other'],
  consultation: ['cancelled', 'noShow', 'quality', 'technical', 'other'],
  diagnostics: ['duplicate', 'cancelled', 'wrongResult', 'noSample', 'other'],
  nursing: ['noShow', 'late', 'quality', 'cancelled', 'other'],
  insurance: ['overpaid', 'wrongCalc', 'notCovered', 'other'],
};

interface ReturnRow { id: string; service_type?: string; order_id?: string; amount?: number; status?: string; createdAt?: string; reason?: string; refund_method?: string; resolved_at?: string }

const FILTERS = ['all', 'processing', 'approved', 'completed', 'rejected'] as const;

/** A request status as its label key and status tone. */
function returnStatus(raw: unknown): { key: string; tone: 'success' | 'warning' | 'danger' | 'info' } {
  switch (String(raw)) {
    case 'approved':
      return { key: 'returns.status.approved', tone: 'info' };
    case 'completed':
      return { key: 'returns.status.completed', tone: 'success' };
    case 'rejected':
      return { key: 'returns.status.rejected', tone: 'danger' };
    default:
      return { key: 'returns.status.processing', tone: 'warning' };
  }
}
const typeOf = (raw: unknown): ServiceType | null => ((TYPES as readonly string[]).includes(String(raw)) ? (raw as ServiceType) : null);
const refundKey = (raw: unknown) => (['original', 'card', 'bank'].includes(String(raw)) ? `returns.refund.${String(raw)}` : 'returns.refund.original');
const shortRef = (id: unknown) => `‎#${String(id ?? '').substring(0, 8)}‎`;

/** `/returns/hub`: the requests with a status filter, the three summary figures and the policy. */
export function ReturnsHubView() {
  const { k, theme, t, c, flow, num } = useScreenUi();
  const { date } = useConsultFormat();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const list = useRemote(async () => rowsOf<ReturnRow>(await apiFetch('/pharmacy/returns')), [], 'returns:list');
  const rows = list.data ?? [];
  const shown = filter === 'all' ? rows : rows.filter((row) => row.status === filter);
  const pending = rows.filter((row) => row.status === 'processing' || row.status === 'approved').reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  return (
    <AccountScreen
      title={k('returns.title')}
      fallback={'/orders' as Href}
      actions={[{ key: 'new', label: k('returns.new'), icon: <Glyph name="plus" size={20} color={c.icon.primary} />, onPress: () => router.push('/returns/new-request' as Href) }]}
      footer={<Button label={k('returns.new')} size="lg" fullWidth startIcon="plus" onPress={() => router.push('/returns/new-request' as Href)} theme={theme} testID="returns-new" />}
      testID="returns-screen"
    >
      <Gate status={list.status} errorTitle={k('returns.loadError')} onRetry={() => void list.reload()}>
        <MetricGrid>
          <MetricTile label={k('returns.summary.count')} value={num(rows.length)} icon="receipt" tone="coral" />
          <MetricTile label={k('returns.summary.pending')} value={num(pending)} unit={k('pharmacy.currency')} icon="clock-counter-clockwise" tone="amber" />
          <MetricTile label={k('returns.summary.done')} value={num(rows.filter((row) => row.status === 'completed').length)} icon="check-circle" tone="mint" />
        </MetricGrid>
        <PolicyCard kind="cancellation" title={k('set.legal.cancellation')} />
        <PolicyCard kind="returns" title={k('set.legal.returns')} />
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FILTERS.map((key) => (
            <Chip key={key} label={k(`returns.filter.${key}`)} selected={filter === key} onPress={() => setFilter(key)} theme={theme} testID={`returns-filter-${key}`} />
          ))}
        </View>
        {shown.length === 0 ? (
          <EmptyState icon="receipt" tone="coral" title={k('returns.empty')} body={k('returns.emptyBody')} theme={theme} />
        ) : (
          shown.map((row) => {
            const type = typeOf(row.service_type);
            const look = type ? TYPE_LOOK[type] : { icon: 'receipt' as FillIconName, tone: 'coral' as ServiceTone };
            const status = returnStatus(row.status);
            const title = type === 'pharmacy' ? k('returns.pharmacyOrder', { ref: shortRef(row.order_id) }) : k('returns.request', { ref: shortRef(row.id) });
            const meta = [type ? k(`returns.type.${type}`) : '', date(row.createdAt)].filter(Boolean).join(' · ');
            return (
              <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={[title, k(status.key), meta].filter(Boolean).join(', ')} onPress={() => router.push({ pathname: '/returns/detail', params: { returnId: row.id } } as unknown as Href)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })} testID={`return-${row.id}`}>
                <Card padding="sm" theme={theme}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <FIcon icon={look.icon} tone={look.tone} chip="soft" size={44} theme={theme} />
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{title}</Text>
                      {meta ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{meta}</Text> : null}
                      {row.reason ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.tertiary, ...flow }}>{k('returns.reasonLine', { reason: row.reason })}</Text> : null}
                    </View>
                    <StatusTag label={k(status.key)} tone={status.tone} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: c.border.subtle }}>
                    <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, flexShrink: 1, ...flow }}>{k('returns.refundTo', { method: k(refundKey(row.refund_method)) })}</Text>
                    {typeof row.amount === 'number' ? <Money amount={row.amount} currency={null} size="bodyStrong" unit="tag" /> : null}
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </Gate>
    </AccountScreen>
  );
}

/** `/returns/detail?returnId=`: one request, its facts and the steps the server recorded. */
export function ReturnDetailView() {
  const { returnId } = useLocalSearchParams<{ returnId?: string }>();
  const { k, theme, t, c } = useScreenUi();
  const { date } = useConsultFormat();
  const id = typeof returnId === 'string' ? returnId : '';
  const detail = useRemote(async () => bodyOf<ReturnRow>(await apiFetch(`/pharmacy/returns/${encodeURIComponent(id)}`)), [id], 'returns:detail');
  const row = detail.data;
  const status: GateStatus = !id ? 'missing' : detail.status;
  const type = typeOf(row?.service_type);
  const state = returnStatus(row?.status);
  const decided = Boolean(row?.resolved_at) && ['approved', 'completed', 'rejected'].includes(String(row?.status));
  const rejected = row?.status === 'rejected';

  return (
    <AccountScreen title={k('returns.detailTitle', { ref: shortRef(id) })} fallback={RETURNS_HOME} testID="return-detail-screen">
      <Gate status={status} errorTitle={k('returns.detailError')} missingTitle={k('returns.detailMissing')} missingBody={k('returns.detailMissingBody')} onRetry={() => void detail.reload()}>
        {row ? (
          <>
            <StatusTag label={k(state.key)} tone={state.tone} />
            <Card theme={theme}>
              <InfoRow label={k('returns.d.number')} value={shortRef(row.id)} />
              <InfoRow label={k('returns.d.service')} value={type ? k(`returns.type.${type}`) : ''} />
              <InfoRow label={k('returns.d.order')} value={row.order_id ? shortRef(row.order_id) : ''} />
              <InfoRow label={k('returns.d.reason')} value={row.reason ?? ''} />
              <InfoRow label={k('returns.d.method')} value={k(refundKey(row.refund_method))} last />
            </Card>
            {typeof row.amount === 'number' ? (
              <Card theme={theme}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.secondary }}>{k('returns.d.amount')}</Text>
                  <Money amount={row.amount} currency={null} size="h4" unit="meta" />
                </View>
              </Card>
            ) : null}
            <Section title={k('returns.d.steps')}>
              <Card theme={theme}>
                <Timeline
                  label={k('returns.d.steps')}
                  theme={theme}
                  steps={[
                    { id: 'submitted', label: k('returns.step.submitted'), time: date(row.createdAt) || undefined, state: 'done' },
                    { id: 'review', label: k('returns.step.review'), time: decided ? date(row.resolved_at) || undefined : undefined, state: decided ? 'done' : 'current' },
                    ...(rejected ? [] : [{ id: 'refund', label: k('returns.step.refund', { method: k(refundKey(row.refund_method)) }), state: (row.status === 'completed' ? 'done' : row.status === 'approved' ? 'current' : 'upcoming') as 'done' | 'current' | 'upcoming' }]),
                  ]}
                />
              </Card>
            </Section>
          </>
        ) : null}
      </Gate>
    </AccountScreen>
  );
}

interface Eligible { id: string; amount?: number | string }
type Step = 'type' | 'details' | 'confirm' | 'success';

/** `/returns/new-request`: type, then the booking and reason, then the summary; the photos are uploaded and sent as media references. */
export function ReturnRequestView() {
  const { k, theme, t, c, flow } = useScreenUi();
  const [step, setStep] = useState<Step>('type');
  const [serviceType, setServiceType] = useState<ServiceType | ''>('');
  const [reason, setReason] = useState('');
  const [orderId, setOrderId] = useState('');
  const [details, setDetails] = useState('');
  const [docs, setDocs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [eligible, setEligible] = useState<Eligible[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);

  useEffect(() => {
    if (!serviceType) return;
    let cancelled = false;
    setLoadingEligible(true);
    setOrderId('');
    apiFetch(`/pharmacy/returns/eligible/${encodeURIComponent(serviceType)}`)
      .then((rows) => {
        if (!cancelled) setEligible(rowsOf<Eligible>(rows));
      })
      .catch((e) => {
        logError('returns:eligible', e);
        if (!cancelled) setEligible([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEligible(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceType]);

  const booking = eligible.find((row) => row.id === orderId);
  const reasons = serviceType ? REASONS[serviceType] : [];

  const attach = async (fromCamera: boolean) => {
    setMessage(null);
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        setMessage(k(fromCamera ? 'returns.new.cameraPermission' : 'returns.new.libraryPermission'));
        return;
      }
      const options = { mediaTypes: ['images' as const], quality: 0.7 };
      const result = fromCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploading(true);
      const form = new FormData();
      form.append('file', { uri: asset.uri, name: asset.fileName || 'return-evidence.jpg', type: asset.mimeType || 'image/jpeg' } as unknown as Blob);
      form.append('purpose', 'report');
      const upload = bodyOf<{ id?: string }>(await apiFetch('/media/upload', { method: 'POST', body: form }));
      if (!upload.id) throw new Error('upload_missing_id');
      // The media reference is stored; the server signs a fresh URL on every read.
      setDocs((rows) => [...rows, `media:${upload.id}`]);
    } catch (e) {
      logError('returns:attach', e);
      setMessage(k('returns.new.attachFailed'));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!serviceType || !booking) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await apiFetch('/pharmacy/returns', { method: 'POST', body: JSON.stringify({ serviceType, reason, orderId: booking.id, details, refundMethod: 'original', attachedDocs: docs }) });
      setStep('success');
    } catch (e) {
      logError('returns:submit', e);
      setMessage(k('returns.new.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <AccountScreen title={k('returns.new')} fallback={RETURNS_HOME} onBack={() => router.replace(RETURNS_HOME)} testID="return-request-screen">
        <ResultHero icon="check-circle" title={k('returns.new.sentTitle')} body={k('returns.new.sentBody')} />
        <Button label={k('returns.new.mine')} size="lg" fullWidth onPress={() => router.replace(RETURNS_HOME)} theme={theme} testID="return-done" />
        <Button label={k('returns.new.home')} variant="outline" size="lg" fullWidth onPress={() => router.replace('/(tabs)' as Href)} theme={theme} />
      </AccountScreen>
    );
  }

  const stepTitle = step === 'type' ? k('returns.new') : step === 'details' ? k('returns.new.detailsTitle') : k('returns.new.confirmTitle');
  const back = () => (step === 'type' ? goBack(RETURNS_HOME) : setStep(step === 'details' ? 'type' : 'details'));
  const footer =
    step === 'type' ? (
      <Button label={k('returns.new.next')} size="lg" fullWidth disabled={!serviceType} onPress={() => setStep('details')} theme={theme} testID="return-next" />
    ) : step === 'details' ? (
      <Button label={k('returns.new.review')} size="lg" fullWidth disabled={!reason || !booking} onPress={() => setStep('confirm')} theme={theme} testID="return-review" />
    ) : (
      <Button label={k('returns.new.send')} size="lg" fullWidth loading={submitting} onPress={() => void submit()} theme={theme} testID="return-send" />
    );

  return (
    <AccountScreen title={stepTitle} fallback={RETURNS_HOME} onBack={back} footer={footer} testID="return-request-screen">
      <Text style={{ ...scale(t, 'meta', 'medium'), color: c.text.secondary, ...flow }}>{k('returns.new.stepOf', { n: step === 'type' ? 1 : step === 'details' ? 2 : 3 })}</Text>
      {message ? <Notice tone="danger" text={message} /> : null}

      {step === 'type' ? (
        <Section title={k('returns.new.typeQuestion')}>
          <View accessibilityRole="radiogroup" accessibilityLabel={k('returns.new.typeQuestion')} style={{ gap: 10 }}>
            {TYPES.map((type) => (
              <Pressable key={type} accessibilityRole="radio" accessibilityLabel={k(`returns.type.${type}`)} accessibilityState={{ checked: serviceType === type }} onPress={() => setServiceType(type)} testID={`return-type-${type}`}>
                <Card padding="sm" theme={theme}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <FIcon icon={TYPE_LOOK[type].icon} tone={TYPE_LOOK[type].tone} chip="soft" size={40} theme={theme} />
                    <Text style={{ ...scale(t, 'body', 'bold'), color: c.text.primary, flex: 1, ...flow }}>{k(`returns.type.${type}`)}</Text>
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: serviceType === type ? 7 : 2, borderColor: serviceType === type ? c.action.primary.bg : c.control.radioOff }} />
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        </Section>
      ) : null}

      {step === 'details' ? (
        <>
          <Section title={k('returns.new.booking')}>
            {loadingEligible ? (
              <Notice tone="info" text={k('common.loading')} />
            ) : eligible.length === 0 ? (
              <Notice tone="info" text={k('returns.new.noEligible')} />
            ) : (
              <Card padding="none" theme={theme}>
                <View accessibilityRole="radiogroup" accessibilityLabel={k('returns.new.booking')}>
                  {eligible.map((row, i) => (
                    <Pressable key={row.id} accessibilityRole="radio" accessibilityLabel={`${shortRef(row.id)} ${Number(row.amount).toFixed(2)}`} accessibilityState={{ checked: orderId === row.id }} onPress={() => setOrderId(row.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 56, borderBottomWidth: i === eligible.length - 1 ? 0 : 1, borderBottomColor: c.border.hairline }}>
                      <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, flex: 1, ...flow }}>{shortRef(row.id)}</Text>
                      {row.amount !== undefined && Number.isFinite(Number(row.amount)) ? <Money amount={Number(row.amount)} currency={null} size="small" unit="tag" /> : null}
                      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: orderId === row.id ? 7 : 2, borderColor: orderId === row.id ? c.action.primary.bg : c.control.radioOff }} />
                    </Pressable>
                  ))}
                </View>
              </Card>
            )}
          </Section>
          <Section title={k('returns.new.reason')}>
            <Card padding="none" theme={theme}>
              <View accessibilityRole="radiogroup" accessibilityLabel={k('returns.new.reason')}>
                {reasons.map((code, i) => {
                  const label = k(`returns.reason.${code}`);
                  return (
                    <Pressable key={code} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: reason === label }} onPress={() => setReason(label)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 52, borderBottomWidth: i === reasons.length - 1 ? 0 : 1, borderBottomColor: c.border.hairline }} testID={`return-reason-${code}`}>
                      <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, flex: 1, ...flow }}>{label}</Text>
                      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: reason === label ? 7 : 2, borderColor: reason === label ? c.action.primary.bg : c.control.radioOff }} />
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          </Section>
          <Input label={k('returns.new.details')} placeholder={k('returns.new.detailsPlaceholder')} value={details} onChange={setDetails} multiline rows={4} theme={theme} testID="return-details" />
          <Section title={k('returns.new.photos')}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button label={k('returns.new.camera')} variant="outline" size="md" fullWidth startIcon="camera" disabled={uploading} onPress={() => void attach(true)} theme={theme} testID="return-camera" />
              </View>
              <View style={{ flex: 1 }}>
                <Button label={k('returns.new.library')} variant="outline" size="md" fullWidth startIcon="image" disabled={uploading} onPress={() => void attach(false)} theme={theme} testID="return-library" />
              </View>
            </View>
            {uploading ? <Notice tone="info" text={k('returns.new.uploading')} /> : null}
            {docs.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {docs.map((doc, i) => (
                  <Chip key={doc} label={k('returns.new.photoN', { n: i + 1 })} selected onPress={() => setDocs((rows) => rows.filter((_, index) => index !== i))} theme={theme} />
                ))}
              </View>
            ) : null}
            {docs.length > 0 ? <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary, ...flow }}>{k('returns.new.removeHint')}</Text> : null}
          </Section>
        </>
      ) : null}

      {step === 'confirm' && serviceType && booking ? (
        <>
          <Card theme={theme}>
            <InfoRow label={k('returns.d.service')} value={k(`returns.type.${serviceType}`)} />
            <InfoRow label={k('returns.d.reason')} value={reason} />
            <InfoRow label={k('returns.new.bookingNo')} value={shortRef(booking.id)} />
            <InfoRow label={k('returns.new.eligibleAmount')} value={Number.isFinite(Number(booking.amount)) ? `${Number(booking.amount).toFixed(2)} ${k('pharmacy.currency')}` : ''} last />
          </Card>
          <Notice tone="info" text={k('returns.new.note')} />
          <PolicyCard kind="returns" title={k('set.legal.returns')} />
        </>
      ) : null}
    </AccountScreen>
  );
}
