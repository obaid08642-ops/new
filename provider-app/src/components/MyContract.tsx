import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SP, FS, R, FW } from '../constants';
import { useTheme, useLang, useToast } from '../context';
import { I as NIcon } from './icons';
import client from '../api/client';
import { contractFileName, saveContractPdf, shareContractPdf } from '../utils/contractFile';

type Signed = { pdf_base64: string; sha256?: string; generated_at?: string; signed_at?: string | null; language?: 'ar' | 'en' };

/** What the server said when the signed PDF was asked for: 404 = there is no signed contract yet. The signer is never refused (no admin switch). */
export const contractErrorKey = (status?: number): 'contract.mine.notReady' | 'contract.mine.failed' =>
  status === 404 ? 'contract.mine.notReady' : 'contract.mine.failed';

/** The signed PDF in the app's language; a contract with no PDF in that language (the agreement had no English text) comes in Arabic. */
export async function fetchMyContract(lang: 'ar' | 'en'): Promise<Signed> {
  try {
    const res: any = await client.get('/provider-onboarding/contract', { params: { lang } });
    return res.data as Signed;
  } catch (e: any) {
    if (lang === 'en' && e?.response?.status === 404 && JSON.stringify(e?.response?.data ?? '').includes('contract_language_unavailable')) {
      const res: any = await client.get('/provider-onboarding/contract', { params: { lang: 'ar' } });
      return res.data as Signed;
    }
    throw e;
  }
}

/** A settings row that opens the provider's own signed contract: when it was signed, its fingerprint, and download or share. */
export function MyContractRow() {
  const { theme } = useTheme();
  const { lang, t } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signed, setSigned] = useState<Signed | null>(null);
  const [errorKey, setErrorKey] = useState<ReturnType<typeof contractErrorKey> | null>(null);

  const load = async () => {
    setBusy(true); setErrorKey(null); setSigned(null);
    try {
      const data = await fetchMyContract(AR ? 'ar' : 'en');
      if (!data?.pdf_base64) throw Object.assign(new Error('empty'), { response: { status: 404 } });
      setSigned(data);
    } catch (e: any) {
      setErrorKey(contractErrorKey(e?.response?.status));
    } finally { setBusy(false); }
  };
  const openIt = () => { setOpen(true); void load(); };

  const download = async () => {
    if (!signed) return;
    try { await saveContractPdf(signed.pdf_base64, contractFileName(signed.sha256)); show(t('contract.mine.saved'), 'success'); }
    catch { show(t('contract.mine.failed'), 'error'); }
  };
  const share = async () => {
    if (!signed) return;
    try {
      const r = await shareContractPdf(signed.pdf_base64, contractFileName(signed.sha256), t('contract.mine.title'));
      if (r === 'unsupported') show(t('contract.mine.shareUnsupported'), 'info');
    } catch { show(t('contract.mine.failed'), 'error'); }
  };

  const row = AR ? 'row-reverse' : 'row';
  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'center', alignItems: 'center' },
    sheet: { width: '90%', backgroundColor: theme.bg, borderRadius: R.lg, padding: SP.lg, gap: SP.md },
    head: { flexDirection: row, justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: FS.lg, fontWeight: FW.bold, color: theme.text },
    line: { fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' },
    error: { fontSize: FS.sm, color: theme.danger, textAlign: AR ? 'right' : 'left' },
    btn: { padding: SP.md, borderRadius: R.md, alignItems: 'center' },
  });
  const signedAt = signed?.signed_at || signed?.generated_at;
  const when = signedAt ? new Date(signedAt).toLocaleDateString(AR ? 'ar' : 'en') : '—';

  return (
    <>
      <TouchableOpacity onPress={openIt} style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between', paddingVertical: SP.sm }} accessibilityRole="button">
        <View style={{ flexDirection: row, alignItems: 'center', gap: SP.sm }}>
          <NIcon name="document" size={20} color={theme.primary} />
          <Text style={{ color: theme.text, fontSize: FS.md }}>{t('contract.mine.row')}</Text>
        </View>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.head}>
              <Text style={s.title}>{t('contract.mine.title')}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} accessibilityLabel={t('contract.mine.close')}><NIcon name="close" size={24} color={theme.text} /></TouchableOpacity>
            </View>
            {busy && <ActivityIndicator color={theme.primary} />}
            {errorKey && (
              <>
                <Text style={s.error}>{t(errorKey)}</Text>
                {errorKey === 'contract.mine.failed' && (
                  <TouchableOpacity style={[s.btn, { borderWidth: 1, borderColor: theme.primary }]} onPress={load}><Text style={{ color: theme.primary, fontWeight: FW.bold }}>{t('common.retry')}</Text></TouchableOpacity>
                )}
              </>
            )}
            {signed && (
              <>
                <Text style={s.line}>{t('contract.mine.signedAt', { date: when })}</Text>
                {!!signed.sha256 && <Text style={s.line}>{t('contract.mine.fingerprint', { hash: signed.sha256 })}</Text>}
                <TouchableOpacity style={[s.btn, { backgroundColor: theme.primary }]} onPress={download}><Text style={{ color: theme.textInv, fontWeight: FW.bold }}>{t('contract.mine.download')}</Text></TouchableOpacity>
                <TouchableOpacity style={[s.btn, { borderWidth: 1, borderColor: theme.primary }]} onPress={share}><Text style={{ color: theme.primary, fontWeight: FW.bold }}>{t('contract.mine.share')}</Text></TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
