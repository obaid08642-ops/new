import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { AppText } from './ui';
import { Icon } from './Icon';

/**
 * d0b9ce9 / R83: the clinic the doctor registered, from GET /care/doctors/:id
 * (`clinic_name`, `clinic_address`; the backend falls back to the doctor's
 * street address). Renders nothing when the doctor published neither.
 */
export function doctorClinicInfo(doc: unknown): { name: string | null; address: string | null } {
  const d = doc && typeof doc === 'object' ? (doc as Record<string, unknown>) : {};
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return { name: text(d.clinic_name), address: text(d.clinic_address) };
}

export function DoctorClinicInfo({ doctor }: { doctor: unknown }) {
  const { colors, lang } = useApp();
  const { name, address } = doctorClinicInfo(doctor);
  if (!name && !address) return null;
  const rtl = lang !== 'en';
  return (
    <View testID="doctor-clinic-info" style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <Icon name="location" size={16} color={colors.primary} />
      <View style={styles.texts}>
        {name ? <AppText variant="bodySM" color={colors.textPrimary} style={{ textAlign: rtl ? 'right' : 'left' }}>{name}</AppText> : null}
        {address ? <AppText variant="caption" color={colors.textSecondary} style={{ textAlign: rtl ? 'right' : 'left' }}>{address}</AppText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'flex-start', gap: 6, marginBottom: 14, width: '90%' },
  texts: { flex: 1, gap: 2 },
});
