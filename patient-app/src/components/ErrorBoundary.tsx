/**
 * 15.5 — the fallback the user sees when a screen throws.
 *
 * The requirement is "not a white screen", so this is not a debug-only boundary:
 * it is the shipped recovery UI, and it always offers the two actions the task
 * names — try again, and contact support — plus the error id a user can quote to
 * support, which is the same id attached to the Sentry event.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Platform } from 'react-native';
import { Icon } from './Icon';
import { captureException, getCrashState } from '../services/monitoring/crash';
import { parseError, getUserFriendlyMessage } from '../services/errors';

export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@nabd.plus';
export const SUPPORT_PHONE = process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? '+966500000000';

/** Short, quotable id. Enough to find the event, short enough to read aloud. */
export function newErrorId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export const FALLBACK_COPY = {
  ar: {
    title: 'حدث خطأ في هذه الشاشة',
    body: 'لم نتمكن من عرض هذه الشاشة. يمكنك المحاولة مرة أخرى، أو تواصل معنا إذا تكرر الخطأ.',
    tryAgain: 'أعد المحاولة',
    contact: 'تواصل مع الدعم',
    errorId: 'رقم الخطأ',
    email: 'البريد',
  },
  en: {
    title: 'This screen ran into a problem',
    body: "We couldn't show this screen. Try again, or contact us if it keeps happening.",
    tryAgain: 'Try again',
    contact: 'Contact support',
    errorId: 'Error id',
    email: 'Email',
  },
} as const;

export function openSupportEmail(errorId: string, locale: 'ar' | 'en'): void {
  const subject = encodeURIComponent(`[${errorId}] App error`);
  const body = encodeURIComponent(
    locale === 'en'
      ? `Error id: ${errorId}\nApp version: ${getCrashState().release}\n\nWhat happened:\n`
      : `رقم الخطأ: ${errorId}\nإصدار التطبيق: ${getCrashState().release}\n\nما حدث:\n`,
  );
  const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  Linking.openURL(url).catch(() => {
    // A device with no mail client must not throw out of a fallback screen.
  });
}

export interface ScreenFallbackProps {
  errorId: string;
  locale?: 'ar' | 'en';
  onRetry: () => void;
}

export function ScreenFallback({ errorId, locale = 'ar', onRetry }: ScreenFallbackProps) {
  const copy = FALLBACK_COPY[locale];
  return (
    <View style={styles.container} testID="screen-error-fallback">
      <Icon name="error_outline" size={44} color="#F0695C" />
      <Text style={[styles.title, { textAlign: locale === 'ar' ? 'right' : 'left' }]}>{copy.title}</Text>
      <Text style={[styles.body, { textAlign: locale === 'ar' ? 'right' : 'left' }]}>{copy.body}</Text>

      <Text
        style={styles.primary}
        accessibilityRole="button"
        testID="screen-error-retry"
        onPress={onRetry}
      >
        {copy.tryAgain}
      </Text>
      <Text
        style={styles.secondary}
        accessibilityRole="button"
        testID="screen-error-contact"
        onPress={() => openSupportEmail(errorId, locale)}
      >
        {copy.contact}
      </Text>

      <Text style={styles.errorId} testID="screen-error-id">
        {copy.errorId}: {errorId}
      </Text>
    </View>
  );
}

interface BoundaryProps {
  children: React.ReactNode;
  /** Which fallback to show; 'screen' is per route, 'root' is the whole app. */
  scope?: 'screen' | 'root';
  locale?: 'ar' | 'en';
  /** Overrides the navigator's own retry, when there is one. */
  retry?: () => void;
}

interface BoundaryState {
  error: unknown;
  errorId: string | null;
}

/**
 * One component serves both 15.5 requirements. expo-router instantiates it per
 * screen through `unstable_settings.screenErrorBoundary`, and the root layout
 * mounts it directly around the provider tree.
 */
export class ErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, errorId: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error, errorId: newErrorId() };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }): void {
    // The release travels with the event, so this crash is attributable to a build.
    captureException(error, {
      scope: this.props.scope ?? 'screen',
      errorId: this.state.errorId,
      componentStack: info?.componentStack ?? undefined,
      catalogCode: parseError(error).metadata?.backendCode,
    });
  }

  private handleRetry = (): void => {
    if (this.props.retry) {
      this.props.retry();
      return;
    }
    this.setState({ error: null, errorId: null });
  };

  render(): React.ReactNode {
    const { error, errorId } = this.state;
    if (!error || !errorId) return this.props.children;
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenFallback errorId={errorId} locale={this.props.locale} onRetry={this.handleRetry} />
      </ScrollView>
    );
  }
}

/**
 * The per-screen boundary, in the shape expo-router wants: it hands us the error
 * and a `retry` that re-renders the route, and we render the recovery UI.
 *
 * `app/_layout.tsx` exports this through `unstable_settings.screenErrorBoundary`,
 * which makes expo-router wrap EVERY route beneath the root layout in its own
 * instance — a crash in one screen no longer takes the app down with it, and a
 * screen added later is covered without touching its file.
 */
export function ScreenErrorBoundary({ error, retry }: { error: unknown; retry: () => void | Promise<void> }) {
  // Stable for the lifetime of this fallback, so the id the user reads matches
  // the id on the reported event.
  const [errorId] = useState(newErrorId);
  const reported = useRef(false);

  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    captureException(error, {
      scope: 'screen',
      errorId,
      catalogCode: parseError(error).metadata?.backendCode,
      userMessage: getUserFriendlyMessage(error),
    });
  }, [error, errorId]);

  return <ScreenFallback errorId={errorId} onRetry={() => void retry()} />;
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', backgroundColor: Platform.OS === 'web' ? '#fff' : '#F5F5F7' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#1B2430' },
  body: { fontSize: 14, lineHeight: 22, color: '#5A6472', textAlign: 'center' },
  primary: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#23B5CE',
    color: '#fff',
    fontWeight: '700',
    overflow: 'hidden',
  },
  secondary: { paddingHorizontal: 20, paddingVertical: 10, color: '#23B5CE', fontWeight: '700' },
  errorId: { marginTop: 12, fontSize: 11, color: '#8A94A6' },
});

export { getUserFriendlyMessage };
