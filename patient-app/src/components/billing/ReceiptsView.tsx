import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card, EmptyState } from '../../../../packages/ui-native/src';
import { AccountScreen } from '../account/AccountKit';
import { Gate, StatusTag, useConsultFormat } from '../consult/ConsultKit';
import { rowsOf, useRemote } from '../health/HealthKit';
import { showLocalizedAlert } from '../LocalizedAlert';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { parseReceipts, shareReceipt, type ReceiptRow } from '../../billing/receipts';

/** `/payments/receipts`: my tax invoices (GET /billing/my, newest first, up to 100). A row opens the PDF in the share sheet. */
export function ReceiptsView() {
  const { k, theme, t, c, flow, num } = useScreenUi();
  const { date } = useConsultFormat();
  const list = useRemote(async () => parseReceipts(rowsOf<unknown>(await apiFetch('/billing/my'))), [], 'billing:receipts');
  const [opening, setOpening] = useState<string | null>(null);
  const rows = list.data ?? [];
  const open = async (row: ReceiptRow) => {
    if (!row.kind || opening) return;
    setOpening(row.invoiceNo);
    const result = await shareReceipt(row.kind, row.bookingId);
    setOpening(null);
    if (result === 'unavailable') showLocalizedAlert(k('receipt.failTitle'), k('receipt.failBody'));
  };
  return (
    <AccountScreen title={k('receipt.title')} testID="receipts-screen">
      <Gate status={list.status} errorTitle={k('receipt.loadError')} onRetry={() => void list.reload()}>
        {rows.length === 0 ? (
          <EmptyState icon="receipt" tone="ink" title={k('receipt.empty')} body={k('receipt.emptyBody')} theme={theme} />
        ) : (
          rows.map((row) => (
            <Pressable key={row.invoiceNo} accessibilityRole="button" accessibilityLabel={`${k('receipt.invoice')} ${row.invoiceNo}`} disabled={!row.kind || opening !== null} onPress={() => void open(row)} style={({ pressed }) => ({ opacity: pressed || opening === row.invoiceNo ? 0.7 : 1 })} testID={`receipt-${row.invoiceNo}`}>
              <Card padding="sm" theme={theme}>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, writingDirection: 'ltr', textAlign: flow.textAlign }}>{row.invoiceNo}</Text>
                      {row.kind ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k(`receipt.kind.${row.kind}`)}</Text> : null}
                    </View>
                    {row.cancelled ? <StatusTag label={k('receipt.cancelled')} tone="neutral" /> : null}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    {row.issuedAt ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{date(row.issuedAt, true)}</Text> : <View />}
                    <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary }}>{`${num(row.total)} ${row.currency === 'SAR' ? k('consult.currency') : row.currency}`}</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </Gate>
    </AccountScreen>
  );
}
