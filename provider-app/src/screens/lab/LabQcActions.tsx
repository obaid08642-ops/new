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
  const { lang, t: tt } = useLang();
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
      show(tt('qc.515c6f3d'), 'success');
      onDone();
    } catch (e: any) {
      show(e?.response?.data?.message || (tt('qc.30abe1ad')), 'error');
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
        {tt('qc.dc7e1205')}
      </Text>

      {/* Priority row */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.sm }}>
        <NBtn
          label={isUrgent ? (tt('qc.2d516396')) : (tt('qc.013937c2'))}
          size="sm" variant={isUrgent ? 'primary' : 'outline'} full={false}
          loading={busy === 'mark_urgent'} disabled={isUrgent}
          onPress={() => qc('mark_urgent')}
        />
        <NBtn
          label={isStat ? tt('labQc.statLabel') : 'STAT'}
          size="sm" variant={isStat ? 'primary' : 'danger'} full={false}
          loading={busy === 'mark_stat'} disabled={isStat}
          onPress={() => qc('mark_stat')}
        />
        <NBtn
          label={tt('qc.4d9b4950')}
          size="sm" variant="danger" full={false}
          onPress={() => setShowCrit(true)}
        />
      </View>

      {/* Verification row */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.sm }}>
        <NBtn
          label={verified ? (tt('qc.f39a812f')) : (tt('qc.1fb1b8cb'))}
          size="sm" variant={verified ? 'primary' : 'outline'} full={false}
          loading={busy === 'verify'} disabled={verified}
          onPress={() => qc('verify')}
        />
        <NBtn
          label={doubleVerified ? (tt('qc.0a13b966')) : (tt('qc.c6906190'))}
          size="sm" variant={doubleVerified ? 'primary' : 'outline'} full={false}
          loading={busy === 'double_verify'}
          disabled={doubleVerified || !verified}
          onPress={() => {
            if (!verified) { show(tt('qc.0ade0daa'), 'error'); return; }
            qc('double_verify');
          }}
        />
      </View>

      {/* Sample actions row */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
        <NBtn
          label={tt('qc.b21b3489')}
          size="sm" variant="outline" full={false}
          onPress={() => setShowReject(true)}
        />
        <NBtn
          label={tt('qc.03292582')}
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
              {tt('qc.c6e1d53d')}
            </Text>
            <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginVertical: SP.sm }}>
              {tt('qc.6be25773')}
            </Text>
            <TextInput
              value={critNote} onChangeText={setCritNote}
              placeholder={tt('qc.e2877391')}
              style={[s.input, { backgroundColor: theme.surface, color: theme.text, textAlign: AR ? 'right' : 'left' }]}
            />
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginTop: SP.md }}>
              <NBtn label={tt('qc.dd0464db')} variant="danger" loading={busy === 'critical_value'}
                onPress={async () => { if (!critNote.trim()) { show(tt('qc.42158617'), 'error'); return; } setShowCrit(false); qc('critical_value', { note: critNote.trim() }); setCritNote(''); }}
                style={{ flex: 1 }} />
              <NBtn label={tt('qc.210b779f')} variant="outline" onPress={() => setShowCrit(false)} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Sample reject modal */}
      <Modal visible={showReject} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: theme.bg }]}>
            <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
              {tt('qc.b21b3489')}
            </Text>
            <TextInput
              value={rejectReason} onChangeText={setRejectReason}
              placeholder={tt('qc.72f9c8d2')}
              style={[s.input, { backgroundColor: theme.surface, color: theme.text, textAlign: AR ? 'right' : 'left' }]}
            />
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginTop: SP.md }}>
              <NBtn label={tt('qc.b8f03747')} variant="danger" loading={busy === 'sample_rejected'}
                onPress={async () => { setShowReject(false); qc('sample_rejected', { reason: rejectReason.trim() || 'unsuitable_sample' }); setRejectReason(''); }}
                style={{ flex: 1 }} />
              <NBtn label={tt('qc.210b779f')} variant="outline" onPress={() => setShowReject(false)} style={{ flex: 1 }} />
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
