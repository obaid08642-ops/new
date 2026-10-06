/**
 * Error Handling — Centralized error management.
 * Global React Error Boundary + structured error types + user-friendly messages.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DSText, DSButton } from '../design-system';
import { Spacing } from '../design-system/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// 13.R5 — Backend error catalog (mirrors backend/src/common/errors.i18n.json).
// Clients never invent strings for covered codes: the backend `code`
// (or legacy `error_code`) selects message + next step. Accepts UPPER_SNAKE
// from the catalog and lower_snake aliases (e.g. `slot_taken` readers).
// ─────────────────────────────────────────────────────────────────────────────
export type BackendErrorCode =
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
  | 'UNKNOWN_ERROR';

type LocalizedEntry = { message: string; nextStep: string };

export const BACKEND_ERROR_CATALOG: Record<BackendErrorCode, { ar: LocalizedEntry; en: LocalizedEntry }> = {
  AUTHENTICATION_REQUIRED: {
    en: { message: 'You need to sign in to continue.', nextStep: 'Sign in and try again.' },
    ar: { message: 'يجب تسجيل الدخول للمتابعة.', nextStep: 'سجّل الدخول ثم حاول مرة أخرى.' },
  },
  INSUFFICIENT_PERMISSION: {
    en: { message: "You don't have permission to do this.", nextStep: 'Contact support if you think this is a mistake.' },
    ar: { message: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.', nextStep: 'تواصل مع الدعم إذا كنت تعتقد أن هذا خطأ.' },
  },
  PRESCRIPTION_REQUIRED: {
    en: { message: 'This item needs a valid prescription.', nextStep: 'Upload your prescription to continue.' },
    ar: { message: 'هذا الصنف يتطلب وصفة طبية سارية.', nextStep: 'ارفع الوصفة الطبية للمتابعة.' },
  },
  NO_AVAILABILITY: {
    en: { message: 'No availability right now.', nextStep: 'Try another time or date.' },
    ar: { message: 'لا يوجد توفر حالياً.', nextStep: 'جرّب وقتاً أو تاريخاً آخر.' },
  },
  SERVICE_UNAVAILABLE: {
    en: { message: 'This service is temporarily unavailable.', nextStep: 'Please try again in a little while.' },
    ar: { message: 'هذه الخدمة غير متاحة مؤقتاً.', nextStep: 'يرجى المحاولة مرة أخرى بعد قليل.' },
  },
  PROVIDER_NOT_AVAILABLE: {
    en: { message: 'No provider is available for this request.', nextStep: 'Try again later or choose another provider.' },
    ar: { message: 'لا يوجد مقدم خدمة متاح لهذا الطلب.', nextStep: 'حاول لاحقاً أو اختر مقدم خدمة آخر.' },
  },
  PRODUCT_OUT_OF_STOCK: {
    en: { message: 'This product is out of stock.', nextStep: 'Try an alternative or check back later.' },
    ar: { message: 'هذا المنتج غير متوفر حالياً.', nextStep: 'جرّب بديلاً أو تحقق لاحقاً.' },
  },
  PAYMENT_REQUIRED: {
    en: { message: 'Payment is required to complete this.', nextStep: 'Complete the payment to continue.' },
    ar: { message: 'يلزم الدفع لإتمام هذا الإجراء.', nextStep: 'أكمل الدفع للمتابعة.' },
  },
  INSURANCE_NOT_SUPPORTED: {
    en: { message: "Your insurance doesn't cover this.", nextStep: 'Continue with self-payment or contact your insurer.' },
    ar: { message: 'التأمين الخاص بك لا يغطي هذه الخدمة.', nextStep: 'تابع بالدفع الذاتي أو تواصل مع شركة التأمين.' },
  },
  LOCATION_NOT_SUPPORTED: {
    en: { message: "We don't serve this location yet.", nextStep: 'Try another address or pickup instead.' },
    ar: { message: 'لا نغطي هذا الموقع بعد.', nextStep: 'جرّب عنواناً آخر أو اختر الاستلام.' },
  },
  DUPLICATE_TRANSACTION: {
    en: { message: 'This was already submitted.', nextStep: 'Check your orders before trying again.' },
    ar: { message: 'تم إرسال هذا الطلب مسبقاً.', nextStep: 'تحقق من طلباتك قبل إعادة المحاولة.' },
  },
  INVALID_INPUT: {
    en: { message: 'Some details look incorrect.', nextStep: 'Review the highlighted fields and try again.' },
    ar: { message: 'بعض البيانات تبدو غير صحيحة.', nextStep: 'راجع الحقول المطلوبة وحاول مرة أخرى.' },
  },
  RATE_LIMITED: {
    en: { message: 'Too many attempts. Please slow down.', nextStep: 'Wait a moment, then try again.' },
    ar: { message: 'محاولات كثيرة جداً. يرجى التمهل.', nextStep: 'انتظر قليلاً ثم حاول مرة أخرى.' },
  },
  UNKNOWN_ERROR: {
    en: { message: 'Something went wrong. Please try again.', nextStep: 'If it keeps happening, contact support.' },
    ar: { message: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.', nextStep: 'إذا استمرت المشكلة، تواصل مع الدعم.' },
  },
};

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

export function normalizeBackendCode(raw: unknown): BackendErrorCode | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.trim().toUpperCase();
  if ((Object.keys(BACKEND_ERROR_CATALOG) as BackendErrorCode[]).includes(upper as BackendErrorCode)) {
    return upper as BackendErrorCode;
  }
  return null;
}

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
  const candidates: unknown[] = [];
  if (input && typeof input === 'object') {
    const rec = input as Record<string, unknown>;
    if (rec.response) candidates.push((rec.response as Record<string, unknown>).data);
    if (rec.data && typeof rec.data === 'object') candidates.push(rec.data);
    candidates.push(input);
  }
  for (const cand of candidates) {
    if (!cand || typeof cand !== 'object') continue;
    const body = cand as Record<string, unknown>;
    const raw = body.code ?? body.error_code;
    const normalized = normalizeBackendCode(raw);
    if (!normalized) {
      // Unknown snake code (e.g. booking `slot_taken`): keep the raw message
      // but surface it as UNKNOWN_ERROR so no invented catalog string leaks.
      if (typeof raw === 'string' && raw.trim().length > 0 && typeof body.message === 'string') {
        return {
          code: 'UNKNOWN_ERROR',
          rawCode: raw.trim(),
          message: body.message,
          nextStep: typeof body.nextStep === 'string' ? body.nextStep : undefined,
          details: (body.details as Record<string, unknown>) ?? undefined,
        };
      }
      continue;
    }
    return {
      code: normalized,
      rawCode: String(raw).trim(),
      message: typeof body.message === 'string' ? body.message : undefined,
      nextStep: typeof body.nextStep === 'string' ? body.nextStep : undefined,
      details: (body.details as Record<string, unknown>) ?? undefined,
    };
  }
  return null;
}

export function backendCodeToAppError(
  code: BackendErrorCode,
  opts: { locale?: 'ar' | 'en'; originalError?: unknown; details?: Record<string, unknown>; nextStep?: string } = {},
): AppError {
  const locale = opts.locale === 'en' ? 'en' : 'ar';
  const entry = BACKEND_ERROR_CATALOG[code][locale];
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
// Global Error Boundary
// ─────────────────────────────────────────────────────────────────────────────
interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: AppError, reset: () => void) => React.ReactNode;
  onError?: (error: AppError) => void;
}

export class AppErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error: parseError(error) };
  }

  componentDidCatch(error: unknown): void {
    const appError = parseError(error);
    logError(appError, 'ErrorBoundary');
    this.props.onError?.(appError);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    const { hasError, error } = this.state;

    if (hasError && error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset);
      }

      return (
        <View style={styles.fallback}>
          <DSText variant="h4" align="center">
            حدث خطأ غير متوقع
          </DSText>
          <DSText variant="bodySM" align="center">
            {getUserFriendlyMessage(error)}
          </DSText>
          <DSButton
            label="أعد المحاولة"
            onPress={this.reset}
            variant="primary"
          />
        </View>
      );
    }

    return this.props.children;
  }
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

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.lg,
  },
});
