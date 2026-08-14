/**
 * DS SearchBar — Animated search input with debounce,
 * voice search trigger, filter button, and clear action.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  StyleProp,
  ViewStyle
} from 'react-native';
import { LocalizedTextInput as TextInput } from '@/components/LocalizedTextInput';
import { useApp } from '../../context/AppContext';
import { BorderRadius, Spacing } from '../tokens';
import { Icon } from '../Icon';
import { DSText } from './Text';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface DSSearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onSearch?: (text: string) => void;
  onClear?: () => void;
  onVoicePress?: () => void;
  onFilterPress?: () => void;
  placeholder?: string;
  debounceMs?: number;
  showVoice?: boolean;
  showFilter?: boolean;
  filterActive?: boolean;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  cancelable?: boolean;
  onCancel?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function DSSearchBar({
  value = '',
  onChangeText,
  onSearch,
  onClear,
  onVoicePress,
  onFilterPress,
  placeholder,
  debounceMs = 300,
  showVoice = false,
  showFilter = false,
  filterActive = false,
  autoFocus = false,
  style,
  cancelable = false,
  onCancel,
}: DSSearchBarProps) {
  const { colors, isRTL, lang } = useApp();
  const [isFocused, setIsFocused] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const cancelWidth = useRef(new Animated.Value(0)).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const defaultPlaceholder =
    placeholder ??
    (lang === 'ar'
      ? 'ابحث هنا...'
      : lang === 'ur'
      ? 'یہاں تلاش کریں...'
      : 'Search...');

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (cancelable) {
      setShowCancel(true);
      Animated.spring(cancelWidth, {
        toValue: 72,
        damping: 18,
        stiffness: 180,
        useNativeDriver: false,
      }).start();
    }
  }, [cancelable, cancelWidth]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (cancelable && !value) {
      Animated.timing(cancelWidth, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => setShowCancel(false));
    }
  }, [cancelable, cancelWidth, value]);

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText?.(text);
      if (debounceMs > 0 && onSearch) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => onSearch(text), debounceMs);
      }
    },
    [onChangeText, onSearch, debounceMs],
  );

  const handleClear = useCallback(() => {
    onChangeText?.('');
    onClear?.();
  }, [onChangeText, onClear]);

  const handleCancel = useCallback(() => {
    handleClear();
    Animated.timing(cancelWidth, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => setShowCancel(false));
    onCancel?.();
  }, [handleClear, cancelWidth, onCancel]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  return (
    <View style={[styles.wrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }, style]}>
      {/* Search field */}
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: isFocused ? colors.primary : 'transparent',
            borderWidth: isFocused ? 1.5 : 1,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            flex: 1,
          },
        ]}
      >
        {/* Search icon */}
        <Icon
          name="search"
          size={20}
          color={isFocused ? colors.primary : colors.textTertiary}
        />

        {/* Input */}
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          placeholder={defaultPlaceholder}
          placeholderTextColor={colors.textTertiary}
          returnKeyType="search"
          onSubmitEditing={() => onSearch?.(value)}
          autoFocus={autoFocus}
          onFocus={handleFocus}
          onBlur={handleBlur}
          textAlign={isRTL ? 'right' : 'left'}
          allowFontScaling
          accessible
          accessibilityLabel="حقل البحث"
          accessibilityHint="اكتب للبحث"
          style={[
            styles.input,
            { color: colors.textPrimary, flex: 1 },
          ]}
        />

        {/* Clear */}
        {value.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel="مسح"
          >
            <Icon name="close" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* Voice */}
        {showVoice && value.length === 0 && (
          <TouchableOpacity
            onPress={onVoicePress}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel="البحث الصوتي"
          >
            <Icon name="mic" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter button */}
      {showFilter && (
        <TouchableOpacity
          onPress={onFilterPress}
          style={[
            styles.filterBtn,
            {
              backgroundColor: filterActive ? colors.primary : colors.backgroundSecondary,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={filterActive ? 'فلاتر نشطة' : 'فتح الفلاتر'}
          accessibilityState={{ selected: filterActive }}
        >
          <Icon
            name="filter_list"
            size={20}
            color={filterActive ? '#fff' : colors.textSecondary}
          />
        </TouchableOpacity>
      )}

      {/* Cancel (animates in on focus) */}
      {showCancel && (
        <Animated.View style={{ width: cancelWidth, overflow: 'hidden' }}>
          <TouchableOpacity
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="إلغاء"
            style={styles.cancelBtn}
          >
            <DSText variant="labelMD" color={colors.primary} noScale>
              {lang === 'ar' ? 'إلغاء' : lang === 'ur' ? 'منسوخ' : 'Cancel'}
            </DSText>
          </TouchableOpacity>
        </Animated.View>
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
    gap: Spacing.sm,
  },
  field: {
    height: 48,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    fontSize: 15,
    height: '100%',
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
});
