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
