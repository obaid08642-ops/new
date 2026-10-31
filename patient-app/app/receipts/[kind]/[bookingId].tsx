import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { ReceiptPaper } from '../../../src/components/receipt/ReceiptPaper';
import { ConsultScreen, Gate } from '../../../src/components/consult/ConsultKit';
import { useRemote } from '../../../src/components/health/HealthKit';
import { showLocalizedAlert } from '../../../src/components/LocalizedAlert';
import { useScreenUi } from '../../../src/components/screen/ScreenKit';
import { apiFetch, downloadProtected } from '../../../src/utils/api';
import { extractReceipt, isReceiptKind } from '../../../src/utils/receipt';
import { Share } from 'react-native';

/** One receipt: GET /billing/invoice/:kind/:id (issued for a paid booking or order), drawn as the thermal receipt. */
export default function ReceiptScreen() {
  const { k, money } = useScreenUi();
  const params = useLocalSearchParams<{ kind?: string; bookingId?: string }>();
  const kind = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const bookingId = Array.isArray(params.bookingId) ? params.bookingId[0] : params.bookingId;
  const [busy, setBusy] = useState(false);
  const { status, data, reload } = useRemote(async () => {
    if (!isReceiptKind(kind) || !bookingId) return null;
    return extractReceipt(await apiFetch(`/billing/invoice/${kind}/${encodeURIComponent(bookingId)}`));
  }, [kind, bookingId], 'receipts:one');
  const receipt = data ?? null;

  const download = async () => {
    if (!receipt || busy) return;
    setBusy(true);
    try {
      const uri = await downloadProtected(`/billing/invoice/${kind}/${encodeURIComponent(receipt.bookingId)}/pdf`, `${receipt.invoiceNo}.pdf`);
      if (!uri) { showLocalizedAlert(k('receipt.pdfFailedTitle'), k('receipt.pdfFailedBody')); return; }
      const { shareAsync } = await import('expo-sharing');
      await shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: k('receipt.downloadPdf') });
    } finally {
      setBusy(false);
    }
  };
  const share = () => {
    if (!receipt) return;
    Share.share({ message: `${k('receipt.shareTitle', { no: receipt.invoiceNo })}\n${k('receipt.total')}: ${money(receipt.total)} ${receipt.currency}` }).catch(() => undefined);
  };

  return (
    <ConsultScreen title={k('receipt.title')} onBack={() => router.back()} testID="receipt-screen">
      <Gate status={status} onRetry={() => void reload()}>
        {receipt ? <ReceiptPaper receipt={receipt} busy={busy} onDownload={() => void download()} onShare={share} /> : null}
      </Gate>
    </ConsultScreen>
  );
}
