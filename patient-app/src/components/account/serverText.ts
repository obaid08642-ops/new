/**
 * issue 1585: texts the server sends for the account screens, read in the app language.
 * Storage items arrive by stable key (translated from the locale files); FAQs may carry question_<lang>/answer_<lang>
 * for every app language (the app's Filipino locale is `tl`, the server's is `fil`).
 */
export const STORAGE_ITEM_KEYS = ['uploaded_prescriptions', 'medical_reports'] as const;
export type StorageItemKey = (typeof STORAGE_ITEM_KEYS)[number];

export function isStorageItemKey(value: unknown): value is StorageItemKey {
  return typeof value === 'string' && (STORAGE_ITEM_KEYS as readonly string[]).includes(value);
}

export type ServerFaq = { q?: string; question?: string; a?: string; answer?: string; category?: string } & Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function faqText(faq: ServerFaq, lang: string): { question: string; answer: string } {
  const code = lang === 'tl' ? 'fil' : lang;
  const second = code === 'ar' ? 'ar' : 'en';
  const pick = (field: 'question' | 'answer', short: 'q' | 'a') =>
    text(faq[`${field}_${code}`]) || text(faq[`${field}_${second}`]) || text(faq[short]) || text(faq[field]);
  return { question: pick('question', 'q'), answer: pick('answer', 'a') };
}
