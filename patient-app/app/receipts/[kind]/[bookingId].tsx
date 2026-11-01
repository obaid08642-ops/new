import React, { useRef, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import { captureRef } from 'react-native-view-shot';

import { ReceiptLinks } from '../../../src/components/receipt/ReceiptLinks';
import { ReceiptPaper } from '../../../src/components/receipt/ReceiptPaper';
import { ConsultScreen, Gate } from '../../../src/components/consult/ConsultKit';
import { useRemote } from '../../../src/components/health/HealthKit';
import { showLocalizedAlert } from '../../../src/components/LocalizedAlert';
import { useScreenUi } from '../../../src/components/screen/ScreenKit';
import { apiFetch, downloadProtected } from '../../../src/utils/api';
import { extractReceipt, isReceiptKind } from '../../../src/utils/receipt';
import { Share, type View } from 'react-native';

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
  const card = useRef<View>(null);

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
  /** "Save as image": the card on screen captured to a PNG and put in the photos (asks for the permission to add photos only). */
  const saveImage = async () => {
    if (!receipt || busy || !card.current) return;
    setBusy(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) { showLocalizedAlert(k('receipt.saveImage'), k('receipt.imagePermission')); return; }
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
      await MediaLibrary.saveToLibraryAsync(uri);
      showLocalizedAlert(k('receipt.saveImage'), k('receipt.imageSaved'));
    } catch {
      showLocalizedAlert(k('receipt.saveImage'), k('receipt.saveImageFailed'));
    } finally {
      setBusy(false);
    }
  };
  const share = () => {
    if (!receipt) return;
    Share.share({ message: `${k('receipt.shareTitle', { no: receipt.invoiceNo })}\n${k('receipt.total')}: ${k('pharmacy.price', { n: money(receipt.total) })}` }).catch(() => undefined);
  };

  return (
    <ConsultScreen title={k('receipt.title')} onBack={() => router.back()} testID="receipt-screen">
      <Gate status={status} onRetry={() => void reload()}>
        {receipt ? (
          <ReceiptPaper receipt={receipt} busy={busy} cardRef={card} onDownload={() => void download()} onShare={share} onSaveImage={() => void saveImage()}>
            {isReceiptKind(kind) && receipt.type !== 'credit_note' ? <ReceiptLinks kind={kind} bookingId={receipt.bookingId} /> : null}
          </ReceiptPaper>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
