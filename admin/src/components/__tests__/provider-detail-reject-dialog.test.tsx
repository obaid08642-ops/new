// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const posts: Array<{ path: string; body: unknown }> = [];
const json = (body: unknown, status = 200) => ({ ok: status < 300, status, json: async () => body }) as unknown as Response;
vi.mock('@/utils/api', () => ({
  fetchWithAdminGuard: vi.fn(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST') { posts.push({ path, body: JSON.parse(String(init.body)) }); return json({ review_status: 'rejected' }); }
    return json({}, 404);
  }),
}));
vi.mock('@/components/AdminGuard', () => ({ useCan: () => true }));
vi.mock('@/components/PharmacyOwnDeliveryAdmin', () => ({ default: () => null }));

import ProviderFullDetail from '@/components/ProviderFullDetail';

const detail = { account: { id: 'acc1' }, documents: [{ id: 'd1', doc_type: 'ترخيص', review_status: 'pending' }] };

let host: HTMLDivElement; let root: Root;
beforeEach(() => { posts.length = 0; vi.spyOn(window, 'alert').mockImplementation(() => undefined); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
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
const open = async () => { await act(async () => { root.render(<ProviderFullDetail detail={detail} />); }); await flush(); };

describe('admin provider detail: a document rejection asks its reason in the confirm dialog, not the browser prompt', () => {
  it('needs 5 characters, then posts the reason to reject', async () => {
    const prompt = vi.spyOn(window, 'prompt');
    await open();
    await press(buttonWith('رفض'));
    expect(prompt).not.toHaveBeenCalled();
    expect(dialog()).not.toBeNull();
    await typeNote('قصير');
    await press(buttonWith('رفض', dialog()));
    expect(posts).toHaveLength(0);
    expect(dialog().textContent).toContain('اكتب سبباً واضحاً (5 أحرف على الأقل).');
    await typeNote('الصورة غير واضحة');
    await press(buttonWith('رفض', dialog()));
    expect(posts).toEqual([{ path: '/api/admin/admin/providers/acc1/documents/d1/reject', body: { reason: 'الصورة غير واضحة' } }]);
    expect(dialog()).toBeNull();
  });

  it('approving needs no reason and cancelling posts nothing', async () => {
    await open();
    await press(buttonWith('رفض'));
    await press(buttonWith('تراجع', dialog()));
    expect(posts).toHaveLength(0);
    await press(buttonWith('قبول'));
    expect(posts).toEqual([{ path: '/api/admin/admin/providers/acc1/documents/d1/approve', body: {} }]);
  });
});
