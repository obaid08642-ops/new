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

export function Search({
  value = '',
  onChange,
  placeholder = '',
  onFilterPress,
  filterLabel,
  loading = false,
  disabled = false,
  testID,
  theme = 'light',
}: SearchProps & { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  return (
    <View style={{ position: 'relative', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', insetInlineStart: 12 }}>
        <Icon name="search" size={20} theme={theme} tone="secondary" />
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={dark ? '#8A97A6' : '#8A94A0'}
        editable={!disabled}
        accessibilityLabel={placeholder || 'Search'}
        testID={testID}
        style={[
          CONTROL,
          {
            borderRadius: 9999,
            color: dark ? '#F5F5F7' : '#0B1B2B',
            backgroundColor: dark ? '#12263A' : '#F4F6F8',
            paddingInlineStart: 44,
            paddingInlineEnd: onFilterPress ? 56 : 20,
          },
        ]}
      />
      {onFilterPress ? (
        <Pressable
          accessibilityRole="button"
          // Icon-only, so the name is explicit — the same rule IconButton
          // enforces through its types.
          accessibilityLabel={filterLabel ?? 'Filter'}
          onPress={onFilterPress}
          testID={testID ? `${testID}-filter` : undefined}
          style={{ position: 'absolute', insetInlineEnd: 0, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="filter" size={20} theme={theme} tone="secondary" />
        </Pressable>
      ) : null}
    </View>
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
  theme = 'light',
}: StepperProps & { theme?: 'light' | 'dark' }) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const shown = format ? format(value) : String(value);
  const dark = theme === 'dark';

  return (
    <View
      accessibilityRole="none"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: dark ? '#6E8BFF' : '#D5DBE4',
        borderRadius: 9999,
        overflow: 'hidden',
        alignSelf: 'flex-start',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={decrementLabel}
        accessibilityState={{ disabled: disabled || value <= min }}
        disabled={disabled || value <= min}
        onPress={() => onChange?.(clamp(value - step))}
        style={{ width: 48, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="minus" size={18} theme={theme} />
      </Pressable>
      <Text
        accessibilityLiveRegion="polite"
        accessibilityLabel={label}
        style={{ minWidth: 40, textAlign: 'center', fontSize: 15, fontWeight: '700', color: dark ? '#F5F5F7' : '#0B1B2B' }}
      >
        {shown}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
        accessibilityState={{ disabled: disabled || value >= max }}
        disabled={disabled || value >= max}
        onPress={() => onChange?.(clamp(value + step))}
        style={{ width: 48, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="plus" size={18} theme={theme} />
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
