/**
 * Lab QC Actions — urgent/STAT/critical-value/verify/double-verify buttons
 * for booking detail views. Backed by /provider/ops/lab/bookings/:id/qc/:action
 * (live-verified Phase-1 APIs with mandatory double-verify ordering).
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, Modal } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NBtn, NCard, NBadge } from '../../components/ui';
import { SP, R, FS, FW } from '../../constants';
import client from '../../api/client';

export function LabQcActions({ booking, onDone }: { booking: any; onDone: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [busy, setBusy] = useState<string | null>(null);
  const [critNote, setCritNote] = useState('');
  const [showCrit, setShowCrit] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const qc = async (action: string, body: any = {}) => {
    setBusy(action);
    try {
      await client.post(`/provider/ops/lab/bookings/${booking.id}/qc/${action}`, body);
      show(AR ? 'تم التنفيذ' : 'Done', 'success');
      onDone();
    } catch (e: any) {
      show(e?.response?.data?.message || (AR ? 'فشل التنفيذ' : 'Failed'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const isStat = booking.priority === 'stat';
  const isUrgent = booking.priority === 'urgent';
  const verified = !!booking.verified_by;
  const doubleVerified = !!booking.double_verified_by;

  return (
    <NCard style={{ marginTop: SP.md }}>
      <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
        {AR ? ' إجراءات الجودة والأولوية' : ' QC & Priority Actions'}
      </Text>

      {/* Priority row */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.sm }}>
        <NBtn
          label={isUrgent ? (AR ? '✓ عاجل' : '✓ Urgent') : (AR ? 'تعليم كعاجل' : 'Mark Urgent')}
          size="sm" variant={isUrgent ? 'primary' : 'outline'} full={false}
          loading={busy === 'mark_urgent'} disabled={isUrgent}
          onPress={() => qc('mark_urgent')}
        />
        <NBtn
          label={isStat ? (AR ? '✓ STAT' : '✓ STAT') : 'STAT'}
          size="sm" variant={isStat ? 'primary' : 'danger'} full={false}
          loading={busy === 'mark_stat'} disabled={isStat}
          onPress={() => qc('mark_stat')}
        />
        <NBtn
          label={AR ? 'قيمة حرجة' : 'Critical Value'}
          size="sm" variant="danger" full={false}
          onPress={() => setShowCrit(true)}
        />
      </View>

      {/* Verification row */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.sm }}>
        <NBtn
          label={verified ? (AR ? '✓ تم التحقق' : '✓ Verified') : (AR ? 'تحقق' : 'Verify')}
          size="sm" variant={verified ? 'primary' : 'outline'} full={false}
          loading={busy === 'verify'} disabled={verified}
          onPress={() => qc('verify')}
        />
        <NBtn
          label={doubleVerified ? (AR ? '✓ تحقق مزدوج' : '✓ Double Verified') : (AR ? 'تحقق مزدوج' : 'Double Verify')}
          size="sm" variant={doubleVerified ? 'primary' : 'outline'} full={false}
          loading={busy === 'double_verify'}
          disabled={doubleVerified || !verified}
          onPress={() => {
            if (!verified) { show(AR ? 'التحقق الأول مطلوب قبل المزدوج' : 'First verification required before double', 'error'); return; }
            qc('double_verify');
          }}
        />
      </View>

      {/* Sample actions row */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
        <NBtn
          label={AR ? 'رفض العينة' : 'Reject Sample'}
          size="sm" variant="outline" full={false}
          onPress={() => setShowReject(true)}
        />
        <NBtn
          label={AR ? 'طلب إعادة سحب' : 'Request Recollect'}
          size="sm" variant="outline" full={false}
          loading={busy === 'recollect_requested'}
          onPress={() => qc('recollect_requested')}
        />
      </View>

      {/* Critical value modal */}
      <Modal visible={showCrit} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: theme.bg }]}>
            <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.danger, textAlign: AR ? 'right' : 'left' }}>
              {AR ? ' إبلاغ قيمة حرجة' : ' Critical Value Alert'}
            </Text>
            <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginVertical: SP.sm }}>
              {AR ? 'يُشعَر المريض والطبيب المعالج فوراً بأولوية قصوى.' : 'Patient and referring doctor are notified immediately with critical priority.'}
            </Text>
            <TextInput
              value={critNote} onChangeText={setCritNote}
              placeholder={AR ? 'مثال: K+ 6.8 — بوتاسيوم مرتفع حرج' : 'e.g. K+ 6.8 critical'}
              style={[s.input, { backgroundColor: theme.surface, color: theme.text, textAlign: AR ? 'right' : 'left' }]}
            />
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginTop: SP.md }}>
              <NBtn label={AR ? 'إرسال الإبلاغ' : 'Send Alert'} variant="danger" loading={busy === 'critical_value'}
                onPress={async () => { if (!critNote.trim()) { show(AR ? 'اكتب القيمة الحرجة' : 'Enter the critical value', 'error'); return; } setShowCrit(false); qc('critical_value', { note: critNote.trim() }); setCritNote(''); }}
                style={{ flex: 1 }} />
              <NBtn label={AR ? 'إلغاء' : 'Cancel'} variant="outline" onPress={() => setShowCrit(false)} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Sample reject modal */}
      <Modal visible={showReject} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: theme.bg }]}>
            <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'رفض العينة' : 'Reject Sample'}
            </Text>
            <TextInput
              value={rejectReason} onChangeText={setRejectReason}
              placeholder={AR ? 'السبب (مثال: عينة متحللة)' : 'Reason (e.g. hemolyzed sample)'}
              style={[s.input, { backgroundColor: theme.surface, color: theme.text, textAlign: AR ? 'right' : 'left' }]}
            />
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginTop: SP.md }}>
              <NBtn label={AR ? 'تأكيد الرفض' : 'Confirm Reject'} variant="danger" loading={busy === 'sample_rejected'}
                onPress={async () => { setShowReject(false); qc('sample_rejected', { reason: rejectReason.trim() || 'unsuitable_sample' }); setRejectReason(''); }}
                style={{ flex: 1 }} />
              <NBtn label={AR ? 'إلغاء' : 'Cancel'} variant="outline" onPress={() => setShowReject(false)} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </NCard>
  );
}

const s = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SP.xl },
  modalCard: { borderRadius: R.lg, padding: SP.lg },
  input: { borderRadius: R.md, padding: SP.md, marginTop: SP.sm, fontSize: FS.md },
});
