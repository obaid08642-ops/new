import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useDrawer } from '../useDrawer';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useDrawer(open, () => { setOpen(false); onClose?.(); }, ref);
  return (
    <div dir="rtl">
      <button id="opener" aria-expanded={open} onClick={() => setOpen(true)}>open</button>
      <aside ref={ref} id="panel" tabIndex={-1} hidden={!open}>
        <a id="first" href="#a">a</a>
        <button id="middle">b</button>
        <button id="last">c</button>
      </aside>
    </div>
  );
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;
function mount(node: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(node));
}
const $ = (id: string) => document.getElementById(id) as HTMLElement;
const key = (k: string, opts: KeyboardEventInit = {}) => act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...opts })); });

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  document.body.style.overflow = '';
});

describe('useDrawer', () => {
  it('locks body scroll, moves focus in and sets aria-expanded on the opener', () => {
    mount(<Harness />);
    $('opener').focus();
    act(() => $('opener').click());
    expect($('opener').getAttribute('aria-expanded')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe($('first'));
  });

  it('traps Tab and Shift+Tab inside the panel', () => {
    mount(<Harness />);
    act(() => $('opener').click());
    $('last').focus();
    key('Tab');
    expect(document.activeElement).toBe($('first'));
    key('Tab', { shiftKey: true });
    expect(document.activeElement).toBe($('last'));
  });

  it('Escape closes, restores body scroll and returns focus to the opener', () => {
    const onClose = vi.fn();
    mount(<Harness onClose={onClose} />);
    $('opener').focus();
    act(() => $('opener').click());
    key('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect($('opener').getAttribute('aria-expanded')).toBe('false');
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe($('opener'));
  });
});
