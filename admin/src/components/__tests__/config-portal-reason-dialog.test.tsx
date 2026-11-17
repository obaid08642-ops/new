// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const writes: Array<{ path: string; method: string; body: Record<string, unknown> }> = [];
const json = (body: unknown, status = 200) => ({ ok: status < 300, status, json: async () => body }) as unknown as Response;
vi.mock('@/utils/api', () => ({
  fetchWithAdminGuard: vi.fn(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST' || init?.method === 'PUT') { writes.push({ path, method: String(init.method), body: JSON.parse(String(init.body)) }); return json({ ok: true }); }
    return json({});
  }),
  apiFetch: vi.fn(async () => ({})),
}));
vi.mock('@/components/AdminGuard', () => ({ useCan: () => true }));
vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

import ConfigPortal from '@/pages/admin/config-portal';

let host: HTMLDivElement; let root: Root;
beforeEach(() => { writes.length = 0; vi.spyOn(window, 'alert').mockImplementation(() => undefined); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const buttonWith = (text: string, scope: ParentNode = document) => Array.from(scope.querySelectorAll('button')).find((x) => x.textContent?.includes(text)) as HTMLButtonElement;
const press = async (b: HTMLButtonElement) => { await act(async () => { b.click(); }); await flush(); };
const dialog = () => document.querySelector('[role="dialog"]') as HTMLElement;
const typeNote = async (v: string) => {
  const area = dialog().querySelector('textarea') as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => { setter.call(area, v); area.dispatchEvent(new Event('input', { bubbles: true })); });
};
const open = async () => { await act(async () => { root.render(<ConfigPortal />); }); await flush(); };

describe('admin config portal: pricing and SLA reasons are asked in the confirm dialog, not the browser prompt', () => {
  it('the SLA save needs 5 characters, then puts the SLA with the reason', async () => {
    const prompt = vi.spyOn(window, 'prompt');
    await open();
    await press(buttonWith('حفظ التعديلات (Override Globally)'));
    expect(prompt).not.toHaveBeenCalled();
    await typeNote('قصير');
    await press(buttonWith('تأكيد', dialog()));
    expect(writes).toHaveLength(0);
    expect(dialog().textContent).toContain('يرجى إدخال سبب لا يقل عن 5 أحرف');
    await typeNote('تقليل مهلة الرنين');
    await press(buttonWith('تأكيد', dialog()));
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ path: '/api/admin/admin/config/sla', method: 'PUT', body: { reason: 'تقليل مهلة الرنين' } });
  });

  it('the pricing save needs 10 characters, then posts the same reason to surge and fees', async () => {
    await open();
    await press(buttonWith('التسعير والذروة'));
    await press(buttonWith('حفظ التسعير'));
    await typeNote('سبب قصير'); // 8 characters
    await press(buttonWith('تأكيد', dialog()));
    expect(writes).toHaveLength(0);
    expect(dialog().textContent).toContain('يرجى إدخال سبب لا يقل عن 10 أحرف');
    await typeNote('رفع رسوم الذروة مؤقتاً');
    await press(buttonWith('تأكيد', dialog()));
    expect(writes.map((w) => w.path)).toEqual(['/api/admin/business-rules/config/surge', '/api/admin/business-rules/config/fees']);
    expect(writes.every((w) => w.body.reason === 'رفع رسوم الذروة مؤقتاً')).toBe(true);
  });

  it('cancelling posts nothing', async () => {
    await open();
    await press(buttonWith('حفظ التعديلات (Override Globally)'));
    await press(buttonWith('تراجع', dialog()));
    expect(writes).toHaveLength(0);
    expect(dialog()).toBeNull();
  });
});
