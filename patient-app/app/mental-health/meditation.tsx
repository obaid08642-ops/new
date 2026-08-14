// @ts-nocheck
// app/mental-health/meditation.tsx — Connected to POST /mental-health/meditation
import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Animated, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

// Sessions fetched dynamically

const GUIDE_STEPS = [
  'اجلس في وضع مريح وأغمض عينيك',
  'ضع يديك على فخذيك بارتياح',
  'ركّز على أنفاسك... استنشق ببطء',
  'احبس الهواء للحظة... ثم أخرجه',
  'اترك أفكارك تمرّ كالسحاب...',
  'اشعر بالهدوء يملأ جسدك وعقلك',
];

export default function MeditationScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentGuide, setCurrentGuide] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    apiFetch('/mental-health/meditation/sessions')
      .then(res => setSessions(res || []))
      .catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 2500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.9, duration: 3000, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0.4, duration: 3000, useNativeDriver: false }),
        ])
      ).start();
      timerRef.current = setInterval(() => {
        setElapsed(e => {
          const next = e + 1;
          setCurrentGuide(Math.floor((next / ((selectedSession?.duration || 5) * 60)) * GUIDE_STEPS.length));
          if (next >= (selectedSession?.duration || 5) * 60) {
            setIsPlaying(false);
            clearInterval(timerRef.current!);
            // Save completed session to backend
            apiFetch('/mental-health/meditation', {
              method: 'POST',
              body: JSON.stringify({
                type: 'guided',
                duration_minutes: selectedSession?.duration ?? 5,
                completed: true,
              }),
            }).catch(() => {});
          }
          return next;
        });
      }, 1000);
    } else {
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const totalSeconds = (selectedSession?.duration || 5) * 60;
  const progress = elapsed / totalSeconds;

  if (selectedSession) {
    const bgGrad: [string, string] = selectedSession.color === '#6366F1' ? ['#1E1B4B', '#312E81']
      : selectedSession.color === '#5BA84F' ? ['#052E16', '#166534']
      : selectedSession.color === '#F0A526' ? ['#1C1402', '#422006']
      : ['#0C1445', '#1E3A8A'];

    return (
      <View style={styles.sessionContainer}>
        <StatusBar barStyle="light-content" />
        <View style={StyleSheet.absoluteFillObject} />

        <View style={[styles.sessionHeader, { paddingTop: insets.top + 8 } ]}>
          <TouchableOpacity onPress={() => { setSelectedSession(null); setIsPlaying(false); setElapsed(0); }} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.sessionTitleWrap}>
            <AppText variant="bodySM">{selectedSession.emoji} {selectedSession.title}</AppText>
            <AppText variant="bodySM">{selectedSession.duration} دقائق</AppText>
          </View>
          <View style={{ width: 36 }}/>
        </View>

        {/* Visual */}
        <View style={styles.meditationVisual}>
          <Animated.View style={[styles.glowRing3, { opacity: glowAnim, borderColor: selectedSession.color + '30' }]} />
          <Animated.View style={[styles.glowRing2, { opacity: glowAnim, borderColor: selectedSession.color + '50', transform: [{ scale: pulseAnim }] }]}/>
          <Animated.View style={[styles.meditationOrb, { backgroundColor: selectedSession.color + '25', borderColor: selectedSession.color + '60', transform: [{ scale: pulseAnim }] }]}>
            <AppText variant="bodySM">{selectedSession.emoji}</AppText>
          </Animated.View>

          {/* Timer */}
          <View style={styles.timerDisplay}>
            <AppText variant="bodySM">{formatTime(elapsed)}</AppText>
            <AppText variant="bodySM">/ {formatTime(totalSeconds)}</AppText>
          </View>

          {/* Progress ring approximation */}
          <View style={[styles.progressRingBg, { borderColor: 'rgba(255,255,255,0.1)' } ]}>
            <View style={[styles.progressRingFill, { borderColor: selectedSession.color, opacity: 0.7 + progress * 0.3 }]} />
          </View>
        </View>

        {/* Guide */}
        <View style={styles.guideBox}>
          <AppText variant="bodySM">
            {GUIDE_STEPS[Math.min(currentGuide, GUIDE_STEPS.length - 1)]}
          </AppText>
        </View>

        {/* Controls */}
        <View style={[styles.controls, { paddingBottom: insets.bottom + 24 } ]}>
          <TouchableOpacity
            onPress={() => { setIsPlaying(!isPlaying); if (!isPlaying && elapsed >= totalSeconds) { setElapsed(0); setCurrentGuide(0); } }} style={styles.playBtn}
          >
            <View style={styles.playBtnGrad}>
              <Icon name="info" size={20} color={colors.primary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setElapsed(0); setCurrentGuide(0); setIsPlaying(false); }} style={styles.resetBtn}>
            <Icon name="refresh" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM">التأمل المُوجَّه</AppText>
          <View style={{ width: 36 }}/>
        </View>
        <AppText variant="bodySM">اختر جلسة تناسب وقتك ومزاجك</AppText>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Stats strip */}
        <View style={[styles.statsRow, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          {[{ num: '12', label: 'جلسة هذا الشهر' }, { num: '3.5h', label: 'وقت التأمل' }, { num: '5', label: 'يوم متتالٍ' }].map((s, i) => (
            <View key={i} style={[styles.statItem, i > 0 && { borderRightWidth: 1, borderColor: colors.border }]}>
              <AppText variant="bodySM">{s.num}</AppText>
              <AppText variant="bodySM">{s.label}</AppText>
            </View>
          ))}
        </View>

        <AppText variant="bodySM">الجلسات المتاحة</AppText>
        {sessions.map(session => (
          <TouchableOpacity
            key={session.id}
            onPress={() => setSelectedSession(session)}
            style={[styles.sessionCard, { backgroundColor: isDark ? colors.surface : colors.white }]}
            activeOpacity={0.85}
          >
            <View style={styles.sessionCardLeft}>
              <View style={[styles.levelBadge, { backgroundColor: session.level === 'مبتدئ' ? (isDark ? 'rgba(91,168,79,0.15)' : '#DCFCE7') : session.level === 'متوسط' ? (isDark ? 'rgba(240,165,38,0.15)' : '#FEF3C7') : (isDark ? 'rgba(122,107,234,0.15)' : '#EDE9FE') } ]}>
                <AppText variant="bodySM">
                  {session.level}
                </AppText>
              </View>
              <View style={[styles.startBtn, { backgroundColor: session.color } ]}>
                <Icon name="chevronLeft" size={14} color="#fff" />
                <AppText variant="bodySM">{session.duration}د</AppText>
              </View>
            </View>
            <View style={styles.sessionInfo}>
              <AppText variant="bodySM">{session.title}</AppText>
              <AppText variant="bodySM">{session.desc}</AppText>
            </View>
            <View style={[styles.sessionEmoji, { backgroundColor: session.color + '18' } ]}>
              <AppText variant="bodySM">{session.emoji}</AppText>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '400', textAlign: 'center' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  statsRow: { borderRadius: 18, padding: 14, flexDirection: 'row-reverse', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  statNum: { fontSize: 18, fontFamily: 'Cairo-ExtraBold' },
  statLabel: { fontSize: 9, fontWeight: '400', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', textAlign: 'right' },
  sessionCard: { borderRadius: 18, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  sessionEmoji: { width: 58, height: 58, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  sessionInfo: { flex: 1, alignItems: 'flex-end', gap: 4 },
  sessionCardTitle: { fontSize: 15, fontWeight: '800' },
  sessionDesc: { fontSize: 12, fontWeight: '400', textAlign: 'right' },
  sessionCardLeft: { alignItems: 'center', gap: 8 },
  levelBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  levelText: { fontSize: 9, fontWeight: '700' },
  startBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  startBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  // Session player
  sessionContainer: { flex: 1 },
  sessionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  sessionTitleWrap: { alignItems: 'center', gap: 3 },
  sessionTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sessionDuration: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '400' },
  meditationVisual: { flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  glowRing3: { position: 'absolute', width: 280, height: 280, borderRadius: 140, borderWidth: 1 },
  glowRing2: { position: 'absolute', width: 210, height: 210, borderRadius: 105, borderWidth: 1.5 },
  meditationOrb: { width: 150, height: 150, borderRadius: 75, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  meditationEmoji: { fontSize: 56 },
  progressRingBg: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 3 },
  progressRingFill: { width: '100%', height: '100%', borderRadius: 95, borderWidth: 3 },
  timerDisplay: { position: 'absolute', bottom: 30, alignItems: 'center' },
  timerText: { color: '#fff', fontSize: 28, fontFamily: 'Cairo-ExtraBold' },
  timerOf: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '400' },
  guideBox: { marginHorizontal: 30, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 12 },
  guideStep: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '700', textAlign: 'center', lineHeight: 24 },
  controls: { alignItems: 'center', gap: 12 },
  playBtn: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden' },
  playBtnGrad: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  resetBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
});
