/**
 * 13.R5 + 15.1 — app-level error type, parsing, and the error catalogue.
 *
 * Deliberately free of React and react-native imports. `ErrorHandler.tsx` used to
 * own this logic, but because it also renders the fallback UI it pulled the whole
 * component tree (design-system → AppContext → react-native-localize) into every
 * module that only wanted `parseError` — including `HttpClient`. Splitting the
 * logic out lets the network layer stay testable in plain Node, and lets the
 * catalogue live in exactly one place (`./http/errorCatalog`).
 */
import {
  ERROR_CATALOG,
  isCatalogCode,
  lookupCatalogEntry,
  normalizeCatalogCode,
  resolveCatalogLocale,
  type BackendErrorCode,
  type LocalizedEntry,
} from './http/errorCatalog';
import { ApiError, isApiError, readServerErrorEnvelope, transportCodeForCatalog } from './http/errors';

/** Compatibility alias: the catalogue keyed by code, ar/en shaped. */
export const BACKEND_ERROR_CATALOG = ERROR_CATALOG;

export type AppErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'AUTH_ERROR'
  | 'FORBIDDEN_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR'
  | 'OFFLINE_ERROR'
  | 'CANCELLED_ERROR';

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly originalError?: unknown,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export {
  ERROR_CATALOG,
  isCatalogCode,
  normalizeCatalogCode,
  resolveCatalogLocale,
  lookupCatalogEntry,
  readServerErrorEnvelope,
  transportCodeForCatalog,
  isApiError,
  ApiError,
};
export type { BackendErrorCode, LocalizedEntry };

