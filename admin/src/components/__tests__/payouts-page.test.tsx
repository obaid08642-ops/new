// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const gets: string[] = [];
const posts: Array<{ path: string; body: unknown }> = [];
let perms = new Set(['finance.read', 'finance.payout.approve']);
const row = (state: string) => ({ id: 'wd_1', reference: 'PAYOUT-1', provider_name: 'د. اختبار', amount: 500, iban: 'SA0380000000608010167519', state, createdAt: '2026-10-25T08:00:00.000Z' });
let rows = [row('PENDING_ADMIN_APPROVAL')];
vi.mock('@/lib/admin-client', () => ({
  adminFetch: vi.fn(async (path: string) => {
    gets.push(path);
    if (path.includes('/withdrawals/pending')) return { data: [] };
    return { data: rows, dual_approval_threshold_sar: 10000, by_state: [{ state: 'PENDING_ADMIN_APPROVAL', count: 2, amount: 900 }, { state: 'APPROVED_FOR_PAYOUT', count: 1, amount: 500 }] };
  }),
  adminMutation: vi.fn(async (path: string, _m: string, body: unknown) => { posts.push({ path, body }); return { ok: true }; }),
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));
vi.mock('@/components/AdminGuard', () => ({ useCan: (p: string) => perms.has(p) }));
vi.mock('next/head', () => ({ default: () => null }));

import PayoutsPage from '@/pages/admin/payouts';

let host: HTMLDivElement; let root: Root;
beforeEach(() => {
  gets.length = 0; posts.length = 0; perms = new Set(['finance.read', 'finance.payout.approve']); rows = [row('PENDING_ADMIN_APPROVAL')];
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  vi.spyOn(window, 'prompt').mockReturnValue('bank record verified'); vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const text = () => host.textContent ?? '';
const button = (label: string) => Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.trim() === label) as HTMLButtonElement | undefined;
const open = async () => { await act(async () => { root.render(<PayoutsPage />); }); await flush(); };

describe('admin payouts page: one flow from request to transfer', () => {
  it('lists the requests of a stage with the counts of every stage, from the one queue', async () => {
    await open();
    expect(gets[0]).toContain('/finance/payouts?status=PENDING_ADMIN_APPROVAL');
    expect(text()).toContain('PAYOUT-1');
    expect(text()).toContain('بانتظار الاعتماد 2');
    expect(text()).toContain('جاهزة للتحويل 1');
  });

  it('a pending request is approved (with a reason), then an approved one is recorded as transferred (PAID)', async () => {
    await open();
    await act(async () => { button('اعتماد')!.click(); }); await flush();
    expect(posts[0]).toEqual({ path: '/api/admin/admin/finance/payouts/wd_1/approve', body: { reason: 'bank record verified' } });
    rows = [row('APPROVED_FOR_PAYOUT')];
    await act(async () => { (Array.from(host.querySelectorAll('[role=tab]')).find((t) => t.textContent?.includes('جاهزة للتحويل')) as HTMLElement).click(); }); await flush();
    expect(button('اعتماد')).toBeUndefined();
    await act(async () => { button('تم التحويل')!.click(); }); await flush();
    expect(posts[1]).toEqual({ path: '/api/admin/admin/finance/payouts/wd_1/execute', body: { reason: 'bank record verified' } });
  });

  it('a second approval is its own action, and a reject is offered while the request is open', async () => {
    rows = [row('AWAITING_SECOND_APPROVAL')];
    await open();
    expect(button('اعتماد ثانٍ')).toBeTruthy();
    await act(async () => { button('رفض')!.click(); }); await flush();
    expect(posts[0].path).toBe('/api/admin/admin/finance/payouts/wd_1/reject');
  });

  it('a paid or rejected request has no action, and a reader without finance.payout.approve sees none', async () => {
    rows = [row('PAID')];
    await open();
    expect(button('رفض')).toBeUndefined();
    act(() => root.unmount()); root = createRoot(host);
    perms = new Set(['finance.read']); rows = [row('PENDING_ADMIN_APPROVAL')];
    await open();
    expect(text()).toContain('PAYOUT-1');
    expect(button('اعتماد')).toBeUndefined();
  });

  it('asks for a reason of ten characters first, and sends nothing without it', async () => {
    (window.prompt as unknown as ReturnType<typeof vi.fn>).mockReturnValue('short');
    await open();
    await act(async () => { button('اعتماد')!.click(); }); await flush();
    expect(posts).toHaveLength(0);
  });
});
