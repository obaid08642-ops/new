import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button } from '../../../../packages/ui-native/src';
import { Gate, InfoRow, ResultHero, Section, useConsultFormat, type GateStatus } from '../consult/ConsultKit';
import { Notice, Panel, rowsOf } from '../health/HealthKit';
import { useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { isOffline } from '../../utils/isOffline';
import { paymentIntentHeaders } from '../../utils/payment-idempotency';
import { isHttpsCheckout } from '../../utils/consultation-payment';
import { insurancePaymentAction, insuranceSelfPayHeaders, parseInsuranceCopayRequest, type InsuranceCopayRequest } from '../../utils/insurance-copay-contract';
import { appointmentStatusRouteParams } from '../../utils/consultation-status-route';
import { INSURANCE_HUB, InsuranceScreen, usePolicy } from './InsuranceKit';

/**
 * One insurance request (board Insurance, merge map 2 section 6, canonical `/insurance/request?id=`): the state of the
 * request decides what shows. Waiting for the provider, approved in full, co-pay to pay, rejected with the offer to pay
 * the price yourself, self-pay to pay, paid. The old /insurance/approval-pending and /insurance/payment-split redirect
 * here with their query. Amounts and states are only what GET /insurance/requests/:id returns; the buttons call the
 * same endpoints payment-split called (capabilities, POST /payments/intent/insurance/:id, accept-self-pay), with the
 * same headers and bodies. The page never marks anything paid: the hosted checkout and the server do.
 */

type Action = ReturnType<typeof insurancePaymentAction>;

const HERO: Record<Action, { icon: 'clock-counter-clockwise' | 'check-circle' | 'credit-card' | 'x-circle' | 'warning'; tone: 'success' | 'warning' | 'danger' | 'info' }> = {
  provider_review: { icon: 'clock-counter-clockwise', tone: 'warning' },
  covered: { icon: 'check-circle', tone: 'success' },
  checkout_copay: { icon: 'credit-card', tone: 'warning' },
  accept_self_pay: { icon: 'x-circle', tone: 'danger' },
  checkout_self_pay: { icon: 'credit-card', tone: 'warning' },
  paid: { icon: 'check-circle', tone: 'info' },
  unavailable: { icon: 'warning', tone: 'danger' },
};

/** The id of the request the screen was opened for: `id`, or the ids the old routes and the notifications carried. */
function useRequestParams() {
  const params = useLocalSearchParams() as Record<string, string | string[] | undefined>;
  const text = (key: string) => {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    return typeof first === 'string' ? first.trim() : '';
  };
  return { id: text('id') || text('request_id') || text('requestId'), bookingId: text('bookingId') || text('booking_id') };
}

export function InsuranceRequestView() {
  const { id: given, bookingId } = useRequestParams();
  const { k, theme } = useScreenUi();
  const fmt = useConsultFormat();
  const policy = usePolicy();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [request, setRequest] = useState<InsuranceCopayRequest | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setStatus('loading');
      try {
        let id = given;
        if (!id) {
          // Opened without an id (the old approval screen): the request of that booking, else the latest one.
          const mine = rowsOf<{ id?: string; booking_id?: string }>(await apiFetch('/insurance/requests/my'));
          const row = bookingId ? mine.find((r) => r.booking_id === bookingId) : mine[0];
          id = String(row?.id ?? '');
        }
        if (!id) {
          setRequest(null);
          setStatus('missing');
          return;
        }
        setRequest(parseInsuranceCopayRequest(await apiFetch(`/insurance/requests/${encodeURIComponent(id)}`)));
        setStatus('ready');
      } catch (e) {
        logError('insurance:request', e);
        setStatus((await isOffline()) ? 'offline' : 'error');
      }
    },
    [given, bookingId],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const action: Action = request ? insurancePaymentAction(request) : 'unavailable';
  // The old approval screen re-read the request every 6 seconds while the provider had not decided; it still does, and only then.
  useEffect(() => {
    if (action !== 'provider_review') return undefined;
    const timer = setInterval(() => void load(true), 6000);
    return () => clearInterval(timer);
  }, [action, load]);

  const openCheckout = async (kind: 'copay' | 'self-pay') => {
    if (!request) return;
    const path = kind === 'copay' ? `/insurance/requests/${encodeURIComponent(request.id)}/capabilities` : `/insurance/requests/${encodeURIComponent(request.id)}/self-pay-capabilities`;
    const capabilities = await apiFetch<{ methods?: { id?: string }[] }>(path);
    const method = capabilities?.methods?.find((item) => item?.id === 'card')?.id;
    if (method !== 'card') throw new Error(k('insurance.request.cardUnavailable'));
    const transaction = await apiFetch<{ checkout_url?: string }>(`/payments/intent/insurance/${encodeURIComponent(request.id)}`, { method: 'POST', headers: paymentIntentHeaders('insurance', request.id), body: JSON.stringify({ method }) });
    if (!isHttpsCheckout(transaction?.checkout_url)) throw new Error(k('insurance.request.checkoutUnavailable'));
    await Linking.openURL(transaction.checkout_url as string);
    await load(true);
  };

  const returnToAppointmentStatus = async () => {
    if (!request) throw new Error(k('insurance.request.noStatus'));
    // LJ-03: the same engine drives consultation, lab and radiology coverage.
    if (request.booking_kind === 'consultation') {
      const appointment = await apiFetch(`/care/appointments/${encodeURIComponent(request.booking_id)}`);
      router.replace({ pathname: '/consultations/booking-status', params: appointmentStatusRouteParams(appointment, request.booking_id) } as unknown as Href);
      return;
    }
    if (request.booking_kind === 'lab' || request.booking_kind === 'radiology') {
      router.replace({ pathname: '/diagnostics/order/[id]', params: { id: request.booking_id } } as unknown as Href);
      return;
    }
    router.replace('/diagnostics/orders' as Href);
  };

  const inFlight = useRef(false);
  const proceed = async () => {
    // Single flight: a second press before the first call returns does nothing (the state alone would be one render late).
    if (!request || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      if (action === 'accept_self_pay') {
        setRequest(parseInsuranceCopayRequest(await apiFetch(`/insurance/requests/${encodeURIComponent(request.id)}/accept-self-pay`, { method: 'POST', headers: insuranceSelfPayHeaders(request.id) })));
      } else if (action === 'checkout_copay') await openCheckout('copay');
      else if (action === 'checkout_self_pay') await openCheckout('self-pay');
      else if (action === 'covered' || action === 'paid') await returnToAppointmentStatus();
    } catch (reason) {
      logError('insurance:request:proceed', reason);
      setError((reason as { message?: string } | null)?.message || k('insurance.request.failed'));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const money = (n: number) => `${fmt.money(n)} ${k('consult.currency')}`;
  const payable = action === 'checkout_copay' ? request?.copay_amount : action === 'checkout_self_pay' ? request?.self_pay_amount : 0;
  const hero = HERO[action];
  const company = request?.policy?.company_name || policy.data?.provider_name || policy.data?.provider;

  return (
    <InsuranceScreen title={k('insurance.request.title')} onRefresh={() => void load(true)} testID="insurance-request">
      <Gate status={status} onRetry={() => void load()} missingTitle={k('insurance.request.missingTitle')} missingBody={k('insurance.request.missingBody')}>
        {request ? (
          <>
            <ResultHero icon={hero.icon} tone={hero.tone} title={k(`insurance.request.${action}.title`)} body={k(`insurance.request.${action}.body`)} />
            {error ? <Notice tone="danger" text={error} testID="request-error" /> : null}
            {request.state === 'REJECTED' && request.rejection_reason ? <Notice tone="danger" text={k('insurance.claims.rejectedReason', { reason: request.rejection_reason })} testID="request-reason" /> : null}
            <Section title={k('insurance.request.amounts')}>
              <Panel testID="request-amounts">
                <View style={{ paddingHorizontal: 14 }}>
                  {request.approval_code ? <InfoRow label={k('insurance.request.approvalNumber')} value={request.approval_code} /> : null}
                  <InfoRow label={k('insurance.request.price')} value={money(request.price)} />
                  <InfoRow label={k('insurance.request.copay')} value={money(request.copay_amount)} strong={action === 'checkout_copay'} />
                  {request.copay_percent !== undefined ? <InfoRow label={k('insurance.request.copayPercent')} value={`${fmt.num(request.copay_percent)}%`} /> : null}
                  <InfoRow label={k('insurance.request.selfPay')} value={money(request.self_pay_amount)} strong={action === 'checkout_self_pay'} last />
                </View>
              </Panel>
            </Section>
            {company || policy.data?.policy_number ? (
              <Panel testID="request-policy">
                <View style={{ paddingHorizontal: 14 }}>
                  <InfoRow label={k('insurance.policy.company')} value={company ?? ''} />
                  <InfoRow label={k('insurance.policy.number')} value={policy.data?.policy_number ?? ''} last />
                </View>
              </Panel>
            ) : null}
            {action === 'provider_review' ? <Button label={k('insurance.request.refresh')} variant="outline" fullWidth onPress={() => void load(true)} theme={theme} testID="request-refresh" /> : null}
            {action === 'provider_review' ? <Button label={k('insurance.request.track')} variant="ghost" fullWidth onPress={() => router.push(INSURANCE_HUB)} theme={theme} testID="request-track" /> : null}
            {action === 'covered' || action === 'paid' ? <Button label={k('insurance.request.viewStatus')} fullWidth loading={submitting} onPress={() => void proceed()} theme={theme} testID="request-status" /> : null}
            {action === 'accept_self_pay' ? <Button label={k('insurance.request.acceptSelfPay')} fullWidth loading={submitting} onPress={() => void proceed()} theme={theme} testID="request-accept" /> : null}
            {action === 'checkout_copay' || action === 'checkout_self_pay' ? <Button label={k('insurance.request.payNow', { amount: money(payable ?? 0) })} fullWidth loading={submitting} onPress={() => void proceed()} theme={theme} testID="request-pay" /> : null}
            {action === 'accept_self_pay' || action === 'unavailable' ? <Button label={k('insurance.request.back')} variant="ghost" fullWidth onPress={() => (router.canGoBack() ? router.back() : router.replace(INSURANCE_HUB))} theme={theme} testID="request-back" /> : null}
          </>
        ) : null}
      </Gate>
    </InsuranceScreen>
  );
}
