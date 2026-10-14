import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Chip, FIcon, Input, type FillIconName } from '../../../../packages/ui-native/src';
import { Glyph } from '../pharmacy/PharmacyKit';
import { Gate, InfoRow, Section, useConsultFormat } from '../consult/ConsultKit';
import { HealthTabs, Notice, Panel, Pill, Row, SheetForm, rowsOf, useRemote, useTab } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { useGuestGuard } from '../../hooks/useGuestGuard';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { ChiLookup } from './ChiLookup';
import { BenefitsTab, NetworkTab } from './InsuranceHubTabs';
import { FootNote, INSURANCE_REQUEST, INSURANCE_TABS, INSURANCE_TONE, InsuranceScreen, KIND_LOOK, requestState, usePolicy, type InsurancePolicy, type InsuranceTab } from './InsuranceKit';

/**
 * The insurance hub (board Insurance, merge map 2 section 6, canonical `/insurance`): the tabs Policy, Benefits and Network in the route
 * query (view only: the facility asks the insurer, Nabd+ shows the decision; decision 35, no claims or refunds here). Policy holds the card, the insurer choice (the old /profile/insurance form),
 * the lookup in the portal of the Council of Health Insurance and the approval requests; the old /insurance/hub,
 * /insurance/policy-detail, /insurance/network-providers and /profile/insurance redirect here.
 * GET /users/me/insurance, POST /users/me/insurance, GET /insurance/companies(/:id/networks), GET /insurance/requests/my.
 */

export interface InsuranceRequestRow {
  id?: string;
  state?: string;
  booking_kind?: string;
  price?: number;
  copay_amount?: number;
  createdAt?: string;
}

export function InsuranceHubView() {
  const { isGuest, requireAuth } = useGuestGuard();
  useEffect(() => {
    // Insurance is one of the two areas guests cannot use (with family).
    if (isGuest) requireAuth('insurance');
  }, [isGuest, requireAuth]);
  if (isGuest) return null;
  return <Hub />;
}

function Hub() {
  const { k, c } = useScreenUi();
  const [tab, setTab] = useTab<InsuranceTab>(INSURANCE_TABS, 'policy');
  return (
    <InsuranceScreen
      title={k('insurance.hub.title')}
      actions={[{ key: 'add', label: k('insurance.hub.addPolicy'), icon: <Glyph name="plus" size={20} color={c.icon.primary} />, onPress: () => router.push('/insurance/add-policy' as Href) }]}
      testID="insurance-hub"
    >
      <HealthTabs
        tabs={INSURANCE_TABS.map((key) => ({ key, label: k(`insurance.tab.${key}`) }))}
        value={tab}
        onChange={setTab}
        testID="insurance-tabs"
      />
      {tab === 'policy' ? <PolicyTab /> : null}
      {tab === 'benefits' ? <BenefitsTab /> : null}
      {tab === 'network' ? <NetworkTab /> : null}
      <FootNote text={k('insurance.hub.note')} />
    </InsuranceScreen>
  );
}

