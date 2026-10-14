import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import type {
  InputProps,
  OtpProps,
  SearchProps,
  SelectProps,
  Slot,
  SlotPickerProps,
  StepperProps,
} from '../../../ui/components/contract';
import Svg, { Path } from 'react-native-svg';

import { tokens, type ThemeName } from '../../../design-tokens/dist/ts/tokens';
import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX } from '../../../ui/icons/fill';
import { Icon } from '../Icon';

/**
 * The form controls — 12.A7, React Native.
 *
 * Same props as the web renderer, and the same three rules it keeps:
 *
 *   1. the label is a real element, never a placeholder that vanishes on the
 *      first keystroke;
 *   2. `error` and `hint` are announced, not just painted;
 *   3. nothing is shorter than 44px.
 *
 * Two things React Native does not have and the web version had to invent:
 * `Select` is a list of pressables inside a bottom area rather than a `<select>`,
 * and `Otp` boxes are real `TextInput`s so the platform keyboard and paste
 * behaviour come for free — which is the same reason the web version spreads a
 * pasted code across its boxes.
 */

const CONTROL: TextStyle = {
  minHeight: 44,
  paddingHorizontal: 20,
  paddingVertical: 12,
  fontSize: 15,
  color: '#0B1B2B',
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#D5DBE4',
  borderRadius: 12,
};

const CONTROL_INVALID: TextStyle = {
  ...CONTROL,
  borderColor: '#D42A38',
  backgroundColor: '#FDECEE',
};

