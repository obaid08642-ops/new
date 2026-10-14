// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/shells/StickyFooter.tsx by tools/design/sync-ui-components.mjs.
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
 * <StickyFooter> — DEVICE_STANDARD §1, web: the CTA bar sticks to the bottom of the
 * viewport with padding-bottom max(16px, env(safe-area-inset-bottom)), so a button
 * never sits under the iOS home indicator. Glass with a hairline on top. Styles in
 * ./shells.css.
 */

export interface StickyFooterProps {
  children: React.ReactNode;
  /** Accessible name when the footer is a landmark region (e.g. "Checkout actions"). */
  label?: string;
  className?: string;
}

export function StickyFooter({ children, label, className }: StickyFooterProps) {
  return (
    <div
      className={['nabd-sticky-footer', className].filter(Boolean).join(' ')}
      role={label ? 'region' : undefined}
      aria-label={label}
    >
      {children}
    </div>
  );
}
StickyFooter.displayName = 'StickyFooter';
