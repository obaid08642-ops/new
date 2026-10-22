import React from 'react';
import type { ServiceKind } from '../../api/ordering';
import { OrderingSettingsScreen } from './OrderingSettingsScreen';
import { OrderingItemsScreen } from './OrderingItemsScreen';
import { OrderingBulkScreen } from './OrderingBulkScreen';
import { OrderingCompletenessScreen } from './OrderingCompletenessScreen';

export { OrderingSettingsScreen, OrderingItemsScreen, OrderingBulkScreen, OrderingCompletenessScreen };
export const ORDERING_ENTRY = 'ordering_completeness';

/**
 * The four ordering-declaration routes for a native-stack navigator: `{orderingStackScreens(Stack, 'lab')}` inside
 * <Stack.Navigator>. The entry route is ORDERING_ENTRY.
 */
export function orderingStackScreens(Stack: any, kind: ServiceKind) {
  const go = (navigation: any) => (screen: string) => navigation.navigate(screen);
  return (
    <>
      <Stack.Screen name="ordering_completeness">{({ navigation }: any) => <OrderingCompletenessScreen kind={kind} onBack={() => navigation.goBack()} onNav={go(navigation)} />}</Stack.Screen>
      <Stack.Screen name="ordering_settings">{({ navigation }: any) => <OrderingSettingsScreen kind={kind} onBack={() => navigation.goBack()} onNav={go(navigation)} />}</Stack.Screen>
      <Stack.Screen name="ordering_items">{({ navigation }: any) => <OrderingItemsScreen kind={kind} onBack={() => navigation.goBack()} onNav={go(navigation)} />}</Stack.Screen>
      <Stack.Screen name="ordering_bulk">{({ navigation }: any) => <OrderingBulkScreen kind={kind} onBack={() => navigation.goBack()} onNav={go(navigation)} />}</Stack.Screen>
    </>
  );
}
