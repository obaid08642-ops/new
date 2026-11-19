// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mutations: Array<{ path: string; method: string; body: unknown }> = [];
vi.mock('@/lib/admin-client', () => ({
  adminFetch: vi.fn(async (path: string) => {
    if (path.endsWith('/ops/queues')) return { queues: [{ name: 'mail', failed: 2 }] };
    if (path.includes('/jobs?')) return { data: [{ id: 'j1', name: 'send', attempts: 1, failedReason: 'boom', data_preview: '{}', timestamp: 1 }] };
    return { data: [] };
  }),
  adminMutation: vi.fn(async (path: string, method: string, body: unknown) => { mutations.push({ path, method, body }); return {}; }),
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));
vi.mock('@/components/AdminGuard', () => ({ useCan: () => true }));
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

import SystemOpsPage from '@/pages/admin/system-ops';

let host: HTMLDivElement; let root: Root;
beforeEach(() => { mutations.length = 0; vi.spyOn(window, 'confirm').mockReturnValue(true); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
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
const open = async () => { await act(async () => { root.render(<SystemOpsPage />); }); await flush(); };

describe('admin system operations: the reason is asked in the confirm dialog, not the browser prompt', () => {
  it('retrying all failed jobs needs a reason of 5 characters, then confirms and posts it', async () => {
    const prompt = vi.spyOn(window, 'prompt');
    await open();
    await press(buttonWith('إعادة المحاولات الفاشلة'));
    expect(prompt).not.toHaveBeenCalled();
    await typeNote('قصير');
    await press(buttonWith('تأكيد', dialog()));
    expect(mutations).toHaveLength(0);
    expect(dialog().textContent).toContain('السبب 5 أحرف على الأقل.');
    await typeNote('إعادة بعد إصلاح الخادم');
    await press(buttonWith('تأكيد', dialog()));
    expect(mutations).toEqual([{ path: '/api/admin/admin/ops/queues/mail/retry-failed', method: 'POST', body: { reason: 'إعادة بعد إصلاح الخادم', limit: 100 } }]);
  });

  it('retrying one job posts its reason, and cancelling posts nothing', async () => {
    await open();
    await press(buttonWith('إعادة المحاولة'));
    await press(buttonWith('تراجع', dialog()));
    expect(mutations).toHaveLength(0);
    await press(buttonWith('إعادة المحاولة'));
    await typeNote('خطأ مؤقت في الشبكة');
    await press(buttonWith('تأكيد', dialog()));
    expect(mutations).toEqual([{ path: '/api/admin/admin/ops/queues/mail/jobs/j1/retry', method: 'POST', body: { reason: 'خطأ مؤقت في الشبكة' } }]);
  });
});
