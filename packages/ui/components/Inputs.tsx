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
import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX, type FillIconName } from '../icons/fill';

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

/*
 * The geometry and paints are in css/Inputs.css (components/components.css says
 * why they are classes): the field box (`nabd-field__control`, never below the
 * 44px touch target) and its invalid paint, the SearchField's inline, page and
 * focused boxes, the Stepper's 36 pill and the SlotPicker's pills.
 */

/** The field box, with its invalid paint when `bad`. */
function controlClass(bad: boolean) {
  return clsx('nabd-field__control', bad && 'nabd-field__control--invalid');
}

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
    <div className="nabd-field__messages">
      {hint ? (
        <span id={`${id}-hint`} className="nabd-field__hint">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} className="nabd-field__error">
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

  const shared = {
    id,
    value,
    placeholder,
    disabled: disabled || readOnly,
    readOnly,
    'aria-invalid': bad || undefined,
    'aria-describedby': describedBy(id, hint, error),
    'data-testid': testID,
  } as const;

  return (
    <div className="nabd-field">
      {label ? (
        <label htmlFor={id} className="nabd-field__label">
          {label}
        </label>
      ) : null}

      <div className="nabd-input__row">
        {startIcon ? (
          <span className="nabd-input__start">
            <Icon name={startIcon} size={20} tone="secondary" />
          </span>
        ) : null}

        {multiline ? (
          <textarea
            {...shared}
            onChange={(e) => onChange?.(e.target.value)}
            rows={rows}
            className={clsx(controlClass(bad), 'nabd-input__textarea', startIcon && 'nabd-input__control--start-icon')}
          />
        ) : (
          <input
            {...shared}
            onChange={(e) => onChange?.(e.target.value)}
            type={keyboardType === 'phone' ? 'tel' : keyboardType}
            inputMode={keyboardType === 'number' || keyboardType === 'decimal' ? 'numeric' : undefined}
            autoComplete={autoComplete}
            // css/Inputs.css: today this element takes the start-icon padding only
            className={clsx('nabd-input__native', startIcon && 'nabd-input__control--start-icon')}
          />
        )}

        {loading ? <span className="nabd-input__loading">…</span> : null}
        {endIcon && !loading ? (
          <span className="nabd-input__end">
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
    <div className="nabd-field">
      {label ? (
        <label htmlFor={id} className="nabd-field__label">
          {label}
        </label>
      ) : null}
      <div className="nabd-select">
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled || loading}
          aria-invalid={bad || undefined}
          aria-describedby={describedBy(id, hint, error)}
          data-testid={testID}
          className={clsx(controlClass(bad), 'nabd-select__control')}
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
        <span className="nabd-select__caret">
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
    <div className="nabd-field">
      {label ? (
        <label htmlFor={`${id}-0`} className="nabd-field__label">
          {label}
        </label>
      ) : null}
      <div className="nabd-otp" role="group">
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
            className={clsx(controlClass(Boolean(error)), 'nabd-otp__cell')}
          />
        ))}
      </div>
      <FieldMessages id={id} error={error} />
    </div>
  );
}

/**
 * SearchField — canvas/PharmacyHub and Consult (`inline`: 52 tall, radius 18,
 * hairline ring, 20px glyph, 15px text) and canvas/Search (`page`: a 50 tall pill
 * with the 2px ink border and soft ring of a focused field). Either variant takes
 * the ink border while focused. The clear and barcode buttons sit inside; the
 * filter is the 52px ink square beside the field.
 */
