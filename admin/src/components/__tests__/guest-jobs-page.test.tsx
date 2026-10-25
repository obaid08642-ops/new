// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const calls: Array<{ path: string; init?: RequestInit }> = [];
const job = { id: 'j1', title: 'صيدلي مطلوب', description: 'دوام كامل', scfhs_role: 'pharmacist', location: 'الرياض', post_type: 'offer', status: 'draft', createdAt: '2026-10-25T08:00:00.000Z' };
vi.mock('@/utils/api', () => ({
  apiFetch: vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    if (init?.method === 'POST') return { ...job, status: 'published' };
    return [job];
  }),
}));
vi.mock('@/components/AdminGuard', () => ({ useCan: () => true }));
vi.mock('next/head', () => ({ default: () => null }));

import GuestJobsPage from '@/pages/admin/guest-jobs';

let host: HTMLDivElement; let root: Root;
beforeEach(() => { calls.length = 0; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const button = (label: string) => Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
const open = async () => { await act(async () => { root.render(<GuestJobsPage />); }); await flush(); await act(async () => { button('التفاصيل').click(); }); await flush(); };

describe('admin guest jobs page', () => {
  it('lists pending guest drafts', async () => {
    await act(async () => { root.render(<GuestJobsPage />); }); await flush();
    expect(calls[0].path).toContain('/admin/admin/recruitment/guest-jobs?status=draft');
    expect(host.textContent).toContain('صيدلي مطلوب');
    expect(host.textContent).toContain('صيدلي');
  });

  it('publish posts the decision to the review route', async () => {
    await open();
    await act(async () => { button('نشر').click(); }); await flush();
    const post = calls.find((c) => c.init?.method === 'POST');
    expect(post?.path).toContain('/admin/admin/recruitment/guest-jobs/j1/review');
    expect(JSON.parse(String(post?.init?.body))).toEqual({ decision: 'publish' });
  });

  it('reject needs a reason first', async () => {
    await open();
    await act(async () => { button('رفض').click(); }); await flush();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('سبب الرفض');
    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false);
  });
});
