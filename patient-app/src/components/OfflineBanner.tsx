import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useScreenUi } from './home/homeKit';

/**
 * Global connectivity banner — shows a slim banner when offline and a brief
 * "back online" confirmation on recovery. Mount once in the root layout.
 */
export default function OfflineBanner() {
  const { c } = useScreenUi();
  const [offline, setOffline] = useState(false);
  const [justBack, setJustBack] = useState(false);
  const anim = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const isOff = !(state.isConnected ?? true);
      setOffline((prev) => {
        if (prev && !isOff) {
          setJustBack(true);
          setTimeout(() => setJustBack(false), 2500);
        }
        return isOff;
      });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    Animated.timing(anim, { toValue: offline || justBack ? 1 : 0, duration: 250, useNativeDriver: true }).start();
  }, [offline, justBack, anim]);

  if (!offline && !justBack) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: offline ? c.status.danger.bg : c.status.success.bg, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-48, 0] }) }] },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.text, { color: offline ? c.status.danger.fg : c.status.success.fg }]}>
        {offline ? 'لا يوجد اتصال بالإنترنت — وضع الأوفلاين' : 'عاد الاتصال — جاري المزامنة...'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    paddingTop: 46, paddingBottom: 10, alignItems: 'center',
  },
  text: { fontFamily: 'ReadexPro-700', fontSize: 12 },
});
