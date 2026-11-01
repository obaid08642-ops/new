import React, { useState } from 'react';

import { Button } from '../../../../packages/ui-native/src';
import { showLocalizedAlert } from '../LocalizedAlert';
import { useScreenUi } from '../screen/ScreenKit';
import { receiptKindOf, shareReceipt } from '../../billing/receipts';

/**
 * "Receipt" on a paid booking or order: downloads the tax invoice PDF (GET /billing/invoice/:kind/:bookingId/pdf) and opens the share
 * sheet. Drawn only by screens that know the booking is paid; renders nothing for a booking kind the invoicing does not cover.
 */
export function ReceiptButton({ bookingKind, bookingId, testID = 'receipt-button' }: { bookingKind: string; bookingId?: string | null; testID?: string }) {
  const { k, theme } = useScreenUi();
  const [busy, setBusy] = useState(false);
  const kind = receiptKindOf(bookingKind);
  if (!kind || !bookingId) return null;
  const open = async () => {
    if (busy) return;
    setBusy(true);
    const result = await shareReceipt(kind, bookingId);
    setBusy(false);
    if (result === 'unavailable') showLocalizedAlert(k('receipt.failTitle'), k('receipt.failBody'));
  };
  return <Button label={k(busy ? 'receipt.preparing' : 'receipt.button')} variant="outline" size="md" fullWidth startIcon="receipt" loading={busy} onPress={() => void open()} theme={theme} testID={testID} />;
}
