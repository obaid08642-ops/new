// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/components/Inputs.tsx by tools/design/sync-ui-components.mjs.
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

import type {
  InputProps,
  OtpProps,
  SearchProps,
  SelectProps,
  Slot,
  SlotPickerProps,
  StepperProps,
} from './contract';
import { Icon } from '../src/Icon';

/**
 * The form controls — 12.A7, web.
 *
 * Three rules run through all of them:
 *
 *   1. The label is a real `<label for>`, never a placeholder. A placeholder
 *      disappears the moment the field has a value, which is exactly when the
 *      user forgets which field they are in.
 *   2. `error` and `hint` are wired with `aria-describedby` and the input is
 *      marked `aria-invalid`, so the message is announced rather than merely
 *      painted.
 *   3. The control's own height is never below the 44px touch target, and the
 *      focus ring comes from the `a11y.focusRing` tokens so it is the same ring
 *      everywhere and in both themes.
 */

const CONTROL_HEIGHT = 'var(--nabd-a11y-minTouchTarget)';

const fieldStyle: React.CSSProperties = {
  width: '100%',
  minHeight: CONTROL_HEIGHT,
  paddingInline: 'var(--nabd-space-md)',
  paddingBlock: 'var(--nabd-space-xs)',
  fontSize: 'var(--nabd-font-size-body)',
  fontFamily: 'var(--nabd-font-family-body)',
  color: 'var(--nabd-color-text-primary)',
  background: 'var(--nabd-color-bg-surface)',
  border: '1px solid var(--nabd-color-border-default)',
  borderRadius: 'var(--nabd-radius-md)',
  appearance: 'none',
};

const invalidFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  borderColor: 'var(--nabd-color-status-danger-fg)',
  background: 'var(--nabd-color-status-danger-bg)',
};

