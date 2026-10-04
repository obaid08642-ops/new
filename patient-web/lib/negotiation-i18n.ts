/**
 * R3: translate raw enums shown to users in all 6 locales.
 * thread.status and message.senderRole must never render as raw enum strings.
 */

const THREAD_STATUS: Record<string, Record<string, string>> = {
  ar: { open: 'مفتوحة', pending: 'بانتظار', resolved: 'محلولة', closed: 'مغلقة', archived: 'مؤرشفة' },
  en: { open: 'Open', pending: 'Pending', resolved: 'Resolved', closed: 'Closed', archived: 'Archived' },
  ur: { open: 'کھلی', pending: 'زیر التواء', resolved: 'حل شدہ', closed: 'بند', archived: 'محفوظ شدہ' },
  hi: { open: 'खुला', pending: 'लंबित', resolved: 'सुलझा', closed: 'बंद', archived: 'संग्रहीत' },
  bn: { open: 'খোলা', pending: 'মুলতুবি', resolved: 'সমাধান', closed: 'বন্ধ', archived: 'আর্কাইভ করা' },
  fil: { open: 'Bukas', pending: 'Nakabinbin', resolved: 'Nalutas', closed: 'Sarado', archived: 'Naka-archive' },
};

// thread.resolution values written by pharmacy-chat.service (schema: pharmacy.schema.ts).
const THREAD_RESOLUTION: Record<string, Record<string, string>> = {
  ar: { accepted: 'تم قبول البديل', rejected: 'تم رفض البديل', removed: 'تمت إزالة الصنف', cancelled: 'أُلغيت', timeout: 'انتهت المهلة' },
  en: { accepted: 'Substitute accepted', rejected: 'Substitute rejected', removed: 'Item removed', cancelled: 'Cancelled', timeout: 'Timed out' },
  ur: { accepted: 'متبادل قبول', rejected: 'متبادل مسترد', removed: 'آئٹم ہٹا دیا گیا', cancelled: 'منسوخ', timeout: 'وقت ختم' },
  hi: { accepted: 'विकल्प स्वीकार', rejected: 'विकल्प अस्वीकार', removed: 'आइटम हटाया गया', cancelled: 'रद्द', timeout: 'समय समाप्त' },
  bn: { accepted: 'বিকল্প গৃহীত', rejected: 'বিকল্প প্রত্যাখ্যাত', removed: 'আইটেম সরানো হয়েছে', cancelled: 'বাতিল', timeout: 'সময় শেষ' },
  fil: { accepted: 'Tinanggap ang kapalit', rejected: 'Tinanggihan ang kapalit', removed: 'Inalis ang item', cancelled: 'Kinansela', timeout: 'Nag-time out' },
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

export function translateThreadResolution(resolution: string | null | undefined, locale: string): string {
  if (!resolution) return '';
  const map = THREAD_RESOLUTION[locale] || THREAD_RESOLUTION.en;
  return map[resolution.toLowerCase()] || resolution;
}
