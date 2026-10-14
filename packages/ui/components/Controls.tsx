import * as React from 'react';

import type { RadioProps, SegmentedProps, StatusChipProps, ToggleProps } from './contract';

/**
 * The selection controls of handoff §3 — Segmented, Toggle, Radio — and the
 * StatusChip, web. Geometry is the boards'; every colour and shadow is a token.
 *
 * A control drawn smaller than 44px (the 38px segment, the 30px switch) keeps a
 * 44px hit area: the clickable box is 44 and gives back the extra with a negative
 * margin, so the layout is the board's and the target is DEVICE_STANDARD §3.3's.
 */

/*
 * The geometry and paints are in css/Controls.css:
 *   Segmented sm 38 / 13.5 (canvas/Orders, CheckoutV2, PharmacyOffers, BookingConfirm),
 *             md 44 / 14.5 (canvas/Settings);
 *   Toggle    a 50×30 track, a 24px knob, 3px inset (canvas/Settings, Cart, RxUpload);
 *   Radio     a 54 row, a 22 ring (7px when on, 2px when off);
 *   StatusChip 26 tall, 10 padding, 12/600 (canvas/Orders).
 */

/* -------------------------------------------------------------- Segmented */

export function Segmented({
  options,
  value,
  onChange,
  label,
  size = 'md',
  loading = false,
  disabled = false,
  invalid = false,
  describedBy,
  testID,
}: SegmentedProps) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const inert = disabled || loading;

  const move = (from: number, step: 1 | -1) => {
    const n = options.length;
    for (let k = 1; k <= n; k += 1) {
      const next = (from + step * k + n) % n;
      if (!options[next].disabled) {
        onChange?.(options[next].value);
        refs.current[next]?.focus();
        return;
      }
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-busy={loading || undefined}
      data-testid={testID}
      className={`nabd-segmented nabd-segmented--${size}${disabled ? ' nabd-segmented--disabled' : ''}`}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            disabled={inert || o.disabled}
            onClick={() => onChange?.(o.value)}
            onKeyDown={(e) => {
              const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
              const forward = e.key === 'ArrowDown' || e.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
              const back = e.key === 'ArrowUp' || e.key === (rtl ? 'ArrowRight' : 'ArrowLeft');
              if (forward || back) {
                e.preventDefault();
                move(i, forward ? 1 : -1);
              }
            }}
            data-testid={testID ? `${testID}-${o.value}` : undefined}
            className={`nabd-segmented__option${inert || o.disabled ? ' nabd-segmented__option--inert' : ''}`}
          >
            <span
              className={`nabd-segmented__pill${on ? ' nabd-segmented__pill--on' : ''}${o.disabled ? ' nabd-segmented__pill--disabled' : ''}`}
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- Toggle */

export function Toggle({ value, onChange, label, loading = false, disabled = false, invalid = false, describedBy, testID }: ToggleProps) {
  const inert = disabled || loading;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-busy={loading || undefined}
      disabled={inert}
      onClick={() => onChange?.(!value)}
      data-testid={testID}
      // the 44 hit area around the 50×30 track is given back to the layout (css)
      className={`nabd-toggle${inert ? ' nabd-toggle--inert' : ''}${disabled ? ' nabd-toggle--disabled' : ''}`}
    >
      <span className={`nabd-toggle__track${value ? ' nabd-toggle__track--on' : ''}`}>
        {/* On is the knob at the inline start, as the boards draw it in RTL. */}
        <span className="nabd-toggle__knob" />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ Radio */

export interface WebRadioProps extends RadioProps {
  /** Draw the row divider below (canvas/Settings: every row but the last). */
  divider?: boolean;
}

export function Radio({
  label,
  meta,
  selected,
  onChange,
  divider = false,
  loading = false,
  disabled = false,
  invalid = false,
  describedBy,
  testID,
}: WebRadioProps) {
  const inert = disabled || loading;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      disabled={inert}
      onClick={() => onChange?.(true)}
      data-testid={testID}
      className={`nabd-radio${divider ? ' nabd-radio--divider' : ''}${inert ? ' nabd-radio--inert' : ''}${disabled ? ' nabd-radio--disabled' : ''}`}
    >
      <span className={`nabd-radio__label${selected ? ' nabd-radio__label--on' : ''}`}>{label}</span>
      {meta ? <span className="nabd-radio__meta">{meta}</span> : null}
      <span aria-hidden className={`nabd-radio__ring${selected ? ' nabd-radio__ring--on' : ''}`} />
    </button>
  );
}

/* ------------------------------------------------------------- StatusChip */

export function StatusChip({ label, tone, testID }: StatusChipProps) {
  return (
    <span
      data-testid={testID}
      data-tone={tone}
      className={`nabd-status-chip nabd-tone--${tone}`}
    >
      {label}
    </span>
  );
}
