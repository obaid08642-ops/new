/**
 * Why a new non-insurance lab or radiology request cannot be accepted yet, as the server decides it (assertConfirmable in
 * labs.service and radiology.service): an unpaid card booking waits for the payment, and cash is only taken at the facility.
 * null = it can be accepted now. Insurance goes through the coverage decision, not here.
 */
export type ConfirmBlocker = 'card_unpaid' | 'cash_at_home' | null;

export const confirmBlocker = (o: { payment_method?: string; payment_status?: string; location_type?: string } | null | undefined): ConfirmBlocker => {
  if (o?.payment_method === 'card' && o?.payment_status !== 'paid') return 'card_unpaid';
  if (o?.payment_method === 'cash' && o?.location_type !== 'facility') return 'cash_at_home';
  return null;
};

export const confirmBlockerText = (b: Exclude<ConfirmBlocker, null>, AR: boolean): string =>
  b === 'card_unpaid'
    ? (AR ? 'بانتظار دفع المريض بالبطاقة، ثم يمكنك قبول الطلب.' : 'Waiting for the patient to pay by card, then you can accept the order.')
    : (AR ? 'الدفع النقدي متاح في المنشأة فقط. اطلب من المريض اختيار البطاقة، أو ارفض الطلب.' : 'Cash is accepted at the facility only. Ask the patient to pay by card, or reject the order.');
