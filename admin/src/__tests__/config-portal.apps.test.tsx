// @vitest-environment jsdom
/**
 * 15.12 — the force-update control surface cannot blind-wipe its own config.
 *
 * Renders the real `config-portal` page with the BFF replaced by canned
 * responses: a failed GET must leave the save disabled (saving the empty form
 * would PUT `{ apps: {} }` and wipe the stored force-update config), and a
 * successful GET must show what clients will actually enforce.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const { fetchWithAdminGuard } = vi.hoisted(() => ({ fetchWithAdminGuard: vi.fn() }));

vi.mock('@/utils/api', () => ({ fetchWithAdminGuard }));

import ConfigPortal from '@/pages/admin/config-portal';

function okJson(payload: unknown) {
  return { ok: true, status: 200, json: async () => payload };
}

describe('15.12 — force-update tab: no blind save, honest enforcement view', () => {
  beforeEach(() => {
    vi.mocked(fetchWithAdminGuard).mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // The SLA probe on mount; irrelevant to the apps tab.
    vi.mocked(fetchWithAdminGuard).mockImplementation(async (url: string) =>
      okJson(url.includes('config/sla') ? {} : { apps: {} }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  async function openAppsTab() {
    render(<ConfigPortal />);
    fireEvent.click(screen.getByText('إصدارات التطبيقات'));
    await screen.findByText('إصدارات التطبيقات والصيانة');
  }

  it('disables the save and shows a retry after a failed load', async () => {
    vi.mocked(fetchWithAdminGuard).mockImplementation(async (url: string) => {
      if (url.includes('app-versions')) return { ok: false, status: 500, json: async () => ({}) };
      return okJson({});
    });
    await openAppsTab();

    expect(screen.getByTestId('app-versions-error')).toBeTruthy();
    const save = screen.getByTestId('app-versions-save') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    // The guard holds even if the button were forced: no PUT left this page.
    expect(
      vi.mocked(fetchWithAdminGuard).mock.calls.filter(([, init]) => (init as RequestInit)?.method === 'PUT'),
    ).toHaveLength(0);

    // Retry is offered and works once the backend recovers.
    vi.mocked(fetchWithAdminGuard).mockImplementation(async () => okJson({ apps: {} }));
    fireEvent.click(screen.getByTestId('app-versions-retry'));
    await screen.findByTestId('app-enforcement-patient');
    expect((screen.getByTestId('app-versions-save') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows unconfigured apps as unconfigured, not as up to date', async () => {
    await openAppsTab();
    const summary = screen.getByTestId('app-enforcement-patient');
    expect(summary.textContent).toContain('غير مضبوط');
    expect(summary.textContent).toContain('لا يفرض العملاء');
    expect((screen.getByTestId('app-versions-save') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows the stored enforcement and warns on non-semver versions', async () => {
    vi.mocked(fetchWithAdminGuard).mockImplementation(async (url: string) => {
      if (url.includes('app-versions')) {
        return okJson({
          apps: { patient: { min_version: '1.4.0', latest_version: 'v9', maintenance: false } },
        });
      }
      return okJson({});
    });
    await openAppsTab();

    expect(screen.getByTestId('app-enforcement-patient').textContent).toContain('1.4.0');
    expect(screen.queryByTestId('app-version-warn-patient-min')).toBeNull();
    expect(screen.getByTestId('app-version-warn-patient-latest').textContent).toContain('X.Y.Z');
  });
});
