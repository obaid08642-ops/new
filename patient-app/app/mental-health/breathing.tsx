// @ts-nocheck
// app/mental-health/breathing.tsx — Connected to POST /mental-health/breathing
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

const TECHNIQUES = [
  { id: '478', name: '4-7-8', desc: 'للاسترخاء العميق', inhale: 4, hold: 7, exhale: 8, color: '#6366F1', cycles: 4 },
  { id: 'box', name: 'التنفس الصندوقي', desc: 'للتركيز وتهدئة الأعصاب', inhale: 4, hold: 4, exhale: 4, holdOut: 4, color: '#7A6BEA', cycles: 4 },
  { id: 'calm', name: '5-5', desc: 'للهدوء السريع', inhale: 5, hold: 0, exhale: 5, color: '#00C9A7', cycles: 6 },
];

export default function BreathingScreen() {
  const insets = useSafeAreaInsets();
  const [technique, setTechnique] = useState(TECHNIQUES[0]);
  const [phase, setPhase] = useState<'ready' | 'inhale' | 'hold' | 'exhale' | 'holdout' | 'done'>('ready');
  const [seconds, setSeconds] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  const PHASES = {
    inhale: { label: 'استنشق', duration: technique.inhale, next: technique.hold > 0 ? 'hold' : 'exhale', scale: 1, opacity: 1 },
    hold: { label: 'احبس', duration: technique.hold, next: 'exhale', scale: 1, opacity: 1 },
    exhale: { label: 'أخرج الهواء', duration: technique.exhale, next: (technique as any).holdOut ? 'holdout' : 'inhale', scale: 0.6, opacity: 0.5 },
    holdout: { label: 'احبس', duration: (technique as any).holdOut || 0, next: 'inhale', scale: 0.6, opacity: 0.5 },
  };

  useEffect(() => {
    if (!isRunning) return;
    const current = PHASES[phase as keyof typeof PHASES];
    if (!current) return;

    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: current.scale, duration: current.duration * 1000, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: current.opacity, duration: current.duration * 1000, useNativeDriver: false }),
    ]).start();

    let count = current.duration;
    setSeconds(count);
    const interval = setInterval(() => {
      count--;
      setSeconds(count);
      if (count <= 0) {
        clearInterval(interval);
        const nextPhase = current.next as typeof phase;
        if (nextPhase === 'inhale' && phase !== 'ready') {
          const newCycle = cycle + 1;
          setCycle(newCycle);
          if (newCycle >= technique.cycles) {
            setPhase('done');
            setIsRunning(false);
            // Save breathing session to backend
            const totalDuration = (technique.inhale + technique.hold + technique.exhale + ((technique as any).holdOut || 0)) * technique.cycles;
            apiFetch('/mental-health/breathing', {
              method: 'POST',
              body: JSON.stringify({
                technique: technique.id === '478' ? '4_7_8' : technique.id === 'box' ? 'box_breathing' : 'equal_breathing',
                rounds: technique.cycles,
                duration_seconds: totalDuration,
              }),
            }).catch(() => {});
            return;
          }
        }
        setPhase(nextPhase);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, isRunning]);

  const start = () => { setCycle(0); setPhase('inhale'); setIsRunning(true); };
  const stop = () => { setIsRunning(false); setPhase('ready'); setSeconds(0); scaleAnim.setValue(0.6); };

  const phaseData = PHASES[phase as keyof typeof PHASES];
  const bgColors: [string, string] = phase === 'inhale' ? ['#23B5CE', '#6366F1'] :
    phase === 'hold' ? ['#1E1B4B', '#312E81'] :
    phase === 'exhale' ? ['#065F46', '#059669'] :
    ['#1E293B', '#334155'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={StyleSheet.absoluteFillObject} />
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
          <Icon name="back" size={22} color="#fff" />
        </TouchableOpacity>
        <AppText variant="bodySM">تمارين التنفس 🫁</AppText>
        <View style={{ width: 36 }}/>
      </View>

      {/* Technique Selector */}
      {!isRunning && phase === 'ready' && (
        <View style={styles.techniqueRow}>
          {TECHNIQUES.map(t => (
            <TouchableOpacity key={t.id} onPress={() => setTechnique(t)}
              style={[styles.techChip, technique.id === t.id && { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: '#fff' } ]}>
              <AppText variant="bodySM">{t.name}</AppText>
              <AppText variant="bodySM">{t.desc}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Breathing Circle */}
      <View style={styles.circleArea}>
        <View style={styles.ringOuter} />
        <View style={styles.ringMid} />
        <Animated.View style={[styles.breathCircle, {
          transform: [{ scale: scaleAnim }],
          backgroundColor: phase === 'inhale' ? 'rgba(99,102,241,0.6)' :
            phase === 'exhale' ? 'rgba(5,150,105,0.6)' : 'rgba(255,255,255,0.2)',
          borderColor: phase === 'inhale' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
        }]}>
          <AppText variant="bodySM">
            {phase === 'ready' ? '🫁' : phase === 'inhale' ? '⬆️' : phase === 'exhale' ? '⬇️' : '⏸️'}
          </AppText>
          {phase !== 'ready' && phase !== 'done' && (
            <>
              <AppText variant="bodySM">{phaseData?.label}</AppText>
              <AppText variant="bodySM">{seconds}</AppText>
            </>
          )}
          {phase === 'done' && <AppText variant="bodySM">أحسنت!</AppText>}
        </Animated.View>

        {isRunning && (
          <View style={styles.cycleIndicator}>
            {Array.from({ length: technique.cycles }).map((_, i) => (
              <View key={i} style={[styles.cycleDot, i < cycle && styles.cycleDotDone]} />
            ))}
          </View>
        )}
      </View>

      {/* Control */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 20 } ]}>
        {!isRunning ? (
          <TouchableOpacity onPress={start} style={styles.startBtn}>
            <View style={styles.startBtnInner}>
              <AppText variant="bodySM">
                {phase === 'done' ? 'أعد التمرين' : `▶️ ابدأ — ${technique.cycles} دورات`}
              </AppText>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={stop} style={styles.stopBtn}>
            <AppText variant="bodySM">⏹ إيقاف</AppText>
          </TouchableOpacity>
        )}
        <AppText variant="bodySM">
          {technique.name}: {technique.inhale}s استنشاق
          {technique.hold > 0 ? ` — ${technique.hold}s احباس` : ''} — {technique.exhale}s إخراج
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' } as any,
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  techniqueRow: { flexDirection: 'row-reverse', paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  techChip: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', gap: 3 },
  techName: { color: '#fff', fontSize: 12, fontWeight: '800' } as any,
  techDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: '400', textAlign: 'center' } as any,
  circleArea: { flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  ringOuter: { position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  ringMid: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  breathCircle: { width: 160, height: 160, borderRadius: 80, borderWidth: 2, justifyContent: 'center', alignItems: 'center', gap: 4 },
  phaseEmoji: { fontSize: 36 } as any,
  phaseLabel: { color: '#fff', fontSize: 14, fontWeight: '700' } as any,
  phaseSeconds: { color: '#fff', fontSize: 36, fontFamily: 'Cairo-ExtraBold', lineHeight: 40 } as any,
  done: { color: '#fff', fontSize: 18, fontWeight: '800' } as any,
  cycleIndicator: { position: 'absolute', bottom: 0, flexDirection: 'row', gap: 8 },
  cycleDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)' },
  cycleDotDone: { backgroundColor: undefined },
  controls: { paddingHorizontal: 20, gap: 12 },
  startBtn: { borderRadius: 18, overflow: 'hidden' },
  startBtnInner: { height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  startBtnAlt: { color: '#fff', fontSize: 17, fontWeight: '800' } as any,
  stopBtn: { height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center' },
  stopBtnAlt: { color: '#fff', fontSize: 15, fontWeight: '700' } as any,
  techInfo: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '400', textAlign: 'center' } as any,
});
