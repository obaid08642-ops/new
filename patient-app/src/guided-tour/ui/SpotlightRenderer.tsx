import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../context/AppContext';

export const SpotlightRenderer = ({ targetLayout, step, onNext, onSkip }: any) => {
  const { colors } = useApp();
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
          borderColor: colors.p,
        }
      ]} />
      
      <View style={[styles.tooltip, { top: targetLayout.y + targetLayout.height + 20, backgroundColor: colors.s, borderColor: colors.bd }]}>
        <Text style={[styles.title, { color: colors.n }]}>{step.title || 'Guided Tour'}</Text>
        <Text style={[styles.desc, { color: colors.t2 }]}>{step.description || 'This is a description of the current feature.'}</Text>
        <View style={styles.footer}>
          <Text style={[styles.btn, { color: colors.t3 }]} onPress={onSkip}>Skip</Text>
          <Text style={[styles.btnNext, { color: colors.p }]} onPress={onNext}>Next →</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  spotlight: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderRadius: 8,
  },
  tooltip: {
    position: 'absolute',
    alignSelf: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    width: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  desc: { fontSize: 14, marginBottom: 16 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { padding: 8 },
  btnNext: { fontWeight: 'bold', padding: 8 },
});
