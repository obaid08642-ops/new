// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/components/Spinner.tsx by tools/design/sync-ui-components.mjs.
//
// patient-web cannot import from packages/: Turbopack refuses to resolve outside
// the app root, and the type checker does not, so the failure only appears at
// `next build`. This file is a copy, not a port — the renderer a screen uses and
// the renderer the conformance gallery exercises are the same code, so the
// artwork cannot drift between them. Run the script after changing the package;
// `--check` in CI fails if this drifts.
//
// tests/module-boundary.test.ts enforces the boundary this mirror exists to work
// around.
import * as React from 'react';

/**
 * Spinner — 12.A7, shared.
 *
 * Not a token colour and not a fixed size: it takes its colour from
 * `currentColor` so it inherits whatever the button, sheet or field it sits in
 * is already painting, and its box is a fixed 1em square with a 2px stroke at a
 * fixed ratio, so it never shifts the layout while it spins.
 *
 * It is `aria-hidden` because the element that owns the loading STATE is the one
 * that announces it — `aria-busy` on a button, a `role="status"` region on a
 * sheet. Two live regions saying the same thing is worse than one.
 */
export function Spinner({ size = 20, label }: { size?: number; label?: string }) {
  const stroke = Math.max(2, Math.round(size * 0.1));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
      data-testid="nabd-spinner"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="currentColor"
        strokeWidth={stroke}
        opacity={0.25}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c * 0.25} ${c}`}
        style={{
          transformOrigin: 'center',
          animation: 'nabd-spin var(--nabd-motion-duration-skeleton) linear infinite',
        }}
      />
      <style>{'@keyframes nabd-spin{to{transform:rotate(360deg)}}'}</style>
    </svg>
  );
}
