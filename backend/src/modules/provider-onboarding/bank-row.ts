import { normalizeIban } from './doctor-profile-fields';

/** Saudi IBAN bank identifier (characters 5-6) to the SAUDI_BANKS code the admin bank review shows. */
const BANK_BY_IBAN_ID: Record<string, { code: string; name_ar: string }> = {
  '80': { code: 'rajhi', name_ar: 'مصرف الراجحي' },
  '10': { code: 'snb', name_ar: 'البنك الأهلي السعودي' },
  '20': { code: 'riyad', name_ar: 'بنك الرياض' },
  '45': { code: 'sab', name_ar: 'البنك السعودي البريطاني' },
  '05': { code: 'alinma', name_ar: 'مصرف الإنماء' },
  '55': { code: 'bsf', name_ar: 'البنك السعودي الفرنسي' },
  '60': { code: 'jazira', name_ar: 'بنك الجزيرة' },
  '30': { code: 'anb', name_ar: 'البنك العربي الوطني' },
};

/**
 * The provider_bank_accounts row a registration IBAN stands for, so the admin "approve bank" step has something to approve.
 * Null when the profile has no valid IBAN (nothing to review yet).
 */
export function bankRowFromProfile(p: { iban?: unknown; bank_account_name?: unknown; legal_name?: unknown; name_ar?: unknown; tax_number?: unknown }): null | { bank_code: string; bank_name: string; holder_name: string; iban: string; vat_number?: string } {
  const iban = normalizeIban(p?.iban);
  if (!iban) return null;
  const bank = BANK_BY_IBAN_ID[iban.slice(4, 6)] || { code: 'other', name_ar: 'بنك آخر' };
  const holder = [p.bank_account_name, p.legal_name, p.name_ar].map((v) => String(v ?? '').trim()).find(Boolean) || 'غير محدد';
  const vat = String(p.tax_number ?? '').trim();
  return { bank_code: bank.code, bank_name: bank.name_ar, holder_name: holder, iban, ...(vat ? { vat_number: vat } : {}) };
}

/**
 * Create or refresh the row. A changed IBAN goes back to PENDING (a new number needs a new review); the same IBAN keeps its review state,
 * so resubmitting after an unrelated rejection does not undo an approved bank.
 */
export async function syncBankRow(conn: { collection: (n: string) => any }, accountId: string, row: ReturnType<typeof bankRowFromProfile>, newId: () => string, now = new Date()): Promise<void> {
  if (!row) return;
  const col = conn.collection('provider_bank_accounts');
  const existing = await col.findOne({ account_id: accountId });
  if (!existing) {
    await col.insertOne({ id: newId(), account_id: accountId, ...row, review_status: 'pending', createdAt: now, updatedAt: now });
    return;
  }
  if (String(existing.iban).toUpperCase() === row.iban) return;
  await col.updateOne({ account_id: accountId }, { $set: { ...row, review_status: 'pending', updatedAt: now }, $unset: { reviewer_id: '', reviewer_note: '', reviewed_at: '' } });
}
