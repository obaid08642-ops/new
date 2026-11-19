// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mutations: Array<{ path: string; method: string; body: unknown }> = [];
vi.mock('@/lib/admin-client', () => ({
  adminFetch: vi.fn(async (path: string) => (path.endsWith('/impersonation') ? { data: [{ id: 's1', status: 'active', target_user_id: 'u1', expiresAt: '2030-01-01T00:00:00Z', reason: 'تذكرة' }] } : { data: [] })),
  adminMutation: vi.fn(async (path: string, method: string, body: unknown) => { mutations.push({ path, method, body }); return {}; }),
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));
vi.mock('next/head', () => ({ default: () => null }));

import ImpersonationPage from '@/pages/admin/impersonation';

let host: HTMLDivElement; let root: Root;
beforeEach(() => { mutations.length = 0; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const click = async (label: string) => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => x.textContent?.trim() === label) as HTMLButtonElement;
  await act(async () => { b.click(); }); await flush();
};
const confirm = async (label: string) => {
  const b = Array.from(document.querySelectorAll('[role="dialog"] button')).find((x) => x.textContent?.trim() === label) as HTMLButtonElement;
  await act(async () => { b.click(); }); await flush();
};
const typeNote = async (v: string) => {
  const area = document.querySelector('[role="dialog"] textarea') as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => { setter.call(area, v); area.dispatchEvent(new Event('input', { bubbles: true })); });
};

describe('admin support sessions: the revoke reason is asked in the confirm dialog, not the browser prompt', () => {
  it('needs 5 characters, then revokes the session with the reason', async () => {
    const prompt = vi.spyOn(window, 'prompt');
    await act(async () => { root.render(<ImpersonationPage />); }); await flush();
    await click('إبطال');
    expect(prompt).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await typeNote('قصير');
    await confirm('إبطال');
    expect(mutations).toHaveLength(0);
    expect(document.body.textContent).toContain('سبب الإبطال خمسة أحرف على الأقل.');
    await typeNote('انتهى الدعم المطلوب');
    await confirm('إبطال');
    expect(mutations).toEqual([{ path: '/api/admin/impersonation/revoke', method: 'POST', body: { session_id: 's1', reason: 'انتهى الدعم المطلوب' } }]);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('cancelling posts nothing', async () => {
    await act(async () => { root.render(<ImpersonationPage />); }); await flush();
    await click('إبطال');
    await confirm('تراجع');
    expect(mutations).toHaveLength(0);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
