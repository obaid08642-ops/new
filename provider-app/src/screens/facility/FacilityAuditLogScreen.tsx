import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme, useLang } from '../../context';
import { NHeader, NCard, NScroll, NBadge } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';

export function FacilityAuditLogScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';

  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  React.useEffect(() => {
    client.get('/provider/facility/audit-logs')
      .then(res => setAuditLogs(res.data || []))
      .catch(() => setAuditLogs([]));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'سجل التدقيق (Audit Logs)' : 'Audit Logs'} onBack={onBack} />
      
      <View style={{ padding: SP.md, backgroundColor: theme.surface }}>
        <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center' }}>
          {AR ? 'تتبع وتوثيق كافة التعديلات والإجراءات المتخذة على حسابات المزودين المرتبطين' : 'Track and document all actions and changes made to linked providers'}
        </Text>
      </View>

      <NScroll>
        <View style={{ padding: SP.xl }}>
          {auditLogs.map(log => (
            <NCard key={log.id} style={{ marginBottom: SP.md, borderLeftWidth: 4, borderLeftColor: log.severity === 'danger' ? theme.danger : log.severity === 'warning' ? theme.warn : theme.primary }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SP.sm }}>
                <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>
                  {log.user}
                </Text>
                <Text style={{ fontSize: 10, color: theme.textSub }}>
                  {log.date}
                </Text>
              </View>
              
              <Text style={{ fontSize: FS.md, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                {log.action}
              </Text>

              <View style={{ backgroundColor: theme.surface2, padding: SP.sm, borderRadius: R.sm }}>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'المستهدف / التأثير:' : 'Target / Impact:'} <Text style={{ color: theme.text, fontWeight: FW.bold }}>{log.target}</Text>
                </Text>
              </View>
            </NCard>
          ))}
        </View>
      </NScroll>
    </View>
  );
}
