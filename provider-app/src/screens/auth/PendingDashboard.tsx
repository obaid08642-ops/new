import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StatusBar } from 'react-native';
import { useTheme, useLang } from '../../context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NCard, NBtn, NInput } from '../../components/ui';
import { I } from '../../components/icons';
import { SP, FS, FW } from '../../constants';
import client from '../../api/client';
import { useAuth, useToast } from '../../context';
import { reasonFromProgress, type BlockedAccountState } from '../../utils/accountStatus';
import { localeTag } from '../../i18n';

interface ReviewedDoc { doc_type?: string; review_status?: string; reviewer_note?: string }
function errorText(err: unknown, fallback: string): string {
  const e = err as { message?: unknown; response?: { data?: { message?: unknown } } } | null;
  const m = e?.response?.data?.message ?? e?.message;
  return typeof m === 'string' && m ? m : fallback;
}

/**
 * Screen for every account that is not approved yet. `status` says which one:
 *   pending        under review (refresh button + "sign in again" hint once approved, GET /provider-onboarding/my-profile)
 *   needs_changes  the reviewer asked for changes (reason + documents, resubmit: POST /provider/onboarding/submit)
 *   rejected       rejected (reason from GET /provider-onboarding/progress, resubmit path as above)
 *   suspended      suspended (reason if the server exposes one; no resubmit, the server has no such transition)
 */
