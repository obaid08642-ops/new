import React from 'react';
import { Text, View } from 'react-native';

import { bodyOf, useRemote } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { homeVisitTermLines, type RefundPolicy } from '../../utils/homeVisitTerms';

/**
 * Journeys 66 (decision 26): the home-visit cancellation terms before payment, from the server's refund policy
 * (GET /refund-policy, admin-editable): full refund before the nurse is on the way, then the trip fee, and what happens
 * when the patient is not there. A sentence whose number the server did not send is not drawn.
 */
export function HomeVisitTerms() {
  const { k, t, c, flow, money } = useScreenUi();
  const policy = useRemote(async () => bodyOf<RefundPolicy>(await apiFetch('/refund-policy')), [], 'nursing:refund-policy');
  const lines = homeVisitTermLines(policy.data, k, money);
  if (!lines.length) return null;
  return (
    <View style={{ gap: 6 }} testID="home-visit-terms">
      <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{k('nur.terms.title')}</Text>
      {lines.map((line) => <Text key={line} style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{line}</Text>)}
    </View>
  );
}
