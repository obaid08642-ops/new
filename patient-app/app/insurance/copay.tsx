import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button } from '../../../packages/ui-native/src';
import { Gate, InfoRow, ResultHero, useConsultFormat, type GateStatus } from '../../src/components/consult/ConsultKit';
import { Notice, Panel, rowsOf } from '../../src/components/health/HealthKit';
import { InsuranceScreen } from '../../src/components/insurance/InsuranceKit';
import { useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { insuranceDecisionOf, type InsuranceCopayRequest } from '../../src/utils/insurance-copay-contract';
import { paymentIntentHeaders } from '../../src/utils/payment-idempotency';

interface CopayRequest extends Pick<InsuranceCopayRequest, 'approval_code' | 'copay_percent'> { id?: string; state?: string; copay_amount?: number; createdAt?: string }

/**
 * Pay the co-pay (board Insurance; payment screen, owner decision 25). It reads the newest COPAY_PENDING request of
 * GET /insurance/requests/my and creates the payment intent POST /payments/intent/insurance/:id exactly as before, then
 * hands over to the hosted checkout. It is not merged into the request page: that page reads one request by id and asks
 * the server which payment methods are open, this one picks the request from the list and sends no method (one
 * Needs-review line). The amount is the request's own; nothing is marked paid here.
 */
export default function InsuranceCopayScreen() {
  const { k, theme } = useScreenUi();
  const fmt = useConsultFormat();
  const [status, setStatus] = useState<GateStatus>('loading');
  const [request, setRequest] = useState<CopayRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const pending = rowsOf<CopayRequest>(await apiFetch('/insurance/requests/my'))
        .filter((r) => r.state === 'COPAY_PENDING')
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
      setRequest(pending[0] ? { ...pending[0], ...insuranceDecisionOf(pending[0]) } : null);
      setStatus(pending.length ? 'ready' : 'missing');
    } catch (e) {
      logError('insurance:copay', e);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const handlePay = async () => {
    if (!request?.id || loading) return;
    setLoading(true);
    setError('');
    try {
      // Create a payment intent for the copay amount via the payments gateway.
      const txn = await apiFetch<{ id?: string; checkout_url?: string; amount?: number }>(`/payments/intent/insurance/${request.id}`, { method: 'POST', headers: paymentIntentHeaders('insurance', request.id) });
      if (!txn?.id) throw new Error('payment_intent_failed');
      // The hosted checkout / verified payment event is the only path that can settle COPAY_PENDING. Never mark a service paid from a client-held transaction id.
      router.replace({ pathname: '/payments/processing', params: { moyasarId: txn.id, paymentUrl: txn.checkout_url || '', bookingId: request.id, bookingKind: 'insurance', amount: String(txn.amount ?? request.copay_amount ?? 0) } } as unknown as Href);
    } catch (e) {
      logError('insurance:copay:pay', e);
      setError(k('insurance.copay.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <InsuranceScreen title={k('insurance.copay.title')} testID="insurance-copay">
      <Gate status={status} onRetry={() => void load()} missingTitle={k('insurance.copay.noneTitle')} missingBody={k('insurance.copay.noneBody')}>
        {request ? (
          <>
            <ResultHero icon="credit-card" tone="warning" title={k('insurance.copay.required')} body={k('insurance.copay.body')} />
            <Panel testID="copay-amount">
              <View style={{ paddingHorizontal: 14 }}>
                <InfoRow label={k('insurance.request.approvalNumber')} value={request.approval_code ?? ''} />
                <InfoRow label={k('insurance.request.copayPercent')} value={request.copay_percent !== undefined ? `${fmt.num(request.copay_percent)}%` : ''} />
                <InfoRow label={k('insurance.copay.amount')} value={typeof request.copay_amount === 'number' ? `${fmt.money(request.copay_amount)} ${k('consult.currency')}` : ''} strong last />
              </View>
            </Panel>
            {error ? <Notice tone="danger" text={error} testID="copay-error" /> : null}
            <Button label={k('insurance.copay.confirm')} size="lg" fullWidth loading={loading} onPress={() => void handlePay()} theme={theme} testID="copay-pay" />
          </>
        ) : null}
      </Gate>
    </InsuranceScreen>
  );
}