export function PendingDashboard({ onExplore, onLogout, providerType, status = 'pending', onOpenDocuments }: {
  onExplore: () => void; onLogout: () => void; providerType?: string; status?: BlockedAccountState; onOpenDocuments?: () => void;
}) {
  const { theme } = useTheme();
  const { lang, t } = useLang();
  const { user, refreshSession } = useAuth();
  const AR = lang === 'ar';
  const { show } = useToast();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  // refresh / approval hint (pending) and review details (needs_changes, rejected, suspended)
  const [checking, setChecking] = useState(false);
  const [approved, setApproved] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [flaggedDocs, setFlaggedDocs] = useState<ReviewedDoc[]>([]);
  const [resubmitting, setResubmitting] = useState(false);

  useEffect(() => {
    // Needs-review issue 1175: only the server's email_verified hides the email OTP card.
    if (user?.emailVerified) setEmailVerified(true);
  }, [user]);

  const sendOtp = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      // F11: provider OTP endpoints (email verification for the provider account).
      await client.post('/provider/auth/send-otp', { email: user.email });
      setOtpSent(true);
    } catch (e) {
      show(t('status.toast.otpFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || !user?.email) return;
    setLoading(true);
    try {
      await client.post('/provider/auth/verify-email', { email: user.email, code: otp });
      setEmailVerified(true);
       // refresh global state
    } catch (e) {
      show(t('status.toast.otpInvalid'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // A2: ask the server for the current status. Approval revokes the old sessions, so a rejected call (or an
  // "active" profile) means: sign in again to open the dashboard.
  const checkStatus = useCallback(async (silent: boolean) => {
    setChecking(true);
    try {
      const res = await client.get('/provider-onboarding/my-profile');
      const profile: { status?: string } = res?.data?.data || res?.data || {};
      setCheckedAt(new Date());
      const s = String(profile.status || '').toLowerCase();
      if (s === 'active' || s === 'approved') { setApproved(true); setSessionEnded(false); }
      else if (!silent) show(t('status.toast.stillReview'), 'info');
    } catch (e) {
      const code = (e as { statusCode?: number; response?: { status?: number } } | null);
      const http = code?.statusCode ?? code?.response?.status;
      if ((http === 401 || http === 403) && !silent) setSessionEnded(true);
      else if (!silent) show(t('status.toast.refreshFailed'), 'error');
    } finally {
      setChecking(false);
    }
  }, [t, show]);

  // A1: the reviewer's reason and the documents that need replacing.
  const loadReview = useCallback(async () => {
    try {
      const res = await client.get('/provider-onboarding/progress');
      setReason(reasonFromProgress(res?.data?.data || res?.data));
    } catch { /* the screen still explains the state */ }
    try {
      const res = await client.get('/provider/kyc/documents');
      const docs: ReviewedDoc[] = Array.isArray(res?.data?.documents) ? res.data.documents : [];
      setFlaggedDocs(docs.filter(d => String(d.review_status || '').toLowerCase() === 'needs_replacement'));
    } catch { /* optional */ }
  }, []);

  useEffect(() => {
    if (status === 'pending') void checkStatus(true);
    else void loadReview();
  }, [status, checkStatus, loadReview]);

  const resubmit = async () => {
    setResubmitting(true);
    try {
      await client.post('/provider/onboarding/submit', {});
      show(t('status.toast.resubmitted'), 'success');
      await refreshSession();
    } catch (e) {
      show(errorText(e, t('status.toast.resubmitFailed')), 'error');
    } finally {
      setResubmitting(false);
    }
  };

  const copy = {
    pending: {
      icon: 'hourglass', tint: theme.warnBg,
      title: t('status.pending.title'),
      body: t('status.pending.body'),
    },
    needs_changes: {
      icon: 'edit', tint: theme.warnBg,
      title: t('status.changes.title'),
      body: t('status.changes.body'),
    },
    rejected: {
      icon: 'close', tint: theme.danger,
      title: t('status.rejected.title'),
      body: t('status.rejected.body'),
    },
    suspended: {
      icon: 'lock', tint: theme.danger,
      title: t('status.suspended.title'),
      body: t('status.suspended.body'),
    },
  }[status];

  const canResubmit = status === 'needs_changes' || status === 'rejected';

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBar} />
      <ScrollView contentContainerStyle={{ padding: SP.xl, paddingTop: insets.top + 12, paddingBottom: 48 }}>

        <View style={{ alignItems: 'center', marginBottom: SP.xxl }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: copy.tint,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: SP.lg,
          }}>
            <I name={copy.icon} size={36} color="#FFF" />
          </View>
          <Text style={{ fontSize: FS['3xl'], fontWeight: FW.bold, color: theme.text, textAlign: 'center', marginBottom: SP.sm }}>
            {copy.title}
          </Text>
          <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', lineHeight: 24 }}>
            {copy.body}
          </Text>
        </View>

        {status !== 'pending' && (
          <NCard style={{ marginBottom: SP.xl, borderColor: theme.warn, borderWidth: 1 }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
              {t('status.reason')}
            </Text>
            <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
              {reason || t('status.noReason')}
            </Text>
            {flaggedDocs.map((d, i) => (
              <View key={`${d.doc_type}-${i}`} style={{ marginTop: SP.md }}>
                <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{d.doc_type}</Text>
                {d.reviewer_note ? <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{d.reviewer_note}</Text> : null}
              </View>
            ))}
          </NCard>
        )}

        {canResubmit && (
          <View style={{ marginBottom: SP.xl, gap: SP.md }}>
            {onOpenDocuments ? <NBtn label={t('status.updateDocs')} variant="outline" onPress={onOpenDocuments} /> : null}
            <NBtn label={t('status.resubmit')} loading={resubmitting} onPress={resubmit} />
          </View>
        )}

        {status === 'pending' && (approved || sessionEnded) && (
          <NCard style={{ marginBottom: SP.xl, backgroundColor: theme.successBg, borderColor: theme.success, borderWidth: 1 }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.success, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
              {approved ? t('status.approved') : t('status.sessionEnded')}
            </Text>
            <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
              {t('status.signInAgainHint')}
            </Text>
            <NBtn label={t('status.signInAgain')} onPress={onLogout} />
          </NCard>
        )}

        {status === 'pending' && !emailVerified && user?.email && (
          <NCard style={{ marginBottom: SP.xl, borderColor: theme.warn, borderWidth: 1 }}>
            <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.warn, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
              {t('status.verifyEmail.title')}
            </Text>
            <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
              {t('status.verifyEmail.body', { email: user.email })}
            </Text>

            {!otpSent ? (
              <NBtn label={t('status.verifyEmail.send')} onPress={sendOtp} loading={loading} />
            ) : (
              <View>
                <NInput
                  label={t('status.verifyEmail.enter')}
                  value={otp}
                  onChange={setOtp}
                  kbType="number-pad"
                  placeholder="123456"
                />
                <NBtn label={t('status.verifyEmail.confirm')} onPress={verifyOtp} loading={loading} />
              </View>
            )}
          </NCard>
        )}

        {status === 'pending' && emailVerified && (
          <NCard style={{ marginBottom: SP.xl, backgroundColor: theme.successBg, borderColor: theme.success, borderWidth: 1 }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.success, textAlign: 'center' }}>
              {t('status.verifyEmail.done')}
            </Text>
          </NCard>
        )}

        {status === 'pending' && (
          <NCard style={{ marginBottom: SP.xl }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
              {t('status.next.title')}
            </Text>
            {(['status.next.docs', 'status.next.prices', 'status.next.activate'] as const).map((key, i) => (
              <View key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: SP.sm }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary, marginHorizontal: SP.sm }} />
                <Text style={{ fontSize: FS.sm, color: theme.text }}>{t(key)}</Text>
              </View>
            ))}
          </NCard>
        )}

        {status === 'pending' && (
          <View style={{ marginBottom: SP.md }}>
            <NBtn label={t('status.refresh')} variant="outline" loading={checking} onPress={() => void checkStatus(false)} />
            {checkedAt ? (
              <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: 'center', marginTop: SP.xs }}>
                {t('status.lastChecked', { time: checkedAt.toLocaleTimeString(localeTag(lang)) })}
              </Text>
            ) : null}
          </View>
        )}

        <NBtn label={t('status.explore')} onPress={onExplore} style={{ marginBottom: SP.md }} />
        <NBtn label={t('logout')} variant="ghost" onPress={onLogout} />

      </ScrollView>
    </View>
  );
}
