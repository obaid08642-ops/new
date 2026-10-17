import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useTheme, useLang } from '../../context';
import { NEmpty, NBtn } from '../../components/ui';
import { SP } from '../../constants';

/**
 * Shown to a signed-in provider when the app cannot reach its server. It used to be the "account under review" screen,
 * which told an approved provider the wrong thing and offered no retry. The session is kept; the screen retries by itself.
 */
export function OfflineScreen({ onRetry, onLogout, autoRetryMs = 15000 }: { onRetry: () => void; onLogout: () => void; autoRetryMs?: number }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  useEffect(() => {
    if (!autoRetryMs) return undefined;
    const timer = setInterval(onRetry, autoRetryMs);
    return () => clearInterval(timer);
  }, [onRetry, autoRetryMs]);
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }} testID="offline-screen">
      <NEmpty
        title={AR ? 'لا يوجد اتصال بالخادم' : 'Cannot reach the server'}
        sub={AR ? 'حسابك بخير. تحقق من اتصال الإنترنت وسنعيد المحاولة تلقائياً.' : 'Your account is fine. Check your internet connection; we retry automatically.'}
        actionLabel={AR ? 'إعادة المحاولة' : 'Try again'}
        onAction={onRetry}
      />
      <View style={{ padding: SP.xl }}>
        <NBtn label={AR ? 'تسجيل الخروج' : 'Log out'} variant="outline" onPress={onLogout} />
      </View>
    </View>
  );
}
