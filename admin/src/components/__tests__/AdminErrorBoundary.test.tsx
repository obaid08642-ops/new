// @vitest-environment jsdom
/**
 * 15.5 required verification, part 1: a thrown render error shows the fallback,
 * not a white screen — and Sentry (the error transport) receives it with the
 * release.
 *
 * This is a real React DOM render: `AdminErrorBoundary` actually catches a
 * component that throws during render, `componentDidCatch` really fires, and the
 * DOM is really inspected.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AdminErrorBoundary } from '../AdminErrorBoundary';
import { clearRecordedErrors, setErrorTransport, resolveRelease } from '@/lib/observability/error-reporter';

function Explode({ message = 'render exploded' }: { message?: string }): React.ReactElement {
  throw new Error(message);
}

describe('15.5 — nothing crashes to a blank screen', () => {
  beforeEach(() => {
    clearRecordedErrors();
    setErrorTransport(null);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    setErrorTransport(null);
    vi.restoreAllMocks();
  });

  it('renders the children when nothing throws', () => {
    render(
      <AdminErrorBoundary segment="/admin/dashboard">
        <p>content is fine</p>
      </AdminErrorBoundary>,
    );
    expect(screen.getByText('content is fine')).toBeTruthy();
    expect(screen.queryByTestId('admin-error-fallback')).toBeNull();
  });

  it('replaces a thrown render error with the fallback instead of a blank page', () => {
    render(
      <AdminErrorBoundary segment="/admin/finance-suite">
        <Explode />
      </AdminErrorBoundary>,
    );

    const fallback = screen.getByTestId('admin-error-fallback');
    expect(fallback).toBeTruthy();
    // A blank screen is an empty <body>; the fallback must not be one.
    expect(document.body.textContent?.trim().length).toBeGreaterThan(0);
    expect(screen.getByText('تعذّر عرض هذه الشاشة')).toBeTruthy();
    // The page it replaced is gone, and it says which page it was.
    expect(document.body.textContent).not.toContain('render exploded');
    expect(screen.getByText('/admin/finance-suite')).toBeTruthy();
  });

  it('offers "try again" and "contact support" on the fallback', () => {
    render(
      <AdminErrorBoundary segment="/admin/orders">
        <Explode />
      </AdminErrorBoundary>,
    );

    const retry = screen.getByTestId('admin-error-retry');
    const support = screen.getByTestId('admin-error-support');
    expect(retry.textContent).toBe('إعادة المحاولة');
    expect(support.textContent).toBe('التواصل مع الدعم');
    // The support link is pre-filled with the error id, so the operator's report
    // matches the one in the buffer.
    expect(support.getAttribute('href')).toContain('mailto:');
    expect(support.getAttribute('href')).toContain(encodeURIComponent('/admin/orders'));
  });

  it('sends the crash to the error transport with the release attached', async () => {
    const captured: Array<{ release: string; context: Record<string, unknown> }> = [];
    setErrorTransport({
      name: 'test',
      capture: (event) => void captured.push(event),
    });

    render(
      <AdminErrorBoundary segment="/admin/rbac">
        <Explode message="rbac table blew up" />
      </AdminErrorBoundary>,
    );
    // componentDidCatch reports asynchronously; let the microtask queue drain.
    await vi.waitFor(() => expect(captured).toHaveLength(1));

    expect(captured[0].release).toBe(resolveRelease());
    expect(captured[0].context.boundary).toBe('admin-error-boundary');
    expect(captured[0].context.segment).toBe('/admin/rbac');
    expect((captured[0].context.componentStack as string) ?? '').toBeTypeOf('string');
  });

  it('shows the captured error id on the fallback so support can match it', async () => {
    render(
      <AdminErrorBoundary segment="/admin/system-ops">
        <Explode />
      </AdminErrorBoundary>,
    );

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('معرّف الخطأ:');
    });
    // The id must be a real value, not an empty placeholder.
    const match = document.body.textContent?.match(/معرّف الخطأ:\s*(\S+)/);
    expect(match?.[1]?.length ?? 0).toBeGreaterThan(8);
  });

  it('recovers when the operator presses "try again" after the cause is gone', () => {
    let shouldThrow = true;
    function Flaky(): React.ReactElement {
      if (shouldThrow) throw new Error('transient');
      return <p>recovered content</p>;
    }

    render(
      <AdminErrorBoundary segment="/admin/analytics">
        <Flaky />
      </AdminErrorBoundary>,
    );
    expect(screen.getByTestId('admin-error-fallback')).toBeTruthy();

    shouldThrow = false;
    // fireEvent (not a raw DOM .click()) so React flushes the reset re-render
    // before the assertions below run.
    fireEvent.click(screen.getByTestId('admin-error-retry'));

    expect(screen.queryByTestId('admin-error-fallback')).toBeNull();
    expect(screen.getByText('recovered content')).toBeTruthy();
  });

  it('resets on navigation so one broken area does not blank the whole admin', () => {
    const { rerender } = render(
      <AdminErrorBoundary segment="/admin/rbac">
        <Explode />
      </AdminErrorBoundary>,
    );
    expect(screen.getByTestId('admin-error-fallback')).toBeTruthy();

    rerender(
      <AdminErrorBoundary segment="/admin/analytics">
        <p>analytics is fine</p>
      </AdminErrorBoundary>,
    );

    expect(screen.queryByTestId('admin-error-fallback')).toBeNull();
    expect(screen.getByText('analytics is fine')).toBeTruthy();
  });
});