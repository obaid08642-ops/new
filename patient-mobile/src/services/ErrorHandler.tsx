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
// Error Parser — converts any thrown value to AppError
// ─────────────────────────────────────────────────────────────────────────────
export function parseError(error: unknown): AppError {
  if (error instanceof AppError) return error;

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
  SERVER_ERROR:      'خطأ في الخادم. يرجى المحاولة لاحقاً.',
  UNKNOWN_ERROR:     'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.',
  OFFLINE_ERROR:     'أنت غير متصل بالإنترنت.',
  CANCELLED_ERROR:   'تم إلغاء العملية.',
};

export function getUserFriendlyMessage(error: unknown): string {
  const appError = parseError(error);
  return ERROR_MESSAGES[appError.code] ?? ERROR_MESSAGES.UNKNOWN_ERROR;
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
