import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Card, Chip } from '../../../../packages/ui-native/src';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { onRefundPolicyChanged, readRefundSummary, readRefundSummaryHash, refundSummaryPath, rememberShownPolicy, type RefundLine, type RefundService } from '../../utils/refundAcceptance';

/**
 * The refund policy before payment, with the "I agree" tick the backend requires (`refund_policy_accepted`, see utils/refundAcceptance.ts).
 * `service` picks the text: the server sends the lines of that service's policy (GET /refund-policy/summary, keys + numbers) and they are shown in the
 * patient's language; while they load, or if they cannot be read, the card says the rules depend on the service and links to the full policy screen.
 * `lines` are the figures of the policy the screen already has (the consultation's cancellation policy); without them the card says the
 * rules depend on the service and links to the full policy screen. The caller keeps the pay or confirm button off until `checked`.
 */
export function RefundPolicyTick({ checked, onChange, lines, service }: { checked: boolean; onChange: (checked: boolean) => void; lines?: string[]; service?: RefundService }) {
  const { theme, t, c, flow, k } = useScreenUi();
  const [summary, setSummary] = useState<RefundLine[]>([]);
  const [changed, setChanged] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!service) return undefined;
    let live = true;
    Promise.resolve(apiFetch<unknown>(refundSummaryPath(service)))
      .then((answer) => {
        if (!live) return;
        const lines = readRefundSummary(answer);
        setSummary(lines);
        // the hash is remembered only when the text it belongs to is really on the screen
        rememberShownPolicy(service, lines.length > 0 ? readRefundSummaryHash(answer) : undefined);
      })
      .catch(() => { if (live) { setSummary([]); rememberShownPolicy(service, undefined); } });
    return () => { live = false; };
  }, [service, reload]);
  // a create answered 409 refund_policy_changed: show the new text and ask for the tick again
  useEffect(() => {
    if (!service) return undefined;
    return onRefundPolicyChanged((changedService) => {
      if (changedService !== service) return;
      setChanged(true); onChange(false); setReload((n) => n + 1);
    });
  }, [service, onChange]);
  return (
    <Card theme={theme} padding="sm">
      <View style={{ gap: 8 }} testID="refund-policy-tick">
        <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('refund.title')}</Text>
        {summary.length > 0 ? (
          summary.map((line) => <Text key={line.key} style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k(line.key, line.params)}</Text>)
        ) : lines && lines.length > 0 ? (
          lines.map((line) => <Text key={line} style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{line}</Text>)
        ) : (
          <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k('refund.general')}</Text>
        )}
        <Button label={k('refund.read')} variant="ghost" size="sm" onPress={() => router.push('/settings/refund-policy' as Href)} theme={theme} testID="refund-policy-read" />
        <View style={{ flexDirection: 'row' }}>
          <Chip label={k('refund.agree')} selected={checked} onPress={() => onChange(!checked)} theme={theme} testID="refund-policy-agree" />
        </View>
        {changed ? <Text accessibilityRole="alert" testID="refund-policy-changed" style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k('refund.changed')}</Text> : null}
        {!checked ? <Text accessibilityLiveRegion="polite" style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('refund.needAgree')}</Text> : null}
      </View>
    </Card>
  );
}
