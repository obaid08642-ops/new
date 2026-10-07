import React from 'react';
import { resolveSupportEmail } from '@/lib/observability/error-reporter';

/**
 * 15.5 — the screen an operator sees instead of a blank page.
 *
 * Both required actions live here and nowhere else: "try again" (re-render the
 * route, falling back to a full reload when re-rendering alone cannot help) and
 * "contact support" (a pre-filled mail carrying the error id, so the report the
 * operator quotes matches the one in the buffer/server log).
 *
 * Rendered by `AdminErrorBoundary`, by `pages/_error.tsx` and by the
 * `AdminGuard` session-failure path, so it must never depend on router state.
 */
export interface ErrorFallbackProps {
  /** Short operator-facing description of what broke. */
  title: string;
  /** The `errorId` from `reportError`, shown so support can find the same event. */
  errorId?: string;
  /** Where the crash happened, e.g. `/admin/finance-suite`. */
  segment?: string;
  /** Clears the boundary state and re-renders the route. */
  onRetry?: () => void;
  supportEmail?: string;
}

export function buildSupportHref(props: {
  errorId?: string;
  segment?: string;
  supportEmail: string;
}): string {
  const subject = 'Nabd Plus admin — error report';
  const lines = [
    `Error id: ${props.errorId || 'not captured'}`,
    `Page: ${props.segment || 'unknown'}`,
    '',
    'What were you doing when this appeared?',
  ];
  return `mailto:${props.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

export function ErrorFallback(props: ErrorFallbackProps) {
  const supportEmail = props.supportEmail ?? resolveSupportEmail();
  return (
    <div
      dir="rtl"
      role="alert"
      aria-live="assertive"
      data-testid="admin-error-fallback"
      className="flex min-h-screen items-center justify-center bg-slate-50 p-6"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-rose-600">خطأ في الواجهة</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{props.title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          بياناتك محفوظة ولم يُنفَّذ أي تغيير. يمكنك إعادة المحاولة، وإذا تكرر الخطأ تواصل مع الدعم الفني وأرفق معرّف الخطأ.
        </p>
        {props.segment ? (
          <p className="mt-3 text-xs text-slate-500" dir="ltr">
            {props.segment}
          </p>
        ) : null}
        {props.errorId ? (
          <p className="mt-3 text-xs text-slate-500">
            معرّف الخطأ: <span dir="ltr" className="font-mono">{props.errorId}</span>
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={props.onRetry}
            data-testid="admin-error-retry"
            className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
          >
            إعادة المحاولة
          </button>
          <a
            href={buildSupportHref({ errorId: props.errorId, segment: props.segment, supportEmail })}
            data-testid="admin-error-support"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            التواصل مع الدعم
          </a>
        </div>
      </div>
    </div>
  );
}

export default ErrorFallback;