import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Chip, Input } from '../../../packages/ui-native/src';
import { InfoRow, ResultHero, Section } from '../../src/components/consult/ConsultKit';
import { Notice, Panel, Pill } from '../../src/components/health/HealthKit';
import { InsuranceScreen } from '../../src/components/insurance/InsuranceKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';

const SERVICE_TYPES = ['consultation', 'labs', 'radiology', 'nursing'] as const;

interface CoverageResult {
  covered?: boolean;
  eligible?: boolean;
  copay_percent?: number;
  copay_flat?: number;
  requires_preauth?: boolean;
  preAuthRequired?: boolean;
  provider_name?: string;
  network_name_ar?: string;
  company_name_ar?: string;
  class?: string;
  reason?: string;
  note_ar?: string;
}

/**
 * Does my insurance cover this? (board Insurance, merge map 2 keeps this screen and sends the old benefits view to the
 * Benefits tab). GET /insurance/coverage-check?service_type=&service_key= answers; the percentages, the cap and the
 * pre-authorisation flag are the coverage engine's, the final amount is the provider's price at booking.
 */
export default function CoverageCheckScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  if (params.view === 'benefits') return <Redirect href={{ pathname: '/insurance', params: { tab: 'benefits' } } as unknown as Href} />;
  return <CoverageCheck />;
}

function CoverageCheck() {
  const { k, theme, t, c, flow } = useScreenUi();
  const [serviceType, setServiceType] = useState('');
  const [providerName, setProviderName] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CoverageResult | null>(null);
  const [error, setError] = useState('');

  const check = async () => {
    if (!serviceType || checking) return;
    setChecking(true);
    setError('');
    try {
      const data = await apiFetch<CoverageResult>(`/insurance/coverage-check?service_type=${serviceType}${providerName ? `&service_key=${encodeURIComponent(providerName)}` : ''}`);
      setResult(data);
    } catch (e) {
      logError('insurance:coverage-check', e);
      setError(k('insurance.coverage.failed'));
    } finally {
      setChecking(false);
    }
  };

  if (result) {
    const covered = result.covered ?? result.eligible ?? false;
    const copayPct = typeof result.copay_percent === 'number' ? result.copay_percent : null;
    const copayFlat = typeof result.copay_flat === 'number' && result.copay_flat > 0 ? result.copay_flat : null;
    const preAuth = result.requires_preauth ?? result.preAuthRequired ?? false;
    const sub = [result.provider_name, result.network_name_ar, result.company_name_ar, result.class ? k('insurance.policy.classValue', { value: result.class }) : null].filter(Boolean).join(' · ');
    return (
      <InsuranceScreen title={k('insurance.coverage.resultTitle')} onBack={() => setResult(null)} testID="coverage-result">
        <ResultHero
          icon={covered ? 'check-circle' : 'warning'}
          tone={covered ? 'success' : 'danger'}
          title={covered ? k('insurance.coverage.covered', { service: k(`insurance.coverage.type.${serviceType}`) }) : k('insurance.coverage.notCovered')}
          body={[sub, covered ? '' : result.reason, result.note_ar].filter(Boolean).join('\n')}
        />
        {covered && (copayPct !== null || copayFlat !== null) ? (
          <Section title={k('insurance.coverage.copayTitle')}>
            <Panel testID="coverage-copay">
              <View style={{ paddingHorizontal: 14 }}>
                {copayPct !== null ? <InfoRow label={k('insurance.coverage.youPay')} value={`${copayPct}%`} strong /> : null}
                {copayFlat !== null ? <InfoRow label={k('insurance.coverage.cap')} value={`${copayFlat} ${k('consult.currency')}`} last /> : null}
              </View>
            </Panel>
            <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('insurance.coverage.finalNote')}</Text>
          </Section>
        ) : null}
        {preAuth ? (
          <Section>
            <Pill label={k('insurance.coverage.preAuth')} tone="warning" />
            <Button label={k('insurance.coverage.askSupport')} variant="outline" fullWidth onPress={() => router.push('/support/chat' as Href)} theme={theme} testID="coverage-preauth" />
          </Section>
        ) : null}
        <Button label={k('insurance.coverage.again')} variant="outline" fullWidth onPress={() => setResult(null)} theme={theme} testID="coverage-again" />
      </InsuranceScreen>
    );
  }

  return (
    <InsuranceScreen
      title={k('insurance.coverage.title')}
      footer={<Button label={k('insurance.coverage.check')} size="lg" fullWidth loading={checking} disabled={!serviceType} onPress={() => void check()} theme={theme} testID="coverage-check" />}
      testID="insurance-coverage"
    >
      <Section title={k('insurance.coverage.serviceType')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SERVICE_TYPES.map((id) => (
            <Chip key={id} label={k(`insurance.coverage.type.${id}`)} selected={serviceType === id} onPress={() => setServiceType(id)} theme={theme} testID={`coverage-type-${id}`} />
          ))}
        </View>
        {serviceType ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k(`insurance.coverage.examples.${serviceType}`)}</Text> : null}
      </Section>
      <Input label={k('insurance.coverage.provider')} placeholder={k('insurance.coverage.providerHint')} value={providerName} onChange={setProviderName} theme={theme} testID="coverage-provider" />
      {error ? <Notice tone="danger" text={error} testID="coverage-error" /> : null}
    </InsuranceScreen>
  );
}
