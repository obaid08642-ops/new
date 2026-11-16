/**
 * P7: one return of this pharmacy's orders, with the patient's evidence photos, and the agree / dispute answer.
 * The admin decides the refund; this screen only records the pharmacy's position.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NBtn, NCard, NHeader, NSheet, NInput, NBadge, NEmpty } from '../../components/ui';
import { SP, FS, FW } from '../../constants';
import client from '../../api/client';
import { ReturnDetail, buildRespondBody, canRespond, mapReturnDetail, returnErrorKey, RETURN_NOTE_MAX } from './returnRespond';

export function PharmacyReturnDetail({ id, onBack, onAnswered }: { id: string; onBack: () => void; onAnswered?: () => void }) {
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const { show } = useToast();
  const AR = lang === 'ar';
  const [detail, setDetail] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sheet, setSheet] = useState<'agree' | 'dispute' | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setNotFound(false);
    try {
      const res = await client.get(`/pharmacy/returns/provider/${encodeURIComponent(id)}`);
      setDetail(mapReturnDetail(res.data));
    } catch (err) {
      setDetail(null);
      if (returnErrorKey(err) === 'not_yours') setNotFound(true);
      else show(tt('prd.642ce947'), 'error');
    } finally { setLoading(false); }
  }, [id, AR, show]);
  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!sheet) return;
    setSaving(true);
    try {
      await client.post(`/pharmacy/returns/provider/${encodeURIComponent(id)}/respond`, buildRespondBody(sheet === 'agree', note));
      show(tt('prd.a681e6a4'), 'success');
      setSheet(null); setNote('');
      await load();
      onAnswered?.();
    } catch (err) {
      const k = returnErrorKey(err);
      show(k === 'not_yours' ? (tt('prd.82233715'))
        : k === 'already_decided' ? (tt('prd.17730d60'))
        : (tt('prd.63da7d6b')), 'error');
      if (k === 'already_decided') { setSheet(null); await load(); }
    } finally { setSaving(false); }
  };

  const al = AR ? 'right' : 'left';
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('prd.98cf71a4')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
        {loading && <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} />}
        {!loading && notFound && <NEmpty title={tt('prd.9df37033')} subtitle={tt('prd.3cb362d5')} />}
        {!loading && detail && (
          <>
            <NCard style={{ padding: SP.lg, marginBottom: SP.md }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: theme.text, fontWeight: FW.bold }}>{(tt('prd.520d902c')) + detail.orderId.slice(0, 8)}</Text>
                <NBadge size="xs" variant={detail.status === 'processing' ? 'warning' : detail.status === 'rejected' ? 'danger' : 'success'}
                  label={detail.status === 'processing' ? (tt('prd.6a7f7505')) : detail.status === 'rejected' ? (tt('prd.8290f876')) : (tt('prd.860c99a6'))} />
              </View>
              <Text style={{ color: theme.textSub, marginTop: SP.sm, textAlign: al }}>{(tt('prd.61065b69')) + (detail.reason || '—')}</Text>
              {!!detail.details && <Text style={{ color: theme.text, marginTop: SP.xs, textAlign: al }}>{detail.details}</Text>}
              <Text style={{ color: theme.text, fontWeight: FW.semi, marginTop: SP.sm, textAlign: al }}>
                {detail.amount === null ? '—' : `${detail.amount} ${tt('prd.91d5796f')}`}
              </Text>
            </NCard>

            <Text style={{ color: theme.text, fontWeight: FW.bold, marginBottom: SP.sm, textAlign: al }}>{tt('prd.154df1dd')}</Text>
            {detail.photos.length === 0
              ? <Text style={{ color: theme.textSub, marginBottom: SP.md, textAlign: al }}>{tt('prd.eedc8f21')}</Text>
              : (
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.md }}>
                  {detail.photos.map((u, i) => (
                    <Image key={u} source={{ uri: u }} accessibilityLabel={(tt('prd.cc480824')) + (i + 1)}
                      style={{ width: 100, height: 100, borderRadius: 8, backgroundColor: theme.surface2 }} />
                  ))}
                </View>
              )}

            {detail.response && (
              <NCard style={{ padding: SP.lg, marginBottom: SP.md }}>
                <Text style={{ color: detail.response.agree ? theme.success : theme.warn, fontWeight: FW.bold, textAlign: al }}>
                  {detail.response.agree ? (tt('prd.601971bc')) : (tt('prd.b0eaa262'))}
                </Text>
                {!!detail.response.note && <Text style={{ color: theme.text, marginTop: SP.xs, textAlign: al }}>{detail.response.note}</Text>}
              </NCard>
            )}

            <Text style={{ color: theme.textSub, fontSize: FS.xs, marginBottom: SP.md, textAlign: al }}>
              {tt('prd.42cb8fdb')}
            </Text>

            {canRespond(detail) && (
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
                <View style={{ flex: 1 }}><NBtn label={tt('prd.925a3d1f')} onPress={() => setSheet('agree')} /></View>
                <View style={{ flex: 1 }}><NBtn label={tt('prd.0ce34c54')} variant="outline" onPress={() => setSheet('dispute')} /></View>
              </View>
            )}
          </>
        )}
      </ScrollView>
      <NSheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'agree' ? (tt('prd.104675c0')) : (tt('prd.2c287425'))}>
        <Text style={{ color: theme.textSub, marginBottom: SP.sm, textAlign: al }}>
          {tt('prd.8fa179b5')}{RETURN_NOTE_MAX}{tt('prd.be83d9fc')}
        </Text>
        <NInput value={note} onChange={(v: string) => setNote(v.slice(0, RETURN_NOTE_MAX))} placeholder={tt('prd.9e8fd92b')} multiline />
        <NBtn label={sheet === 'agree' ? (tt('prd.191d2a4c')) : (tt('prd.f9e6b562'))} onPress={submit} disabled={saving} style={{ marginTop: SP.md }} />
      </NSheet>
    </View>
  );
}
