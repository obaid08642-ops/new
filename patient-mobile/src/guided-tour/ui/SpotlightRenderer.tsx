import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  spotlight: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderRadius: 8,
  },
  tooltip: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    width: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  desc: { fontSize: 14, color: '#666', marginBottom: 16 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { color: '#888', padding: 8 },
  btnNext: { color: '#4A90E2', fontWeight: 'bold', padding: 8 },
});
