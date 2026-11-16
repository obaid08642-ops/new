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
  const { lang, t: tt } = useLang();
  const AR = lang === 'ar';
  useEffect(() => {
    if (!autoRetryMs) return undefined;
    const timer = setInterval(onRetry, autoRetryMs);
    return () => clearInterval(timer);
  }, [onRetry, autoRetryMs]);
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }} testID="offline-screen">
      <NEmpty
        title={tt('offline.82750cf4')}
        sub={tt('offline.bea3eb3a')}
        actionLabel={tt('offline.96cbdad3')}
        onAction={onRetry}
      />
      <View style={{ padding: SP.xl }}>
        <NBtn label={tt('offline.7f6db502')} variant="outline" onPress={onLogout} />
      </View>
    </View>
  );
}
