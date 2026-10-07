// @vitest-environment jsdom
/**
 * 15.12 — the flags control surface never presents an absent flag as "off".
 *
 * Renders the real `system-ops` page with the backend replaced by canned
 * payloads and drives the lookup an operator would use before assuming a
 * kill-switch key is "closed".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@/lib/admin-client', () => ({
  adminFetch: vi.fn(async (url: string) => {
    if (url.includes('ops/queues/')) return { data: [] };
    if (url.includes('ops/queues')) return { queues: [] };
    if (url.includes('ops/translations')) return { total_keys: 0, overridden_count: 0, data: [] };
    if (url.includes('ops/seo/controls')) return { data: [] };
    if (url.includes('governance-controls/feature-flags')) {
      return {
        data: [{ key: 'checkout.new_flow', enabled: true, rollout_percentage: 50 }],
        stores: { canonical: 1, legacy: 0 },
      };
    }
    throw new Error(`unexpected url ${url}`);
  }),
  adminMutation: vi.fn(),
  apiErrorMessage: (_cause: unknown, fallback: string) => fallback,
}));

import SystemOpsPage from '@/pages/admin/system-ops';

describe('15.12 — flags tab: absent keys are shown as absent, never off', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  async function openFlagsTab() {
    render(<SystemOpsPage />);
    fireEvent.click(await screen.findByText('Feature Flags'));
    await screen.findByText('الرايات الموحدة');
  }

  it('lists stored flags and warns that unlisted keys are not "off"', async () => {
    await openFlagsTab();
    expect(screen.getByText('checkout.new_flow')).toBeTruthy();
    expect(document.body.textContent).toContain('غير المسجل');
  });

  it('shows an absent key as absent with the honest client-evaluation note', async () => {
    await openFlagsTab();
    fireEvent.change(screen.getByTestId('flag-lookup-input'), {
      target: { value: 'kill_switch.never_created' },
    });
    fireEvent.click(screen.getByTestId('flag-lookup-submit'));

    const result = screen.getByTestId('flag-lookup-result');
    expect(result.getAttribute('data-flag-status')).toBe('absent');
    expect(result.textContent).toContain('غير مسجلة');
    expect(result.textContent).toContain('كمعطَّل');
    // Must never use the "off" wording reserved for stored disabled rows.
    expect(result.textContent).not.toContain('معطلة');
  });

  it('shows a stored enabled key as enabled with its rollout', async () => {
    await openFlagsTab();
    fireEvent.change(screen.getByTestId('flag-lookup-input'), {
      target: { value: 'checkout.new_flow' },
    });
    fireEvent.click(screen.getByTestId('flag-lookup-submit'));

    const result = screen.getByTestId('flag-lookup-result');
    expect(result.getAttribute('data-flag-status')).toBe('enabled');
    expect(result.textContent).toContain('مفعلة');
    expect(result.textContent).toContain('50');
  });
});
