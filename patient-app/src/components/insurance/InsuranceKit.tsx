import React from 'react';
import { Text, View } from 'react-native';
import type { Href } from 'expo-router';

import { SERVICE_ICONS, type FillIconName, type ServiceTone } from '../../../../packages/ui-native/src';
import { goBack } from '../consult/ConsultKit';
import { HealthScreen, bodyOf, useRemote } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';

/**
 * What the insurance screens share (Batch 7, merge map 2 section 6): the frame whose back button returns to the
 * insurance hub, the one place the policy of the signed-in patient is read (GET /users/me/insurance) and the words and
 * tones of the request states. Amounts and states are only ever what the server sent.
 */

export const INSURANCE_HUB = '/insurance' as Href;
export const INSURANCE_REQUEST = '/insurance/request';
export const INSURANCE_TONE: ServiceTone = SERVICE_ICONS.insurance.tone;

/** The glyph and the label key of each kind of booking an insurance request can be for. */
export const KIND_LOOK: Record<string, { icon: FillIconName; key: string }> = {
  consultation: { icon: 'stethoscope', key: 'insurance.kind.consultation' },
  lab: { icon: 'test-tube', key: 'insurance.kind.lab' },
  labs: { icon: 'test-tube', key: 'insurance.kind.lab' },
  radiology: { icon: 'scan', key: 'insurance.kind.radiology' },
  nursing: { icon: 'first-aid-kit', key: 'insurance.kind.nursing' },
  pharmacy: { icon: 'pill', key: 'insurance.kind.pharmacy' },
};

export type InsuranceTab = 'policy' | 'benefits' | 'network';
export const INSURANCE_TABS: readonly InsuranceTab[] = ['policy', 'benefits', 'network'];

/** The frame of an insurance screen: the board header, back to the hub when there is nothing to go back to. */
export function InsuranceScreen(props: React.ComponentProps<typeof HealthScreen>) {
  return <HealthScreen {...props} onBack={props.onBack ?? (() => goBack(INSURANCE_HUB))} />;
}

export interface InsurancePolicy {
  provider?: string | null;
  provider_name?: string | null;
  policy_number?: string | null;
  member_id?: string | null;
  member_name?: string | null;
  national_id?: string | null;
  network?: string | null;
  class?: string | null;
  expiry_date?: string | null;
  verified?: boolean;
}

/** The policy on the patient's account, or null when there is none (an empty body or "not found"). */
export async function loadPolicy(): Promise<InsurancePolicy | null> {
  try {
    const policy = bodyOf<InsurancePolicy>(await apiFetch('/users/me/insurance'));
    return policy && (policy.provider || policy.provider_name || policy.policy_number) ? policy : null;
  } catch (e) {
    if (/not found|404/i.test(String((e as { message?: unknown } | null)?.message ?? ''))) return null;
    throw e;
  }
}

export function usePolicy() {
  return useRemote(loadPolicy, [], 'insurance:policy');
}

type PillTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** The pill of an insurance request state: the label key and tone, from the server state only. */
export function requestState(state: unknown): { key: string; tone: PillTone } {
  switch (String(state ?? '')) {
    case 'PENDING_PROVIDER_REVIEW': return { key: 'insurance.request.state.PENDING_PROVIDER_REVIEW', tone: 'warning' };
    case 'APPROVED_FULL': return { key: 'insurance.request.state.APPROVED_FULL', tone: 'success' };
    case 'COPAY_PENDING': return { key: 'insurance.request.state.COPAY_PENDING', tone: 'warning' };
    case 'COPAY_PAID': return { key: 'insurance.request.state.COPAY_PAID', tone: 'success' };
    case 'REJECTED': return { key: 'insurance.request.state.REJECTED', tone: 'danger' };
    case 'SELF_PAY_PENDING': return { key: 'insurance.request.state.SELF_PAY_PENDING', tone: 'warning' };
    case 'SELF_PAY_PAID': return { key: 'insurance.request.state.SELF_PAY_PAID', tone: 'success' };
    case 'EXPIRED': return { key: 'insurance.request.state.EXPIRED', tone: 'neutral' };
    case 'CANCELLED': return { key: 'insurance.request.state.CANCELLED', tone: 'neutral' };
    default: return { key: 'insurance.request.state.other', tone: 'neutral' };
  }
}

/** A labelled value (an amount with its caption). */
export function Stat({ label, value, tone = 'primary', testID }: { label: string; value: string; tone?: 'primary' | 'success' | 'warning'; testID?: string }) {
  const { t, c, flow } = useScreenUi();
  const color = tone === 'success' ? c.status.success.fg : tone === 'warning' ? c.status.warning.fg : c.text.primary;
  return (
    <View testID={testID} style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{label}</Text>
      <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color, ...flow }}>{value}</Text>
    </View>
  );
}

/** The board's note at the foot of the insurance pages. */
export function FootNote({ text }: { text: string }) {
  const { t, c } = useScreenUi();
  return <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{text}</Text>;
}
