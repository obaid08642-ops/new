import React from 'react';
import { Text } from 'react-native';
import { router, type Href } from 'expo-router';

import { ConsultScreen, Gate } from '../../src/components/consult/ConsultKit';
import { Panel, Row, useRemote } from '../../src/components/health/HealthKit';
import { useConsultFormat } from '../../src/components/consult/ConsultKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { extractReceipts, isReceiptKind } from '../../src/utils/receipt';

const KIND_KEY: Record<string, string> = {
  pharmacy: 'receipt.kindPharmacy', order: 'receipt.kindPharmacy', appointment: 'receipt.kindConsultation', consultation: 'receipt.kindConsultation',
  lab: 'receipt.kindLab', radiology: 'receipt.kindRadiology', home_care: 'receipt.kindNursing', nursing: 'receipt.kindNursing',
};

/** Receipts: the patient's invoices, newest first (GET /billing/my), each opening its receipt. */
export default function ReceiptsScreen() {
  const { k, t, c, flow, money } = useScreenUi();
  const fmt = useConsultFormat();
  const { status, data, reload } = useRemote(async () => extractReceipts(await apiFetch('/billing/my')).filter((r) => isReceiptKind(r.kind)), [], 'receipts:list');
  const receipts = data ?? [];
  return (
    <ConsultScreen title={k('receipt.listTitle')} onBack={() => router.back()} testID="receipts-screen">
      <Gate status={status} onRetry={() => void reload()}>
        {receipts.length === 0 ? (
          <>
            <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('receipt.listEmptyTitle')}</Text>
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('receipt.listEmptyBody')}</Text>
          </>
        ) : (
          <Panel>
            {receipts.map((r, i, all) => (
              <Row
                key={r.invoiceNo}
                icon="receipt"
                tone="blue"
                title={r.type === 'credit_note' ? k('receipt.creditNoteTitle') : k(KIND_KEY[r.kind] ?? 'receipt.kindPharmacy')}
                subtitle={`${r.invoiceNo} · ${fmt.dateTime(r.issuedAt)}`}
                caption={r.cancelled ? k('receipt.cancelled') : r.state === 'refunded' ? k('receipt.stateRefunded') : r.state === 'partially_refunded' ? k('receipt.statePartial') : undefined}
                trailing={<Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary }}>{k('pharmacy.price', { n: money(r.total) })}</Text>}
                last={i === all.length - 1}
                onPress={() => router.push({ pathname: '/receipts/[kind]/[bookingId]', params: { kind: r.kind, bookingId: r.bookingId } } as unknown as Href)}
              />
            ))}
          </Panel>
        )}
      </Gate>
    </ConsultScreen>
  );
}
