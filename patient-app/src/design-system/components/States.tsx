/**
 * DS EmptyState + ErrorState — Premium states for empty data
 * and error conditions. No emojis — only SVG icons.
 */
import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useApp } from '../../context/AppContext';
import { Spacing, BorderRadius } from '../tokens';
import { DSText } from './Text';
import { DSButton } from './Button';
import { Icon, IconName } from '../Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────────────────────
export interface DSEmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  size?: 'compact' | 'full';
  style?: StyleProp<ViewStyle>;
}

export function DSEmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  size = 'full',
  style,
}: DSEmptyStateProps) {
  const { colors } = useApp();
  const isCompact = size === 'compact';

  return (
    <View
      style={[styles.container, isCompact && styles.containerCompact, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${description ?? ''}`}
    >
      {/* Icon container */}
      <View
        style={[
          styles.iconContainer,
          isCompact && styles.iconContainerCompact,
          { backgroundColor: colors.primarySurface },
        ]}
      >
        <Icon
          name={icon}
          size={isCompact ? 28 : 40}
          color={colors.primary}
        />
      </View>

      {/* Title */}
      <DSText
        variant={isCompact ? 'h5' : 'h4'}
        color={colors.textPrimary}
        align="center"
        style={styles.title}
      >
        {title}
      </DSText>

      {/* Description */}
      {description && (
        <DSText
          variant="bodySM"
          color={colors.textSecondary}
          align="center"
          style={styles.description}
        >
          {description}
        </DSText>
      )}

      {/* Actions */}
      {actionLabel && onAction && (
        <View style={styles.actions}>
          <DSButton
            label={actionLabel}
            onPress={onAction}
            variant="primary"
            size={isCompact ? 'sm' : 'md'}
            fullWidth
          />
          {secondaryActionLabel && onSecondaryAction && (
            <DSButton
              label={secondaryActionLabel}
              onPress={onSecondaryAction}
              variant="ghost"
              size={isCompact ? 'sm' : 'md'}
              fullWidth
            />
          )}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Error State
// ─────────────────────────────────────────────────────────────────────────────
export type ErrorStateType = 'generic' | 'network' | 'not_found' | 'permission' | 'server';

export interface DSErrorStateProps {
  type?: ErrorStateType;
  title?: string;
  description?: string;
  onRetry?: () => void;
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
}

const ERROR_CONFIG: Record<
  ErrorStateType,
  { icon: IconName; defaultTitle: string; defaultDesc: string }
> = {
  generic:    { icon: 'error_outline', defaultTitle: 'حدث خطأ ما', defaultDesc: 'يرجى المحاولة مرة أخرى' },
  network:    { icon: 'wifi_off', defaultTitle: 'لا يوجد اتصال', defaultDesc: 'تحقق من اتصالك بالإنترنت وأعد المحاولة' },
  not_found:  { icon: 'search_off', defaultTitle: 'لم يتم العثور على المحتوى', defaultDesc: 'الصفحة التي تبحث عنها غير موجودة' },
  permission: { icon: 'lock', defaultTitle: 'غير مصرح لك', defaultDesc: 'ليس لديك صلاحية الوصول لهذا المحتوى' },
  server:     { icon: 'dns', defaultTitle: 'خطأ في الخادم', defaultDesc: 'نعتذر، يرجى المحاولة بعد قليل' },
};

export function DSErrorState({
  type = 'generic',
  title,
  description,
  onRetry,
  onBack,
  style,
}: DSErrorStateProps) {
  const { colors } = useApp();
  const config = ERROR_CONFIG[type];

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={title ?? config.defaultTitle}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: '#FEF2F2' }]}>
        <Icon name={config.icon} size={40} color={colors.error} />
      </View>

      {/* Title */}
      <DSText
        variant="h4"
        color={colors.textPrimary}
        align="center"
        style={styles.title}
      >
        {title ?? config.defaultTitle}
      </DSText>

      {/* Description */}
      <DSText
        variant="bodySM"
        color={colors.textSecondary}
        align="center"
        style={styles.description}
      >
        {description ?? config.defaultDesc}
      </DSText>

      {/* Actions */}
      <View style={styles.actions}>
        {onRetry && (
          <DSButton
            label="أعد المحاولة"
            onPress={onRetry}
            variant="primary"
            icon="refresh"
            iconPosition="left"
            fullWidth
          />
        )}
        {onBack && (
          <DSButton
            label="العودة"
            onPress={onBack}
            variant="ghost"
            fullWidth
          />
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['3xl'],
  },
  containerCompact: {
    paddingVertical: Spacing.xl,
    flex: 0,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainerCompact: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  description: {
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
});
