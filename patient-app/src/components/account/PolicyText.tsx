import React from 'react';
import { Text, View } from 'react-native';

import { Card } from '../../../../packages/ui-native/src';
import { bodyOf, useRemote } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';

/**
 * The cancellation and returns policy as the server states it (GET /system-config/public: `cancellation_policy` and
 * `returns_policy`). Every number in a sentence comes from that answer; a sentence whose numbers are missing is not
 * drawn, and no hours or percentages are written in the app (decision 26).
 */

interface CancellationPolicy { full_hours?: number; full_refund?: boolean; half_hours?: number; half_refund_percent?: number; late_fee_percent?: number; pharmacy_prep_cancellable?: boolean }
interface ReturnsPolicy { unused_days?: number; intact_packaging_required?: boolean; wallet_refund_days_min?: number; wallet_refund_days_max?: number }
interface PublicConfig { cancellation_policy?: CancellationPolicy | null; returns_policy?: ReturnsPolicy | null }

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** The sentences of one policy block, from the server's numbers. */
export function policyLines(config: PublicConfig | null, kind: 'cancellation' | 'returns', k: (key: string, vars?: Record<string, string | number>) => string): string[] {
  const lines: string[] = [];
  if (kind === 'cancellation') {
    const c = config?.cancellation_policy;
    if (!c) return lines;
    if (isNumber(c.full_hours) && c.full_refund !== false) lines.push(k('set.legal.cancelFull', { hours: c.full_hours }));
    if (isNumber(c.half_hours) && isNumber(c.half_refund_percent)) lines.push(k('set.legal.cancelHalf', { hours: c.half_hours, percent: c.half_refund_percent }));
    if (isNumber(c.late_fee_percent)) lines.push(k('set.legal.cancelLate', { percent: c.late_fee_percent }));
    if (c.pharmacy_prep_cancellable === false) lines.push(k('set.legal.cancelPharmacy'));
    return lines;
  }
  const r = config?.returns_policy;
  if (!r) return lines;
  if (isNumber(r.unused_days)) lines.push(k(r.intact_packaging_required ? 'set.legal.returnsDaysPacked' : 'set.legal.returnsDays', { days: r.unused_days }));
  if (isNumber(r.wallet_refund_days_min) && isNumber(r.wallet_refund_days_max)) lines.push(k('set.legal.refundDays', { min: r.wallet_refund_days_min, max: r.wallet_refund_days_max }));
  return lines;
}

/**
 * The rules that apply to a pharmacy order, for its cancel confirmation (decision 26): whether preparation can still be
 * cancelled, then the return and refund sentences. Only what the server sent is written; the appointment-time
 * cancellation tiers belong to consultations and are not repeated here.
 */
export function pharmacyPolicyLines(config: PublicConfig | null, k: (key: string, vars?: Record<string, string | number>) => string): string[] {
  const lines: string[] = [];
  if (config?.cancellation_policy?.pharmacy_prep_cancellable === false) lines.push(k('set.legal.cancelPharmacy'));
  return [...lines, ...policyLines(config, 'returns', k)];
}

/** Loads the public policy once; `null` data means it could not be read (the caller draws nothing then). */
export function usePublicPolicy() {
  return useRemote(async () => bodyOf<PublicConfig>(await apiFetch('/system-config/public')), [], 'settings:policy');
}

/** The policy as a card with a title and one line per sentence. Draws nothing when the server sent no sentence. */
export function PolicyCard({ kind, title }: { kind: 'cancellation' | 'returns'; title: string }) {
  const { k, theme, t, c, flow } = useScreenUi();
  const policy = usePublicPolicy();
  const lines = policyLines(policy.data, kind, k);
  if (lines.length === 0) return null;
  return (
    <Card theme={theme} testID={`policy-${kind}`}>
      <View style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{title}</Text>
        {lines.map((line) => (
          <Text key={line} style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{line}</Text>
        ))}
      </View>
    </Card>
  );
}
