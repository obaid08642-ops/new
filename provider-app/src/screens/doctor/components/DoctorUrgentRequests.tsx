import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useTheme, useLang } from '../../../context';
import { NCard, NBtn, NBadge } from '../../../components/ui';
import { SP, FS, FW } from '../../../constants';

interface UrgentRequest {
  id: string;
  patient_name: string;
  symptoms?: string;
  urgent_type?: string;
  createdAt?: string;
}

interface DoctorUrgentRequestsProps {
  requests: UrgentRequest[];
  onAccept: (request: UrgentRequest) => void;
  onDecline: (requestId: string) => void;
}

export function DoctorUrgentRequests({ requests, onAccept, onDecline }: DoctorUrgentRequestsProps) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';

  if (!requests || requests.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { flexDirection: AR ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.title, { color: theme.danger }]}>
          {AR?' طلبات كشف مستعجلة':' Urgent Consultation Requests'}
        </Text>
        <NBadge label={String(requests.length)} variant="danger" />
      </View>

      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: SP.md }}
        renderItem={({ item }) => (
          <NCard style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.danger }]}>
            <View style={{ alignItems: AR ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.patientName, { color: theme.text }]}>{item.patient_name}</Text>
              <Text style={[styles.symptoms, { color: theme.textSub }]} numberOfLines={2}>
                {item.symptoms || (AR ? 'طلب استشارة فورية' : 'Immediate consultation request')}
              </Text>
            </View>

            <View style={[styles.actionRow, { flexDirection: AR ? 'row-reverse' : 'row' }]}>
              <NBtn
                label={AR ? 'قبول' : 'Accept'}
                onPress={() => onAccept(item)}
                size="sm"
                variant="primary"
                style={{ flex: 1 }}
              />
              <NBtn
                label={AR ? 'رفض' : 'Decline'}
                onPress={() => onDecline(item.id)}
                size="sm"
                variant="outline"
                style={{ flex: 1 }}
              />
            </View>
          </NCard>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SP.lg,
    paddingVertical: SP.sm,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SP.sm,
  },
  title: {
    fontSize: FS.md,
    fontWeight: FW.bold,
  },
  card: {
    width: 260,
    padding: SP.md,
    borderWidth: 1.5,
    borderRadius: 16,
    gap: SP.sm,
  },
  patientName: {
    fontSize: FS.md,
    fontWeight: FW.bold,
  },
  symptoms: {
    fontSize: FS.xs,
    marginTop: 2,
  },
  actionRow: {
    gap: SP.xs,
    marginTop: SP.xs,
  },
});
