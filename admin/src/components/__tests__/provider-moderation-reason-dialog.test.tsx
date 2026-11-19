// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const posts: Array<{ path: string; body: unknown }> = [];
const json = (body: unknown, status = 200) => ({ ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) }) as unknown as Response;
vi.mock('@/utils/api', () => ({
  fetchWithAdminGuard: vi.fn(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST') { posts.push({ path, body: JSON.parse(String(init.body)) }); return json({ ok: true }); }
    if (path.includes('provider-deltas')) return json([]);
    if (path.includes('/providers?status=pending')) return json({ items: [{ id: 'p1', display_name_ar: 'مزود تجريبي', provider_type: 'lab', status: 'pending' }] });
    return json({});
  }),
}));
vi.mock('@/components/ProviderFullDetail', () => ({ default: () => null }));
vi.mock('../../components/GeoPicker', () => ({ GeoPicker: () => null }));

import ProviderModeration from '@/pages/admin/provider-moderation';

let host: HTMLDivElement; let root: Root;
beforeEach(() => { posts.length = 0; vi.spyOn(window, 'alert').mockImplementation(() => undefined); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const buttonWith = (text: string, scope: ParentNode = document) => Array.from(scope.querySelectorAll('button')).find((x) => x.textContent?.includes(text)) as HTMLButtonElement;
const press = async (b: HTMLButtonElement) => { await act(async () => { b.click(); }); await flush(); };
const typeNote = async (v: string) => {
  const area = document.querySelector('[role="dialog"] textarea') as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => { setter.call(area, v); area.dispatchEvent(new Event('input', { bubbles: true })); });
};
const openProvider = async () => {
  await act(async () => { root.render(<ProviderModeration />); }); await flush();
  const row = Array.from(document.querySelectorAll('h3')).find((h) => h.textContent === 'مزود تجريبي') as HTMLElement;
  await act(async () => { row.click(); }); await flush();
};

describe('admin provider moderation: reasons are asked in the confirm dialog, not the browser prompt', () => {
  it('rejecting needs a reason of 5 characters, then posts it as `reason`', async () => {
    const prompt = vi.spyOn(window, 'prompt');
    await openProvider();
    await press(buttonWith('Reject (رفض)'));
    expect(prompt).not.toHaveBeenCalled();
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain('سبب رفض المزود');
    await typeNote('قصير');
    await press(buttonWith('تأكيد', dialog));
    expect(posts).toHaveLength(0);
    expect(dialog.textContent).toContain('يرجى إدخال سبب لا يقل عن 5 أحرف');
    await typeNote('الوثائق غير مكتملة');
    await press(buttonWith('تأكيد', dialog));
    expect(posts).toEqual([{ path: '/api/admin/admin/providers/p1/reject', body: { reason: 'الوثائق غير مكتملة' } }]);
  });

  it('request-changes posts the text as `note`', async () => {
    await openProvider();
    await press(buttonWith('Request changes'));
    await typeNote('أرفق الترخيص الجديد');
    await press(buttonWith('تأكيد', document.querySelector('[role="dialog"]') as HTMLElement));
    expect(posts).toEqual([{ path: '/api/admin/admin/providers/p1/request-changes', body: { note: 'أرفق الترخيص الجديد' } }]);
  });

  it('reactivating asks for a reason too, and cancelling posts nothing', async () => {
    await openProvider();
    await press(buttonWith('Reactivate'));
    await press(buttonWith('تراجع', document.querySelector('[role="dialog"]') as HTMLElement));
    expect(posts).toHaveLength(0);
    await press(buttonWith('Reactivate'));
    await typeNote('انتهى سبب الإيقاف');
    await press(buttonWith('تأكيد', document.querySelector('[role="dialog"]') as HTMLElement));
    expect(posts).toEqual([{ path: '/api/admin/admin/providers/p1/reactivate', body: { reason: 'انتهى سبب الإيقاف' } }]);
  });
});
