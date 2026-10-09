// @vitest-environment jsdom
import React, { act } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot, type Root } from 'react-dom/client';
import { ConfirmDialog } from '../ConfirmDialog';
import { BarcodeScanner, canScanWithCamera } from '../BarcodeScanner';
import { SensitiveChangeList, isPublished, sensitiveChanges } from '../MedicineQuickEdit';

beforeAll(() => { (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });

let root: Root | null = null;
let host: HTMLElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});
function mount(node: React.ReactNode) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(node));
  return host;
}

describe('sensitiveChanges', () => {
  it('lists price and prescription changes with old and new values, and nothing else', () => {
    const stored = { price: 10, requires_prescription: false, name_ar: 'x' };
    expect(sensitiveChanges(stored, { price: 10, requires_prescription: false })).toEqual([]);
    expect(sensitiveChanges(stored, { price: 12.5, requires_prescription: false })).toEqual([{ label: 'السعر (ر.س)', from: '10', to: '12.5' }]);
    const both = sensitiveChanges(stored, { price: 8, requires_prescription: true });
    expect(both.map((c) => c.label)).toEqual(['السعر (ر.س)', 'يتطلب وصفة طبية']);
    expect(both[1]).toMatchObject({ from: 'لا', to: 'نعم' });
  });

  it('treats a missing stored price as 0', () => {
    expect(sensitiveChanges({}, { price: 0, requires_prescription: false })).toEqual([]);
  });

  it('knows when an item is published (an edit would un-publish it)', () => {
    expect(isPublished({ medical_review_status: 'approved' })).toBe(true);
    expect(isPublished({ public_eligibility: true })).toBe(true);
    expect(isPublished({ medical_review_status: 'pending' })).toBe(false);
    const html = renderToStaticMarkup(<SensitiveChangeList changes={[{ label: 'السعر (ر.س)', from: '1', to: '2' }]} published />);
    expect(html).toContain('منشور');
    expect(renderToStaticMarkup(<SensitiveChangeList changes={[]} published={false} />)).not.toContain('منشور');
  });
});

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    expect(renderToStaticMarkup(<ConfirmDialog open={false} title="t" onConfirm={() => undefined} onCancel={() => undefined}>x</ConfirmDialog>)).toBe('');
  });

  it('is a labelled modal dialog, focuses the safe button, confirms and cancels, Escape cancels', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const el = mount(<ConfirmDialog open title="تأكيد" confirmLabel="نعم" onConfirm={onConfirm} onCancel={onCancel}>body</ConfirmDialog>);
    const dialog = el.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('تأكيد');
    expect(document.activeElement?.textContent).toBe('تراجع');
    act(() => (Array.from(el.querySelectorAll('button')).find((b) => b.textContent === 'نعم') as HTMLButtonElement).click());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('BarcodeScanner without a camera', () => {
  it('reports no camera scan in this environment and falls back to a typed code', () => {
    expect(canScanWithCamera()).toBe(false);
    const onCode = vi.fn();
    const el = mount(<BarcodeScanner onCode={onCode} onClose={() => undefined} />);
    expect(el.querySelector('[role="status"]')?.textContent).toContain('غير مدعوم');
    const input = el.querySelector('input') as HTMLInputElement;
    const submit = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, ' 6281234567890 ');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => { el.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(onCode).toHaveBeenCalledWith('6281234567890');
  });
});
