import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button } from '../../../../packages/ui-native/src';
import { Glyph } from '../pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { StatusTag } from './ConsultKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { readLateGuarantee, type FollowUpAction, type LateGuarantee, type LicenseLine } from '../../utils/differentiators';

/**
 * The visible parts of the five differentiators (owner decision 2026-10-24) that the doctor card, the doctor page and the
 * appointment page share. Each draws nothing when the server did not send its value (no default minutes, no default points).
 */

/** The late-appointment setting of GET /system-config/public; null while loading, on failure, or when the server has no setting. */
export function useLateGuarantee(config?: unknown): LateGuarantee | null {
  const [guarantee, setGuarantee] = useState<LateGuarantee | null>(() => (config === undefined ? null : readLateGuarantee(config)));
  useEffect(() => {
    if (config !== undefined) {
      setGuarantee(readLateGuarantee(config));
      return;
    }
    let alive = true;
    apiFetch<unknown>('/system-config/public')
      .then((res) => alive && setGuarantee(readLateGuarantee(res)))
      .catch((e) => {
        logError('consultations:late-guarantee', e);
        if (alive) setGuarantee(null);
      });
    return () => {
      alive = false;
    };
  }, [config]);
  return guarantee;
}

/** "Late more than 30 minutes? You get N Nabdat points", the minutes and the points being the server's. */
export function GuaranteeLine({ guarantee, center, testID }: { guarantee: LateGuarantee | null; center?: boolean; testID?: string }) {
  const { t, c, flow, k, num } = useScreenUi();
  if (!guarantee) return null;
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: center ? 'center' : 'flex-start', gap: 8, minHeight: 24 }}>
      <Glyph name="clock-counter-clockwise" size={16} color={c.status.success.fg} />
      <Text style={{ ...scale(t, 'meta', 'medium'), color: c.status.success.fg, flexShrink: 1, ...flow }}>{k('consult.guarantee.line', { minutes: num(guarantee.minutes), points: num(guarantee.points) })}</Text>
    </View>
  );
}

/** "Licensed by SCFHS, no. X" with the verified badge when the licence was verified. No date, no expiry. */
export function LicenseRow({ license, testID }: { license: LicenseLine | null; testID?: string }) {
  const { t, c, flow, k } = useScreenUi();
  if (!license) return null;
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingVertical: 8 }}>
      <Glyph name="identification-card" size={20} color={c.icon.secondary} />
      <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, flexShrink: 1, ...flow }}>{k('consult.license.line', { number: license.number })}</Text>
      {license.verified ? <StatusTag label={k('consult.license.verified')} tone="success" /> : null}
    </View>
  );
}

const FOLLOW_UP_LABEL: Record<FollowUpAction['kind'], { key: string; icon: 'package' | 'test-tube' | 'scan' }> = {
  pharmacy_order: { key: 'consult.followUp.rx', icon: 'package' },
  lab_booking: { key: 'consult.followUp.labs', icon: 'test-tube' },
  radiology_booking: { key: 'consult.followUp.scans', icon: 'scan' },
};

/**
 * One-tap buttons for the actions the server lists after a completed visit. The prescription opens the rx-order flow with its
 * id; labs and scans do what the medical order's group Order button does: POST /medical-orders/:id/items/:first/order
 * { group_all: true }, then the ordering flow.
 */
export function FollowUpActions({ actions, testID }: { actions: FollowUpAction[]; testID?: string }) {
  const { theme, k } = useScreenUi();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  if (actions.length === 0) return null;
  const run = async (action: FollowUpAction, id: string) => {
    if (action.kind === 'pharmacy_order') {
      router.push({ pathname: '/pharmacy/rx-order', params: { prescriptionId: action.prescriptionId } } as unknown as Href);
      return;
    }
    setBusy(id);
    setFailed(false);
    try {
      await apiFetch(`/medical-orders/${encodeURIComponent(action.orderId)}/items/${encodeURIComponent(action.firstItemId)}/order`, { method: 'POST', body: JSON.stringify({ group_all: true }) });
      router.push({ pathname: '/diagnostics/search' } as unknown as Href);
    } catch (e) {
      logError('consultations:follow-up-action', e);
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };
  return (
    <View testID={testID} style={{ gap: 8 }}>
      {actions.map((action, i) => {
        const id = `${action.kind}-${i}`;
        return <Button key={id} label={k(FOLLOW_UP_LABEL[action.kind].key)} variant="outline" size="md" fullWidth startIcon={FOLLOW_UP_LABEL[action.kind].icon} loading={busy === id} disabled={busy !== null} onPress={() => void run(action, id)} theme={theme} testID={`follow-up-${action.kind}-${i}`} />;
      })}
      {failed ? <Text accessibilityRole="alert" style={{ color: 'inherit' }}>{k('medorders.loadError')}</Text> : null}
    </View>
  );
}