const BACKEND_TO_APP_CODE: Record<BackendErrorCode, AppErrorCode> = {
  AUTHENTICATION_REQUIRED: 'AUTH_ERROR',
  INSUFFICIENT_PERMISSION: 'FORBIDDEN_ERROR',
  PRESCRIPTION_REQUIRED: 'VALIDATION_ERROR',
  NO_AVAILABILITY: 'NOT_FOUND_ERROR',
  SERVICE_UNAVAILABLE: 'SERVER_ERROR',
  PROVIDER_NOT_AVAILABLE: 'NOT_FOUND_ERROR',
  PRODUCT_OUT_OF_STOCK: 'NOT_FOUND_ERROR',
  PAYMENT_REQUIRED: 'VALIDATION_ERROR',
  INSURANCE_NOT_SUPPORTED: 'VALIDATION_ERROR',
  LOCATION_NOT_SUPPORTED: 'VALIDATION_ERROR',
  DUPLICATE_TRANSACTION: 'VALIDATION_ERROR',
  INVALID_INPUT: 'VALIDATION_ERROR',
  RATE_LIMITED: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

export interface BackendErrorPayload {
  code: BackendErrorCode;
  rawCode: string;
  message?: string;
  nextStep?: string;
  details?: Record<string, unknown>;
}

/** Read a backend `{code|error_code,message,nextStep,details}` envelope from
 *  an Axios-style error (`response.data`), a bare payload, or a thrown value. */
export function extractBackendErrorPayload(input: unknown): BackendErrorPayload | null {
  const found = readServerErrorEnvelope(input);
  if (!found.catalogCode) return null;
  return {
    code: found.catalogCode,
    rawCode: found.rawCode ?? found.catalogCode,
    message: found.message,
    nextStep: found.nextStep,
    details: found.details,
  };
}

export function backendCodeToAppError(
  code: BackendErrorCode,
  opts: { locale?: string; originalError?: unknown; details?: Record<string, unknown>; nextStep?: string } = {},
): AppError {
  const entry = lookupCatalogEntry(code, opts.locale ?? 'ar', {
    message: undefined,
    nextStep: opts.nextStep,
  });
  return new AppError(
    BACKEND_TO_APP_CODE[code],
    entry.message,
    opts.originalError,
    {
      backendCode: code,
      nextStep: opts.nextStep ?? entry.nextStep,
      ...(opts.details ? { details: opts.details } : {}),
    },
  );
}

export function getBackendNextStep(error: unknown): string | undefined {
  const parsed = error instanceof AppError ? error : parseError(error);
  const next = parsed.metadata?.nextStep;
  return typeof next === 'string' ? next : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Parser — converts any thrown value to AppError
// ─────────────────────────────────────────────────────────────────────────────
export function parseError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  // 15.1: the single client already resolved a catalogue entry. Its localized
  // sentence is the message, and its next step is carried through, so a screen
  // never has to re-derive either from a raw status code.
  if (isApiError(error)) {
    return new AppError(error.code as AppErrorCode, error.userMessage, error, {
      backendCode: error.catalogCode,
      nextStep: error.nextStep,
      status: error.status,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  // 13.R5: backend `{code,message,nextStep}` envelopes win over heuristics.
  const backend = extractBackendErrorPayload(error);
  if (backend) {
    return backendCodeToAppError(backend.code, {
      originalError: error,
      details: backend.details,
      nextStep: backend.nextStep,
    });
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return new AppError('CANCELLED_ERROR', 'Request cancelled', error);
    }
    if (error.message.toLowerCase().includes('network') ||
        error.message.toLowerCase().includes('fetch')) {
      return new AppError('NETWORK_ERROR', 'فشل الاتصال بالشبكة', error);
    }
    if (error.message.toLowerCase().includes('timeout')) {
      return new AppError('TIMEOUT_ERROR', 'انتهت مهلة الطلب', error);
    }
    return new AppError('UNKNOWN_ERROR', error.message, error);
  }

  if (typeof error === 'string') {
    return new AppError('UNKNOWN_ERROR', error);
  }

  return new AppError('UNKNOWN_ERROR', 'حدث خطأ غير متوقع', error);
}

// ─────────────────────────────────────────────────────────────────────────────
// User-friendly messages (Arabic default)
// ─────────────────────────────────────────────────────────────────────────────
const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  NETWORK_ERROR:     'تحقق من اتصالك بالإنترنت وأعد المحاولة.',
  TIMEOUT_ERROR:     'الطلب استغرق وقتاً طويلاً. أعد المحاولة.',
  AUTH_ERROR:        'انتهت جلستك. يرجى تسجيل الدخول مجدداً.',
  FORBIDDEN_ERROR:   'ليس لديك صلاحية لهذا الإجراء.',
  NOT_FOUND_ERROR:   'لم يتم العثور على المحتوى المطلوب.',
  VALIDATION_ERROR:  'يرجى مراجعة البيانات المدخلة.',
  SERVER_ERROR:      'حدث خلل مؤقت. يرجى المحاولة لاحقاً.',
  UNKNOWN_ERROR:     'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.',
  OFFLINE_ERROR:     'أنت غير متصل بالإنترنت.',
  CANCELLED_ERROR:   'تم إلغاء العملية.',
};

export function getUserFriendlyMessage(error: unknown): string {
  const appError = parseError(error);
  if (appError.metadata?.backendCode) {
    // A catalogue code was resolved: its localized sentence is already `message`.
    return appError.message;
  }
  return ERROR_MESSAGES[appError.code] ?? ERROR_MESSAGES.UNKNOWN_ERROR;
}

export function getUserFriendlyNextStep(error: unknown): string | undefined {
  return getBackendNextStep(error);
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Logger (dev + prod)
// ─────────────────────────────────────────────────────────────────────────────
const errorListeners: Array<(error: AppError) => void> = [];

export function addErrorListener(fn: (e: AppError) => void): () => void {
  errorListeners.push(fn);
  return () => {
    const idx = errorListeners.indexOf(fn);
    if (idx > -1) errorListeners.splice(idx, 1);
  };
}

export function logError(error: unknown, context?: string): AppError {
  const appError = parseError(error);
  if (__DEV__) {
    console.error(`[AppError]${context ? ` [${context}]` : ''}`, appError);
  }
  errorListeners.forEach((fn) => fn(appError));
  return appError;
}

// ─────────────────────────────────────────────────────────────────────────────
// Async error wrapper — try/catch with structured error
// ─────────────────────────────────────────────────────────────────────────────
export async function tryCatch<T>(
  fn: () => Promise<T>,
  context?: string,
): Promise<[T, null] | [null, AppError]> {
  try {
    const data = await fn();
    return [data, null];
  } catch (err) {
    const appError = logError(err, context);
    return [null, appError];
  }
}

export type { LocalizedEntry as CatalogEntry };