export function Search({
  value = '',
  onChange,
  placeholder = '',
  variant = 'inline',
  onFilterPress,
  filterLabel,
  onClear,
  clearLabel,
  onScanPress,
  scanLabel,
  label,
  loading = false,
  disabled = false,
  invalid = false,
  describedBy,
  testID,
}: SearchProps) {
  const id = React.useId();
  const [focused, setFocused] = React.useState(false);
  const page = variant === 'page';
  const active = page || focused;

  return (
    <div className="nabd-search">
      <label
        htmlFor={id}
        // the ink border while focused, and always on the page variant (css/Inputs.css)
        className={clsx(
          'nabd-search__field',
          page && 'nabd-search__field--page',
          active && 'nabd-search__field--active',
          disabled && 'nabd-search__field--disabled',
        )}
      >
        <Icon name="search" size={20} tone={active ? 'primary' : 'secondary'} />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label ?? (placeholder || 'Search')}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-busy={loading || undefined}
          data-testid={testID}
          className={clsx('nabd-search__input', page && 'nabd-search__input--page')}
        />
        {onClear && value ? (
          <button type="button" onClick={onClear} aria-label={clearLabel ?? 'Clear'} data-testid={testID ? `${testID}-clear` : undefined} className="nabd-search__inner">
            {/* canvas/Search: a 28px sunken disc with the cross, inside a 44 hit area */}
            <span className="nabd-search__clear-disc">
              <Icon name="close" size={14} tone="secondary" />
            </span>
          </button>
        ) : null}
        {onScanPress ? (
          <button type="button" onClick={onScanPress} aria-label={scanLabel ?? 'Scan'} data-testid={testID ? `${testID}-scan` : undefined} className="nabd-search__inner">
            <FillGlyph name="barcode" size={22} />
          </button>
        ) : null}
      </label>
      {onFilterPress ? (
        <button
          type="button"
          onClick={onFilterPress}
          // The filter control is icon-only, so its name has to be explicit —
          // the same rule IconButton enforces through its types.
          aria-label={filterLabel ?? 'Filter'}
          data-testid={testID ? `${testID}-filter` : undefined}
          className="nabd-search__filter"
        >
          <Icon name="sliders" size={20} tone="currentColor" />
        </button>
      ) : null}
    </div>
  );
}

function FillGlyph({ name, size }: { name: FillIconName; size: number }) {
  return (
    <svg width={size} height={size} viewBox={FILL_ICON_VIEWBOX} aria-hidden="true">
      <path d={FILL_ICON_PATHS[name]} fill="var(--nabd-color-icon-secondary)" />
    </svg>
  );
}

/**
 * canvas/Cart: a 36 tall pill in the canvas colour, two 30px surface discs and
 * the value at 14/700 between them. Each disc is a 44 hit area.
 */
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
  loading = false,
  disabled = false,
  invalid = false,
  describedBy,
  testID,
}: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const shown = format ? format(value) : String(value);
  const inert = disabled || loading;

  return (
    <div
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-busy={loading || undefined}
      data-testid={testID}
      className={clsx('nabd-stepper', disabled && 'nabd-stepper--disabled')}
    >
      <button
        type="button"
        onClick={() => onChange?.(clamp(value - step))}
        disabled={inert || value <= min}
        aria-label={decrementLabel}
        data-testid={testID ? `${testID}-dec` : undefined}
        className="nabd-stepper__button"
      >
        <span className="nabd-stepper__disc" aria-hidden>
          −
        </span>
      </button>
      <span aria-live="polite" className="nabd-stepper__value">
        {shown}
      </span>
      <button
        type="button"
        onClick={() => onChange?.(clamp(value + step))}
        disabled={inert || value >= max}
        aria-label={incrementLabel}
        data-testid={testID ? `${testID}-inc` : undefined}
        className="nabd-stepper__button"
      >
        <span className="nabd-stepper__disc" aria-hidden>
          +
        </span>
      </button>
    </div>
  );
}

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
    <div className="nabd-slot-picker" data-testid={testID}>
      <span className="nabd-slot-picker__day">{dayLabel}</span>
      {loading ? (
        <div className="nabd-slot-picker__row" aria-busy>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="nabd-slot-picker__skeleton" />
          ))}
        </div>
      ) : (
        <div role="radiogroup" aria-label={dayLabel} className="nabd-slot-picker__row">
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
              className={clsx(
                'nabd-slot-picker__slot',
                value === slot.id && 'nabd-slot-picker__slot--selected',
                slot.available === false && 'nabd-slot-picker__slot--unavailable',
              )}
            >
              {slot.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
