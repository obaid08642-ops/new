/**
 * Platform error catalog — provider-app slice of the shared contract.
 *
 * Mirrors `backend/src/common/errors.i18n.json` + `backend/src/common/error-catalog.ts`
 * (`lookupError`, `isCatalogCode`, `FALLBACK_CODE`, `SUPPORTED_LOCALES`). That file is
 * owned by the backend agent, so this module keeps a generated-exact copy rather than
 * importing across the package boundary; `errorCatalog.parity.test.ts` fails if the two
 * ever drift.
 *
 * Every provider-app network failure funnels through `lookupCatalogError` so the UI
 * always shows a catalog code + localized message + next step instead of a raw string.
 */

export const FALLBACK_CODE = 'UNKNOWN_ERROR' as const;
export const DEFAULT_LOCALE = 'en' as const;
/** Matches the backend catalog: only ar/en are localized today (P15 scope note). */
export const SUPPORTED_LOCALES = ['ar', 'en'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type CatalogCode =
  | 'AUTHENTICATION_REQUIRED'
  | 'INSUFFICIENT_PERMISSION'
  | 'PRESCRIPTION_REQUIRED'
  | 'NO_AVAILABILITY'
  | 'SERVICE_UNAVAILABLE'
  | 'PROVIDER_NOT_AVAILABLE'
  | 'PRODUCT_OUT_OF_STOCK'
  | 'PAYMENT_REQUIRED'
  | 'INSURANCE_NOT_SUPPORTED'
  | 'LOCATION_NOT_SUPPORTED'
  | 'DUPLICATE_TRANSACTION'
  | 'INVALID_INPUT'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR'
  | typeof FALLBACK_CODE;

export interface CatalogEntry { message: string; nextStep: string }
export interface CatalogTableEntry { ar: CatalogEntry; en: CatalogEntry }

/** Verbatim copy of `backend/src/common/errors.i18n.json`. */
export const CATALOG: Record<CatalogCode, CatalogTableEntry> = {
  AUTHENTICATION_REQUIRED: {
    en: { message: "You need to sign in to continue.", nextStep: "Sign in and try again." },
    ar: { message: "يجب تسجيل الدخول للمتابعة.", nextStep: "سجّل الدخول ثم حاول مرة أخرى." },
  },
  INSUFFICIENT_PERMISSION: {
    en: { message: "You don't have permission to do this.", nextStep: "Contact support if you think this is a mistake." },
    ar: { message: "ليس لديك صلاحية لتنفيذ هذا الإجراء.", nextStep: "تواصل مع الدعم إذا كنت تعتقد أن هذا خطأ." },
  },
  PRESCRIPTION_REQUIRED: {
    en: { message: "This item needs a valid prescription.", nextStep: "Upload your prescription to continue." },
    ar: { message: "هذا الصنف يتطلب وصفة طبية سارية.", nextStep: "ارفع الوصفة الطبية للمتابعة." },
  },
  NO_AVAILABILITY: {
    en: { message: "No availability right now.", nextStep: "Try another time or date." },
    ar: { message: "لا يوجد توفر حالياً.", nextStep: "جرّب وقتاً أو تاريخاً آخر." },
  },
  SERVICE_UNAVAILABLE: {
    en: { message: "This service is temporarily unavailable.", nextStep: "Please try again in a little while." },
    ar: { message: "هذه الخدمة غير متاحة مؤقتاً.", nextStep: "يرجى المحاولة مرة أخرى بعد قليل." },
  },
  PROVIDER_NOT_AVAILABLE: {
    en: { message: "No provider is available for this request.", nextStep: "Try again later or choose another provider." },
    ar: { message: "لا يوجد مقدم خدمة متاح لهذا الطلب.", nextStep: "حاول لاحقاً أو اختر مقدم خدمة آخر." },
  },
  PRODUCT_OUT_OF_STOCK: {
    en: { message: "This product is out of stock.", nextStep: "Try an alternative or check back later." },
    ar: { message: "هذا المنتج غير متوفر حالياً.", nextStep: "جرّب بديلاً أو تحقق لاحقاً." },
  },
  PAYMENT_REQUIRED: {
    en: { message: "Payment is required to complete this.", nextStep: "Complete the payment to continue." },
    ar: { message: "يلزم الدفع لإتمام هذا الإجراء.", nextStep: "أكمل الدفع للمتابعة." },
  },
  INSURANCE_NOT_SUPPORTED: {
    en: { message: "Your insurance doesn't cover this.", nextStep: "Continue with self-payment or contact your insurer." },
    ar: { message: "التأمين الخاص بك لا يغطي هذه الخدمة.", nextStep: "تابع بالدفع الذاتي أو تواصل مع شركة التأمين." },
  },
  LOCATION_NOT_SUPPORTED: {
    en: { message: "We don't serve this location yet.", nextStep: "Try another address or pickup instead." },
    ar: { message: "لا نغطي هذا الموقع بعد.", nextStep: "جرّب عنواناً آخر أو اختر الاستلام." },
  },
  DUPLICATE_TRANSACTION: {
    en: { message: "This was already submitted.", nextStep: "Check your orders before trying again." },
    ar: { message: "تم إرسال هذا الطلب مسبقاً.", nextStep: "تحقق من طلباتك قبل إعادة المحاولة." },
  },
  INVALID_INPUT: {
    en: { message: "Some details look incorrect.", nextStep: "Review the highlighted fields and try again." },
    ar: { message: "بعض البيانات تبدو غير صحيحة.", nextStep: "راجع الحقول المطلوبة وحاول مرة أخرى." },
  },
  RATE_LIMITED: {
    en: { message: "Too many attempts. Please slow down.", nextStep: "Wait a moment, then try again." },
    ar: { message: "محاولات كثيرة جداً. يرجى التمهل.", nextStep: "انتظر قليلاً ثم حاول مرة أخرى." },
  },
  UNKNOWN_ERROR: {
    en: { message: "Something went wrong. Please try again.", nextStep: "If it keeps happening, contact support." },
    ar: { message: "حدث خطأ ما. يرجى المحاولة مرة أخرى.", nextStep: "إذا استمرت المشكلة، تواصل مع الدعم." },
  },
};

const CATALOG_CODES = Object.keys(CATALOG) as CatalogCode[];

/** Backend `isCatalogCode`: known code, or the fallback. */
export function isCatalogCode(code: unknown): code is CatalogCode {
  if (code === FALLBACK_CODE) return true;
  return CATALOG_CODES.includes(code as CatalogCode);
}

const CODE_PATTERN = /^[A-Za-z0-9_.-]{1,80}$/;

/** UPPER_SNAKE the backend code; reject free text / injection-shaped strings. */
export function normalizeCatalogCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!CODE_PATTERN.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

function normalizeLocale(locale: unknown): SupportedLocale {
  return locale === 'ar' ? 'ar' : 'en';
}

export interface ResolvedCatalogError {
  code: CatalogCode;
  message: string;
  nextStep: string;
  /** true when `code` was not in the catalog and FALLBACK_CODE was substituted. */
  fallback: boolean;
}

/**
 * Backend `lookupError`, plus fallback signalling. Always returns a localized message
 * and a concrete next step so no screen has to invent one.
 */
export function lookupCatalogError(
  code: unknown,
  locale: unknown = DEFAULT_LOCALE,
): ResolvedCatalogError {
  const lang = normalizeLocale(locale);
  const normalized = normalizeCatalogCode(code);
  const key: CatalogCode = normalized && isCatalogCode(normalized) ? normalized : FALLBACK_CODE;
  const entry = CATALOG[key][lang] ?? CATALOG[key].en;
  return {
    code: key,
    message: entry.message,
    nextStep: entry.nextStep,
    fallback: normalized !== null && normalized !== FALLBACK_CODE && key === FALLBACK_CODE,
  };
}

/** Pull a backend `code` out of normalized client errors, raw payloads, or a bare string. */
export function extractCatalogCode(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'string') return normalizeCatalogCode(input);
  if (typeof input !== 'object') return null;
  const rec = input as Record<string, unknown>;
  const direct = normalizeCatalogCode(rec.code ?? rec.error_code);
  if (direct) return direct;
  const nested: unknown[] = [];
  const response = rec.response;
  if (response && typeof response === 'object') nested.push((response as Record<string, unknown>).data);
  const data = rec.data;
  if (data && typeof data === 'object') nested.push(data);
  for (const n of nested) {
    if (n && typeof n === 'object') {
      const hit = normalizeCatalogCode(
        (n as Record<string, unknown>).code ?? (n as Record<string, unknown>).error_code,
      );
      if (hit) return hit;
    }
  }
  return null;
}
