"use client";

// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/components/Button.tsx by tools/design/sync-ui-components.mjs.
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
import clsx from 'clsx';

import {
  type ButtonProps,
  type IconButtonProps,
  type Size,
  type Variant,
} from './contract';
import { Icon } from '../src/Icon';
import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX, type FillIconName } from '../icons/fill';
import type { IconName } from '../icons/names';
import { Spinner } from './Spinner';

/**
 * Button and IconButton — handoff §3 (PrimaryButton, OutlineButton, IconButton), web.
 *
 * Geometry is the boards': the page CTA (canvas/Cart, CheckoutV2, RxUpload …) is
 * 56 tall with radius 18 and a 17/700 label; the smaller outline buttons
 * (HomeWeb "التفاصيل", Orders, Appointments) are 44 or 40 tall with radius 14.
 * Colours and shadows are tokens only: the primary fill is the
 * `action.primary.gradient` pair with `shadow.button`, the outline is 1.5px of
 * `text.primary`.
 *
 * `sm` is 40px of VISUAL height; a transparent extender inside the button makes
 * the hit area 44px, so it never shrinks below the touch minimum.
 */

const HEIGHT: Record<Size, number> = { sm: 40, md: 44, lg: 56 };
const RADIUS: Record<Size, number> = { sm: 14, md: 14, lg: 18 };
const PAD_X: Record<Size, number> = { sm: 14, md: 16, lg: 24 };
const FONT: Record<Size, { size: string; weight: number }> = {
  sm: { size: '13.5px', weight: 600 },
  md: { size: '14px', weight: 600 },
  lg: { size: '17px', weight: 700 },
};
const ICON_PX: Record<Size, number> = { sm: 16, md: 18, lg: 22 };

/** A handoff fill glyph when the name is one (the boards draw button icons filled), else the line icon. */
function ButtonIcon({ name, size }: { name: IconName | FillIconName; size: number }) {
  if (name in FILL_ICON_PATHS) {
    return (
      <svg width={size} height={size} viewBox={FILL_ICON_VIEWBOX} aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d={FILL_ICON_PATHS[name as FillIconName]} fill="currentColor" />
      </svg>
    );
  }
  return <Icon name={name as IconName} size={size} tone="currentColor" />;
}

/**
 * `lime` is the acid accent. The canvas restricts it to DARK surfaces, so the
 * pairing is fixed here rather than left to a caller: lime fill, ink label,
 * always.
 */
const VARIANT_STYLE: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(180deg, var(--nabd-color-action-primary-gradient-from) 0%, var(--nabd-color-action-primary-gradient-to) 100%)',
    color: 'var(--nabd-color-action-primary-fg)',
    border: 0,
    boxShadow: 'var(--nabd-shadow-button)',
  },
  outline: {
    background: 'transparent',
    color: 'var(--nabd-color-text-primary)',
    border: '1.5px solid var(--nabd-color-text-primary)',
  },
  secondary: {
    background: 'var(--nabd-color-action-secondary-bg)',
    color: 'var(--nabd-color-action-secondary-fg)',
    border: '1px solid var(--nabd-color-border-onGlass)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--nabd-color-text-primary)',
    border: 0,
  },
  danger: {
    background: 'var(--nabd-color-action-danger-bg)',
    color: 'var(--nabd-color-action-danger-fg)',
    border: 0,
  },
  lime: {
    background: 'var(--nabd-color-accent-lime)',
    color: 'var(--nabd-color-text-onAccent)',
    border: 0,
  },
};

/** IconButton: 44×44 at sm/md (canvas/Settings back, Cart delete), 52×52 at lg (Consult filter). */
const ICON_BOX: Record<Size, number> = { sm: 44, md: 44, lg: 52 };
const ICON_GLYPH: Record<Size, number> = { sm: 20, md: 22, lg: 22 };

const ICON_BUTTON_VARIANT_STYLE: Record<NonNullable<IconButtonProps['variant']>, React.CSSProperties> = {
  plain: { background: 'transparent', border: 0 },
  outlined: { background: 'var(--nabd-color-bg-surface)', border: '1px solid var(--nabd-color-border-onGlass)' },
  filled: { background: 'var(--nabd-color-action-selected-bg)', border: 0 },
  tinted: { background: 'var(--nabd-color-bg-sunken)', border: 0 },
  glass: {
    background: 'var(--nabd-color-glass-bg)',
    border: '1px solid var(--nabd-color-border-onGlass)',
    backdropFilter: 'blur(var(--nabd-color-glass-blur))',
    WebkitBackdropFilter: 'blur(var(--nabd-color-glass-blur))',
  },
};

