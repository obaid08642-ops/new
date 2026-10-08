// The last page of every registration: summary, bank account, contract, signature, e-mail OTP, submit.
// A provider type supplies its summary rows, its pre-submit check and the calls that send its own data (`run`).
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLang, useTheme, useToast } from '../../context';
import { NBtn, NCard, NCheckbox, NHeader, NInput } from '../../components/ui';
import { ContractModal } from '../../components/ContractModal';
import { OtpModal } from '../../components/OtpModal';
import { SignatureCanvasModal } from '../../components/SignatureCanvasModal';
import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';
import { sanitizeWizardData } from '../../api/provider';
import { I } from '../../components/icons';
import { FS, FW, R, SP } from '../../constants';
import { RegistrationSuccess } from '../shared/SharedScreens';
import { apiMessage, finishApplication } from './kit';
import type { Uploader } from './kit';
import { ApprovalNotice } from './WizardParts';
import type { NoticeText } from './WizardParts';

/** Fields the review page itself edits or reads, present on every provider type's data. */
export interface ReviewData {
  iban?: string; accountHolderName?: string; signerName: string; signerRole: string; signatureData: string;
  managerEmail?: string; email?: string;
}

export interface ReviewConfig<T extends ReviewData> {
  /** Passed to the success screen. */
  providerType: string;
  headerAr: string; headerEn: string;
  summary?: { titleAr: string; titleEn: string; rows: (data: T, AR: boolean) => { label: string; value: string }[] };
  notice?: NoticeText;
  /** A warning card shown above the summary when it applies to this data (e.g. cash-only services). */
  banner?: (data: T) => { ar: string; en: string } | null;
  signatoryRoleHint: { ar: string; en: string };
  signatureTitle: { ar: string; en: string };
  /** A legal declaration shown above the signature (types that have no agree checkbox). */
  declaration?: { ar: string; en: string };
  agree?: { ar: string; en: string };
  submitLabel: { ar: string; en: string };
  /** An error message to show instead of starting the submit, or null when the data is complete. */
  precheck?: (data: T, AR: boolean) => string | null;
  contractPricing?: (data: T) => { labelAr: string; labelEn: string; price: string | number }[];
  /** Sends the type's own data (step3, uploads, step2). Runs before the signature and the bank step. */
  run: (data: T, uploads: Uploader) => Promise<void>;
  coords: (data: T) => { lat: number; lng: number };
}

const emailOf = (d: ReviewData) => d.managerEmail || d.email || '';

