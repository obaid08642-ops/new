/**
 * Labels for the ids the wallet ledger carries (backend/src/modules/finance-engine: `type`, `service_type`,
 * `reference_type`). The revenue screen printed them as they are ("provider_earning", "other") in both languages.
 */
const TYPES: Record<string, [string, string]> = {
  provider_earning: ['أرباح الخدمات', 'Service earnings'],
  payout: ['السحوبات', 'Withdrawals'],
  provider_debit: ['استردادات مخصومة', 'Refund clawbacks'],
  penalty: ['غرامات', 'Penalties'],
  chargeback: ['مبالغ مستردة من البنك', 'Chargebacks'],
  bonus: ['مكافآت', 'Bonuses'],
  referral: ['إحالات', 'Referrals'],
  commission: ['عمولة المنصة', 'Platform commission'],
  vat: ['ضريبة القيمة المضافة', 'VAT'],
  refund: ['مرتجعات', 'Refunds'],
  adjustment: ['تسويات', 'Adjustments'],
  other: ['أخرى', 'Other'],
};

const SERVICES: Record<string, [string, string]> = {
  consultation: ['استشارات', 'Consultations'],
  appointment: ['مواعيد', 'Appointments'],
  appointments: ['مواعيد', 'Appointments'],
  doctor: ['استشارات', 'Consultations'],
  lab: ['المختبر', 'Lab'],
  radiology: ['الأشعة', 'Radiology'],
  home_care: ['الرعاية المنزلية', 'Home care'],
  nursing: ['التمريض', 'Nursing'],
  pharmacy: ['الصيدلية', 'Pharmacy'],
  order: ['الطلبات', 'Orders'],
  orders: ['الطلبات', 'Orders'],
  other: ['أخرى', 'Other'],
};

// An id nobody mapped yet is shown as words ("some_new_type" -> "Some new type"), never as the raw id.
function words(id: string): string {
  const s = id.replace(/[_-]+/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
}

export const ledgerTypeLabel = (type: string, ar: boolean): string => { const l = TYPES[type]; return l ? l[ar ? 0 : 1] : words(type); };
export const serviceLabel = (key: string, ar: boolean): string => { const l = SERVICES[key]; return l ? l[ar ? 0 : 1] : words(key); };
