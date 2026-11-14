// @ts-nocheck
/**
 * Legacy route — canonical doctor profile lives at /consultations/doctor/[id].
 * This screen exists only to keep old links working (clinic page, map,
 * therapist-match, deep links /s/doctor/:slug). It redirects immediately.
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { AppText } from '../../src/components/ui';
import { useScreenUi } from '../../src/components/screen/ScreenKit';

export default function DoctorProfileRedirect() {
  const { colors } = useApp();
  const { k } = useScreenUi();
  const params = useLocalSearchParams();
  const doctorId = (params.doctorId || params.id || '') as string;

  useEffect(() => {
    if (doctorId) {
      router.replace(`/consultations/doctor/${encodeURIComponent(doctorId)}`);
    } else {
      router.replace('/consultations/doctor-search');
    }
  }, [doctorId]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="bodySM" color={colors.textSecondary} style={{ marginTop: 12 }}>
        {k('link.opening.doctor')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
