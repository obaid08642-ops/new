/**
 * R3: translate raw enums shown to users in all 6 locales.
 * thread.status and message.senderRole must never render as raw enum strings.
 */

const THREAD_STATUS: Record<string, Record<string, string>> = {
  ar: { open: 'مفتوحة', pending: 'بانتظار', resolved: 'محلولة', closed: 'مغلقة' },
  en: { open: 'Open', pending: 'Pending', resolved: 'Resolved', closed: 'Closed' },
  ur: { open: 'کھلی', pending: 'زیر التواء', resolved: 'حل شدہ', closed: 'بند' },
  hi: { open: 'खुला', pending: 'लंबित', resolved: 'सुलझा', closed: 'बंद' },
  bn: { open: 'খোলা', pending: 'মুলতুবি', resolved: 'সমাধান', closed: 'বন্ধ' },
  fil: { open: 'Bukas', pending: 'Nakabinbin', resolved: 'Nalutas', closed: 'Sarado' },
};

const SENDER_ROLE: Record<string, Record<string, string>> = {
  ar: { patient: 'المريض', pharmacy: 'الصيدلية', system: 'النظام' },
  en: { patient: 'Patient', pharmacy: 'Pharmacy', system: 'System' },
  ur: { patient: 'مریض', pharmacy: 'فارمیسی', system: 'سسٹم' },
  hi: { patient: 'मरीज़', pharmacy: 'फार्मेसी', system: 'सिस्टम' },
  bn: { patient: 'রোগী', pharmacy: 'ফার্মেসি', system: 'সিস্টেম' },
  fil: { patient: 'Pasyente', pharmacy: 'Botika', system: 'Sistema' },
};

export function translateThreadStatus(status: string | null | undefined, locale: string): string {
  if (!status) return '—';
  const map = THREAD_STATUS[locale] || THREAD_STATUS.en;
  return map[status.toLowerCase()] || status;
}

export function translateSenderRole(role: string | null | undefined, locale: string): string {
  if (!role) return '—';
  const map = SENDER_ROLE[locale] || SENDER_ROLE.en;
  return map[role.toLowerCase()] || role;
}
