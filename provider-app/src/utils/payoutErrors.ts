/**
 * Text for the codes `POST /provider/payouts/request` and `POST /provider/bank-account` answer with
 * (backend/src/modules/payouts/provider-payouts.controller.ts). The screen used to print the code itself
 * ("insufficient_available_balance", "minimum_withdrawal_100") to the provider.
 */
export function payoutErrorText(code: unknown, ar: boolean, fallback: string): string {
  if (typeof code !== 'string' || !code) return fallback;
  const min = /^minimum_withdrawal_(\d+(?:\.\d+)?)$/.exec(code);
  if (min) return ar ? `الحد الأدنى للسحب ${min[1]} ريال` : `The minimum withdrawal is ${min[1]} SAR`;
  const known: Record<string, [string, string]> = {
    verified_bank_account_required: ['لا يوجد حساب بنكي معتمد. أضف حسابك وانتظر اعتماد الإدارة.', 'No approved bank account yet. Add your account and wait for admin approval.'],
    invalid_verified_iban: ['رقم الآيبان المعتمد غير صالح. حدّث حسابك البنكي.', 'The approved IBAN is not valid. Update your bank account.'],
    negative_balance: ['رصيدك سالب، لا يمكن طلب سحب حتى تُسوّى المستحقات.', 'Your balance is negative; you cannot withdraw until the dues are settled.'],
    insufficient_available_balance: ['المبلغ أكبر من الرصيد المتاح للسحب.', 'The amount is more than your available balance.'],
    pending_withdrawal_exists: ['لديك طلب سحب قيد المعالجة. انتظر اكتماله قبل طلب آخر.', 'You already have a withdrawal in progress. Wait for it to finish.'],
    valid_amount_required: ['أدخل مبلغاً صحيحاً.', 'Enter a valid amount.'],
    idempotency_key_required: ['تعذر إرسال الطلب، أعد المحاولة.', 'The request could not be sent, try again.'],
  };
  const hit = known[code];
  return hit ? (ar ? hit[0] : hit[1]) : fallback;
}
