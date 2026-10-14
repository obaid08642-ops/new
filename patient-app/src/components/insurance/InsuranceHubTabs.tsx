import React, { useMemo, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Input, type FillIconName } from '../../../../packages/ui-native/src';
import { Gate, Section, useConsultFormat } from '../consult/ConsultKit';
import { HealthTabs, Notice, Panel, Row, rowsOf, useRemote } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { pickLocalized } from '../../utils/localize';
import { INSURANCE_TONE, Stat, usePolicy } from './InsuranceKit';

/**
 * The Benefits and Network tabs of the insurance hub. Every amount, percentage and state on them is
 * what the server sent: nothing is summed, estimated or filled in on the device.
 */

/** GET /insurance/benefits-summary (issues 823 and 826): the patient's own use of the policy and its expiry, as the server sums them. */
interface BenefitsAnswer {
  has_policy?: boolean;
  benefits?: Array<{ key?: string; note_code?: string }>;
  usage?: { requests?: number; approved?: number; rejected?: number; insurer_covered?: number; patient_share?: number } | null;
  expiry_date?: string | null;
}

const NOTE_CODES = ['coverage_decided_by_provider', 'no_policy_on_file'] as const;
type NoteCode = (typeof NOTE_CODES)[number];

/**
 * The Benefits tab: the requests decided under the policy with what the insurer covered and what the patient paid, the
 * policy's expiry, and who decides the coverage. There is no plan limit in the platform, so none is drawn (never invented).
 */
