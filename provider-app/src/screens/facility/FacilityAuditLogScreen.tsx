import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme, useLang } from '../../context';
import { NHeader, NCard, NScroll, NBadge } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';

export function FacilityAuditLogScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const AR = lang === 'ar';

  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  React.useEffect(() => {
    client.get('/provider/facility/audit-logs')
      .then(res => setAuditLogs(res.data || []))
      .catch(() => setAuditLogs([]));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('rrar.ff138587')} onBack={onBack} />
      
      <View style={{ padding: SP.md, backgroundColor: theme.surface }}>
        <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center' }}>
          {tt('rrar.951ef6ec')}
        </Text>
      </View>

      <NScroll>
        <View style={{ padding: SP.xl }}>
          {auditLogs.map(log => (
            <NCard key={log.id} style={{ marginBottom: SP.md, borderLeftWidth: 4, borderLeftColor: log.severity === 'danger' ? theme.danger : log.severity === 'warning' ? theme.warn : theme.primary }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SP.sm }}>
                <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>
                  {log.user || (log.actor ? String(log.actor).slice(0, 8) : '—')}
                </Text>
                <Text style={{ fontSize: 10, color: theme.textSub }}>
                  {log.date || (log.created_at ? new Date(log.created_at).toLocaleString() : '')}
                </Text>
              </View>
              
              <Text style={{ fontSize: FS.md, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                {log.action}
              </Text>

              <View style={{ backgroundColor: theme.surface2, padding: SP.sm, borderRadius: R.sm }}>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                  {tt('rrar.6b882c5a')} <Text style={{ color: theme.text, fontWeight: FW.bold }}>{log.target}</Text>
                </Text>
              </View>
            </NCard>
          ))}
        </View>
      </NScroll>
    </View>
  );
}
