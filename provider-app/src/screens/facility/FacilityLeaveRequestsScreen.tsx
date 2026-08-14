import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NBadge, NBtn, NScroll } from '../../components/ui';
import { FS, FW, SP, R } from '../../constants';
import { ProviderApi } from '../../api/provider';

interface LeaveRequest {
  id: string;
  providerName: string;
  providerType: string;
  type: 'vacation' | 'emergency';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

import client from '../../api/client';

export function FacilityLeaveRequestsScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await client.get('/provider/leave-requests');
      setRequests(res.data || []);
    } catch (e) {
      console.warn('Failed to fetch leave requests', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    try {
      await client.post('/provider/leave-requests/action', { id, action });
      setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: action } : r));
      show(AR ? `تم ${action === 'approved' ? 'قبول' : 'رفض'} الطلب` : `Request ${action}`, 'success');
    } catch (e) {
      show(AR ? 'حدث خطأ' : 'An error occurred', 'error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'إدارة الإجازات والأعذار' : 'Leave Management'} onBack={onBack} />
      <NScroll>
        <View style={{ padding: SP.xl, gap: SP.md }}>
          {requests.map(req => (
            <NCard key={req.id}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ alignItems: AR ? 'flex-end' : 'flex-start', flex: 1 }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{req.providerName}</Text>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4 }}>{req.providerType}</Text>
                  <Text style={{ fontSize: FS.sm, color: theme.text, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? 'السبب: ' : 'Reason: '}{req.reason}
                  </Text>
                  <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: 4 }}>
                    {req.startDate} ➔ {req.endDate}
                  </Text>
                </View>
                <NBadge 
                  label={req.status === 'pending' ? (AR ? 'قيد الانتظار' : 'Pending') : req.status === 'approved' ? (AR ? 'مقبول' : 'Approved') : (AR ? 'مرفوض' : 'Rejected')} 
                  variant={req.status === 'pending' ? 'warning' : req.status === 'approved' ? 'success' : 'danger'} 
                />
              </View>

              {req.status === 'pending' && (
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginTop: SP.lg }}>
                  <NBtn 
                    label={AR ? 'رفض' : 'Reject'} 
                    variant="outline" 
                    full={false} 
                    style={{ flex: 1, borderColor: theme.danger }} 
                    labelStyle={{ color: theme.danger }} 
                    onPress={() => handleAction(req.id, 'rejected')} 
                  />
                  <NBtn 
                    label={AR ? 'قبول' : 'Approve'} 
                    full={false} 
                    style={{ flex: 1, backgroundColor: theme.success }} 
                    onPress={() => handleAction(req.id, 'approved')} 
                  />
                </View>
              )}
            </NCard>
          ))}
          {requests.length === 0 && (
            <Text style={{ textAlign: 'center', color: theme.textSub, marginTop: SP.xxl }}>
              {AR ? 'لا توجد طلبات إجازة' : 'No leave requests'}
            </Text>
          )}
        </View>
      </NScroll>
    </View>
  );
}
