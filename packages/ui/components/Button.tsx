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

// Geometry (height, radius, padding, type) per size and the variant paints are in
// css/Button.css; only the glyph sizes, which are SVG attributes, stay here.
const ICON_PX: Record<Size, number> = { sm: 16, md: 18, lg: 22 };

/** A handoff fill glyph when the name is one (the boards draw button icons filled), else the line icon. */
function ButtonIcon({ name, size }: { name: IconName | FillIconName; size: number }) {
  if (name in FILL_ICON_PATHS) {
    return (
      <svg width={size} height={size} viewBox={FILL_ICON_VIEWBOX} aria-hidden="true" className="nabd-button__icon">
        <path d={FILL_ICON_PATHS[name as FillIconName]} fill="currentColor" />
      </svg>
    );
  }
  return <Icon name={name as IconName} size={size} tone="currentColor" />;
}

/*
 * `lime` is the acid accent. The canvas restricts it to DARK surfaces, so the
 * pairing is fixed (css/Button.css) rather than left to a caller: lime fill, ink
 * label, always.
 */

/** IconButton: 44×44 at sm/md (canvas/Settings back, Cart delete), 52×52 at lg (Consult filter). */
/** IconButton glyph: 20 at sm, 22 at md/lg; the 44 / 52 box is css/Button.css. */
const ICON_GLYPH: Record<Size, number> = { sm: 20, md: 22, lg: 22 };

/** The glyph tones css/Button.css paints; anything else falls back to neutral. */
const TONE_CLASS = new Set(['neutral', 'primary', 'success', 'warning', 'danger', 'info']);

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
        'nabd-button--disabled': disabled,
        'nabd-button--inert': inert,
      })}
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
      {size === 'sm' ? (
        // sm is 40 to look at (canvas/Account) and 44 to hit: a transparent extender inside the button
        <span aria-hidden className="nabd-button__hit" />
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
  const px = ICON_GLYPH[size];

  return (
    <button
      type="button"
      className={clsx(
        'nabd-icon-button',
        `nabd-icon-button--${size}`,
        `nabd-icon-button--${variant}`,
        `nabd-icon-button--${shape}`,
        variant === 'filled' ? null : `nabd-icon-button--tone-${TONE_CLASS.has(tone) ? tone : 'neutral'}`,
        { 'nabd-icon-button--disabled': disabled, 'nabd-icon-button--inert': inert },
      )}
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
