import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NBtn, NSecHeader, NScroll, NBadge } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';

export function FacilityInvitationsScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [invitations, setInvitations] = useState([
    {
      id: 'inv-101',
      facilityName: 'مستشفى النور التخصصي',
      date: '2026-10-01',
      status: 'pending',
      permissions: ['إدارة الجدول', 'شركات التأمين', 'الاستشارات عن بعد']
    }
  ]);

  const handleAccept = (id: string) => {
    setInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'accepted' } : inv));
    show(AR ? 'تم قبول الدعوة بنجاح. أنت الآن تعمل ضمن منشأة.' : 'Invitation accepted. You are now linked to the facility.', 'success');
  };

  const handleReject = (id: string) => {
    setInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'rejected' } : inv));
    show(AR ? 'تم رفض الدعوة' : 'Invitation rejected', 'info');
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'دعوات المنشآت' : 'Facility Invitations'} onBack={onBack} />
      
      <View style={{ padding: SP.xl }}>
        {invitations.length === 0 ? (
          <Text style={{ textAlign: 'center', color: theme.textSub, marginTop: SP.xxl }}>
            {AR ? 'لا توجد دعوات حالياً' : 'No pending invitations'}
          </Text>
        ) : (
          invitations.map(inv => (
            <NCard key={inv.id} style={{ marginBottom: SP.lg, borderColor: inv.status === 'pending' ? theme.primary : theme.border }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
                  {inv.facilityName}
                </Text>
                <NBadge 
                  label={inv.status === 'pending' ? (AR ? 'قيد الانتظار' : 'Pending') : inv.status === 'accepted' ? (AR ? 'مقبولة' : 'Accepted') : (AR ? 'مرفوضة' : 'Rejected')} 
                  variant={inv.status === 'pending' ? 'primary' : inv.status === 'accepted' ? 'success' : 'danger'} 
                />
              </View>

              <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
                {AR ? `تاريخ الدعوة: ${inv.date}` : `Date: ${inv.date}`}
              </Text>

              <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'الصلاحيات المطلوبة (Permissions):' : 'Requested Permissions:'}
              </Text>
              
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.xs, marginBottom: SP.lg }}>
                {inv.permissions.map((perm, i) => (
                  <View key={i} style={{ backgroundColor: theme.surface2, paddingHorizontal: SP.sm, paddingVertical: 4, borderRadius: R.md }}>
                    <Text style={{ fontSize: FS.xs, color: theme.text }}>{perm}</Text>
                  </View>
                ))}
              </View>

              {inv.status === 'pending' && (
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
                  <NBtn label={AR ? 'قبول وانضمام' : 'Accept & Join'} onPress={() => handleAccept(inv.id)} style={{ flex: 1 }} />
                  <NBtn label={AR ? 'رفض' : 'Decline'} onPress={() => handleReject(inv.id)} variant="outline" style={{ flex: 1, borderColor: theme.danger }} labelStyle={{ color: theme.danger }} />
                </View>
              )}
            </NCard>
          ))
        )}
      </View>
    </NScroll>
  );
}
