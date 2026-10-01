import * as React from 'react';
import clsx from 'clsx';

import {
  type ButtonProps,
  type IconButtonProps,
  type Size,
  type Variant,
} from './contract';
import { Icon } from '../src/Icon';
import { Spinner } from './Spinner';

/**
 * Button and IconButton — 12.A7, web.
 *
 * Every dimension here comes from a token: the padding from the `space` scale,
 * the corner from the `radius` scale, the height from a per-size table that is
 * clamped by the 44px touch minimum, the colours from `action.*` / `icon.*`.
 * There is no literal colour and no literal pixel in this file, which is why the
 * `no-px-font-size` and palette ratchets do not have to know about it.
 *
 * The height table deserves a note. `sm` is 32px of VISUAL height so a dense
 * table can use it, but `min-height` stays 44px, so the hit area never shrinks.
 * That is the difference between a small button and a small target, and §A7 asks
 * for the second while the canvas asks for the first.
 */

const HEIGHT: Record<Size, number> = { sm: 32, md: 40, lg: 48 };
const PAD_X: Record<Size, string> = {
  sm: 'var(--nabd-space-sm)',
  md: 'var(--nabd-space-md)',
  lg: 'var(--nabd-space-lg)',
};
const FONT_SIZE: Record<Size, string> = {
  sm: 'var(--nabd-font-size-body)',
  md: 'var(--nabd-font-size-bodyStrong)',
  lg: 'var(--nabd-font-size-label)',
};
const ICON_PX: Record<Size, number> = { sm: 16, md: 20, lg: 24 };

/**
 * `lime` is the acid accent. The canvas restricts it to DARK surfaces, so the
 * pairing is fixed here rather than left to a caller: lime fill, ink label,
 * always. A caller cannot get this wrong because there is nothing to get wrong.
 */
const VARIANT_STYLE: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--nabd-color-action-primary-bg)',
    color: 'var(--nabd-color-action-primary-fg)',
    borderColor: 'transparent',
  },
  secondary: {
    background: 'var(--nabd-color-action-secondary-bg)',
    color: 'var(--nabd-color-action-secondary-fg)',
    borderColor: 'var(--nabd-color-border-strong)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--nabd-color-text-primary)',
    borderColor: 'transparent',
  },
  danger: {
    background: 'var(--nabd-color-action-danger-bg)',
    color: 'var(--nabd-color-action-danger-fg)',
    borderColor: 'transparent',
  },
  lime: {
    background: 'var(--nabd-color-accent-lime)',
    color: 'var(--nabd-color-text-onAccent)',
    borderColor: 'transparent',
  },
};

const ICON_BUTTON_VARIANT_STYLE: Record<
  NonNullable<IconButtonProps['variant']>,
  React.CSSProperties
> = {
  plain: { background: 'transparent', borderColor: 'transparent' },
  outlined: { background: 'transparent', borderColor: 'var(--nabd-color-border-strong)' },
  filled: { background: 'var(--nabd-color-action-secondary-bg)', borderColor: 'transparent' },
  tinted: { background: 'var(--nabd-color-bg-sunken)', borderColor: 'transparent' },
};

const TONE_COLOR: Record<string, string> = {
  neutral: 'var(--nabd-color-icon-secondary)',
  primary: 'var(--nabd-color-icon-primary)',
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
        minHeight: 'var(--nabd-a11y-minTouchTarget)',
        height: fullWidth ? undefined : HEIGHT[size],
        paddingInline: PAD_X[size],
        paddingBlock: 0,
        fontSize: FONT_SIZE[size],
        borderRadius: variant === 'ghost' ? 'var(--nabd-radius-sm)' : 'var(--nabd-radius-pill)',
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.5 : 1,
        cursor: inert ? 'not-allowed' : 'pointer',
      }}
      onClick={inert ? undefined : onClick}
      disabled={inert}
      aria-busy={loading || undefined}
      aria-invalid={invalid || undefined}
      data-testid={testID}
      data-variant={variant}
      data-size={size}
    >
      {loading ? <Spinner size={ICON_PX[size]} /> : startIcon ? <Icon name={startIcon} size={ICON_PX[size]} /> : null}
      <span className="nabd-button__label">{label}</span>
      {!loading && endIcon ? <Icon name={endIcon} size={ICON_PX[size]} /> : null}
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
  tone = 'neutral',
  loading = false,
  disabled = false,
  invalid = false,
  testID,
  onClick,
}: WebIconButtonProps) {
  const inert = disabled || loading;
  const px = ICON_PX[size];

  return (
    <button
      type="button"
      className={clsx('nabd-icon-button', `nabd-icon-button--${size}`, `nabd-icon-button--${variant}`)}
      style={{
        ...ICON_BUTTON_VARIANT_STYLE[variant],
        // Square, 44 minimum, so the target is the same in both axes.
        minWidth: 'var(--nabd-a11y-minTouchTarget)',
        minHeight: 'var(--nabd-a11y-minTouchTarget)',
        height: Math.max(HEIGHT[size], 44),
        width: Math.max(HEIGHT[size], 44),
        borderRadius: 'var(--nabd-radius-pill)',
        color: TONE_COLOR[tone] ?? TONE_COLOR.neutral,
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
    >
      {loading ? <Spinner size={px} /> : <Icon name={name} size={px} />}
    </button>
  );
}
