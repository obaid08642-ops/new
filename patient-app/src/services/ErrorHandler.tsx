/**
 * Error Handling — the React half.
 *
 * 15.1: all parsing, catalogue lookup and typing now live in `./errors`, which has
 * no React or react-native imports. That split exists so the HTTP client (and its
 * unit tests) can use the catalogue without loading the component tree — loading
 * it used to drag `react-native-localize` into every suite that imported
 * `HttpClient`. Everything is re-exported here, so `@/services/ErrorHandler`
 * imports are unchanged.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DSText, DSButton } from '../design-system';
import { Spacing } from '../design-system/tokens';
import { getUserFriendlyMessage, parseError, type AppError } from './errors';

export * from './errors';
import { logError } from './errors';

// ─────────────────────────────────────────────────────────────────────────────
// Global Error Boundary
// ─────────────────────────────────────────────────────────────────────────────
interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: AppError, reset: () => void) => React.ReactNode;
  onError?: (error: AppError) => void;
}

export class AppErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error: parseError(error) };
  }

  componentDidCatch(error: unknown): void {
    const appError = parseError(error);
    logError(appError, 'ErrorBoundary');
    this.props.onError?.(appError);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    const { hasError, error } = this.state;

    if (hasError && error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset);
      }

      return (
        <View style={styles.fallback}>
          <DSText variant="h4" align="center">
            حدث خطأ غير متوقع
          </DSText>
          <DSText variant="bodySM" align="center">
            {getUserFriendlyMessage(error)}
          </DSText>
          <DSButton
            label="أعد المحاولة"
            onPress={this.reset}
            variant="primary"
          />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.lg,
  },
});
