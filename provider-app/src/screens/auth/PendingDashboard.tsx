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
  const { lang } = useLang();
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
      show(AR ? 'فشل إرسال رمز التحقق' : 'Failed to send OTP', 'error');
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
      show(AR ? 'رمز غير صحيح أو منتهي الصلاحية' : 'Invalid OTP or expired', 'error');
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
      else if (!silent) show(AR ? 'حسابك ما زال قيد المراجعة' : 'Your account is still under review', 'info');
    } catch (e) {
      const code = (e as { statusCode?: number; response?: { status?: number } } | null);
      const http = code?.statusCode ?? code?.response?.status;
      if ((http === 401 || http === 403) && !silent) setSessionEnded(true);
      else if (!silent) show(AR ? 'تعذر تحديث الحالة' : 'Could not refresh the status', 'error');
    } finally {
      setChecking(false);
    }
  }, [AR, show]);

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
      show(AR ? 'أُعيد إرسال طلبك للمراجعة' : 'Your application was resubmitted for review', 'success');
      await refreshSession();
    } catch (e) {
      show(errorText(e, AR ? 'تعذر إعادة الإرسال' : 'Could not resubmit'), 'error');
    } finally {
      setResubmitting(false);
    }
  };

  const copy = {
    pending: {
      icon: 'hourglass', tint: theme.warnBg,
      title: AR ? 'حسابك قيد المراجعة' : 'Account Under Review',
      body: AR
        ? 'تم استلام طلبك بنجاح وهو الآن قيد المراجعة الإدارية. ستتمكن من ممارسة عملك بمجرد اعتماده.'
        : 'Your application has been received and is under administrative review. You can start working once approved.',
    },
    needs_changes: {
      icon: 'edit', tint: theme.warnBg,
      title: AR ? 'مطلوب تعديلات على طلبك' : 'Changes Requested',
      body: AR
        ? 'راجعت الإدارة طلبك وتحتاج إلى تعديلات قبل الاعتماد. حدّث المستندات المطلوبة ثم أعد الإرسال للمراجعة.'
        : 'The review team needs changes before approval. Update the requested documents, then resubmit for review.',
    },
    rejected: {
      icon: 'close', tint: theme.danger,
      title: AR ? 'تم رفض طلبك' : 'Application Rejected',
      body: AR
        ? 'لم يُعتمد طلبك. يمكنك تصحيح بياناتك ومستنداتك ثم إعادة الإرسال للمراجعة.'
        : 'Your application was not approved. You can correct your details and documents, then resubmit for review.',
    },
    suspended: {
      icon: 'lock', tint: theme.danger,
      title: AR ? 'حسابك موقوف' : 'Account Suspended',
      body: AR
        ? 'تم إيقاف حسابك. تواصل مع دعم نبض لمعرفة السبب وطلب إعادة التفعيل.'
        : 'Your account has been suspended. Contact Nabd support to learn why and ask for reactivation.',
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
              {AR ? 'سبب القرار' : 'Reason'}
            </Text>
            <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
              {reason || (AR ? 'لم يُسجَّل سبب مكتوب. تواصل مع الدعم لمعرفة التفاصيل.' : 'No written reason was recorded. Contact support for details.')}
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
            {onOpenDocuments ? <NBtn label={AR ? 'تحديث المستندات' : 'Update documents'} variant="outline" onPress={onOpenDocuments} /> : null}
            <NBtn label={AR ? 'إعادة الإرسال للمراجعة' : 'Resubmit for review'} loading={resubmitting} onPress={resubmit} />
          </View>
        )}

        {status === 'pending' && (approved || sessionEnded) && (
          <NCard style={{ marginBottom: SP.xl, backgroundColor: theme.successBg, borderColor: theme.success, borderWidth: 1 }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.success, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
              {approved ? (AR ? 'تم اعتماد حسابك' : 'Your account is approved') : (AR ? 'انتهت الجلسة' : 'Your session has ended')}
            </Text>
            <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
              {AR ? 'سجّل الخروج ثم سجّل الدخول من جديد لفتح لوحة العمل.' : 'Sign out and sign in again to open your dashboard.'}
            </Text>
            <NBtn label={AR ? 'تسجيل الخروج وإعادة الدخول' : 'Sign out and sign in again'} onPress={onLogout} />
          </NCard>
        )}

        {status === 'pending' && !emailVerified && user?.email && (
          <NCard style={{ marginBottom: SP.xl, borderColor: theme.warn, borderWidth: 1 }}>
            <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.warn, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
              {AR ? 'تأكيد البريد الإلكتروني' : 'Verify Email Address'}
            </Text>
            <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
              {AR ? `نحتاج لتأكيد بريدك الإلكتروني (${user.email}) لضمان أمان حسابك.` : `Please verify your email (${user.email}) to secure your account.`}
            </Text>

            {!otpSent ? (
              <NBtn label={AR ? 'إرسال رمز التحقق' : 'Send Verification Code'} onPress={sendOtp} loading={loading} />
            ) : (
              <View>
                <NInput
                  label={AR ? 'أدخل الرمز' : 'Enter Code'}
                  value={otp}
                  onChange={setOtp}
                  kbType="number-pad"
                  placeholder="123456"
                />
                <NBtn label={AR ? 'تأكيد الرمز' : 'Verify'} onPress={verifyOtp} loading={loading} />
              </View>
            )}
          </NCard>
        )}

        {status === 'pending' && emailVerified && (
          <NCard style={{ marginBottom: SP.xl, backgroundColor: theme.successBg, borderColor: theme.success, borderWidth: 1 }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.success, textAlign: 'center' }}>
              {AR?'البريد الإلكتروني مؤكد':'Email Verified'}
            </Text>
          </NCard>
        )}

        {status === 'pending' && (
          <NCard style={{ marginBottom: SP.xl }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
              {AR ? 'الخطوات القادمة' : 'Next Steps'}
            </Text>
            {[
              { ar: 'مراجعة التراخيص والمستندات', en: 'Review licenses and documents' },
              { ar: 'مراجعة المواعيد وقائمة الأسعار', en: 'Review schedules and pricing' },
              { ar: 'اعتماد الحساب و تفعيله', en: 'Account approval and activation' }
            ].map((s, i) => (
              <View key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: SP.sm }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary, marginHorizontal: SP.sm }} />
                <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? s.ar : s.en}</Text>
              </View>
            ))}
          </NCard>
        )}

        {status === 'pending' && (
          <View style={{ marginBottom: SP.md }}>
            <NBtn label={AR ? 'تحديث الحالة' : 'Refresh status'} variant="outline" loading={checking} onPress={() => void checkStatus(false)} />
            {checkedAt ? (
              <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: 'center', marginTop: SP.xs }}>
                {(AR ? 'آخر تحديث: ' : 'Last checked: ') + checkedAt.toLocaleTimeString(AR ? 'ar-SA' : 'en-GB')}
              </Text>
            ) : null}
          </View>
        )}

        <NBtn label={AR ? 'استكشاف التطبيق' : 'Explore App'} onPress={onExplore} style={{ marginBottom: SP.md }} />
        <NBtn label={AR ? 'تسجيل الخروج' : 'Log Out'} variant="ghost" onPress={onLogout} />

      </ScrollView>
    </View>
  );
}
