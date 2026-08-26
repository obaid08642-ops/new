/**
 * DS Input — All input variants with validation states,
 * icons, password toggle, RTL support, and accessibility.
 */
import React, { useState, useRef, useCallback, forwardRef } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet,
  StyleProp, ViewStyle, TextInputProps, Animated,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { Spacing, BorderRadius } from '../tokens';
import { DSText } from './Text';
import { Icon, IconName } from '../Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type InputVariant = 'default' | 'filled' | 'outline' | 'underline';
export type InputState = 'default' | 'focused' | 'error' | 'success' | 'disabled';

export interface DSInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  variant?: InputVariant;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  required?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const DSInput = forwardRef<TextInput, DSInputProps>(function DSInput(
  {
    label,
    placeholder,
    value,
    onChangeText,
    variant = 'default',
    leftIcon,
    rightIcon,
    onRightIconPress,
    error,
    hint,
    disabled = false,
    isPassword = false,
    containerStyle,
    required = false,
    ...textInputProps
  },
  ref,
) {
  const { colors, isRTL } = useApp();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const inputState: InputState = disabled
    ? 'disabled'
    : error
    ? 'error'
    : isFocused
    ? 'focused'
    : 'default';

  const borderColor = getBorderColor(inputState, colors);
  const bgColor = variant === 'filled' ? colors.backgroundSecondary : colors.surface;

  const togglePassword = useCallback(() => setShowPassword((v) => !v), []);

  const resolvedRightIcon: IconName | undefined = isPassword
    ? showPassword ? 'visibility_off' : 'visibility'
    : rightIcon;

  const handleRightIconPress = isPassword ? togglePassword : onRightIconPress;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* Label */}
      {label && (
        <View style={[styles.labelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <DSText variant="labelMD" color={colors.textSecondary}>
            {label}
          </DSText>
          {required && (
            <DSText variant="labelMD" color={colors.error} style={{ marginHorizontal: 2 }}>
              *
            </DSText>
          )}
        </View>
      )}

      {/* Input Container */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: bgColor,
            borderColor,
            borderWidth: isFocused ? 2 : 1.5,
            borderBottomWidth: variant === 'underline' ? (isFocused ? 2 : 1.5) : undefined,
            borderTopWidth: variant === 'underline' ? 0 : undefined,
            borderLeftWidth: variant === 'underline' ? 0 : undefined,
            borderRightWidth: variant === 'underline' ? 0 : undefined,
            borderRadius: variant === 'underline' ? 0 : BorderRadius.lg,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        {leftIcon && (
          <View style={styles.iconWrapper}>
            <Icon
              name={leftIcon}
              size={20}
              color={isFocused ? colors.primary : colors.textTertiary}
            />
          </View>
        )}

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          editable={!disabled}
          secureTextEntry={isPassword && !showPassword}
          textAlign={isRTL ? 'right' : 'left'}
          allowFontScaling
          maxFontSizeMultiplier={1.3}
          accessible
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.textInput,
            {
              color: colors.textPrimary,
              flex: 1,
            },
          ]}
          {...textInputProps}
        />

        {resolvedRightIcon && (
          <TouchableOpacity
            onPress={handleRightIconPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isPassword ? (showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور') : undefined}
            style={styles.iconWrapper}
          >
            <Icon
              name={resolvedRightIcon}
              size={20}
              color={isFocused ? colors.primary : colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Error / Hint */}
      {error ? (
        <View style={[styles.feedbackRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Icon name="error_outline" size={13} color={colors.error} />
          <DSText
            variant="caption"
            color={colors.error}
            style={{ marginHorizontal: 4 }}
          >
            {error}
          </DSText>
        </View>
      ) : hint ? (
        <DSText variant="caption" color={colors.textTertiary} style={styles.hint}>
          {hint}
        </DSText>
      ) : null}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getBorderColor(state: InputState, colors: any): string {
  switch (state) {
    case 'focused':  return colors.primary;
    case 'error':    return colors.error;
    case 'success':  return colors.success;
    case 'disabled': return colors.border;
    default:         return colors.border;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.sm,
  },
  labelRow: {
    alignItems: 'center',
    gap: 2,
  },
  inputContainer: {
    height: 52,
    alignItems: 'center',
    overflow: 'hidden',
  },
  textInput: {
    fontSize: 15,
    fontWeight: '400',
    paddingHorizontal: Spacing.md,
    height: '100%',
  },
  iconWrapper: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackRow: {
    alignItems: 'center',
    gap: 4,
  },
  hint: {
    marginTop: 2,
  },
});
