import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '../../../../packages/design-tokens/dist/ts/tokens';
const T = tokens('light').color;

export const SpotlightRenderer = ({ targetLayout, step, onNext, onSkip }: any) => {
  if (!targetLayout) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.overlay} />
      <View style={[
        styles.spotlight,
        {
          top: targetLayout.y - 10,
          left: targetLayout.x - 10,
          width: targetLayout.width + 20,
          height: targetLayout.height + 20,
        }
      ]} />
      
      <View style={[styles.tooltip, { top: targetLayout.y + targetLayout.height + 20 }]}>
        <Text style={styles.title}>{step.title || 'Guided Tour'}</Text>
        <Text style={styles.desc}>{step.description || 'This is a description of the current feature.'}</Text>
        <View style={styles.footer}>
          <Text style={styles.btn} onPress={onSkip}>Skip</Text>
          <Text style={styles.btnNext} onPress={onNext}>Next →</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: T.glass.bg,
  },
  spotlight: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: T.action.primary.bg,
    borderRadius: 8,
  },
  tooltip: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: T.bg.surface,
    padding: 20,
    borderRadius: 16,
    width: '90%',
    shadowColor: T.brand.ink,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  desc: { fontSize: 14, color: T.text.secondary, marginBottom: 16 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { color: T.text.tertiary, padding: 8 },
  btnNext: { color: T.text.link, fontWeight: 'bold', padding: 8 },
});
