// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const posts: Array<{ path: string; body: unknown }> = [];
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST') { posts.push({ path, body: JSON.parse(String(init.body)) }); return {}; }
    return [{ id: 'ap1', patient_name: 'سارة', doctor_name: 'د. أحمد', slot_start: '2026-11-20T10:00:00Z', status: 'CONFIRMED' }];
  }),
}));
vi.mock('../../components/AdminGuard', () => ({ useCan: () => true }));

import AppointmentsOversightPage from '../../pages/admin/appointments-oversight';

let host: HTMLDivElement; let root: Root;
beforeEach(() => { posts.length = 0; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
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
const open = async () => { await act(async () => { root.render(<AppointmentsOversightPage />); }); await flush(); };

describe('admin appointments oversight: cancelling asks its reason in the confirm dialog, not the browser prompt', () => {
  it('needs 3 characters, then posts the reason to cancel', async () => {
    const prompt = vi.spyOn(window, 'prompt');
    await open();
    await press(buttonWith('إلغاء'));
    expect(prompt).not.toHaveBeenCalled();
    expect(dialog()).not.toBeNull();
    await typeNote('لا');
    await press(buttonWith('إلغاء الموعد', dialog()));
    expect(posts).toHaveLength(0);
    expect(dialog().textContent).toContain('اكتب سبب الإلغاء (3 أحرف على الأقل)');
    await typeNote('الطبيب غير متاح');
    await press(buttonWith('إلغاء الموعد', dialog()));
    expect(posts).toEqual([{ path: '/api/admin/admin/appointments/ap1/cancel', body: { reason: 'الطبيب غير متاح' } }]);
    expect(dialog()).toBeNull();
  });

  it('going back posts nothing', async () => {
    await open();
    await press(buttonWith('إلغاء'));
    await press(buttonWith('تراجع', dialog()));
    expect(posts).toHaveLength(0);
    expect(dialog()).toBeNull();
  });
});
