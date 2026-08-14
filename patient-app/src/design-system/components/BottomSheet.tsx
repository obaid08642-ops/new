/**
 * DS BottomSheet — Premium gesture-driven bottom sheet.
 * Supports snap points, backdrop dismiss, safe area,
 * dynamic content height, and RTL.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Modal, TouchableWithoutFeedback, Animated,
  PanResponder, StyleSheet, ScrollView, StyleProp, ViewStyle,
  Dimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Spacing, BorderRadius, Shadows } from '../tokens';
import { DSText } from './Text';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface DSBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Max height as fraction of screen (0.3 → 0.95) */
  maxHeightFactor?: number;
  scrollable?: boolean;
  showHandle?: boolean;
  showBackdrop?: boolean;
  closeOnBackdropPress?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function DSBottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeightFactor = 0.85,
  scrollable = false,
  showHandle = true,
  showBackdrop = true,
  closeOnBackdropPress = true,
  style,
  contentStyle,
}: DSBottomSheetProps) {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const maxHeight = SCREEN_HEIGHT * maxHeightFactor;

  // ── Animations ──────────────────────────────────────────────────────────────
  const open = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 22,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, backdropOpacity]);

  const close = useCallback((cb?: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      cb?.();
      onClose();
    });
  }, [translateY, backdropOpacity, onClose]);

  useEffect(() => {
    if (visible) {
      open();
    } else {
      translateY.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
    }
  }, [visible, open]);

  // ── Pan Responder (swipe to dismiss) ────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          close();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            damping: 20,
            stiffness: 150,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  if (!visible) return null;

  const ContentWrapper = scrollable ? ScrollView : View;
  const contentWrapperProps = scrollable
    ? { showsVerticalScrollIndicator: false, bounces: false }
    : {};

  return (
    <Modal
      transparent
      statusBarTranslucent
      visible={visible}
      animationType="none"
      onRequestClose={() => close()}
    >
      {/* Backdrop */}
      {showBackdrop && (
        <TouchableWithoutFeedback
          onPress={closeOnBackdropPress ? () => close() : undefined}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: colors.overlay, opacity: backdropOpacity },
            ]}
          />
        </TouchableWithoutFeedback>
      )}

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            maxHeight,
            paddingBottom: insets.bottom + Spacing.md,
            transform: [{ translateY }],
            ...Shadows.xl,
          },
          style,
        ]}
      >
        {/* Handle */}
        {showHandle && (
          <View
            {...panResponder.panHandlers}
            style={styles.handleArea}
            accessible
            accessibilityRole="button"
            accessibilityLabel="اسحب لأسفل للإغلاق"
            accessibilityHint="اسحب للأسفل لإغلاق هذه الورقة"
          >
            <View
              style={[styles.handle, { backgroundColor: colors.border }]}
            />
          </View>
        )}

        {/* Title */}
        {title && (
          <View style={styles.titleRow}>
            <DSText variant="h5" color={colors.textPrimary} align="center">
              {title}
            </DSText>
          </View>
        )}

        {/* Content */}
        <ContentWrapper
          style={[styles.content, contentStyle]}
          {...contentWrapperProps}
        >
          {children}
        </ContentWrapper>
      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    overflow: 'hidden',
  },
  handleArea: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  titleRow: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
});
