import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useTheme, useLang } from '../../../context';
import { NCard, NBadge, NEmpty } from '../../../components/ui';
import { SP, FS, FW } from '../../../constants';

interface AppointmentItem {
  id: string;
  patient_name: string;
  scheduled_time?: string;
  time?: string;
  status: string;
  type?: string;
}

interface DoctorQueueListProps {
  appointments: AppointmentItem[];
  onSelect: (apt: AppointmentItem) => void;
}

export function DoctorQueueList({ appointments, onSelect }: DoctorQueueListProps) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const AR = lang === 'ar';

  if (!appointments || appointments.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>
          {tt('rrr.a8aefa7b')}
        </Text>
        <NEmpty title={tt('rrr.811ac3a5')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { flexDirection: AR ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {tt('rrr.a8aefa7b')}
        </Text>
        <NBadge label={`${appointments.length} ${AR ? 'مريض' : 'patients'}`} />
      </View>

      <FlatList
        data={appointments}
        keyExtractor={item => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ gap: SP.sm }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onSelect(item)} activeOpacity={0.8}>
            <NCard style={[styles.aptCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.aptRow, { flexDirection: AR ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1, alignItems: AR ? 'flex-end' : 'flex-start' }}>
                  <Text style={[styles.patientName, { color: theme.text }]}>{item.patient_name}</Text>
                  <Text style={[styles.aptTime, { color: theme.textSub }]}>
                     {item.scheduled_time || item.time || (tt('rrr.0dc10d36'))}
                  </Text>
                </View>

                <NBadge
                  label={item.status === 'COMPLETED' ? (tt('rrr.a78b4dfb')) : item.status === 'IN_PROGRESS' ? (tt('rrr.373c20b5')) : (tt('rrr.29e17b4a'))}
                  variant={item.status === 'COMPLETED' ? 'success' : item.status === 'IN_PROGRESS' ? 'warning' : 'primary'}
                />
              </View>
            </NCard>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SP.lg,
    paddingVertical: SP.md,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SP.sm,
  },
  sectionTitle: {
    fontSize: FS.lg,
    fontWeight: FW.bold,
  },
  aptCard: {
    padding: SP.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  aptRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientName: {
    fontSize: FS.md,
    fontWeight: FW.bold,
  },
  aptTime: {
    fontSize: FS.xs,
    marginTop: 4,
  },
});
