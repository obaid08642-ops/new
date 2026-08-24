/**
 * DS Toast + Snackbar — Lightweight notification system.
 * Toast: auto-dismiss. Snackbar: with action button.
 * Global singleton accessible from anywhere via ToastService.
 */
import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import {
  View, StyleSheet, Animated, TouchableOpacity,
  Dimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { BorderRadius, Spacing, Shadows, Animation } from '../tokens';
import { DSText } from './Text';
import { Icon, IconName } from '../Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top' | 'bottom';

export interface ToastConfig {
  id?: string;
  type?: ToastType;
  message: string;
  title?: string;
  duration?: number;
  position?: ToastPosition;
  action?: { label: string; onPress: () => void };
  onDismiss?: () => void;
}

interface ToastState extends ToastConfig {
  id: string;
  visible: boolean;
  translateY: Animated.Value;
  opacity: Animated.Value;
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast config
// ─────────────────────────────────────────────────────────────────────────────
const TOAST_ICONS: Record<ToastType, IconName> = {
  success: 'check_circle',
  error:   'error_outline',
  warning: 'warning',
  info:    'info_outline',
};

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
interface ToastContextValue {
  show: (config: ToastConfig) => void;
  hide: (id?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside <ToastProvider>');
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const show = useCallback((config: ToastConfig) => {
    const id = config.id ?? String(Date.now());
    const translateY = new Animated.Value(config.position === 'bottom' ? 80 : -80);
    const opacity = new Animated.Value(0);
    const duration = config.duration ?? 3500;

    const toast: ToastState = {
      ...config,
      id,
      visible: true,
      type: config.type ?? 'info',
      position: config.position ?? 'top',
      translateY,
      opacity,
    };

    setToasts((prev) => [...prev.slice(-2), toast]); // max 3 toasts

    // Animate in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    setTimeout(() => dismiss(id), duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      if (!toast) return prev;

      Animated.parallel([
        Animated.timing(toast.translateY, {
          toValue: toast.position === 'bottom' ? 80 : -80,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(toast.opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToasts((p) => p.filter((t) => t.id !== id));
        toast.onDismiss?.();
      });

      return prev;
    });
  }, []);

  const hide = useCallback((id?: string) => {
    if (id) {
      dismiss(id);
    } else {
      toasts.forEach((t) => dismiss(t.id));
    }
  }, [toasts, dismiss]);

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      <ToastLayer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast Layer — rendered over everything
// ─────────────────────────────────────────────────────────────────────────────
function ToastLayer({
  toasts,
  onDismiss,
}: {
  toasts: ToastState[];
  onDismiss: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const topToasts = toasts.filter((t) => t.position !== 'bottom');
  const bottomToasts = toasts.filter((t) => t.position === 'bottom');

  return (
    <>
      {/* Top toasts */}
      <View
        style={[styles.layer, { top: insets.top + Spacing.md, left: 0, right: 0 }]}
        pointerEvents="box-none"
      >
        {topToasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </View>

      {/* Bottom toasts */}
      <View
        style={[styles.layer, { bottom: insets.bottom + Spacing.xl, left: 0, right: 0 }]}
        pointerEvents="box-none"
      >
        {bottomToasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </View>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Toast
// ─────────────────────────────────────────────────────────────────────────────
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: (id: string) => void;
}) {
  const { colors, isRTL } = useApp();
  const icon = TOAST_ICONS[toast.type ?? 'info'];
  const toastColors = getToastColors(toast.type ?? 'info', colors);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.surface,
          borderLeftWidth: isRTL ? 0 : 4,
          borderRightWidth: isRTL ? 4 : 0,
          borderLeftColor: toastColors.accent,
          borderRightColor: toastColors.accent,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          transform: [{ translateY: toast.translateY }],
          opacity: toast.opacity,
          ...Shadows.lg,
        },
      ]}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`${toast.title ? toast.title + '. ' : ''}${toast.message}`}
    >
      {/* Icon */}
      <View style={[styles.toastIcon, { backgroundColor: toastColors.bg }]}>
        <Icon name={icon} size={18} color={toastColors.accent} />
      </View>

      {/* Text */}
      <View style={styles.toastContent}>
        {toast.title && (
          <DSText variant="labelMD" color={colors.textPrimary} noScale>
            {toast.title}
          </DSText>
        )}
        <DSText variant="bodySM" color={colors.textSecondary} noScale>
          {toast.message}
        </DSText>
        {toast.action && (
          <TouchableOpacity onPress={toast.action.onPress} hitSlop={{ top: 8, bottom: 8 }}>
            <DSText variant="labelSM" color={toastColors.accent} noScale>
              {toast.action.label}
            </DSText>
          </TouchableOpacity>
        )}
      </View>

      {/* Dismiss */}
      <TouchableOpacity
        onPress={() => onDismiss(toast.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="إغلاق"
      >
        <Icon name="close" size={16} color={colors.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getToastColors(type: ToastType, colors: any) {
  switch (type) {
    case 'success': return { accent: colors.success, bg: '#EBF6E9' };
    case 'error':   return { accent: colors.error,   bg: '#FEF2F2' };
    case 'warning': return { accent: colors.warning,  bg: '#FFF7E6' };
    case 'info':    return { accent: colors.primary,  bg: '#DEF5F9' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    zIndex: 9999,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  toast: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 52,
  },
  toastIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastContent: {
    flex: 1,
    gap: 2,
  },
});
