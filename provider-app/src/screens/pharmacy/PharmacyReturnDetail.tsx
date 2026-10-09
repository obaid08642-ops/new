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
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast();
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
      else show(AR ? 'تعذر جلب المرتجع' : 'Could not load the return', 'error');
    } finally { setLoading(false); }
  }, [id, AR, show]);
  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!sheet) return;
    setSaving(true);
    try {
      await client.post(`/pharmacy/returns/provider/${encodeURIComponent(id)}/respond`, buildRespondBody(sheet === 'agree', note));
      show(AR ? 'تم تسجيل ردك، وستقرر الإدارة الاسترداد' : 'Your answer was recorded; the platform admin will decide the refund', 'success');
      setSheet(null); setNote('');
      await load();
      onAnswered?.();
    } catch (err) {
      const k = returnErrorKey(err);
      show(k === 'not_yours' ? (AR ? 'هذا المرتجع ليس على طلباتك' : 'This return is not on your orders')
        : k === 'already_decided' ? (AR ? 'تم البت في هذا المرتجع بالفعل' : 'This return was already decided')
        : (AR ? 'تعذر إرسال الرد، حاول مرة أخرى' : 'Could not send your answer, try again'), 'error');
      if (k === 'already_decided') { setSheet(null); await load(); }
    } finally { setSaving(false); }
  };

  const al = AR ? 'right' : 'left';
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'تفاصيل المرتجع' : 'Return details'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
        {loading && <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} />}
        {!loading && notFound && <NEmpty title={AR ? 'مرتجع غير موجود' : 'Return not found'} subtitle={AR ? 'هذا المرتجع ليس على طلبات صيدليتك' : 'This return is not on your pharmacy orders'} />}
        {!loading && detail && (
          <>
            <NCard style={{ padding: SP.lg, marginBottom: SP.md }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: theme.text, fontWeight: FW.bold }}>{(AR ? 'طلب ' : 'Order ') + detail.orderId.slice(0, 8)}</Text>
                <NBadge size="xs" variant={detail.status === 'processing' ? 'warning' : detail.status === 'rejected' ? 'danger' : 'success'}
                  label={detail.status === 'processing' ? (AR ? 'قيد المعالجة' : 'Processing') : detail.status === 'rejected' ? (AR ? 'مرفوض' : 'Rejected') : (AR ? 'تم البت' : 'Decided')} />
              </View>
              <Text style={{ color: theme.textSub, marginTop: SP.sm, textAlign: al }}>{(AR ? 'السبب: ' : 'Reason: ') + (detail.reason || '—')}</Text>
              {!!detail.details && <Text style={{ color: theme.text, marginTop: SP.xs, textAlign: al }}>{detail.details}</Text>}
              <Text style={{ color: theme.text, fontWeight: FW.semi, marginTop: SP.sm, textAlign: al }}>
                {detail.amount === null ? '—' : `${detail.amount} ${AR ? 'ر.س' : 'SAR'}`}
              </Text>
            </NCard>

            <Text style={{ color: theme.text, fontWeight: FW.bold, marginBottom: SP.sm, textAlign: al }}>{AR ? 'صور الإثبات' : 'Evidence photos'}</Text>
            {detail.photos.length === 0
              ? <Text style={{ color: theme.textSub, marginBottom: SP.md, textAlign: al }}>{AR ? 'لم يرفق المريض صوراً' : 'The patient attached no photos'}</Text>
              : (
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.md }}>
                  {detail.photos.map((u, i) => (
                    <Image key={u} source={{ uri: u }} accessibilityLabel={(AR ? 'صورة إثبات ' : 'Evidence photo ') + (i + 1)}
                      style={{ width: 100, height: 100, borderRadius: 8, backgroundColor: theme.surface2 }} />
                  ))}
                </View>
              )}

            {detail.response && (
              <NCard style={{ padding: SP.lg, marginBottom: SP.md }}>
                <Text style={{ color: detail.response.agree ? theme.success : theme.warn, fontWeight: FW.bold, textAlign: al }}>
                  {detail.response.agree ? (AR ? 'وافقت على المرتجع' : 'You agreed with the return') : (AR ? 'اعترضت على المرتجع' : 'You disputed the return')}
                </Text>
                {!!detail.response.note && <Text style={{ color: theme.text, marginTop: SP.xs, textAlign: al }}>{detail.response.note}</Text>}
              </NCard>
            )}

            <Text style={{ color: theme.textSub, fontSize: FS.xs, marginBottom: SP.md, textAlign: al }}>
              {AR ? 'ردك لا يحسم الاسترداد: قرار القبول أو الرفض والاسترداد يتم من إدارة المنصة' : 'Your answer does not settle the refund: the platform admin decides approval, rejection and the refund'}
            </Text>

            {canRespond(detail) && (
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
                <View style={{ flex: 1 }}><NBtn label={AR ? 'موافقة' : 'Agree'} onPress={() => setSheet('agree')} /></View>
                <View style={{ flex: 1 }}><NBtn label={AR ? 'اعتراض' : 'Dispute'} variant="outline" onPress={() => setSheet('dispute')} /></View>
              </View>
            )}
          </>
        )}
      </ScrollView>
      <NSheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'agree' ? (AR ? 'الموافقة على المرتجع' : 'Agree with the return') : (AR ? 'الاعتراض على المرتجع' : 'Dispute the return')}>
        <Text style={{ color: theme.textSub, marginBottom: SP.sm, textAlign: al }}>
          {AR ? 'أضف ملاحظة اختيارية للإدارة (حتى ' : 'Add an optional note for the admin (up to '}{RETURN_NOTE_MAX}{AR ? ' حرف). الإدارة هي من تقرر الاسترداد.' : ' characters). The admin decides the refund.'}
        </Text>
        <NInput value={note} onChange={(v: string) => setNote(v.slice(0, RETURN_NOTE_MAX))} placeholder={AR ? 'ملاحظة (اختياري)' : 'Note (optional)'} multiline />
        <NBtn label={sheet === 'agree' ? (AR ? 'تأكيد الموافقة' : 'Confirm agree') : (AR ? 'تأكيد الاعتراض' : 'Confirm dispute')} onPress={submit} disabled={saving} style={{ marginTop: SP.md }} />
      </NSheet>
    </View>
  );
}
