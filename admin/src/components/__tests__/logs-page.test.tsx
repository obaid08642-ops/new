// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const calls: string[] = [];
const line = (over: Record<string, unknown>) => ({ id: 'l1', ts: '2026-10-17T10:00:00.000Z', level: 'error', service: 'backend', module: 'http', event: 'http_request', request_id: 'req-1', user_id: 'admin-1', route: '/boom', status: 500, duration_ms: 12, details: { method: 'GET' }, ...over });
vi.mock('@/lib/admin-client', async (orig) => {
  const real = await orig<typeof import('@/lib/admin-client')>();
  return {
    ...real,
    adminFetch: vi.fn(async (path: string) => {
      calls.push(path);
      if (path.includes('/logs/request/')) return { request_id: 'req-1', count: 2, data: [line({ id: 'a', event: 'first_event', level: 'warn', status: null }), line({ id: 'b', event: 'second_event' })] };
      return { data: [line({}), line({ id: 'l2', level: 'warn', module: 'security', event: 'slow_or_err', request_id: null, details: null })], page: 1, page_size: 50, total: 2, total_capped: false, pages: 1, retention_days: 30, dropped_in_this_process: 0 };
    }),
  };
});

import LogsPage from '@/pages/admin/logs';

let host: HTMLDivElement; let root: Root;
beforeEach(() => { calls.length = 0; window.localStorage.clear(); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const text = () => host.textContent ?? '';

describe('admin Logs page', () => {
  it('loads the stored lines, in Arabic and right-to-left by default', async () => {
    await act(async () => { root.render(<LogsPage />); }); await flush();
    expect(calls[0]).toContain('/api/admin/admin/logs?page_size=50');
    expect(host.querySelector('section')?.getAttribute('dir')).toBe('rtl');
    expect(text()).toContain('سجلات النظام');
    expect(text()).toContain('http_request');
    expect(text()).toContain('slow_or_err');
    expect(text()).toContain('تُحفظ أسطر التحذير والخطأ 30 يوماً');
  });

  it('switches to English (left-to-right) and Urdu (right-to-left) and remembers the choice', async () => {
    await act(async () => { root.render(<LogsPage />); }); await flush();
    const select = host.querySelector('header select') as HTMLSelectElement;
    await act(async () => { select.value = 'en'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(host.querySelector('section')?.getAttribute('dir')).toBe('ltr');
    expect(text()).toContain('System logs');
    expect(window.localStorage.getItem('nabd-admin-logs-lang')).toBe('en');
    await act(async () => { select.value = 'ur'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(host.querySelector('section')?.getAttribute('dir')).toBe('rtl');
    expect(text()).toContain('سسٹم لاگز');
  });

  it('applies the filters into the query and clears them again', async () => {
    window.localStorage.setItem('nabd-admin-logs-lang', 'en');
    await act(async () => { root.render(<LogsPage />); }); await flush();
    const inputs = host.querySelectorAll('form input');
    const setValue = (el: Element, v: string) => { const input = el as HTMLInputElement; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!; set.call(input, v); input.dispatchEvent(new Event('input', { bubbles: true })); };
    await act(async () => { setValue(inputs[2], 'auth'); setValue(inputs[3], 'req-1'); });
    await act(async () => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); await flush();
    const last = calls[calls.length - 1];
    expect(last).toContain('module=auth'); expect(last).toContain('request_id=req-1');
    const buttons = [...host.querySelectorAll('form button')];
    await act(async () => { (buttons.find((b) => b.textContent === 'Clear filters') as HTMLButtonElement).click(); }); await flush();
    expect(calls[calls.length - 1]).toBe('/api/admin/admin/logs?page_size=50');
  });

  it('opens a line, then shows every stored line of its request in order', async () => {
    window.localStorage.setItem('nabd-admin-logs-lang', 'en');
    await act(async () => { root.render(<LogsPage />); }); await flush();
    const open = [...host.querySelectorAll('tbody button')].find((b) => b.textContent === 'Details') as HTMLButtonElement;
    await act(async () => { open.click(); });
    const panel = host.querySelector('aside')!;
    expect(panel.textContent).toContain('Line details'); expect(panel.textContent).toContain('"method": "GET"'); expect(panel.textContent).toContain('req-1');
    await act(async () => { ([...panel.querySelectorAll('button')].find((b) => b.textContent === 'All lines of this request') as HTMLButtonElement).click(); }); await flush();
    expect(calls[calls.length - 1]).toBe('/api/admin/admin/logs/request/req-1');
    const items = [...host.querySelectorAll('aside ol li')].map((li) => li.textContent ?? '');
    expect(items).toHaveLength(2);
    expect(items[0]).toContain('first_event'); expect(items[1]).toContain('second_event');
  });

  it('exports the rows on screen as CSV', async () => {
    window.localStorage.setItem('nabd-admin-logs-lang', 'en');
    let blob: Blob | null = null;
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = (b) => { blob = b; return 'blob:x'; };
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = () => {};
    await act(async () => { root.render(<LogsPage />); }); await flush();
    await act(async () => { ([...host.querySelectorAll('form button')].find((b) => b.textContent === 'Export CSV') as HTMLButtonElement).click(); });
    expect(blob).not.toBeNull();
    const csv = await new Promise<string>((resolve) => { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result)); fr.readAsText(blob as unknown as Blob); });
    expect(csv).toContain('ts,level,service,module,event,request_id');
    expect(csv).toContain('http_request'); expect(csv).toContain('slow_or_err');
  });
});
