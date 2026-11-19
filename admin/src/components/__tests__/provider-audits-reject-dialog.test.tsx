// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const posts: Array<{ path: string; body: unknown }> = [];
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST') { posts.push({ path, body: init.body ? JSON.parse(String(init.body)) : {} }); return {}; }
    return [{ id: 'd1', provider_name: 'عيادة النور', role: 'DOCTOR', requested_changes: { price: 200 }, old_data: { price: 150 } }];
  }),
}));

import ProviderAuditsPage from '../../pages/admin/provider-audits';

let host: HTMLDivElement; let root: Root;
beforeEach(() => { posts.length = 0; vi.spyOn(window, 'alert').mockImplementation(() => undefined); vi.spyOn(window, 'confirm').mockReturnValue(true); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
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
const open = async () => { await act(async () => { root.render(<ProviderAuditsPage />); }); await flush(); };

describe('admin provider audits: a rejection asks its reason in the confirm dialog, not the browser prompt', () => {
  it('needs a reason, then posts it to reject', async () => {
    const prompt = vi.spyOn(window, 'prompt');
    await open();
    await press(buttonWith('رفض التعديل'));
    expect(prompt).not.toHaveBeenCalled();
    expect(dialog()).not.toBeNull();
    await press(buttonWith('رفض التعديل', dialog()));
    expect(posts).toHaveLength(0);
    expect(dialog().textContent).toContain('اكتب سبب الرفض.');
    await typeNote('السعر غير مبرر');
    await press(buttonWith('رفض التعديل', dialog()));
    expect(posts).toEqual([{ path: '/api/admin/admin/providers/provider-deltas/d1/reject', body: { reason: 'السعر غير مبرر' } }]);
    expect(dialog()).toBeNull();
  });

  it('going back posts nothing; approving needs no reason', async () => {
    await open();
    await press(buttonWith('رفض التعديل'));
    await press(buttonWith('تراجع', dialog()));
    expect(posts).toHaveLength(0);
    await press(buttonWith('اعتماد التعديل وتطبيقه'));
    expect(posts).toEqual([{ path: '/api/admin/admin/providers/provider-deltas/d1/approve', body: {} }]);
  });
});
