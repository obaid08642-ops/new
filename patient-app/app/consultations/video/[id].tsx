// @ts-nocheck
import React from "react";
import {
  View,
  StyleSheet,
  ScrollView
} from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useApp } from "../../../src/context/AppContext";
import { lightColors, darkColors } from "../../../src/theme/colors";

export default function VideoCall() {
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: 100,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 20, color: colors.n, marginTop: 40 }}>
          VideoCall - s64
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
