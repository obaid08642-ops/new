// @ts-nocheck
// app/payments/processing.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, Easing, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Button } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

// Conditionally import WebView (not available in Expo Go)
let WebViewComponent: any = null;
try {
  WebViewComponent = require('react-native-webview').WebView;
} catch {}

type PaymentStatus = 'webview' | 'polling' | 'timeout' | 'error';

export default function PaymentProcessingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams<{
    moyasarId: string;
    paymentUrl: string;
    bookingId: string;
    bookingKind: string;
    amount: string;
    walletTopupId?: string;
  }>();

  const { moyasarId, paymentUrl, bookingId, bookingKind, amount, walletTopupId } = params;

  const [phase, setPhase] = useState<PaymentStatus>(
    paymentUrl ? 'webview' : 'polling'
  );
  const [pollCount, setPollCount] = useState(0);
  const [statusText, setStatusText] = useState('جاري معالجة الدفع...');
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Animations
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnims = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]).current;

  // Spinning animation
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Dot loading animation
  useEffect(() => {
    const animateDots = () => {
      const animations = dotAnims.map((dot, index) =>
        Animated.sequence([
          Animated.delay(index * 250),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      Animated.loop(Animated.parallel(animations)).start();
    };
    animateDots();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // Poll payment status from backend
  const pollPaymentStatus = useCallback(
    async (attempt: number = 1) => {
      if (!isMountedRef.current || (!moyasarId && !walletTopupId)) return;

      const MAX_ATTEMPTS = 15;
      const POLL_INTERVAL = 3000;

      if (attempt > MAX_ATTEMPTS) {
        if (isMountedRef.current) {
          setPhase('timeout');
          setStatusText('انتهت مهلة التحقق');
        }
        return;
      }

      try {
        setPollCount(attempt);
        setStatusText(
          attempt === 1
            ? 'جاري التحقق من حالة الدفع...'
            : `جاري التحقق... (${attempt}/${MAX_ATTEMPTS})`
        );

        // Wallet top-up flow: confirm (and credit) via the wallet endpoint.
        if (walletTopupId) {
          const res = await apiFetch<{ status: string; balance?: number; amount?: number }>(
            '/wallet/topup/confirm',
            { method: 'POST', body: JSON.stringify({ topup_id: walletTopupId }) }
          );
          if (!isMountedRef.current) return;
          if (res.status === 'credited') {
            router.replace({
              pathname: '/payments/success',
              params: { wallet: 'true', amount: String(res.amount ?? amount ?? ''), serviceName: 'شحن المحفظة' },
            });
            return;
          }
          if (res.status === 'failed') {
            router.replace({
              pathname: '/payments/failed',
              params: { amount: amount || '', reason: 'فشلت عملية شحن المحفظة' },
            });
            return;
          }
          pollTimerRef.current = setTimeout(() => pollPaymentStatus(attempt + 1), POLL_INTERVAL);
          return;
        }

        // Detect if moyasarId is a general transaction UUID vs a Moyasar pay ID
        const isTxn = moyasarId.startsWith('txn_') || moyasarId.includes('-') || !moyasarId.startsWith('pay_');
        const endpoint = isTxn ? `/payments/verify/${moyasarId}` : `/moyasar/payments/sync/${moyasarId}`;

        const res = await apiFetch<{
          status: string;
          payment_method?: string;
          method?: string;
          reason?: string;
          failure_reason?: string;
        }>(endpoint, { method: isTxn ? 'POST' : 'GET' });

        if (!isMountedRef.current) return;

        if (res.status === 'paid') {
          router.replace({
            pathname: '/payments/success',
            params: {
              bookingId: bookingId || '',
              bookingKind: bookingKind || '',
              amount: amount || '',
              moyasarId: moyasarId,
              paymentMethod: res.payment_method || res.method || '',
            },
          });
          return;
        }

        if (res.status === 'failed') {
          router.replace({
            pathname: '/payments/failed',
            params: {
              bookingId: bookingId || '',
              bookingKind: bookingKind || '',
              amount: amount || '',
              reason: res.reason || res.failure_reason || 'فشلت عملية الدفع',
            },
          });
          return;
        }

        // Status is still pending/initiated - poll again
        pollTimerRef.current = setTimeout(() => {
          pollPaymentStatus(attempt + 1);
        }, POLL_INTERVAL);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        // Network error - retry
        if (attempt < MAX_ATTEMPTS) {
          pollTimerRef.current = setTimeout(() => {
            pollPaymentStatus(attempt + 1);
          }, POLL_INTERVAL);
        } else {
          setPhase('timeout');
          setStatusText('تعذر التحقق من حالة الدفع');
        }
      }
    },
    [moyasarId, bookingId, bookingKind, amount, walletTopupId]
  );

  // If no paymentUrl (sandbox mode), start polling immediately
  useEffect(() => {
    if (!paymentUrl) {
      setPhase('polling');
      pollPaymentStatus(1);
    }
  }, []);

  // WebView fallback: open in external browser
  const openInBrowser = useCallback(async () => {
    if (paymentUrl) {
      try {
        await Linking.openURL(paymentUrl);
      } catch {}
      // Start polling after opening browser
      setPhase('polling');
      pollPaymentStatus(1);
    }
  }, [paymentUrl, pollPaymentStatus]);

  // If WebView is not available but paymentUrl exists, open in browser
  useEffect(() => {
    if (paymentUrl && !WebViewComponent) {
      openInBrowser();
    }
  }, []);

  // Handle WebView navigation state change
  const handleWebViewNavChange = useCallback(
    (navState: { url: string }) => {
      const url = navState.url?.toLowerCase() || '';
      if (url.includes('callback') || url.includes('nabd://')) {
        // Moyasar redirected back - start polling
        setPhase('polling');
        pollPaymentStatus(1);
      }
    },
    [pollPaymentStatus]
  );

  // Manual check button
  const handleManualCheck = () => {
    setPhase('polling');
    setPollCount(0);
    setStatusText('جاري التحقق من حالة الدفع...');
    pollPaymentStatus(1);
  };

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // WebView phase - show Moyasar checkout
  if (phase === 'webview' && paymentUrl && WebViewComponent) {
    return (
      <View style={[styles.container, { paddingTop: insets.top } ]}>
        <View
          style={styles.webviewHeader}
        >
          <View style={styles.webviewHeaderContent}>
            <Icon name="lock" size={14} color="#5BA84F" />
            <AppText variant="bodySM" style={{ color: '#fff' }}>
              دفع آمن - Moyasar
            </AppText>
            <Icon name="card" size={14} color={colors.primary} />
          </View>
          {amount && (
            <AppText
              variant="bodySM"
              style={{ color: 'rgba(255,255,255,0.6)' }}>
              {amount} ريال
            </AppText>
          )}
        </View>
        <WebViewComponent
          source={{ uri: paymentUrl }}
          style={styles.webview}
          onNavigationStateChange={handleWebViewNavChange}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <Animated.View
                style={{ transform: [{ rotate: spinInterpolate }] }}>
                <Icon name="refresh" size={24} color={colors.primary} />
              </Animated.View>
              <AppText variant="bodySM" style={{ color: colors.textSecondary }}>
                جاري تحميل صفحة الدفع...
              </AppText>
            </View>
          )}
        />
      </View>
    );
  }

  // Polling / Timeout phase
  return (
    <View style={styles.container}>
      <View
        style={StyleSheet.absoluteFillObject}
      />

      {/* Background orbs */}
      <View style={styles.shimmer1} />
      <View style={styles.shimmer2} />

      <View style={styles.content}>
        {/* Animated icon */}
        <Animated.View
          style={[
            styles.icon,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}>
          <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
            <Icon
              name={phase === 'timeout' ? 'time' : 'card'}
              size={24}
              color={phase === 'timeout' ? '#F0A526' : colors.primary}
            />
          </Animated.View>
        </Animated.View>

        {/* Status text */}
        <AppText variant="bodySM" style={{ color: '#fff', textAlign: 'center' }}>
          {statusText}
        </AppText>
        <AppText
          variant="bodySM"
          style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
          {phase === 'timeout'
            ? 'يمكنك التحقق يدوياً من حالة الدفع'
            : 'لا تغلق هذه الشاشة'}
        </AppText>

        {/* Loading dots */}
        {phase === 'polling' && (
          <View style={styles.dots}>
            {dotAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    opacity: anim,
                    transform: [
                      {
                        scale: anim.interpolate({
                          inputRange: [0.3, 1],
                          outputRange: [0.8, 1.2],
                        }),
                      },
                    ],
                  },
                ]}/>
            ))}
          </View>
        )}

        {/* Amount badge */}
        {amount && (
          <View style={styles.amountBadge}>
            <AppText variant="bodySM" style={{ color: '#fff' }}>
              {amount} ريال
            </AppText>
          </View>
        )}

        {/* Timeout actions */}
        {phase === 'timeout' && (
          <View style={styles.timeoutActions}>
            <Button
              label="تحقق من حالة الدفع"
              icon="refresh"
              onPress={handleManualCheck}
              style={styles.checkBtn}
            />

            <Button
              label="إلغاء العملية"
              onPress={() =>
                router.replace({
                  pathname: '/payments/failed',
                  params: {
                    bookingId: bookingId || '',
                    bookingKind: bookingKind || '',
                    amount: amount || '',
                    reason: 'انتهت مهلة التحقق من الدفع',
                  },
                })
              }
              variant="ghost"
              style={styles.cancelBtn}
            />
          </View>
        )}

        {/* Secure note */}
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 6, }}>
          <Icon name="lock" size={16} color="#5BA84F" />
          <AppText
            variant="bodySM"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            معاملة آمنة ومشفرة بـ SSL
          </AppText>
        </View>

        {/* Poll progress indicator */}
        {phase === 'polling' && pollCount > 0 && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min((pollCount / 10) * 100, 100)}%` },
              ]} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  shimmer1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(0,102,204,0.1)',
    top: '10%',
    right: '-20%',
  },
  shimmer2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0,201,167,0.08)',
    bottom: '10%',
    left: '-15%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    padding: 32,
  },
  icon: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#23B5CE' },
  amountBadge: {
    backgroundColor: 'rgba(0,102,204,0.3)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,102,204,0.4)',
  },
  timeoutActions: {
    width: '100%',
    gap: 10,
    marginTop: 10,
  },
  checkBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#23B5CE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    width: '60%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#23B5CE',
    borderRadius: 2,
  },
  webviewHeader: {
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  webviewHeaderContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  webview: { flex: 1 },
  webviewLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F172A',
  },
});
