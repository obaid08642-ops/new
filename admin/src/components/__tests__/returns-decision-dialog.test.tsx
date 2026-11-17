// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const calls: Array<{ path: string; init?: RequestInit }> = [];
const row = { id: 'r1', patient_id: 'p1', order_id: 'o1', service_type: 'pharmacy', reason: 'تالف', status: 'processing', amount: 40 };
vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    return path.includes('/decide') ? { ok: true } : [row];
  }),
}));
vi.mock('@/components/AdminGuard', () => ({ useCan: () => true }));

import ReturnsAdminPage from '@/pages/admin/returns';

let host: HTMLDivElement; let root: Root;
beforeEach(() => { calls.length = 0; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const click = async (label: string) => {
  const b = Array.from(host.ownerDocument.querySelectorAll('button')).find((x) => x.textContent?.trim() === label) as HTMLButtonElement;
  await act(async () => { b.click(); }); await flush();
};
const typeNote = async (v: string) => {
  const area = host.ownerDocument.querySelector('textarea') as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => { setter.call(area, v); area.dispatchEvent(new Event('input', { bubbles: true })); });
};

describe('admin returns: the decision note is asked in the confirm dialog, not window.prompt', () => {
  it('rejecting asks for a reason of at least 5 characters, then posts the decision with it', async () => {
    const prompt = vi.spyOn(window, 'prompt');
    await act(async () => { root.render(<ReturnsAdminPage />); }); await flush();
    await click('رفض الطلب');
    expect(prompt).not.toHaveBeenCalled();
    expect(host.ownerDocument.querySelector('[role="dialog"]')).not.toBeNull();
    await typeNote('قصير');
    await click('رفض');
    expect(calls.some((c) => c.path.includes('/decide'))).toBe(false);
    expect(host.ownerDocument.body.textContent).toContain('سبب الرفض 5 أحرف على الأقل.');
    await typeNote('المنتج وصل تالفاً');
    await click('رفض');
    const post = calls.find((c) => c.path.includes('/returns/r1/decide'));
    expect(post).toBeTruthy();
    expect(JSON.parse(String(post?.init?.body))).toEqual({ decision: 'rejected', note: 'المنتج وصل تالفاً' });
    expect(host.ownerDocument.querySelector('[role="dialog"]')).toBeNull();
  });

  it('approving needs no note and cancelling posts nothing', async () => {
    await act(async () => { root.render(<ReturnsAdminPage />); }); await flush();
    await click('اعتماد الاسترداد');
    await click('تراجع');
    expect(calls.some((c) => c.path.includes('/decide'))).toBe(false);
    await click('اعتماد الاسترداد');
    await click('اعتماد');
    const post = calls.find((c) => c.path.includes('/returns/r1/decide'));
    expect(JSON.parse(String(post?.init?.body))).toEqual({ decision: 'approved', note: '' });
  });
});