function PolicyTab() {
  const { k, theme, t, c, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const policy = usePolicy();
  const requests = useRemote(async () => rowsOf<InsuranceRequestRow>(await apiFetch('/insurance/requests/my')), [], 'insurance:requests');
  const [chi, setChi] = useState(false);
  const [form, setForm] = useState(false);
  const p: InsurancePolicy | null = policy.data;
  const rows = requests.data ?? [];

  return (
    <>
      <Gate status={policy.status} onRetry={() => void policy.reload()}>
        {p ? (
          <View testID="policy-card" style={{ borderRadius: 28, padding: 18, gap: 14, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <FIcon icon="shield-check" tone={INSURANCE_TONE} size={52} chip="soft" theme={theme} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ ...scale(t, 'h4', 'bold'), color: c.text.primary, ...flow }}>{p.provider_name || p.provider || k('insurance.policy.company')}</Text>
                <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>
                  {[p.class ? k('insurance.policy.classValue', { value: p.class }) : '', p.expiry_date ? k('insurance.policy.expiresOn', { date: fmt.date(p.expiry_date) || p.expiry_date }) : ''].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Pill label={p.verified ? k('insurance.policy.verified') : k('insurance.policy.inReview')} tone={p.verified ? 'success' : 'warning'} />
            </View>
            <View>
              <InfoRow label={k('insurance.policy.number')} value={p.policy_number ?? ''} />
              <InfoRow label={k('insurance.policy.memberName')} value={p.member_name ?? ''} />
              <InfoRow label={k('insurance.policy.nationalId')} value={p.national_id ?? p.member_id ?? ''} />
              <InfoRow label={k('insurance.policy.network')} value={p.network ?? ''} last />
            </View>
          </View>
        ) : (
          <Notice tone="info" text={k('insurance.policy.none')} testID="policy-none" />
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button label={p ? k('insurance.policy.change') : k('insurance.policy.add')} variant="outline" fullWidth onPress={() => (p ? setForm(true) : router.push('/insurance/add-policy' as Href))} theme={theme} testID="policy-change" />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={k('insurance.policy.chiLookup')} variant="outline" fullWidth onPress={() => setChi(true)} theme={theme} testID="policy-chi" />
          </View>
        </View>
      </Gate>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <ShortcutTile icon="shield-check" label={k('insurance.shortcut.coverage')} onPress={() => router.push('/insurance/coverage-check' as Href)} testID="tile-coverage" />
        <ShortcutTile icon="hospital" label={k('insurance.shortcut.network')} onPress={() => router.setParams({ tab: 'network' })} testID="tile-network" />
      </View>

      <Section title={k('insurance.requests.title')}>
        <Gate status={requests.status} onRetry={() => void requests.reload()}>
          {rows.length === 0 ? (
            <Notice tone="info" text={k('insurance.requests.empty')} testID="requests-empty" />
          ) : (
            <Panel testID="requests-list">
              {rows.map((r, i) => {
                const look = KIND_LOOK[String(r.booking_kind ?? '')] ?? { icon: 'shield-check' as FillIconName, key: 'insurance.kind.other' };
                const state = requestState(r.state);
                return (
                  <Row
                    key={String(r.id ?? i)}
                    icon={look.icon}
                    tone={INSURANCE_TONE}
                    title={k(look.key)}
                    subtitle={typeof r.price === 'number' ? `${fmt.money(r.price)} ${k('consult.currency')}` : undefined}
                    caption={fmt.date(r.createdAt)}
                    trailing={<Pill label={k(state.key)} tone={state.tone} />}
                    onPress={r.id ? () => router.push({ pathname: INSURANCE_REQUEST, params: { id: r.id } } as unknown as Href) : undefined}
                    last={i === rows.length - 1}
                    testID={`request-${i}`}
                  />
                );
              })}
            </Panel>
          )}
        </Gate>
      </Section>

      <InsurerSheet open={form} onClose={() => setForm(false)} onSaved={() => { setForm(false); void policy.reload(true); }} />
      <ChiLookup open={chi} onClose={() => setChi(false)} onSaved={() => { setChi(false); void policy.reload(true); }} />
    </>
  );
}

function ShortcutTile({ icon, label, onPress, testID }: { icon: FillIconName; label: string; onPress: () => void; testID: string }) {
  const { theme, t, c } = useScreenUi();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} testID={testID} style={({ pressed }) => ({ flex: 1, minHeight: 96, borderRadius: 20, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8, opacity: pressed ? 0.85 : 1 })}>
      <FIcon icon={icon} tone={INSURANCE_TONE} size={42} chip="soft" theme={theme} />
      <Text style={{ ...scale(t, 'meta', 'medium'), color: c.text.primary, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

interface Company { id?: string; code?: string; name_ar?: string; name_en?: string }
interface Network { code?: string; id?: string; name_ar?: string; name_en?: string }

/**
 * The insurer choice (the old /profile/insurance form): the companies and their networks come from the catalog
 * (GET /insurance/companies, GET /insurance/companies/:id/networks); the body is the one that screen always sent.
 */
function InsurerSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { k, theme, lang } = useScreenUi();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [networkCode, setNetworkCode] = useState<string | null>(null);
  const [policyNumber, setPolicyNumber] = useState('');
  const [memberId, setMemberId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogFailed, setCatalogFailed] = useState(false);
  const name = (x: { name_ar?: string; name_en?: string; code?: string }) => (lang === 'ar' || lang === 'ur' ? x.name_ar || x.name_en : x.name_en || x.name_ar) || x.code || '';

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCatalogFailed(false);
    apiFetch('/insurance/companies').then((list) => setCompanies(rowsOf<Company>(list))).catch((e) => { logError('insurance:companies', e); setCompanies([]); setCatalogFailed(true); });
  }, [open]);

  const pickCompany = async (company: Company) => {
    const id = String(company.id || company.code);
    setCompanyId(id);
    setNetworkCode(null);
    setNetworks([]);
    try {
      setNetworks(rowsOf<Network>(await apiFetch(`/insurance/companies/${id}/networks`)));
    } catch (e) {
      logError('insurance:networks', e);
      setNetworks([]);
    }
  };

  const save = async () => {
    if (!companyId || !policyNumber.trim()) {
      setError(k('insurance.insurer.required'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const company = companies.find((c) => String(c.id || c.code) === companyId);
      await apiFetch('/users/me/insurance', {
        method: 'POST',
        body: JSON.stringify({
          provider: company?.code || companyId,
          provider_name: company?.name_ar || company?.name_en || '',
          policy_number: policyNumber.trim(),
          member_id: memberId.trim(),
          network: networkCode || '',
          class: 'A',
        }),
      });
      setPolicyNumber('');
      setMemberId('');
      onSaved();
    } catch (e) {
      logError('insurance:insurer-save', e);
      setError(k('insurance.insurer.failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetForm open={open} title={k('insurance.insurer.title')} onClose={onClose} onSave={() => void save()} saving={saving} error={error} saveLabel={k('insurance.insurer.save')} testID="insurer-sheet">
      <Section title={k('insurance.insurer.company')}>
        {catalogFailed ? <Notice tone="danger" text={k('insurance.insurer.catalogFailed')} /> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {companies.map((company) => {
            const id = String(company.id || company.code);
            return <Chip key={id} label={name(company)} selected={companyId === id} onPress={() => void pickCompany(company)} theme={theme} testID={`insurer-${id}`} />;
          })}
        </View>
      </Section>
      {networks.length > 0 ? (
        <Section title={k('insurance.insurer.network')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {networks.map((n) => {
              const code = String(n.code || n.id);
              return <Chip key={code} label={name(n)} selected={networkCode === code} onPress={() => setNetworkCode(code)} theme={theme} testID={`network-${code}`} />;
            })}
          </View>
        </Section>
      ) : null}
      <Input label={k('insurance.insurer.policyNumber')} value={policyNumber} onChange={setPolicyNumber} theme={theme} testID="insurer-policy" />
      <Input label={k('insurance.insurer.memberId')} value={memberId} onChange={setMemberId} theme={theme} testID="insurer-member" />
    </SheetForm>
  );
}
