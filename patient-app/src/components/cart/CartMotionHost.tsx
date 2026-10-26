import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScreenUi } from '../screen/ScreenKit';
import { measureCartTarget, subscribeFlights, type Flight } from '../../utils/flyToCart';
import { MOTION, reduceMotion } from '../../utils/motion';
import { subscribeUndoToast, type UndoToast } from '../../utils/undoToast';

const SIZE = 48;
const TOAST_MS = 5000;

/** One flying picture: from the finger to the cart button, MOTION.flight ms, ease-out, then it is gone. */
function Flying({ flight, onDone }: { flight: Flight; onDone: (id: number) => void }) {
  const { c } = useScreenUi();
  const progress = useRef(new Animated.Value(0)).current;
  const [to, setTo] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    let alive = true;
    void measureCartTarget().then((point) => {
      if (!alive) return;
      if (!point) { onDone(flight.id); return; }
      setTo(point);
      Animated.timing(progress, { toValue: 1, duration: MOTION.flight, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => onDone(flight.id));
    });
    return () => { alive = false; };
  }, [flight.id, onDone, progress]);
  if (!to) return null;
  const dx = to.x - flight.from.x;
  const dy = to.y - flight.from.y;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute', start: 0, top: 0, width: SIZE, height: SIZE, borderRadius: 14, overflow: 'hidden', backgroundColor: c.bg.media,
        transform: [
          { translateX: Animated.add(new Animated.Value(flight.from.x - SIZE / 2), progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] })) },
          { translateY: Animated.add(new Animated.Value(flight.from.y - SIZE / 2), progress.interpolate({ inputRange: [0, 1], outputRange: [0, dy] })) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] }) },
        ],
        opacity: progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.8, 0.4] }),
      }}
    >
      {flight.uri ? <Image source={{ uri: flight.uri }} accessibilityIgnoresInvertColors style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : null}
    </Animated.View>
  );
}

/**
 * Mounted once at the root: draws the pictures that fly to the cart button and the "removed - undo" toast. Draws nothing
 * when there is nothing to show; with reduced motion the toast simply appears.
 */
export function CartMotionHost() {
  const { c, flow } = useScreenUi();
  const insets = useSafeAreaInsets();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [toast, setToast] = useState<UndoToast | null>(null);
  const slide = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => subscribeFlights((flight) => setFlights((now) => [...now, flight])), []);
  useEffect(() => subscribeUndoToast((next) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(next);
    slide.setValue(reduceMotion() ? 1 : 0);
    if (!reduceMotion()) Animated.timing(slide, { toValue: 1, duration: MOTION.toast, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }), [slide]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const done = useCallback((id: number) => setFlights((now) => now.filter((f) => f.id !== id)), []);
  return (
    <>
      {flights.map((flight) => <Flying key={flight.id} flight={flight} onDone={done} />)}
      {toast ? (
        <Animated.View
          testID="undo-toast"
          accessibilityRole="alert"
          style={{
            position: 'absolute', start: 16, end: 16, bottom: Math.max(insets.bottom, 12) + 64, alignSelf: 'center', maxWidth: 420, flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingStart: 16, paddingEnd: 4, borderRadius: 18, backgroundColor: c.text.primary, opacity: slide,
            transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          <Text style={{ flex: 1, color: c.bg.surface, fontSize: 14, paddingVertical: 12, ...flow }}>{toast.text}</Text>
          <Pressable
            accessibilityRole="button"
            testID="undo-toast-action"
            onPress={() => { toast.onUndo(); setToast(null); }}
            style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: c.bg.surface, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' }}>{toast.undoLabel}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </>
  );
}
