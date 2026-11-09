import React from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Card, Chip } from '../../../../packages/ui-native/src';
import { step as scale, useScreenUi } from '../screen/ScreenKit';

/**
 * The refund policy before payment, with the "I agree" tick the backend requires (`refund_policy_accepted`, see utils/refundAcceptance.ts).
 * `lines` are the figures of the policy the screen already has (the consultation's cancellation policy); without them the card says the
 * rules depend on the service and links to the full policy screen. The caller keeps the pay or confirm button off until `checked`.
 */
export function RefundPolicyTick({ checked, onChange, lines }: { checked: boolean; onChange: (checked: boolean) => void; lines?: string[] }) {
  const { theme, t, c, flow, k } = useScreenUi();
  return (
    <Card theme={theme} padding="sm">
      <View style={{ gap: 8 }} testID="refund-policy-tick">
        <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('refund.title')}</Text>
        {lines && lines.length > 0 ? (
          lines.map((line) => <Text key={line} style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{line}</Text>)
        ) : (
          <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k('refund.general')}</Text>
        )}
        <Button label={k('refund.read')} variant="ghost" size="sm" onPress={() => router.push('/settings/refund-policy' as Href)} theme={theme} testID="refund-policy-read" />
        <View style={{ flexDirection: 'row' }}>
          <Chip label={k('refund.agree')} selected={checked} onPress={() => onChange(!checked)} theme={theme} testID="refund-policy-agree" />
        </View>
        {!checked ? <Text accessibilityLiveRegion="polite" style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('refund.needAgree')}</Text> : null}
      </View>
    </Card>
  );
}
