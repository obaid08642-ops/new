import * as React from 'react';
import {
  ActivityIndicator,
  Modal as RNModal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import type {
  EmptyStateProps,
  ErrorStateProps,
  ModalProps,
  OfflineStateProps,
  SkeletonProps,
  ToastProps,
} from '../../../ui/components/contract';
import { Icon } from '../Icon';
import { FIcon } from './FIcon';
import type { FillIconName, ServiceTone } from '../../../ui/icons/fill';
import { tokens } from '../../../design-tokens/dist/ts/tokens';
import { Button } from './Button';

/**
 * Status, overlays and loading — 12.A7, React Native.
 *
 * Empty and error stay two components with two pictures and two different
 * buttons, exactly as on the web: "you have no orders" is information, "we could
 * not load your orders" is an apology, and merging them means apologising to
 * people who simply have nothing yet.
 *
 * What differs from the web is the overlay. A native modal is a real
 * `Modal`, which is what makes the hardware back button dismiss it and the
 * system apply the dim — neither of which a `position: fixed` view can do.
 */

const SKELETON_W = { auto: 'auto', full: '100%', half: '50%' } as const;

export function Skeleton({ variant = 'text', lines = 1, width = 'full', testID, theme = 'light' }: SkeletonProps & { theme?: 'light' | 'dark' }) {
  const bg = theme === 'dark' ? '#12263A' : '#F4F6F8';
  const w = SKELETON_W[width];

  if (variant === 'circle') {
    return <View testID={testID} accessibilityElementsHidden style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg }} />;
  }
  if (variant === 'tile') {
    return <View testID={testID} accessibilityElementsHidden style={{ width: 128, height: 128, borderRadius: 24, backgroundColor: bg }} />;
  }
  if (variant === 'block' || variant === 'title') {
    return <View testID={testID} accessibilityElementsHidden style={{ width: w, height: variant === 'title' ? 28 : 64, borderRadius: 12, backgroundColor: bg }} />;
  }

  return (
    <View testID={testID} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ gap: 8, width: w }}>
      {Array.from({ length: lines }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 12,
            // A trailing line is shorter, which is what makes a stack of them
            // read as text rather than as a barcode.
            width: i === lines - 1 && lines > 1 ? '60%' : '100%',
            borderRadius: 9999,
            backgroundColor: bg,
          }}
        />
      ))}
    </View>
  );
}

type Themed = { theme?: 'light' | 'dark' };

/** canvas/States: the shared layout of the empty, error, offline and 404 screens (same as the web). */
function StateLayout({
  icon,
  tone,
  title,
  body,
  detail,
  children,
  testID,
  role,
  theme,
}: {
  icon: FillIconName;
  tone: ServiceTone;
  title: string;
  body?: string;
  detail?: string;
  children?: React.ReactNode;
  testID?: string;
  role?: 'alert' | 'summary';
  theme: 'light' | 'dark';
}) {
  const c = tokens(theme).color;
  return (
    <View
      testID={testID}
      accessibilityRole={role}
      accessibilityLiveRegion={role === 'alert' ? 'assertive' : role === 'summary' ? 'polite' : undefined}
      style={{ alignItems: 'center', gap: 14, paddingHorizontal: 32, paddingVertical: 32 }}
    >
      <FIcon icon={icon} tone={tone} size={112} theme={theme} />
      <Text accessibilityRole="header" style={{ fontSize: 22, fontFamily: 'ReadexPro-700', color: c.text.primary, textAlign: 'center' }}>
        {title}
      </Text>
      {body ? <Text style={{ fontSize: 14.5, lineHeight: 24.65, fontFamily: 'ReadexPro-400', color: c.text.secondary, textAlign: 'center' }}>{body}</Text> : null}
      {detail ? <Text style={{ fontSize: 11.5, fontFamily: 'ReadexPro-400', color: c.text.tertiary, textAlign: 'center' }}>{detail}</Text> : null}
      {children ? <View style={{ alignSelf: 'stretch', marginTop: 10, gap: 4 }}>{children}</View> : null}
    </View>
  );
}

/** The quiet second action under the CTA: 48 tall, 15 ink. */
function TextAction({ label, onPress, theme }: { label: string; onPress?: () => void; theme: 'light' | 'dark' }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 15, fontFamily: 'ReadexPro-700', color: tokens(theme).color.text.primary }}>{label}</Text>
    </Pressable>
  );
}

export interface NativeEmptyStateProps extends EmptyStateProps, Themed {
  onAction?: () => void;
  onSecondaryAction?: () => void;
}

export function EmptyState({ icon, tone, title, body, actionLabel, secondaryActionLabel, onAction, onSecondaryAction, testID, theme = 'light' }: NativeEmptyStateProps) {
  return (
    <StateLayout icon={icon} tone={tone} title={title} body={body} testID={testID} theme={theme}>
      {actionLabel ? <Button label={actionLabel} size="lg" fullWidth onPress={onAction} theme={theme} /> : null}
      {secondaryActionLabel ? <TextAction label={secondaryActionLabel} onPress={onSecondaryAction} theme={theme} /> : null}
    </StateLayout>
  );
}

