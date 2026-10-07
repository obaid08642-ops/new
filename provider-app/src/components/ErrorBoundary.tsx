/**
 * P15.5 — nothing crashes to a blank screen.
 *
 * `ErrorBoundary` is mounted at the app root and around every screen. A render throw
 * anywhere below it produces a readable fallback with two actions — "Try again" and
 * "Contact support" — instead of the white screen a bare React Native crash gives you.
 *
 * The boundary also reports the error to Sentry with the release attached (see
 * `src/utils/sentry.ts`), so "try again" is a real fix path and not the only one.
 *
 * BLOCKED: the live Sentry DSN is an owner secret, so the send itself is not exercised
 * here; `sentry.test.tsx` verifies the fallback and the release attachment against a
 * mocked Sentry module.
 */
import React, { useContext } from 'react';
import { ScrollView, StyleSheet, Text, View, Linking } from 'react-native';
import { SafeAreaInsetsContext, type EdgeInsets } from 'react-native-safe-area-context';
import { reportError } from '../utils/sentry';

/** Where "contact support" goes. Overridden by the app shell to the in-app route. */
export const SUPPORT_URL = 'https://nabd.plus/support';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Logical screen name, attached to the Sentry event so a crash is locatable. */
  screenName?: string;
  /** Custom retry, e.g. remount the screen. Defaults to clearing the error state. */
  onRetry?: () => void;
  /** Custom "contact support" action. Defaults to opening SUPPORT_URL. */
  onContactSupport?: () => void;
  /** Notified for every caught error (tests, analytics). */
  onError?: (error: Error, info: { componentStack: string | null }) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  componentStack: string | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string | null }) {
    const { screenName, onError } = this.props;
    // Every caught render error reaches Sentry, tagged with where it happened.
    reportError(error, screenName ? { screen: screenName } : undefined);
    if (onError) {
      try {
        onError(error, info);
      } catch {
        /* a failing listener must not re-enter the boundary */
      }
    }
    this.setState({ componentStack: info?.componentStack ?? null });
  }

  private handleRetry = () => {
    this.setState({ error: null, componentStack: null });
    if (this.props.onRetry) this.props.onRetry();
  };

  private handleContactSupport = () => {
    const { onContactSupport } = this.props;
    if (onContactSupport) {
      onContactSupport();
      return;
    }
    // A failure to open the mail client must not throw from the error path.
    Linking.openURL(SUPPORT_URL).catch(() => {});
  };

  render() {
    const { error, componentStack } = this.state;
    const { children } = this.props;
    if (!error) return <>{children}</>;
    return (
      <ErrorFallback
        error={error}
        componentStack={componentStack}
        screenName={this.props.screenName}
        onRetry={this.handleRetry}
        onContactSupport={this.handleContactSupport}
      />
    );
  }
}

/**
 * The fallback itself, exported so it can be rendered (and asserted) directly.
 * Bilingual like the rest of the app; `lang` defaults to Arabic, the primary locale.
 */
export function ErrorFallback({
  error,
  componentStack,
  screenName,
  onRetry,
  onContactSupport,
  lang = 'ar',
}: {
  error: Error;
  componentStack?: string | null;
  screenName?: string;
  onRetry: () => void;
  onContactSupport: () => void;
  lang?: 'ar' | 'en';
}) {
  const AR = lang === 'ar';
  // Read the context directly instead of `useSafeAreaInsets()`: that hook *throws*
  // outside a SafeAreaProvider, and the root boundary sits above one. An error
  // fallback that can itself crash is exactly the blank screen this component exists
  // to prevent.
  const insets: EdgeInsets = useContext(SafeAreaInsetsContext) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <ScrollView contentContainerStyle={styles.scroll} testID="error-fallback">
        <Text style={styles.icon}>{AR ? '⚠️' : '⚠️'}</Text>
        <Text style={styles.title} testID="error-fallback-title">
          {AR ? 'حدث خطأ في هذه الشاشة' : 'This screen ran into a problem'}
        </Text>
        <Text style={styles.body}>
          {AR
            ? 'لم نفقد بياناتك. يمكنك المحاولة مرة أخرى، أو التواصل مع الدعم إذا تكرر الخطأ.'
            : 'Nothing was lost. Try again, or contact support if it keeps happening.'}
        </Text>
        {screenName ? <Text style={styles.where}>{AR ? 'الشاشة: ' : 'Screen: '}{screenName}</Text> : null}
        <Text style={styles.detail} numberOfLines={4} testID="error-fallback-detail">
          {String(error?.message ?? error)}
        </Text>
        <View style={styles.actions}>
          <Text
            accessibilityRole="button"
            testID="error-fallback-retry"
            style={styles.retry}
            onPress={onRetry}
          >
            {AR ? 'إعادة المحاولة' : 'Try again'}
          </Text>
          <Text
            accessibilityRole="button"
            testID="error-fallback-support"
            style={styles.support}
            onPress={onContactSupport}
          >
            {AR ? 'التواصل مع الدعم' : 'Contact support'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  icon: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: '800', color: '#101828', textAlign: 'center' },
  body: { fontSize: 14, color: '#475467', textAlign: 'center', lineHeight: 22 },
  where: { fontSize: 12, color: '#667085' },
  detail: { fontSize: 12, color: '#98A2B3', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  retry: { backgroundColor: '#0E7C7B', color: '#FFFFFF', fontSize: 15, fontWeight: '700', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, overflow: 'hidden' },
  support: { borderWidth: 1, borderColor: '#0E7C7B', color: '#0E7C7B', fontSize: 15, fontWeight: '700', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
});

/** Convenience wrapper for a screen: `<ScreenBoundary name="DoctorHome">…</ScreenBoundary>`. */
export function ScreenBoundary({
  name,
  children,
  onRetry,
}: {
  name: string;
  children: React.ReactNode;
  onRetry?: () => void;
}) {
  return (
    <ErrorBoundary screenName={name} onRetry={onRetry}>
      {children}
    </ErrorBoundary>
  );
}