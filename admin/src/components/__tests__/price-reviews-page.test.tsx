// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const calls: Array<{ path: string; init?: RequestInit }> = [];
let perms = new Set(['catalog.price.write', 'facility.edit', 'finance.config.edit']);
const review = { id: 'r1', pharmacy_id: 'ph1', pharmacy_name_ar: 'صيدلية النور', order_id: 'order-12345678', offer_id: 'offer-1234567', medicine_id: 'med-1', name_ar: 'بنادول', catalogue_price: 10, offered_price: 12, percent_above: 20, status: 'open', action: null, note: null, admin_id: null, created_at: '2026-10-25T08:00:00.000Z' };
vi.mock('@/utils/api', () => ({
  apiFetch: vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    if (init?.method === 'POST') return { ...review, status: 'dismissed' };
    if (/price-reviews\/r1$/.test(path)) return { ...review, history: [{ id: 'old', status: 'dismissed', action: 'dismissed', percent_above: 8, offered_price: 10.8, created_at: '2026-10-20T08:00:00.000Z' }] };
    return { items: [review], total: 1, page: 1, limit: 25 };
  }),
}));
vi.mock('@/components/AdminGuard', () => ({ useCan: (p: string) => perms.has(p) }));
vi.mock('next/head', () => ({ default: () => null }));

import PriceReviewsPage from '@/pages/admin/price-reviews';

let host: HTMLDivElement; let root: Root;
beforeEach(() => { calls.length = 0; perms = new Set(['catalog.price.write', 'facility.edit', 'finance.config.edit']); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const text = () => host.textContent ?? '';
const button = (label: string) => Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes(label)) as HTMLButtonElement;
const setNote = async (v: string) => {
  const area = host.querySelector('textarea') as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => { setter.call(area, v); area.dispatchEvent(new Event('input', { bubbles: true })); });
};
const openDetail = async () => { await act(async () => { root.render(<PriceReviewsPage />); }); await flush(); await act(async () => { button('التفاصيل').click(); }); await flush(); };

describe('admin Price reviews page', () => {
  it('lists the open reviews with the pharmacy, both prices and the % above', async () => {
    await act(async () => { root.render(<PriceReviewsPage />); }); await flush();
    expect(calls[0].path).toContain('/admin/admin/pharmacy/price-reviews?status=open');
    expect(text()).toContain('صيدلية النور');
    expect(text()).toContain('بنادول');
    expect(text()).toContain('10.00 ر.س');
    expect(text()).toContain('12.00 ر.س');
    expect(text()).toContain('20%');
  });

  it('shows the detail with the earlier reviews of the same pharmacy and medicine', async () => {
    await openDetail();
    expect(host.querySelector('aside')).toBeTruthy();
    expect(text()).toContain('نفس الصيدلية ونفس الصنف سابقًا');
    expect(text()).toContain('8%');
  });

  it('refuses a decision without a reason, and sends the note with the action when there is one', async () => {
    await openDetail();
    await act(async () => { button('رفض: السعر مبرَّر').click(); }); await flush();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('سبب القرار');
    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false);
    await setNote('السعر مبرَّر بسبب النقل');
    await act(async () => { button('رفض: السعر مبرَّر').click(); }); await flush();
    const post = calls.find((c) => c.init?.method === 'POST')!;
    expect(post.path).toMatch(/price-reviews\/r1\/dismiss$/);
    expect(JSON.parse(String(post.init!.body))).toEqual({ note: 'السعر مبرَّر بسبب النقل' });
  });

  it('update catalogue calls its endpoint after a confirmed decision with a reason', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await openDetail();
    await setNote('سبب كافٍ');
    await act(async () => { button('تحديث سعر الكتالوج إلى').click(); }); await flush();
    expect(calls.filter((c) => c.init?.method === 'POST').map((c) => c.path.split('/').pop())).toEqual(['update-catalogue']);
  });

  it('shows only the actions the admin may take', async () => {
    perms = new Set(['catalog.price.write']);
    await openDetail();
    expect(button('تحديث سعر الكتالوج إلى')).toBeTruthy();
    expect(button('تحذير الصيدلية')).toBeUndefined();
    expect(button('فرض غرامة')).toBeUndefined();
    expect(button('إيقاف مؤقت')).toBeUndefined();
  });
});
