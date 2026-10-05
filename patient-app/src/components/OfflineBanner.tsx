import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useApp } from '../context/AppContext';
import { useScreenUi } from './home/homeKit';
import { subscribeConnectivity, startConnectivityWatch, stopConnectivityWatch } from '../services/http/connectivity';
import { offlineCache, formatLastUpdated, OFFLINE_BANNER_COPY } from '../services/offline/cache';
import { outbox } from '../services/offline/outbox';

/**
 * 15.4 — global connectivity banner.
 *
 * It used to read `@react-native-community/netinfo` directly, which meant the app
 * had a second, independent idea of "am I online" from the one the HTTP client
 * maintains. It now subscribes to that single signal, so a request that failed
 * because the link dropped raises the same banner NetInfo would.
 *
 * It also answers the second half of 15.4: while offline, cached data stays on
 * screen and the banner says how old it is, instead of the app looking broken.
 * `formatLastUpdated(null)` is "never synced", so a first run with no cache
 * written yet renders that instead of crashing on a missing timestamp.
 *
 * The colours come from the shared design tokens (the active light/dark theme)
 * rather than the two hard-coded hexes this file used to carry, so the banner
 * follows the theme like every other surface.
 */

/** Caches whose freshness the banner reports. */
const TRACKED_CACHES = ['orders', 'medicines', 'notifications', 'appointments'];

export default function OfflineBanner() {
  const { lang } = useApp();
  const { c } = useScreenUi();
  const locale = lang === 'en' ? 'en' : 'ar';
  const [offline, setOffline] = useState(false);
  const [justBack, setJustBack] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [queued, setQueued] = useState(0);
  const anim = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    startConnectivityWatch();
    const unsubscribe = subscribeConnectivity((snapshot) => {
      const isOff = !snapshot.online;
      setOffline((prev) => {
        if (prev && !isOff) {
          setJustBack(true);
          setTimeout(() => setJustBack(false), 2500);
        }
        return isOff;
      });
    });
    const stopOutbox = outbox.startAutoReplay();
    const stopQueueWatch = outbox.subscribe((entries) => setQueued(entries.length));
    void offlineCache.lastUpdatedAt(TRACKED_CACHES).then(setLastUpdated);
    return () => {
      unsubscribe();
      stopOutbox();
      stopQueueWatch();
      stopConnectivityWatch();
    };
  }, []);

  useEffect(() => {
    Animated.timing(anim, { toValue: offline || justBack ? 1 : 0, duration: 250, useNativeDriver: true }).start();
  }, [offline, justBack, anim]);

  if (!offline && !justBack) return null;

  const copy = OFFLINE_BANNER_COPY[locale];
  const queueNote = queued > 0
    ? locale === 'en'
      ? ` · ${queued} action${queued === 1 ? '' : 's'} will be sent`
      : ` · ${queued} إجراء بانتظار الإرسال`
    : '';

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: offline ? c.status.danger.bg : c.status.success.bg, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-48, 0] }) }] },
      ]}
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={offline ? `${copy.offline}. ${formatLastUpdated(lastUpdated, locale)}` : copy.back}
    >
      <Text style={[styles.text, { color: offline ? c.status.danger.fg : c.status.success.fg }]}>
        {offline ? copy.offline : copy.back}
        {queueNote}
      </Text>
      {offline ? (
        <Text style={[styles.subtext, { color: c.status.danger.fg }]}>{formatLastUpdated(lastUpdated, locale)}</Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    paddingTop: 46, paddingBottom: 10, alignItems: 'center', gap: 2,
  },
  text: { fontFamily: 'ReadexPro-700', fontSize: 12, textAlign: 'center' },
  subtext: { fontFamily: 'ReadexPro-400', fontSize: 10, opacity: 0.9, textAlign: 'center' },
});