export function ReviewStep<T extends ReviewData>({ config, data, update, uploads, step, total, onBack, onDone }: {
  config: ReviewConfig<T>; data: T; update: (patch: Partial<T>) => void; uploads: Uploader;
  step: number; total: number; onBack: () => void; onDone: () => void;
}) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const { show } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const align = AR ? 'right' : 'left';

  const send = async () => {
    setLoading(true);
    try {
      await config.run(data, uploads);
      const sigUrl = await uploads.signature(data.signatureData);
      await finishApplication(data, sigUrl, config.coords(data), sanitizeWizardData(data));
      show(AR ? 'تم إرسال الطلب وملحقاته بنجاح!' : 'Registration Submitted!', 'success');
      setSubmitted(true);
    } catch (e) {
      show(apiMessage(e, AR ? 'حدث خطأ' : 'Error submitting'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const submit = () => {
    if (loading) return;
    const problem = config.precheck?.(data, AR);
    if (problem) { show(problem, 'error'); return; }
    if (config.agree && !agreed) { show(AR ? 'يرجى الموافقة على الشروط' : 'Please agree to terms', 'warning'); return; }
    if (!data.signatureData) { show(AR ? 'الرجاء توقيع العقد أولاً' : 'Please sign the contract first', 'error'); return; }
    // The real e-mail OTP is sent by the backend mailer before the modal opens.
    sendEmailOtp(emailOf(data))
      .then(() => show(AR ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to your email', 'success'))
      .catch(() => show(AR ? 'تعذر إرسال الرمز — تحقق من البريد أو أعد المحاولة' : 'Could not send the code — check the email or retry', 'error'));
    setShowOtp(true);
  };

  if (submitted) return <RegistrationSuccess onDone={onDone} email={emailOf(data)} providerType={config.providerType} />;

  const label = (t: { ar: string; en: string }) => (AR ? t.ar : t.en);
  const heading = { fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: align, marginBottom: SP.sm } as const;
  const rows = config.summary?.rows(data, AR) ?? [];
  const banner = config.banner?.(data) ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: SP.xl, paddingBottom: 0 }}>
        <NHeader title={AR ? config.headerAr : config.headerEn} step={step} total={total} onBack={onBack} />
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: SP.xl }} keyboardShouldPersistTaps="handled">
        {banner && (
          <NCard style={{ backgroundColor: theme.warnBg, marginBottom: SP.lg }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: SP.md }}>
              <I name="info" size={16} color={theme.warn} />
              <Text style={{ flex: 1, fontSize: FS.sm, color: theme.warn, lineHeight: 20, textAlign: align }}>{label(banner)}</Text>
            </View>
          </NCard>
        )}

        {config.summary && (
          <NCard style={{ marginBottom: SP.lg }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: align, marginBottom: SP.lg }}>
              {AR ? config.summary.titleAr : config.summary.titleEn}
            </Text>
            {rows.map((row, i) => (
              <View key={i} style={{
                flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, paddingVertical: SP.sm,
                borderBottomWidth: i < rows.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: theme.border,
              }}>
                <Text style={{ flex: 1, color: theme.textSub, fontSize: FS.sm, textAlign: align }}>{row.label}</Text>
                <Text style={{ color: theme.text, fontWeight: FW.semi, fontSize: FS.sm }}>{row.value}</Text>
              </View>
            ))}
          </NCard>
        )}

        {config.notice && <ApprovalNotice text={config.notice} />}

        <View style={{ marginVertical: SP.lg }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: align, marginBottom: SP.sm }}>{AR ? 'الحساب البنكي' : 'Bank Account'}</Text>
          <NInput label={AR ? 'اسم صاحب الحساب' : 'Account Holder Name'} value={data.accountHolderName}
            onChange={(v) => update({ accountHolderName: v } as Partial<T>)} placeholder={AR ? 'اسم مطابق للهوية/السجل التجاري' : 'Name matching ID/CR'} />
          <NInput label={AR ? 'رقم الآيبان IBAN' : 'Bank IBAN'} value={data.iban}
            onChange={(v) => update({ iban: v.toUpperCase().replace(/\s/g, '') } as Partial<T>)} placeholder="SA0000000000000000000000" maxLen={24} />
          <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: align }}>
            {AR ? 'ملاحظة: سيتم تحويل مستحقاتك إلى هذا الحساب.' : 'Note: Your earnings will be transferred to this account.'}
          </Text>
        </View>

        <TouchableOpacity onPress={() => setShowContract(true)} style={{
          backgroundColor: theme.surface, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: theme.primary, alignItems: 'center', marginBottom: SP.lg,
        }}>
          <Text style={{ color: theme.primary, fontWeight: FW.bold, fontSize: FS.md }}>{AR ? 'الاطلاع على العقد' : 'View Contract'}</Text>
        </TouchableOpacity>

        <Text style={{ ...heading, marginTop: SP.md }}>{AR ? 'اسم الموقّع' : 'Signatory Name'}</Text>
        <NInput value={data.signerName} onChange={(v) => update({ signerName: v } as Partial<T>)} placeholder={AR ? 'الاسم الثلاثي' : 'Full Name'} />
        <Text style={{ ...heading, marginTop: SP.md }}>{AR ? 'صفة الموقّع / المسمى الوظيفي' : 'Signatory Role'}</Text>
        <NInput value={data.signerRole} onChange={(v) => update({ signerRole: v } as Partial<T>)} placeholder={label(config.signatoryRoleHint)} />
        {config.declaration && (
          <>
            <Text style={{ ...heading, marginTop: SP.xl }}>{AR ? 'إقرار وتوقيع' : 'Declaration & Signature'}</Text>
            <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: align, lineHeight: 22 }}>{label(config.declaration)}</Text>
          </>
        )}
        <Text style={{ ...heading, marginTop: SP.xl }}>{label(config.signatureTitle)}</Text>

        <View style={{ marginBottom: SP.xl, gap: SP.md }}>
          {data.signatureData ? (
            <View style={{ alignItems: 'center', marginVertical: SP.md }}>
              <Image source={{ uri: data.signatureData }} style={{ width: 200, height: 100, resizeMode: 'contain', backgroundColor: theme.surface }} />
              <TouchableOpacity onPress={() => setShowSigModal(true)} style={{ marginTop: SP.sm }}>
                <Text style={{ color: theme.primary }}>{AR ? 'إعادة التوقيع' : 'Re-sign'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowSigModal(true)} style={{
              padding: SP.lg, borderWidth: 1, borderColor: theme.primary, borderRadius: R.md, alignItems: 'center', borderStyle: 'dashed', marginVertical: SP.md,
            }}>
              <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{AR ? 'اضغط للتوقيع' : 'Tap to Sign'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {config.agree && (
          <NCard style={{ marginBottom: SP.lg, backgroundColor: theme.surface2 }}>
            <NCheckbox label={label(config.agree)} value={agreed} onChange={setAgreed} />
          </NCard>
        )}

        <NBtn label={label(config.submitLabel)} onPress={submit} loading={loading} disabled={!!config.agree && !agreed}
          style={{ marginBottom: 50, backgroundColor: theme.success }} />
      </ScrollView>

      <ContractModal visible={showContract} onClose={() => setShowContract(false)} pricingDetails={config.contractPricing?.(data)} />
      <SignatureCanvasModal visible={showSigModal} onClose={() => setShowSigModal(false)} onOK={(sig) => update({ signatureData: sig } as Partial<T>)} />
      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={emailOf(data)}
        onVerify={async (code) => {
          const ok = await verifyEmailOtp(emailOf(data), code);
          if (ok) { setShowOtp(false); void send(); return true; }
          return false;
        }}
        onResend={() => sendEmailOtp(emailOf(data))
          .then(() => show(AR ? 'أُعيد إرسال الرمز' : 'Code resent', 'success'))
          .catch(() => show(AR ? 'تعذر الإرسال — انتظر قليلاً' : 'Could not resend — wait a moment', 'error'))} />
    </View>
  );
}
