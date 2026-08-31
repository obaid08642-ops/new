/**
 * Phase 8 — غلاف الشاشة المتحرك الموحد: أنيميشن دخول خفيف (fade + slide 12px) لكل شاشة.
 * يُغلّف أي محتوى شاشة؛ مدة 250ms وفق brand.motion.base — خفيف ووظيفي لا زخرفي.
 */
import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";
import { brand } from "../theme/brand";

export function AnimatedScreen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: brand.motion.base, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, ...brand.motion.spring, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ flex: 1, opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}
