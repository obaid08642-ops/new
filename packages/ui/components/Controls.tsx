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

const HIT = 44;
const MOTION = '200ms cubic-bezier(.22,1,.36,1)';

/* -------------------------------------------------------------- Segmented */

const SEGMENT: Record<'sm' | 'md', { height: number; font: string }> = {
  // canvas/Orders, CheckoutV2, PharmacyOffers, BookingConfirm: 38 / 13.5
  sm: { height: 38, font: '13.5px' },
  // canvas/Settings: 44 / 14.5
  md: { height: 44, font: '14.5px' },
};

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
  const { height, font } = SEGMENT[size];
  const hit = Math.max(height, HIT);
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
      style={{
        display: 'flex',
        padding: 4,
        borderRadius: 16,
        background: 'var(--nabd-color-control-segmentedTrack)',
        opacity: disabled ? 0.5 : 1,
      }}
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
            style={{
              flex: '1 1 0',
              minWidth: 0,
              height: hit,
              marginBlock: (height - hit) / 2,
              padding: 0,
              border: 0,
              background: 'transparent',
              fontFamily: 'inherit',
              color: 'var(--nabd-color-text-primary)',
              cursor: inert || o.disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                flex: 1,
                height,
                paddingInline: 14,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                fontSize: font,
                fontWeight: on ? 700 : 500,
                background: on ? 'var(--nabd-color-bg-surface)' : 'transparent',
                boxShadow: on ? 'var(--nabd-shadow-segmented)' : 'none',
                opacity: o.disabled ? 0.5 : 1,
                transition: `background-color ${MOTION}, box-shadow ${MOTION}`,
              }}
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

/** canvas/Settings, Cart, RxUpload: a 50×30 track, a 24px knob, 3px inset. */
const TRACK_W = 50;
const TRACK_H = 30;
const KNOB = 24;
const INSET = 3;

export function Toggle({ value, onChange, label, loading = false, disabled = false, invalid = false, describedBy, testID }: ToggleProps) {
  const inert = disabled || loading;
  const padX = Math.max(0, (HIT - TRACK_W) / 2);
  const padY = (HIT - TRACK_H) / 2;
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
      style={{
        // the 44 hit area around the 50×30 track, given back to the layout
        padding: `${padY}px ${padX}px`,
        margin: `${-padY}px ${-padX}px`,
        border: 0,
        background: 'transparent',
        display: 'inline-flex',
        flexShrink: 0,
        cursor: inert ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'block',
          width: TRACK_W,
          height: TRACK_H,
          borderRadius: TRACK_H / 2,
          background: value ? 'var(--nabd-color-control-switchOn)' : 'var(--nabd-color-border-strong)',
          transition: `background-color ${MOTION}`,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: INSET,
            // On is the knob at the inline start, as the boards draw it in RTL.
            insetInlineStart: value ? INSET : TRACK_W - KNOB - INSET,
            width: KNOB,
            height: KNOB,
            borderRadius: KNOB / 2,
            background: 'var(--nabd-color-control-switchKnob)',
            boxShadow: 'var(--nabd-shadow-knob)',
            transition: `inset-inline-start ${MOTION}`,
          }}
        />
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
      style={{
        width: '100%',
        minHeight: 54,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        paddingInline: 14,
        paddingBlock: 0,
        border: 0,
        borderBlockEnd: divider ? '1px solid var(--nabd-color-border-subtle)' : 0,
        background: 'transparent',
        fontFamily: 'inherit',
        color: 'var(--nabd-color-text-primary)',
        textAlign: 'start',
        cursor: inert ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ flex: 1, fontSize: '15.5px', fontWeight: selected ? 700 : 400 }}>{label}</span>
      {meta ? <span style={{ fontSize: 'var(--nabd-font-size-label)', color: 'var(--nabd-color-text-secondary)' }}>{meta}</span> : null}
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          boxSizing: 'border-box',
          flexShrink: 0,
          border: selected ? '7px solid var(--nabd-color-action-primary-bg)' : '2px solid var(--nabd-color-control-radioOff)',
          transition: `border-width ${MOTION}`,
        }}
      />
    </button>
  );
}

/* ------------------------------------------------------------- StatusChip */

export function StatusChip({ label, tone, testID }: StatusChipProps) {
  return (
    <span
      data-testid={testID}
      data-tone={tone}
      style={{
        // canvas/Orders: 26 tall, 10 padding, 12/600
        height: 26,
        paddingInline: 10,
        borderRadius: 13,
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        fontSize: '12px',
        fontWeight: 600,
        background: `var(--nabd-color-service-${tone}-bg)`,
        color: `var(--nabd-color-service-${tone}-fg)`,
      }}
    >
      {label}
    </span>
  );
}