const TONE_COLOR: Record<string, string> = {
  neutral: 'var(--nabd-color-icon-primary)',
  primary: 'var(--nabd-color-action-primary-bg)',
  success: 'var(--nabd-color-status-success-fg)',
  warning: 'var(--nabd-color-status-warning-fg)',
  danger: 'var(--nabd-color-status-danger-fg)',
  info: 'var(--nabd-color-status-info-fg)',
};

export interface WebButtonProps extends ButtonProps {
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  invalid = false,
  startIcon,
  endIcon,
  testID,
  onClick,
  type = 'button',
}: WebButtonProps) {
  // A loading button is also a disabled button: a tap during the request must
  // not fire the handler twice, and the two flags are separate so a caller can
  // pass `disabled` without pretending to be loading.
  const inert = disabled || loading;

  return (
    <button
      type={type}
      className={clsx('nabd-button', `nabd-button--${variant}`, `nabd-button--${size}`, {
        'nabd-button--full': fullWidth,
        'nabd-button--loading': loading,
        'nabd-button--invalid': invalid,
      })}
      style={{
        ...VARIANT_STYLE[variant],
        display: fullWidth ? 'flex' : 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--nabd-space-2xs)',
        boxSizing: 'border-box',
        position: 'relative',
        height: HEIGHT[size],
        paddingInline: PAD_X[size],
        paddingBlock: 0,
        fontFamily: 'inherit',
        fontSize: FONT[size].size,
        fontWeight: FONT[size].weight,
        borderRadius: RADIUS[size],
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.5 : 1,
        cursor: inert ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
      }}
      onClick={inert ? undefined : onClick}
      disabled={inert}
      aria-busy={loading || undefined}
      aria-invalid={invalid || undefined}
      data-testid={testID}
      data-variant={variant}
      data-size={size}
    >
      {loading ? <Spinner size={ICON_PX[size]} /> : startIcon ? <ButtonIcon name={startIcon} size={ICON_PX[size]} /> : null}
      <span className="nabd-button__label">{label}</span>
      {HEIGHT[size] < 44 ? (
        // sm is 40 to look at (canvas/Account) and 44 to hit: a transparent extender inside the button
        <span aria-hidden style={{ position: 'absolute', insetInline: 0, insetBlock: `calc((${HEIGHT[size]}px - var(--nabd-a11y-minTouchTarget)) / 2)` }} />
      ) : null}
      {!loading && endIcon ? <ButtonIcon name={endIcon} size={ICON_PX[size]} /> : null}
    </button>
  );
}

export interface WebIconButtonProps extends IconButtonProps {
  onClick?: () => void;
}

export function IconButton({
  name,
  label,
  size = 'md',
  variant = 'plain',
  shape = 'circle',
  tone = 'neutral',
  loading = false,
  disabled = false,
  invalid = false,
  testID,
  onClick,
}: WebIconButtonProps) {
  const inert = disabled || loading;
  const box = ICON_BOX[size];
  const px = ICON_GLYPH[size];

  return (
    <button
      type="button"
      className={clsx('nabd-icon-button', `nabd-icon-button--${size}`, `nabd-icon-button--${variant}`)}
      style={{
        ...ICON_BUTTON_VARIANT_STYLE[variant],
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        flexShrink: 0,
        width: box,
        height: box,
        minWidth: 'var(--nabd-a11y-minTouchTarget)',
        minHeight: 'var(--nabd-a11y-minTouchTarget)',
        borderRadius: shape === 'square' ? (size === 'lg' ? 18 : 14) : box / 2,
        color: variant === 'filled' ? 'var(--nabd-color-action-selected-fg)' : TONE_COLOR[tone] ?? TONE_COLOR.neutral,
        opacity: disabled ? 0.5 : 1,
        cursor: inert ? 'not-allowed' : 'pointer',
      }}
      // `label` is required by the contract, so this can never be undefined at
      // the type level — the a11y rule is enforced by the compiler, not by review.
      aria-label={label}
      aria-busy={loading || undefined}
      aria-invalid={invalid || undefined}
      onClick={inert ? undefined : onClick}
      disabled={inert}
      data-testid={testID}
      data-variant={variant}
      data-shape={shape}
    >
      {loading ? <Spinner size={px} /> : <Icon name={name} size={px} tone="currentColor" />}
    </button>
  );
}
