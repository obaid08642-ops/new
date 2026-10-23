// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const calls: Array<{ path: string; init?: RequestInit }> = [];
let can = true;
const json = (body: unknown, status = 200) => ({ ok: status < 300, status, json: async () => body }) as unknown as Response;
vi.mock('@/utils/api', () => ({
  fetchWithAdminGuard: vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    if (path.endsWith('/pharmacy/broadcasts/config')) {
      if (init?.method === 'PUT') return json({ stages: null, stop_after_offers: JSON.parse(String(init.body)).stop_after_offers });
      return json({ stages: [{ stage: 1, radius_km: 3, timeout_seconds: 60 }, { stage: 2, radius_km: 5, timeout_seconds: 60 }], stop_after_offers: 3 });
    }
    return json({});
  }),
  apiFetch: vi.fn(async () => ({})),
}));
vi.mock('@/components/AdminGuard', () => ({ useCan: () => can }));
vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

import ConfigPortal from '@/pages/admin/config-portal';

let host: HTMLDivElement; let root: Root;
beforeEach(() => { calls.length = 0; can = true; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const openTab = async () => {
  await act(async () => { root.render(<ConfigPortal />); }); await flush();
  const tab = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'بث الصيدليات') as HTMLButtonElement;
  await act(async () => { tab.click(); }); await flush();
};
const input = () => host.querySelector('input[type="number"][max="100"]') as HTMLInputElement;
const setValue = async (el: HTMLInputElement, v: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => { setter.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); });
};
const saveButton = () => Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'حفظ') as HTMLButtonElement;

describe('admin config: pharmacy broadcast tab', () => {
  it('shows the stages next to the stop-after-offers value', async () => {
    await openTab();
    expect(calls.some((c) => c.path === '/api/admin/admin/pharmacy/broadcasts/config')).toBe(true);
    expect(host.textContent).toContain('مراحل التوسع');
    expect(host.textContent).toContain('نصف القطر');
    expect(input().value).toBe('3');
  });

  it('saves a whole number 0..100 with PUT and refuses anything else without calling the server', async () => {
    await openTab();
    await setValue(input(), '0');
    await act(async () => { saveButton().click(); }); await flush();
    const put = calls.find((c) => c.init?.method === 'PUT');
    expect(JSON.parse(String(put?.init?.body))).toEqual({ stop_after_offers: 0 });
    expect(host.textContent).toContain('تم حفظ الإعداد');
    calls.length = 0;
    await setValue(input(), '2.5');
    await act(async () => { saveButton().click(); }); await flush();
    expect(calls.some((c) => c.init?.method === 'PUT')).toBe(false);
    expect(host.textContent).toContain('أدخل عدداً صحيحاً من 0 إلى 100');
  });

  it('without settings.edit the field and the button are disabled', async () => {
    can = false;
    await openTab();
    expect(input().disabled).toBe(true);
    expect(saveButton().disabled).toBe(true);
  });
});
