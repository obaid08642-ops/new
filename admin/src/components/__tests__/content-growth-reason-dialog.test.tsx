// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mutations: Array<{ path: string; method: string; body: unknown }> = [];
vi.mock('@/lib/admin-client', () => ({
  adminFetch: vi.fn(async (path: string) => {
    if (path.includes('/cms/articles')) return { data: [{ id: 'a1', title_ar: 'مقال تجريبي', status: 'DRAFT', slug: 'demo', tags: [] }] };
    if (path.includes('/coupons')) return [{ id: 'c1', code: 'WELCOME', active: true, used_count: 0 }];
    if (path.includes('/campaigns')) return { data: [] };
    return { all: 0, patients: 0, providers: 0 };
  }),
  adminMutation: vi.fn(async (path: string, method: string, body: unknown) => { mutations.push({ path, method, body }); return {}; }),
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));
vi.mock('@/components/AdminGuard', () => ({ useCan: () => true }));
vi.mock('next/head', () => ({ default: () => null }));

import ContentGrowthPage from '@/pages/admin/content-growth';

let host: HTMLDivElement; let root: Root;
beforeEach(() => { mutations.length = 0; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const buttonWith = (text: string, scope: ParentNode = document) => Array.from(scope.querySelectorAll('button')).find((x) => x.textContent?.trim() === text) as HTMLButtonElement;
const press = async (b: HTMLButtonElement) => { await act(async () => { b.click(); }); await flush(); };
const dialog = () => document.querySelector('[role="dialog"]') as HTMLElement;
const typeNote = async (v: string) => {
  const area = dialog().querySelector('textarea') as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => { setter.call(area, v); area.dispatchEvent(new Event('input', { bubbles: true })); });
};
const open = async () => { await act(async () => { root.render(<ContentGrowthPage />); }); await flush(); };

describe('admin content and growth: decisions ask their reason in the confirm dialog, not the browser prompt', () => {
  it('publishing an article needs 5 characters and posts the reason to publish', async () => {
    const prompt = vi.spyOn(window, 'prompt');
    await open();
    await press(buttonWith('اعتماد ونشر'));
    expect(prompt).not.toHaveBeenCalled();
    expect(dialog().textContent).toContain('مقال تجريبي');
    await typeNote('قصير');
    await press(buttonWith('تأكيد', dialog()));
    expect(mutations).toHaveLength(0);
    expect(dialog().textContent).toContain('السبب 5 أحرف على الأقل.');
    await typeNote('مراجعة طبية مكتملة');
    await press(buttonWith('تأكيد', dialog()));
    expect(mutations).toEqual([{ path: '/api/admin/admin/cms/a1/publish', method: 'POST', body: { reason: 'مراجعة طبية مكتملة' } }]);
  });

  it('cancelling posts nothing', async () => {
    await open();
    await press(buttonWith('اعتماد ونشر'));
    await press(buttonWith('تراجع', dialog()));
    expect(mutations).toHaveLength(0);
    expect(dialog()).toBeNull();
  });
});