export interface NativeErrorStateProps extends ErrorStateProps, Themed {
  onRetry?: () => void;
  onAction?: () => void;
}

/**
 * `detail` is the technical cause, shown small and quiet so a support agent can
 * read it out of a screenshot. It is deliberately NOT the title: a user cannot
 * act on "TypeError: fetch failed", they can act on "We could not reach Nabd+".
 */
export function ErrorState({
  icon = 'warning',
  tone = 'amber',
  title,
  body,
  detail,
  actionLabel,
  retryLabel,
  onRetry,
  onAction,
  loading = false,
  testID,
  theme = 'light',
}: NativeErrorStateProps) {
  return (
    <StateLayout icon={icon} tone={tone} title={title} body={body} detail={detail} testID={testID} role="alert" theme={theme}>
      {retryLabel ? <Button label={retryLabel} size="lg" fullWidth loading={loading} onPress={onRetry} theme={theme} /> : null}
      {actionLabel ? <TextAction label={actionLabel} onPress={onAction} theme={theme} /> : null}
    </StateLayout>
  );
}

export interface NativeOfflineStateProps extends OfflineStateProps, Themed {
  onRetry?: () => void;
}

export function OfflineState({ title, body, retryLabel, onRetry, loading = false, testID, theme = 'light' }: NativeOfflineStateProps) {
  return (
    <StateLayout icon="wifi-slash" tone="blue" title={title} body={body} testID={testID} role="summary" theme={theme}>
      {retryLabel ? <Button label={retryLabel} size="lg" fullWidth loading={loading} onPress={onRetry} theme={theme} /> : null}
    </StateLayout>
  );
}

/**
 * A toast is a live region. `accessibilityLiveRegion="polite"` announces it
 * without cutting off whatever the user is hearing, which is the difference
 * between a helpful confirmation and a hijacked screen reader mid-sentence.
 */
export function Toast({
  message,
  tone = 'neutral',
  dismissible = false,
  dismissLabel = 'Dismiss',
  actionLabel,
  durationMs,
  testID,
  theme = 'light',
}: ToastProps & { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  const accent = {
    neutral: '#8A94A0',
    primary: '#D42A38',
    success: '#1B7A4B',
    warning: '#8A5A00',
    danger: '#B3202C',
    info: '#1F5FBF',
  }[tone];

  return (
    <View
      testID={testID}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        position: 'absolute',
        insetInline: 20,
        bottom: 96,
        zIndex: 500,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 12,
        backgroundColor: dark ? '#F5F5F7' : '#12263A',
        borderStartWidth: 4,
        borderStartColor: accent,
        elevation: 6,
      }}
    >
      <Text numberOfLines={2} style={{ flex: 1, fontSize: 15, color: dark ? '#0B1B2B' : '#F5F5F7' }}>
        {message}
      </Text>
      {actionLabel ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} style={{ padding: 8 }}>
          <Text style={{ fontWeight: '700', color: dark ? '#0B1B2B' : '#F5F5F7' }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
      {dismissible ? (
        <Pressable accessibilityRole="button" accessibilityLabel={dismissLabel} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={16} theme={dark ? 'light' : 'dark'} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Modal({
  open,
  title,
  body,
  variant = 'modal',
  confirmLabel,
  cancelLabel,
  destructive = false,
  closeLabel,
  loading = false,
  testID,
  theme = 'light',
}: ModalProps & { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  const isSheet = variant === 'sheet';

  return (
    <RNModal
      visible={open}
      transparent
      animationType={isSheet ? 'slide' : 'fade'}
      // A hardware back press has to dismiss a native dialog; there is no Esc key.
      onRequestClose={() => undefined}
      testID={testID}
    >
      <View
        accessibilityViewIsModal
        accessibilityRole="alert"
        style={{
          flex: 1,
          backgroundColor: 'rgba(18,38,58,0.55)',
          justifyContent: isSheet ? 'flex-end' : 'center',
          padding: isSheet ? 0 : 24,
        }}
      >
        <View
          accessible
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={{
            backgroundColor: dark ? '#12263A' : '#FFFFFF',
            borderTopLeftRadius: isSheet ? 28 : 24,
            borderTopRightRadius: isSheet ? 28 : 24,
            borderBottomLeftRadius: isSheet ? 0 : 24,
            borderBottomRightRadius: isSheet ? 0 : 24,
            padding: 24,
            gap: 16,
            elevation: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 20, fontWeight: '700', color: dark ? '#F5F5F7' : '#0B1B2B' }}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="close" size={18} theme={dark ? 'dark' : 'light'} />
            </Pressable>
          </View>
          {body ? <Text style={{ fontSize: 15, color: dark ? '#C2CBD6' : '#5B6673' }}>{body}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
            {cancelLabel ? <Button label={cancelLabel} variant="ghost" size="sm" theme={dark ? 'dark' : 'light'} /> : null}
            <Button label={confirmLabel} size="sm" variant={destructive ? 'danger' : 'primary'} loading={loading} theme={dark ? 'dark' : 'light'} />
          </View>
        </View>
      </View>
    </RNModal>
  );
}