function FieldMessages({
  id,
  hint,
  error,
}: {
  id: string;
  hint?: string;
  error?: string;
}) {
  if (!hint && !error) return null;
  return (
    <div style={{ display: 'grid', gap: '2px', marginTop: 'var(--nabd-space-2xs)' }}>
      {hint ? (
        <span id={`${id}-hint`} style={{ fontSize: 'var(--nabd-font-size-caption)', color: 'var(--nabd-color-text-secondary)' }}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span
          id={`${id}-error`}
          style={{ fontSize: 'var(--nabd-font-size-caption)', color: 'var(--nabd-color-status-danger-fg)' }}
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string, extra?: string) {
  return [extra, hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ') || undefined;
}

export function Input({
  label,
  placeholder,
  value,
  multiline = false,
  rows = 4,
  error,
  hint,
  startIcon,
  endIcon,
  keyboardType = 'text',
  autoComplete,
  readOnly = false,
  loading = false,
  disabled = false,
  invalid = false,
  onChange,
  testID,
}: InputProps) {
  const id = React.useId();
  const bad = invalid || Boolean(error);
  const style = bad ? invalidFieldStyle : fieldStyle;

  const shared = {
    id,
    value,
    placeholder,
    disabled: disabled || readOnly,
    readOnly,
    'aria-invalid': bad || undefined,
    'aria-describedby': describedBy(id, hint, error),
    'data-testid': testID,
    style,
  } as const;

  return (
    <div className="nabd-field" style={{ display: 'grid', gap: 'var(--nabd-space-2xs)' }}>
      {label ? (
        <label htmlFor={id} style={{ fontSize: 'var(--nabd-font-size-label)', color: 'var(--nabd-color-text-secondary)' }}>
          {label}
        </label>
      ) : null}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {startIcon ? (
          <span style={{ position: 'absolute', insetInlineStart: 'var(--nabd-space-sm)', display: 'grid', placeItems: 'center' }}>
            <Icon name={startIcon} size={20} tone="secondary" />
          </span>
        ) : null}

        {multiline ? (
          <textarea
            {...shared}
            onChange={(e) => onChange?.(e.target.value)}
            rows={rows}
            style={{ ...style, paddingInlineStart: startIcon ? 'calc(var(--nabd-space-md) + 28px)' : undefined, resize: 'vertical' }}
          />
        ) : (
          <input
            {...shared}
            onChange={(e) => onChange?.(e.target.value)}
            type={keyboardType === 'phone' ? 'tel' : keyboardType}
            inputMode={keyboardType === 'number' || keyboardType === 'decimal' ? 'numeric' : undefined}
            autoComplete={autoComplete}
            style={{ paddingInlineStart: startIcon ? 'calc(var(--nabd-space-md) + 28px)' : undefined }}
          />
        )}

        {loading ? <span style={{ position: 'absolute', insetInlineEnd: 'var(--nabd-space-sm)' }}>…</span> : null}
        {endIcon && !loading ? (
          <span style={{ position: 'absolute', insetInlineEnd: 'var(--nabd-space-sm)', display: 'grid', placeItems: 'center' }}>
            <Icon name={endIcon} size={20} tone="secondary" />
          </span>
        ) : null}
      </div>

      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  hint,
  loading = false,
  disabled = false,
  invalid = false,
  testID,
}: SelectProps) {
  const id = React.useId();
  const bad = invalid || Boolean(error);

  return (
    <div className="nabd-field" style={{ display: 'grid', gap: 'var(--nabd-space-2xs)' }}>
      {label ? (
        <label htmlFor={id} style={{ fontSize: 'var(--nabd-font-size-label)', color: 'var(--nabd-color-text-secondary)' }}>
          {label}
        </label>
      ) : null}
      <div style={{ position: 'relative' }}>
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled || loading}
          aria-invalid={bad || undefined}
          aria-describedby={describedBy(id, hint, error)}
          data-testid={testID}
          style={{ ...(bad ? invalidFieldStyle : fieldStyle), paddingInlineEnd: 'var(--nabd-space-xl)' }}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <span style={{ position: 'absolute', insetInlineEnd: 'var(--nabd-space-sm)', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <Icon name="caret-down" size={16} tone="secondary" />
        </span>
      </div>
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}

/**
 * The OTP field. Rendered as N separate one-character inputs because that is what
 * lets a paste of the whole code land in the first box and spread itself, which
 * is how people actually use these.
 */
export function Otp({ value = '', length, label, error, onChange, onComplete, disabled = false, testID }: OtpProps) {
  const id = React.useId();
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  const setAt = (index: number, next: string) => {
    const merged = digits.map((d, i) => (i === index ? next : d)).join('').replace(/ /g, '');
    onChange?.(merged);
    // Auto-submit only when the code is actually complete, not on every keystroke.
    if (merged.length === length) onComplete?.(merged);
    if (next && index < length - 1) refs.current[index + 1]?.focus();
  };

  return (
    <div className="nabd-field" style={{ display: 'grid', gap: 'var(--nabd-space-2xs)' }}>
      {label ? (
        <label htmlFor={`${id}-0`} style={{ fontSize: 'var(--nabd-font-size-label)', color: 'var(--nabd-color-text-secondary)' }}>
          {label}
        </label>
      ) : null}
      <div style={{ display: 'flex', gap: 'var(--nabd-space-2xs)', direction: 'ltr' }} role="group">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            id={`${id}-${i}`}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={digits[i] === ' ' ? '' : digits[i]}
            onChange={(e) => setAt(i, e.target.value.slice(-1))}
            onPaste={(e) => {
              // Spread a pasted code across the boxes instead of filling only one.
              e.preventDefault();
              const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
              onChange?.(pasted);
              if (pasted.length === length) onComplete?.(pasted);
              refs.current[Math.min(pasted.length, length - 1)]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            disabled={disabled}
            aria-label={`${label ?? 'Code'} ${i + 1}`}
            aria-invalid={Boolean(error) || undefined}
            data-testid={testID ? `${testID}-${i}` : undefined}
            style={{
              ...(error ? invalidFieldStyle : fieldStyle),
              width: 'var(--nabd-a11y-minTouchTarget)',
              minWidth: 'var(--nabd-a11y-minTouchTarget)',
              textAlign: 'center',
              fontFamily: 'var(--nabd-font-family-mono, monospace)',
            }}
          />
        ))}
      </div>
      <FieldMessages id={id} error={error} />
    </div>
  );
}

export function Search({
  value = '',
  onChange,
  placeholder = '',
  onFilterPress,
  filterLabel,
  loading = false,
  disabled = false,
  testID,
}: SearchProps) {
  const id = React.useId();
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', insetInlineStart: 'var(--nabd-space-sm)', display: 'grid', placeItems: 'center' }}>
        <Icon name="search" size={20} tone="secondary" />
      </span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={placeholder || 'Search'}
        data-testid={testID}
        style={{
          ...fieldStyle,
          paddingInlineStart: 'calc(var(--nabd-space-md) + 28px)',
          paddingInlineEnd: onFilterPress ? 'calc(var(--nabd-space-md) + 44px)' : undefined,
          borderRadius: 'var(--nabd-radius-pill)',
        }}
      />
      {onFilterPress ? (
        <button
          type="button"
          onClick={onFilterPress}
          // The filter control is icon-only, so its name has to be explicit —
          // this is the same rule IconButton enforces through its types.
          aria-label={filterLabel ?? 'Filter'}
          data-testid={testID ? `${testID}-filter` : undefined}
          style={{
            position: 'absolute',
            insetInlineEnd: 'var(--nabd-space-3xs)',
            minWidth: 'var(--nabd-a11y-minTouchTarget)',
            minHeight: 'var(--nabd-a11y-minTouchTarget)',
            display: 'grid',
            placeItems: 'center',
            background: 'transparent',
            border: 0,
            borderRadius: 'var(--nabd-radius-pill)',
            cursor: 'pointer',
            color: 'var(--nabd-color-icon-secondary)',
          }}
        >
          <Icon name="filter" size={20} />
        </button>
      ) : null}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  decrementLabel = 'Decrease',
  incrementLabel = 'Increase',
  format,
  disabled = false,
  testID,
}: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const shown = format ? format(value) : String(value);

  return (
    <div
      role="group"
      aria-label={label}
      data-testid={testID}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid var(--nabd-color-border-default)',
        borderRadius: 'var(--nabd-radius-pill)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => onChange?.(clamp(value - step))}
        disabled={disabled || value <= min}
        aria-label={decrementLabel}
        style={stepButton}
      >
        <Icon name="minus" size={18} />
      </button>
      <span
        aria-live="polite"
        style={{
          minWidth: 'var(--nabd-space-2xl)',
          textAlign: 'center',
          fontSize: 'var(--nabd-font-size-bodyStrong)',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--nabd-color-text-primary)',
        }}
      >
        {shown}
      </span>
      <button
        type="button"
        onClick={() => onChange?.(clamp(value + step))}
        disabled={disabled || value >= max}
        aria-label={incrementLabel}
        style={stepButton}
      >
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}

const stepButton: React.CSSProperties = {
  minWidth: 'var(--nabd-a11y-minTouchTarget)',
  minHeight: 'var(--nabd-a11y-minTouchTarget)',
  display: 'grid',
  placeItems: 'center',
  background: 'transparent',
  border: 0,
  cursor: 'pointer',
  color: 'var(--nabd-color-icon-primary)',
};

export function SlotPicker({
  dayLabel,
  slots,
  value,
  onChange,
  loading = false,
  disabled = false,
  testID,
}: SlotPickerProps) {
  return (
    <div style={{ display: 'grid', gap: 'var(--nabd-space-2xs)' }} data-testid={testID}>
      <span style={{ fontSize: 'var(--nabd-font-size-label)', color: 'var(--nabd-color-text-secondary)' }}>
        {dayLabel}
      </span>
      {loading ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--nabd-space-2xs)' }} aria-busy>
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 72,
                height: 'var(--nabd-a11y-minTouchTarget)',
                borderRadius: 'var(--nabd-radius-pill)',
                background: 'var(--nabd-color-bg-sunken)',
              }}
            />
          ))}
        </div>
      ) : (
        <div role="radiogroup" aria-label={dayLabel} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--nabd-space-2xs)' }}>
          {slots.map((slot: Slot) => (
            <button
              key={slot.id}
              type="button"
              role="radio"
              aria-checked={value === slot.id}
              onClick={() => onChange?.(slot.id)}
              // An unavailable slot is disabled, never hidden: removing it would
              // make the day look emptier than it is.
              disabled={disabled || slot.available === false}
              data-testid={slot.id}
              style={{
                minHeight: 'var(--nabd-a11y-minTouchTarget)',
                minWidth: 72,
                paddingInline: 'var(--nabd-space-sm)',
                fontSize: 'var(--nabd-font-size-body)',
                fontVariantNumeric: 'tabular-nums',
                borderRadius: 'var(--nabd-radius-pill)',
                cursor: slot.available === false ? 'not-allowed' : 'pointer',
                border: `1px solid ${
                  value === slot.id ? 'var(--nabd-color-action-primary-bg)' : 'var(--nabd-color-border-default)'
                }`,
                background:
                  value === slot.id ? 'var(--nabd-color-action-primary-bg)' : 'var(--nabd-color-bg-surface)',
                color:
                  value === slot.id ? 'var(--nabd-color-action-primary-fg)' : 'var(--nabd-color-text-primary)',
                textDecoration: slot.available === false ? 'line-through' : 'none',
                opacity: slot.available === false ? 0.5 : 1,
              }}
            >
              {slot.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