function Field({
  label,
  hint,
  error,
  children,
  nativeID,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  nativeID?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      {label ? (
        <Text nativeID={nativeID ? `${nativeID}-label` : undefined} style={{ fontSize: 12, color: '#5B6673' }}>
          {label}
        </Text>
      ) : null}
      {children}
      {hint ? <Text style={{ fontSize: 11, color: '#5B6673' }}>{hint}</Text> : null}
      {error ? (
        <Text accessibilityRole="alert" style={{ fontSize: 11, color: '#B3202C' }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export interface NativeInputProps extends InputProps {
  theme?: 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
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
  testID,
  theme = 'light',
}: NativeInputProps) {
  const bad = invalid || Boolean(error);
  const dark = theme === 'dark';

  return (
    <Field label={label} hint={hint} error={error} nativeID={testID}>
      <View style={{ position: 'relative', justifyContent: 'center' }}>
        {startIcon ? (
          <View style={{ position: 'absolute', insetInlineStart: 12 }}>
            <Icon name={startIcon} size={20} theme={theme} tone="secondary" />
          </View>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={dark ? '#8A97A6' : '#8A94A0'}
          editable={!disabled && !readOnly && !loading}
          multiline={multiline}
          numberOfLines={multiline ? rows : 1}
          // `textContentType` is the native spelling of autocomplete; the
          // contract stays platform-free and the mapping happens here.
          textContentType={autoComplete === 'email' ? 'emailAddress' : autoComplete === 'tel' ? 'telephoneNumber' : 'none'}
          keyboardType={
            keyboardType === 'phone' ? 'phone-pad'
            : keyboardType === 'email' ? 'email-address'
            : keyboardType === 'decimal' ? 'decimal-pad'
            : keyboardType === 'number' ? 'number-pad'
            : 'default'
          }
          accessibilityLabel={label ?? placeholder}
          accessibilityHint={hint}
          accessibilityState={{ disabled: disabled || readOnly }}
          testID={testID}
          style={[
            bad ? CONTROL_INVALID : CONTROL,
            multiline ? { minHeight: rows * 24, textAlignVertical: 'top' } : null,
            { color: dark ? '#F5F5F7' : '#0B1B2B', backgroundColor: dark ? '#12263A' : '#FFFFFF' },
            startIcon ? { paddingInlineStart: 44 } : null,
            endIcon || loading ? { paddingInlineEnd: 44 } : null,
          ]}
        />
        {loading ? (
          <View style={{ position: 'absolute', insetInlineEnd: 12 }}>
            <ActivityIndicator size="small" />
          </View>
        ) : endIcon ? (
          <View style={{ position: 'absolute', insetInlineEnd: 12 }}>
            <Icon name={endIcon} size={20} theme={theme} tone="secondary" />
          </View>
        ) : null}
      </View>
    </Field>
  );
}

export interface NativeSelectProps extends SelectProps {
  theme?: 'light' | 'dark';
}

/**
 * A native Select cannot be a `<select>`, so it is a labelled radio GROUP. That
 * is a fair trade: it gets platform scrolling and platform touch handling, and it
 * keeps the a11y contract by exposing the choices as radios rather than as a
 * closed list nobody can read.
 */
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
  testID,
  theme = 'light',
}: NativeSelectProps) {
  const dark = theme === 'dark';

  return (
    <Field label={label} hint={hint} error={error} nativeID={testID}>
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={label ?? placeholder}>
        {loading ? <ActivityIndicator accessibilityLabel={label} /> : null}
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: disabled || o.disabled }}
              accessibilityLabel={o.label}
              disabled={disabled || o.disabled}
              onPress={() => onChange?.(o.value)}
              testID={testID ? `${testID}-${o.value}` : undefined}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                minHeight: 44,
                opacity: disabled || o.disabled ? 0.5 : 1,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: selected ? '#D42A38' : dark ? '#6E8BFF' : '#D5DBE4',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#D42A38' }} /> : null}
              </View>
              <Text style={{ fontSize: 15, color: dark ? '#F5F5F7' : '#0B1B2B' }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}

export function Otp({ value = '', length, label, error, onChange, onComplete, disabled = false, testID, theme = 'light' }: OtpProps & { theme?: 'light' | 'dark' }) {
  const digits = value.padEnd(length, ' ').slice(0, length).split('');
  const dark = theme === 'dark';
  const refs = React.useRef<Array<TextInput | null>>([]);

  return (
    <Field label={label} error={error} nativeID={testID}>
      <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="none">
        {Array.from({ length }).map((_, i) => (
          <TextInput
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={digits[i] === ' ' ? '' : digits[i]}
            onChangeText={(t) => {
              const next = t.replace(/\D/g, '').slice(-1);
              const merged = digits.map((d, j) => (j === i ? next : d)).join('').replace(/ /g, '');
              onChange?.(merged);
              // Auto-submit only when the code is actually complete.
              if (merged.length === length) onComplete?.(merged);
              if (next && i < length - 1) refs.current[i + 1]?.focus();
            }}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            }}
            keyboardType="number-pad"
            textContentType={i === 0 ? 'oneTimeCode' : 'none'}
            maxLength={1}
            editable={!disabled}
            accessibilityLabel={`${label ?? 'Code'} ${i + 1}`}
            testID={testID ? `${testID}-${i}` : undefined}
            style={[
              error ? CONTROL_INVALID : CONTROL,
              {
                width: 48,
                minHeight: 56,
                textAlign: 'center',
                fontSize: 20,
                color: dark ? '#F5F5F7' : '#0B1B2B',
                backgroundColor: dark ? '#12263A' : '#FFFFFF',
              },
            ]}
          />
        ))}
      </View>
    </Field>
  );
}

/**
 * SearchField — canvas/PharmacyHub and Consult (`inline`: 52 tall, radius 18,
 * hairline ring) and canvas/Search (`page`: a 50 tall pill with the 2px ink
 * border and soft ring of a focused field). Either variant takes the ink border
 * while focused. Clear and barcode sit inside; the filter is the 52pt ink square
 * beside the field. Same props and geometry as the web renderer.
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
  testID,
  theme = 'light',
}: SearchProps & { theme?: ThemeName }) {
  const t = tokens(theme);
  const c = t.color;
  const [focused, setFocused] = React.useState(false);
  const page = variant === 'page';
  const active = page || focused;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View
        style={{
          flex: 1,
          minWidth: 0,
          height: page ? 50 : 52,
          borderRadius: page ? 25 : 18,
          backgroundColor: c.bg.surface,
          borderWidth: active ? 2 : 1,
          borderColor: active ? c.text.primary : c.border.onGlass,
          boxShadow: active ? `0 0 0 4px ${c.glass.scrim}` : undefined,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: active ? 13 : 14,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Icon name="search" size={20} theme={theme} tone={active ? 'primary' : 'secondary'} />
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={c.text.secondary}
          editable={!disabled}
          accessibilityLabel={label ?? (placeholder || 'Search')}
          accessibilityState={{ disabled, busy: loading }}
          aria-invalid={invalid || undefined}
          testID={testID}
          style={{ flex: 1, minWidth: 0, height: '100%', padding: 0, fontSize: page ? 16 : 15, fontFamily: 'ReadexPro-400', color: c.text.primary }}
        />
        {onClear && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={clearLabel ?? 'Clear'}
            onPress={onClear}
            hitSlop={8}
            testID={testID ? `${testID}-clear` : undefined}
            style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.bg.sunken, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="close" size={14} theme={theme} tone="secondary" />
          </Pressable>
        ) : null}
        {onScanPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={scanLabel ?? 'Scan'}
            onPress={onScanPress}
            hitSlop={4}
            testID={testID ? `${testID}-scan` : undefined}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Svg width={22} height={22} viewBox={FILL_ICON_VIEWBOX}>
              <Path d={FILL_ICON_PATHS.barcode} fill={c.icon.secondary} />
            </Svg>
          </Pressable>
        ) : null}
      </View>
      {onFilterPress ? (
        <Pressable
          accessibilityRole="button"
          // Icon-only, so the name is explicit — the same rule IconButton
          // enforces through its types.
          accessibilityLabel={filterLabel ?? 'Filter'}
          onPress={onFilterPress}
          testID={testID ? `${testID}-filter` : undefined}
          style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: c.action.selected.bg, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="sliders" size={20} theme={theme} color={c.action.selected.fg} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * canvas/Cart: a 36 tall pill in the canvas colour, two 30pt elevated discs and
 * the value at 14/700 between them. Each disc reaches 44 with hitSlop.
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
  testID,
  theme = 'light',
}: StepperProps & { theme?: ThemeName }) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const shown = format ? format(value) : String(value);
  const c = tokens(theme).color;
  const inert = disabled || loading;
  const disc = { width: 30, height: 30, borderRadius: 15, backgroundColor: c.bg.elevated, alignItems: 'center' as const, justifyContent: 'center' as const };

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={label}
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        height: 36,
        paddingHorizontal: 3,
        borderRadius: 18,
        backgroundColor: c.bg.canvas,
        alignSelf: 'flex-start',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={decrementLabel}
        accessibilityState={{ disabled: inert || value <= min }}
        disabled={inert || value <= min}
        onPress={() => onChange?.(clamp(value - step))}
        hitSlop={7}
        testID={testID ? `${testID}-dec` : undefined}
        style={disc}
      >
        <Text style={{ fontSize: 16, color: c.text.primary }}>−</Text>
      </Pressable>
      <Text
        accessibilityLiveRegion="polite"
        style={{ minWidth: 20, textAlign: 'center', fontSize: 14, fontFamily: 'ReadexPro-700', color: c.text.primary }}
      >
        {shown}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
        accessibilityState={{ disabled: inert || value >= max }}
        disabled={inert || value >= max}
        onPress={() => onChange?.(clamp(value + step))}
        hitSlop={7}
        testID={testID ? `${testID}-inc` : undefined}
        style={disc}
      >
        <Text style={{ fontSize: 16, color: c.text.primary }}>+</Text>
      </Pressable>
    </View>
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
  theme = 'light',
}: SlotPickerProps & { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  return (
    <View style={{ gap: 8 }} testID={testID}>
      <Text style={{ fontSize: 12, color: '#5B6673' }}>{dayLabel}</Text>
      {loading ? (
        <View accessibilityState={{ busy: true }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={{ width: 72, height: 44, borderRadius: 9999, backgroundColor: dark ? '#12263A' : '#F4F6F8', marginInlineEnd: 8 }} />
            ))}
          </ScrollView>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" accessibilityLabel={dayLabel}>
          {slots.map((slot: Slot) => {
            const selected = slot.id === value;
            const unavailable = slot.available === false;
            return (
              <Pressable
                key={slot.id}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: disabled || unavailable }}
                accessibilityLabel={slot.label}
                disabled={disabled || unavailable}
                onPress={() => onChange?.(slot.id)}
                testID={slot.id}
                style={{
                  minHeight: 44,
                  minWidth: 72,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginInlineEnd: 8,
                  borderRadius: 9999,
                  borderWidth: 1,
                  borderColor: selected ? '#D42A38' : dark ? '#6E8BFF' : '#D5DBE4',
                  backgroundColor: selected ? '#D42A38' : dark ? '#12263A' : '#FFFFFF',
                  opacity: unavailable ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontVariant: ['tabular-nums'],
                    color: selected ? '#FFFFFF' : dark ? '#F5F5F7' : '#0B1B2B',
                    textDecorationLine: unavailable ? 'line-through' : 'none',
                  }}
                >
                  {slot.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
