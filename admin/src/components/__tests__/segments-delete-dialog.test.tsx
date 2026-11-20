// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mutations: Array<{ path: string; method: string; body: unknown }> = [];
vi.mock('@/lib/admin-client', () => ({
  adminFetch: vi.fn(async (path: string) => {
    if (path.endsWith('/segments/fields')) return { allowed_fields: ['city'] };
    return [{ id: 's1', name_ar: 'عملاء الرياض', definition: { match: 'all', rules: [] }, count_current: 3, count_at_creation: 2 }];
  }),
  adminMutation: vi.fn(async (path: string, method: string, body: unknown) => { mutations.push({ path, method, body }); return {}; }),
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
  toQuery: () => '',
}));
vi.mock('@/components/AdminGuard', () => ({ useCan: () => true }));
vi.mock('next/head', () => ({ default: () => null }));

import SegmentsPage from '@/pages/admin/segments';

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
const open = async () => { await act(async () => { root.render(<SegmentsPage />); }); await flush(); };

describe('admin segments: deleting asks its reason in the confirm dialog, not the browser prompt', () => {
  it('needs 5 characters, then sends the reason with the DELETE', async () => {
    const prompt = vi.spyOn(window, 'prompt');
    const confirm = vi.spyOn(window, 'confirm');
    await open();
    await press(buttonWith('حذف'));
    expect(prompt).not.toHaveBeenCalled();
    expect(dialog().textContent).toContain('عملاء الرياض');
    await typeNote('قصير');
    await press(buttonWith('حذف', dialog()));
    expect(mutations).toHaveLength(0);
    expect(dialog().textContent).toContain('اكتب سبباً واضحاً (5 أحرف على الأقل).');
    await typeNote('شريحة قديمة');
    await press(buttonWith('حذف', dialog()));
    expect(mutations).toEqual([{ path: '/api/admin/admin/segments/s1', method: 'DELETE', body: { reason: 'شريحة قديمة' } }]);
    expect(confirm).not.toHaveBeenCalled();
    expect(dialog()).toBeNull();
  });

  it('going back deletes nothing', async () => {
    await open();
    await press(buttonWith('حذف'));
    await press(buttonWith('تراجع', dialog()));
    expect(mutations).toHaveLength(0);
    expect(dialog()).toBeNull();
  });
});
