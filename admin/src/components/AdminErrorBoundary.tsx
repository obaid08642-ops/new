import React from 'react';
import { ErrorFallback } from './ErrorFallback';
import { reportError } from '@/lib/observability/error-reporter';

/**
 * 15.5 — per-route-segment error boundary for the admin (Pages Router).
 *
 * The admin is a Pages Router app, so the App Router's `error.tsx` /
 * `global-error.tsx` files do not exist as a convention here
 * (`node_modules/next/dist/docs/02-pages/03-building-your-application/
 * 06-configuring/12-error-handling.md` documents `ErrorBoundary` in `_app.js` as
 * the client-side mechanism). Segment isolation is therefore done here: the
 * boundary resets when the route changes, so a crash in `/admin/*` cannot leave a
 * poisoned shell behind when the operator navigates somewhere else.
 *
 * `componentDidCatch` reports with the release attached (15.5's second half) and
 * keeps the `errorId` so the fallback can show it.
 */
export interface AdminErrorBoundaryProps {
  children: React.ReactNode;
  /** Route segment this boundary owns, used in the report and on screen. */
  segment: string;
  title?: string;
}

interface AdminErrorBoundaryState {
  hasError: boolean;
  errorId: string;
  error: unknown;
}

export class AdminErrorBoundary extends React.Component<AdminErrorBoundaryProps, AdminErrorBoundaryState> {
  state: AdminErrorBoundaryState = { hasError: false, errorId: '', error: null };

  /** Catches since the last reset; the second one means a plain re-render cannot help. */
  private catchCount = 0;

  private mounted = false;

  static getDerivedStateFromError(error: unknown): Partial<AdminErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    this.catchCount += 1;
    if (this.catchCount > 1 && typeof window !== 'undefined') {
      // The operator already pressed "try again" and the same boundary crashed
      // again: the cause is not in the component tree, so fetch fresh state.
      window.location.reload();
    }
    this.mounted = true;
    void reportError(error, {
      boundary: 'admin-error-boundary',
      segment: this.props.segment,
      componentStack: info.componentStack || null,
    }).then((entry) => {
      if (this.mounted) this.setState({ errorId: entry.errorId });
    });
  }

  componentDidUpdate(previous: AdminErrorBoundaryProps) {
    // A route change is the "try again": the new segment gets a clean render.
    if (previous.segment !== this.props.segment && this.state.hasError) {
      this.reset();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  reset = () => {
    this.catchCount = 0;
    this.setState({ hasError: false, errorId: '', error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          title={this.props.title || 'تعذّر عرض هذه الشاشة'}
          errorId={this.state.errorId}
          segment={this.props.segment}
          onRetry={this.reset}
        />
      );
    }
    return this.props.children;
  }
}

export default AdminErrorBoundary;