export function BenefitsTab() {
  const { k, t, c, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const answer = useRemote(async () => (await apiFetch('/insurance/benefits-summary')) as BenefitsAnswer, [], 'insurance:benefits');
  const data = answer.data;
  const money = (n: unknown) => (typeof n === 'number' ? `${fmt.money(n)} ${k('consult.currency')}` : '—');
  const notes = (data?.benefits ?? []).map((b) => b.note_code).filter((code): code is NoteCode => (NOTE_CODES as readonly string[]).includes(String(code)));
  const usage = data?.usage ?? null;
  const expiry = data?.expiry_date ? fmt.date(data.expiry_date) : '';
  return (
    <Gate status={answer.status} onRetry={() => void answer.reload()}>
      {!data?.has_policy ? (
        <Notice tone="info" text={k('insurance.noteCode.no_policy_on_file')} testID="benefits-empty" />
      ) : (
        <View style={{ gap: 12 }} testID="benefits-list">
          {usage ? (
            <View style={{ borderRadius: 24, padding: 16, gap: 12, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
              <Text style={{ ...scale(t, 'body', 'bold'), color: c.text.primary, ...flow }}>{k('insurance.benefits.requestsTitle', { count: fmt.num(usage.requests ?? 0) })}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Stat label={k('insurance.benefits.insurerCovered')} value={money(usage.insurer_covered)} tone="success" />
                <Stat label={k('insurance.benefits.youPaid')} value={money(usage.patient_share)} />
              </View>
            </View>
          ) : null}
          {expiry ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('insurance.policy.expiresOn', { date: expiry })}</Text> : null}
          {notes.map((code) => <Notice key={code} tone="info" text={k(`insurance.noteCode.${code}`)} />)}
        </View>
      )}
    </Gate>
  );
}

interface Provider {
  id?: string;
  type?: string;
  name_ar?: string;
  name_en?: string;
  specialty?: string;
  specialties?: string[];
  city?: string;
  phone?: string;
}

const TYPE_FILTERS = ['all', 'doctor', 'hospital', 'pharmacy', 'lab'] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];
const TYPE_LOOK: Record<string, { icon: FillIconName; key: string }> = {
  doctor: { icon: 'stethoscope', key: 'insurance.providerType.doctor' },
  hospital: { icon: 'hospital', key: 'insurance.providerType.hospital' },
  clinic: { icon: 'hospital', key: 'insurance.providerType.clinic' },
  pharmacy: { icon: 'pill', key: 'insurance.providerType.pharmacy' },
  lab: { icon: 'test-tube', key: 'insurance.providerType.lab' },
  radiology: { icon: 'scan', key: 'insurance.providerType.radiology' },
  home_care: { icon: 'first-aid-kit', key: 'insurance.providerType.homeCare' },
};

/**
 * The providers of the patient's own network: GET /providers filtered by the policy's company, network and class. Without a
 * policy there is nothing to filter by, so the tab asks for one.
 */
export function NetworkTab() {
  const { k, theme, t, c, flow } = useScreenUi();
  const policy = usePolicy();
  const profile = useRemote(async () => {
    const response = await apiFetch<{ insurance?: { provider?: string; company_id?: string; network?: string; class?: string } | null }>('/users/me/profile');
    const ins = response?.insurance ?? null;
    if (!ins?.provider) return [] as Provider[];
    const qs = new URLSearchParams();
    qs.set('insurance_company', ins.company_id || ins.provider);
    if (ins.network) qs.set('insurance_network', ins.network);
    if (ins.class) qs.set('insurance_class', ins.class);
    return rowsOf<Provider>(await apiFetch(`/providers?${qs.toString()}`));
  }, [], 'insurance:network');
  const [filter, setFilter] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');
  const hasPolicy = !!policy.data;
  const shown = useMemo(
    () =>
      (profile.data ?? []).filter(
        (p) => (filter === 'all' || p.type === filter) && (!query || String(p.name_ar || p.name_en || '').includes(query) || String(p.city || '').includes(query)),
      ),
    [profile.data, filter, query],
  );
  return (
    <Gate status={profile.status === 'ready' ? policy.status : profile.status} onRetry={() => { void profile.reload(); void policy.reload(); }}>
      <Input label={k('insurance.network.search')} placeholder={k('insurance.network.searchPlaceholder')} value={query} onChange={setQuery} theme={theme} testID="network-search" />
      <HealthTabs tabs={TYPE_FILTERS.map((key) => ({ key, label: k(`insurance.network.type.${key}`) }))} value={filter} onChange={setFilter} testID="network-filter" />
      {shown.length === 0 ? (
        <View style={{ gap: 10 }}>
          <Notice tone="info" text={hasPolicy ? k('insurance.network.empty') : k('insurance.network.noPolicy')} testID="network-empty" />
          {!hasPolicy ? <Button label={k('insurance.policy.add')} variant="outline" fullWidth onPress={() => router.push('/insurance/add-policy' as Href)} theme={theme} /> : null}
        </View>
      ) : (
        <Section>
          <Panel testID="network-list">
            {shown.map((p, i) => {
              const look = TYPE_LOOK[String(p.type)] ?? { icon: 'hospital' as FillIconName, key: 'insurance.providerType.other' };
              const specialties = (Array.isArray(p.specialties) ? p.specialties : p.specialty ? [p.specialty] : []).slice(0, 3).join(' · ');
              return (
                <Row
                  key={String(p.id ?? i)}
                  icon={look.icon}
                  tone={INSURANCE_TONE}
                  title={pickLocalized(p.name_ar, p.name_en) ?? ''}
                  subtitle={[k(look.key), specialties].filter(Boolean).join(' · ')}
                  caption={p.city}
                  trailing={p.phone ? <PhoneButton phone={p.phone} label={k('insurance.network.call')} /> : undefined}
                  last={i === shown.length - 1}
                  testID={`provider-${i}`}
                />
              );
            })}
          </Panel>
        </Section>
      )}
    </Gate>
  );
}

function PhoneButton({ phone, label }: { phone: string; label: string }) {
  const { theme } = useScreenUi();
  return (
    <View>
      <Button label={label} variant="outline" size="sm" onPress={() => void Linking.openURL(`tel:${phone}`)} theme={theme} />
    </View>
  );
}
