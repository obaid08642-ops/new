import React, { useCallback, useEffect, useState } from 'react';
import { View, Modal, TouchableOpacity, Text, StyleSheet, ScrollView, ActivityIndicator, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SP, FS, R, FW } from '../constants';
import { useTheme, useLang } from '../context';
import { I as NIcon } from './icons';
import client from '../api/client';

export const PROVIDER_AGREEMENT_KEY = 'provider_agreement';

export type ContractPolicy = { content: string; version: string; effective_date?: string | null };

interface ContractModalProps {
  visible: boolean;
  onClose: () => void;
  pricingDetails?: { labelAr: string; labelEn: string; price: string | number }[];
  /** A new version must be accepted to continue: no close button. */
  required?: boolean;
  /** Called with the version the server recorded, after the acceptance was saved. */
  onAccepted?: (version: string) => void;
}

/** How far from the bottom still counts as "read to the end" (text rendering rounds line heights). */
const END_SLACK = 24;
export const reachedEnd = (e: NativeScrollEvent): boolean =>
  e.contentOffset.y + e.layoutMeasurement.height >= e.contentSize.height - END_SLACK;

/**
 * The provider agreement the provider signs: the text is the versioned, admin-edited policy from the legal service
 * (Arabic for the Arabic app, English for English). There is no text written in the app: when the policy cannot be loaded the
 * modal says so and offers a retry, and the agree button stays off until the provider has scrolled to the end of the loaded text.
 */
export const ContractModal: React.FC<ContractModalProps> = ({ visible, onClose, pricingDetails, required, onAccepted }) => {
  const { theme } = useTheme();
  const { lang, t } = useLang();
  const AR = lang === 'ar';

  const [policy, setPolicy] = useState<ContractPolicy | null>(null);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [loadError, setLoadError] = useState<'failed' | 'empty' | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [viewportH, setViewportH] = useState(0);

  const load = useCallback(() => {
    setLoadingPolicy(true); setLoadError(null); setAtEnd(false); setAcceptError(false);
    client.get(`/legal/policy/${PROVIDER_AGREEMENT_KEY}?lang=${AR ? 'ar' : 'en'}`)
      .then((res: any) => {
        const d = res?.data;
        if (d?.content) setPolicy({ content: String(d.content), version: String(d.version), effective_date: d.effective_date ?? null });
        else { setPolicy(null); setLoadError('empty'); }
      })
      .catch(() => { setPolicy(null); setLoadError('failed'); })
      .finally(() => setLoadingPolicy(false));
  }, [AR]);
  useEffect(() => { if (visible) load(); }, [visible, load]);

  // a text shorter than the window has nothing to scroll: it counts as read
  const onContentSize = (_w: number, h: number) => { if (viewportH > 0 && h <= viewportH + END_SLACK) setAtEnd(true); };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => { if (reachedEnd(e.nativeEvent)) setAtEnd(true); };

  const accept = async () => {
    if (!policy || accepting) return;
    setAccepting(true); setAcceptError(false);
    try {
      const res: any = await client.post(`/legal/accept/${PROVIDER_AGREEMENT_KEY}`, {});
      const version = String(res?.data?.version ?? policy.version);
      onAccepted?.(version);
      onClose();
    } catch {
      setAcceptError(true);
    } finally {
      setAccepting(false);
    }
  };

  const canAccept = !!policy && atEnd && !accepting;
  const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'center', alignItems: 'center' },
    modal: { width: '90%', height: '80%', backgroundColor: theme.bg, borderRadius: R.lg, padding: SP.lg },
    header: { flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md },
    title: { fontSize: FS.lg, fontWeight: FW.bold, color: theme.text },
    closeBtn: { padding: SP.xs },
    content: { flex: 1, backgroundColor: theme.surface, padding: SP.md, borderRadius: R.md },
    text: { fontSize: FS.md, color: theme.text, textAlign: AR ? 'right' : 'left', lineHeight: 26 },
    meta: { fontSize: FS.xs, color: theme.textSub, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' },
    error: { fontSize: FS.sm, color: theme.danger, textAlign: AR ? 'right' : 'left', marginVertical: SP.md },
    hint: { fontSize: FS.xs, color: theme.textSub, textAlign: 'center', marginTop: SP.sm },
    pricingSection: { marginTop: SP.md, padding: SP.md, backgroundColor: theme.surface2, borderRadius: R.sm },
    pricingTitle: { fontWeight: FW.bold, marginBottom: SP.sm, color: theme.text },
    pricingRow: { flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 4 },
    confirmBtn: { padding: SP.md, borderRadius: R.md, backgroundColor: theme.primary, marginTop: SP.md },
    retryBtn: { padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: theme.primary, alignItems: 'center' },
    confirmTxt: { color: theme.textInv, textAlign: 'center', fontWeight: FW.bold },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={required ? undefined : onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('contract.title')}</Text>
            {!required && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel={t('contract.mine.close')}>
                <NIcon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            testID="contract-scroll"
            style={styles.content}
            onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
            onContentSizeChange={onContentSize}
            onScroll={onScroll}
            scrollEventThrottle={64}
          >
            {loadingPolicy && <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.lg }} />}
            {loadError && (
              <View>
                <Text style={styles.error}>{loadError === 'empty' ? t('contract.notPublished') : t('contract.loadFailed')}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={load}><Text style={{ color: theme.primary, fontWeight: FW.bold }}>{t('common.retry')}</Text></TouchableOpacity>
              </View>
            )}
            {policy && <Text style={styles.text}>{policy.content}</Text>}
            {policy && <Text style={styles.meta}>{t('contract.version', { version: policy.version })}</Text>}
            {policy?.effective_date ? <Text style={styles.meta}>{t('contract.effective', { date: new Date(policy.effective_date).toLocaleDateString(AR ? 'ar' : 'en') })}</Text> : null}

            {policy && pricingDetails && pricingDetails.length > 0 && (
              <View style={styles.pricingSection}>
                <Text style={styles.pricingTitle}>{t('contract.pricingAnnex')}</Text>
                {pricingDetails.map((item, idx) => (
                  <View key={idx} style={styles.pricingRow}>
                    <Text style={{ color: theme.textSub }}>{AR ? item.labelAr : item.labelEn}</Text>
                    <Text style={{ fontWeight: FW.bold, color: theme.text }}>{item.price} {t('contract.currency')}</Text>
                  </View>
                ))}
              </View>
            )}

            {policy && <Text style={[styles.text, { marginTop: SP.md, fontWeight: FW.bold }]}>{t('contract.bindingNote')}</Text>}
          </ScrollView>

          {acceptError && <Text style={styles.error}>{t('contract.acceptFailed')}</Text>}
          {!!policy && !atEnd && <Text style={styles.hint}>{t('contract.readToEnd')}</Text>}
          <TouchableOpacity
            style={[styles.confirmBtn, !canAccept && { opacity: 0.5 }]}
            disabled={!canAccept}
            onPress={accept}
            accessibilityState={{ disabled: !canAccept }}
          >
            <Text style={styles.confirmTxt}>{accepting ? t('contract.recording') : t('contract.accept')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
