/**
 * DS OTPInput — Premium 4/5/6 digit OTP input with auto-advance,
 * paste support, cursor visibility, error state, and RTL.
 */
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  StyleProp,
  ViewStyle,
  Clipboard,
  Platform
} from 'react-native';
import { LocalizedTextInput as TextInput } from '@/components/LocalizedTextInput';
import { useApp } from '../../context/AppContext';
import { BorderRadius, Spacing, Animation } from '../tokens';
import { DSText } from './Text';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface DSOTPInputProps {
  length?: 4 | 5 | 6;
  value: string;
  onChangeText: (code: string) => void;
  onComplete?: (code: string) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function DSOTPInput({
  length = 6,
  value,
  onChangeText,
  onComplete,
  error,
  disabled = false,
  autoFocus = true,
  style,
}: DSOTPInputProps) {
  const { colors } = useApp();
  const refs = useRef<Array<TextInput | null>>(Array(length).fill(null));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(autoFocus ? 0 : null);

  const digits = value.split('').slice(0, length);
  while (digits.length < length) digits.push('');

  // Focus first empty on mount
  useEffect(() => {
    if (autoFocus) {
      const firstEmpty = digits.findIndex((d) => d === '');
      refs.current[firstEmpty === -1 ? length - 1 : firstEmpty]?.focus();
    }
  }, []);

  const handleChange = useCallback(
    (text: string, index: number) => {
      // Handle paste
      if (text.length > 1) {
        const cleaned = text.replace(/\D/g, '').slice(0, length);
        onChangeText(cleaned);
        if (cleaned.length === length) {
          onComplete?.(cleaned);
          refs.current[length - 1]?.blur();
        } else {
          refs.current[cleaned.length]?.focus();
        }
        return;
      }

      const digit = text.replace(/\D/g, '');
      const newDigits = [...digits];
      newDigits[index] = digit;
      const newValue = newDigits.join('');
      onChangeText(newValue);

      if (digit && index < length - 1) {
        refs.current[index + 1]?.focus();
      }

      if (newValue.replace(/\s/g, '').length === length) {
        onComplete?.(newValue);
        refs.current[length - 1]?.blur();
      }
    },
    [digits, length, onChangeText, onComplete],
  );

  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
      if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
        refs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChangeText(newDigits.join(''));
      }
    },
    [digits, onChangeText],
  );

  return (
    <View style={[styles.wrapper, style]}>
      {/* Digit cells */}
      <View style={styles.row}>
        {Array.from({ length }).map((_, index) => {
          const isFocused = focusedIndex === index;
          const hasValue = Boolean(digits[index]);
          const isError = Boolean(error);

          const borderColor = isError
            ? colors.error
            : isFocused
            ? colors.primary
            : colors.border;

          return (
            <TextInput
              key={index}
              ref={(r) => { refs.current[index] = r; }}
              value={digits[index]}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              keyboardType="number-pad"
              maxLength={Platform.OS === 'android' ? 2 : 1}
              selectTextOnFocus
              editable={!disabled}
              accessible
              accessibilityLabel={`رقم OTP ${index + 1} من ${length}`}
              style={[
                styles.cell,
                {
                  borderColor,
                  backgroundColor: isFocused
                    ? colors.primarySurface
                    : colors.surface,
                  color: colors.textPrimary,
                  fontSize: 22,
                  fontWeight: '700',
                  borderWidth: isFocused ? 2 : 1.5,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Error */}
      {error && (
        <DSText
          variant="caption"
          color={colors.error}
          align="center"
          style={styles.error}
        >
          {error}
        </DSText>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cell: {
    width: 52,
    height: 60,
    borderRadius: BorderRadius.lg,
    textAlign: 'center',
    includeFontPadding: false,
  },
  error: {
    marginTop: 4,
  },
});
