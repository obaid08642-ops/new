import React, { useMemo, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Input, type FillIconName } from '../../../../packages/ui-native/src';
import { Gate, Section, useConsultFormat } from '../consult/ConsultKit';
import { HealthTabs, Notice, Panel, Pill, Row, rowsOf, useRemote } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { pickLocalized } from '../../utils/localize';
import { INSURANCE_TONE, Stat, usePolicy } from './InsuranceKit';

/**
 * The Benefits and Network tabs of the insurance hub. Every amount, percentage and state on them is
 * what the server sent: nothing is summed, estimated or filled in on the device.
 */

interface Benefit {
  service?: string;
  coverage?: number;
  remaining?: number;
  annualLimit?: number;
  usedAmount?: number;
  usedCount?: number;
  limitCount?: number;
}

/** GET /insurance/benefits-summary: the benefits of the policy with what is used and what is left. */
export function BenefitsTab() {
  const { k, t, c, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const benefits = useRemote(async () => rowsOf<Benefit>(await apiFetch('/insurance/benefits-summary')), [], 'insurance:benefits');
  const rows = benefits.data ?? [];
  const money = (n: unknown) => (typeof n === 'number' ? `${fmt.money(n)} ${k('consult.currency')}` : '—');
  return (
    <Gate status={benefits.status} onRetry={() => void benefits.reload()}>
      {rows.length === 0 ? (
        <Notice tone="info" text={k('insurance.benefits.empty')} testID="benefits-empty" />
      ) : (
        <View style={{ gap: 12 }} testID="benefits-list">
          {rows.map((b, i) => {
            const pct = typeof b.usedAmount === 'number' && typeof b.annualLimit === 'number' && b.annualLimit > 0 ? Math.min(100, (b.usedAmount / b.annualLimit) * 100) : null;
            return (
              <View key={`${b.service}-${i}`} style={{ borderRadius: 24, padding: 16, gap: 12, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ ...scale(t, 'body', 'bold'), color: c.text.primary, flex: 1, ...flow }}>{b.service}</Text>
                  {typeof b.coverage === 'number' ? <Pill label={k('insurance.benefits.coverage', { value: fmt.num(b.coverage) })} tone="info" /> : null}
                </View>
                {pct !== null ? (
                  <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }} style={{ height: 8, borderRadius: 4, backgroundColor: c.border.hairline, overflow: 'hidden' }}>
                    <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: c.action.primary.bg }} />
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Stat label={k('insurance.benefits.limit')} value={money(b.annualLimit)} />
                  <Stat label={k('insurance.benefits.used')} value={money(b.usedAmount)} />
                  <Stat label={k('insurance.benefits.remaining')} value={money(b.remaining)} tone="success" />
                </View>
                {typeof b.limitCount === 'number' && b.limitCount > 0 ? (
                  <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('insurance.benefits.visits', { used: fmt.num(b.usedCount ?? 0), limit: fmt.num(b.limitCount) })}</Text>
                ) : null}
              </View>
            );
          })}
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
