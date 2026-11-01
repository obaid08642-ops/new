import React from 'react';
import { router, type Href } from 'expo-router';

import { Button } from '../../../../packages/ui-native/src';
import { useScreenUi } from '../screen/ScreenKit';
import { receiptKindOf } from '../../billing/receipts';

/**
 * "Receipt" on a paid booking or order: opens the receipt (the thermal-receipt card with the print animation, app/receipts/[kind]/[bookingId]),
 * where Download PDF and Share are. Drawn only by screens that know the booking is paid; renders nothing for a booking kind the invoicing does not cover.
 */
export function ReceiptButton({ bookingKind, bookingId, testID = 'receipt-button' }: { bookingKind: string; bookingId?: string | null; testID?: string }) {
  const { k, theme } = useScreenUi();
  const kind = receiptKindOf(bookingKind);
  if (!kind || !bookingId) return null;
  return <Button label={k('receipt.button')} variant="outline" size="md" fullWidth startIcon="receipt" onPress={() => router.push({ pathname: '/receipts/[kind]/[bookingId]', params: { kind, bookingId } } as unknown as Href)} theme={theme} testID={testID} />;
}
