import { API_BASE } from '../../../constants';
import { buildHeaders } from '../../../security/Security';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppointmentStatus } from '../../../types/contracts';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Switch, TextInput,
 KeyboardAvoidingView, Platform, Linking, ActivityIndicator, Image
} from 'react-native';
import client from '../../../api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NDivider, NPriceInput, NCheckbox
} from '../../../components/ui';
import { I, IBg, RatingStars } from '../../../components/icons';
import { SP, R, FS, FW, C } from '../../../constants';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { resolveImageUri, resolveGallery } from '../../../utils/imageUrl';
import { useInsuranceCatalog } from '../../../api/catalogs';
import { SK, Vault } from '../../../security/Security';
import { tokens, withAlpha } from '../../../theme/tokens';

// Same two states the server treats as an open request (provider-payouts.controller.ts:78).
const PENDING_STATES = ['PENDING_ADMIN_APPROVAL', 'APPROVED_FOR_PAYOUT'];

export function WithdrawalWorkflow({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [balance, setBalance] = useState<{ available: number; pending: number; negative: boolean } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [bank, setBank] = useState<any | null>(null);
  const [banks, setBanks] = useState<any[]>([]);
  const [bankCode, setBankCode] = useState('');
  const [holderName, setHolderName] = useState('');
  const [iban, setIban] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedReference, setSubmittedReference] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setLoadErr(false);
    try {
      const [balRes, bankRes, mineRes] = await Promise.all([
        client.get('/provider/payouts/balance'),
        client.get('/provider/bank-account'),
        client.get('/provider/payouts/mine'),
      ]);
      const b = balRes.data || {};
      setBalance({ available: Number(b.available || 0), pending: Number(b.pending || 0), negative: !!b.negative });
      const bk = bankRes.data || null;
      setBank(bk && bk.iban ? bk : null);
      if (bk?.iban) { setIban(String(bk.iban)); setBankCode(bk.bank_code || ''); setHolderName(bk.holder_name || ''); }
      if (!bk?.iban) {
        const banksRes = await client.get('/provider/banks').catch(() => ({ data: [] }));
        setBanks(Array.isArray(banksRes.data) ? banksRes.data : []);
      }
      setHistory(Array.isArray(mineRes.data) ? mineRes.data : []);
    } catch {
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
  const ibanValid = /^SA\d{22}$/.test(cleanIban);
  const amt = parseFloat(amount);
  const hasPending = history.some((h: any) => PENDING_STATES.includes(String(h.state)));
  const needsBankSetup = !bank;
  const bankApproved = bank?.review_status === 'approved';
  const awaitingBankApproval = !!bank && !bankApproved;
  const bankFormValid = !needsBankSetup || (!!bankCode && holderName.trim().length >= 3 && ibanValid);
  const canSubmit = !!balance && !balance.negative && bankApproved && bankFormValid && !!amt && amt >= 100 && amt <= balance.available && !hasPending && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (needsBankSetup) {
        await client.post('/provider/bank-account', {
          bank_code: bankCode,
          holder_name: holderName.trim(),
          iban: cleanIban,
        });
        show(AR ? 'أُرسل الحساب البنكي للمراجعة. لا يمكن طلب سحب قبل أن يعيده الخادم بحالة معتمدة.' : 'The bank account was submitted for review. A withdrawal cannot be requested until the server returns an approved status.', 'info');
        await load();
        return;
      }
      const idempotency_key = `payout_${Crypto.randomUUID()}`;
      const result = await client.post('/provider/payouts/request', { amount: amt, iban: cleanIban, idempotency_key });
      const reference = result.data?.reference || result.data?.id || result.data?.withdrawal_id;
      if (!reference) throw new Error('server_withdrawal_reference_missing');
      setSubmittedReference(String(reference));
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'تعذر إرسال طلب السحب — تحقق من الاتصال وحاول مجدداً' : 'Could not submit withdrawal request — check connection and retry'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Payout status comes from the server `state` (PENDING_ADMIN_APPROVAL, AWAITING_SECOND_APPROVAL, APPROVED_FOR_PAYOUT, COMPLETED, REJECTED).
  const statusLabel = (st: string) => {
    switch (String(st)) {
      case 'PENDING_ADMIN_APPROVAL': return AR ? 'بانتظار اعتماد الإدارة' : 'Pending admin approval';
      case 'AWAITING_SECOND_APPROVAL': return AR ? 'بانتظار الاعتماد الثاني' : 'Awaiting second approval';
      case 'APPROVED_FOR_PAYOUT': return AR ? 'معتمد وجارٍ التحويل' : 'Approved, transfer in progress';
      case 'COMPLETED': return AR ? 'تم التحويل' : 'Paid';
      case 'REJECTED': return AR ? 'مرفوض' : 'Rejected';
      default: return st || '—';
    }
  };
  const statusVariant = (st: string) => {
    switch (String(st)) {
      case 'COMPLETED': return 'success';
      case 'REJECTED': return 'danger';
      case 'APPROVED_FOR_PAYOUT': return 'info';
      default: return 'warning';
    }
  };

  if (loading) {
    return (
      <NScroll>
        <NHeader title={AR ? 'سحب الأموال' : 'Withdraw Funds'} onBack={onBack} />
        <View style={{ alignItems: 'center', paddingVertical: SP.huge }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </NScroll>
    );
  }

  if (loadErr) {
    return (
      <NScroll>
        <NHeader title={AR ? 'سحب الأموال' : 'Withdraw Funds'} onBack={onBack} />
        <NEmpty
          icon="⚠️"
          title={AR ? 'تعذر تحميل بيانات المحفظة' : 'Could not load wallet data'}
          sub={AR ? 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة' : 'Check your internet connection and try again'}
          actionLabel={AR ? 'إعادة المحاولة' : 'Retry'}
          onAction={load}
        />
      </NScroll>
    );
  }

  if (submitted) {
    return (
      <NScroll>
        <NHeader title={AR ? 'سحب الأموال' : 'Withdraw Funds'} onBack={onBack} />
        <View style={{ gap: SP.xl, alignItems: 'center', paddingVertical: SP.huge }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.successBg, alignItems: 'center', justifyContent: 'center' }}>
            <I name="check" size={40} color={theme.success} />
          </View>
          <Text style={{ fontSize: FS['2xl'], fontWeight: FW.bold, color: theme.success, textAlign: 'center' }}>
            {AR ? 'تم استلام طلب السحب' : 'Withdrawal Request Received'}
          </Text>
          <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', paddingHorizontal: SP.xl }}>
            {AR ? `طلبك بقيمة ${amount} ريال قيد مراجعة الإدارة المالية الآن. ستصلك حالة الطلب عبر الإشعارات.`
                : `Your ${amount} SAR request is now under finance-admin review. You will be notified of its status.`}
            {submittedReference ? `\n${AR ? 'مرجع الخادم: ' : 'Server reference: '}${submittedReference}` : ''}
          </Text>
          <NBtn label={AR ? 'العودة للمحفظة' : 'Back to Wallet'} onPress={onBack} />
        </View>
      </NScroll>
    );
  }

  return (
    <NScroll>
      <NHeader title={AR ? 'سحب الأموال' : 'Withdraw Funds'} onBack={onBack} />

      <View style={{ gap: SP.xl }}>
        <NCard style={{ backgroundColor: theme.primaryLight }}>
          <Text style={{ fontSize: FS.sm, color: theme.primary, textAlign: AR ? 'right' : 'left' }}>
            {AR ? `الرصيد المتاح للسحب: ${balance!.available.toFixed(2)} ريال` : `Available for withdrawal: ${balance!.available.toFixed(2)} SAR`}
          </Text>
          {balance!.pending > 0 && (
            <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
              {AR ? `قيد التسوية (ضمان): ${balance!.pending.toFixed(2)} ريال` : `In escrow (pending): ${balance!.pending.toFixed(2)} SAR`}
            </Text>
          )}
        </NCard>

        {balance!.negative && (
          <NCard style={{ backgroundColor: theme.dangerBg }}>
            <Text style={{ fontSize: FS.sm, color: theme.danger, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'رصيدك سالب بسبب استردادات أو تسويات — الأرباح الجديدة ستسوّي هذا الدين أولاً قبل إتاحة أي سحب.'
                  : 'Your balance is negative due to refunds/adjustments — new earnings settle this debt before any withdrawal is allowed.'}
            </Text>
          </NCard>
        )}

        {hasPending && (
          <NCard style={{ backgroundColor: theme.warnBg }}>
            <Text style={{ fontSize: FS.sm, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'لديك طلب سحب قيد المراجعة حالياً — لا يمكن إرسال طلب جديد حتى تتم معالجته.'
                  : 'You already have a withdrawal request under review — you cannot submit a new one until it is processed.'}
            </Text>
          </NCard>
        )}

        {bank && (
          <NCard>
            <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'الحساب البنكي المسجل' : 'Registered bank account'}
            </Text>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
              {bank.bank_name || ''} · {String(bank.iban).slice(0, 6)}…{String(bank.iban).slice(-4)}
            </Text>
            {bank.holder_name ? (
              <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: 2 }}>
                {bank.holder_name}
              </Text>
            ) : null}
          </NCard>
        )}

        {awaitingBankApproval && (
          <NCard style={{ backgroundColor: theme.warnBg }}>
            <Text style={{ fontSize: FS.sm, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'الحساب البنكي قيد المراجعة أو غير معتمد؛ لا يمكن طلب السحب حالياً.' : 'The bank account is pending review or unapproved; withdrawals are unavailable.'}
            </Text>
          </NCard>
        )}

        {needsBankSetup && (
          <View style={{ gap: SP.md }}>
            <NSecHeader title={AR ? 'إعداد الحساب البنكي (أول مرة)' : 'Bank Account Setup (first time)'} />
            <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'اختر البنك:' : 'Select bank:'}
            </Text>
            {banks.map((b: any) => (
              <NCard
                key={b.code}
                style={{ borderColor: bankCode === b.code ? theme.primary : theme.border, borderWidth: bankCode === b.code ? 2 : 1.5 }}
                onPress={() => setBankCode(b.code)}
              >
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
                  <I name="wallet" size={20} color={theme.textSub} />
                  <Text style={{ flex: 1, fontSize: FS.md, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? b.name_ar : (b.name_en || b.name_ar)}
                  </Text>
                  {bankCode === b.code && <I name="check" size={16} color={theme.primary} />}
                </View>
              </NCard>
            ))}
            <NInput
              label={AR ? 'اسم صاحب الحساب (كما في البنك)' : 'Account holder name (as registered)'}
              value={holderName}
              onChange={setHolderName}
              required
            />
            <NInput
              label={AR ? 'رقم الآيبان (IBAN)' : 'IBAN'}
              placeholder="SA00 0000 0000 0000 0000 0000"
              value={iban}
              onChange={setIban}
              caps="characters"
              maxLen={34}
              required
              error={iban.length > 0 && !ibanValid ? (AR ? 'الآيبان السعودي يجب أن يبدأ بـ SA متبوعاً بـ 22 رقماً' : 'Saudi IBAN must be SA followed by 22 digits') : undefined}
            />
          </View>
        )}

        <NPriceInput
          label={AR ? 'مبلغ السحب (100 ريال على الأقل)' : 'Withdrawal Amount (min 100 SAR)'}
          value={amount}
          onChange={setAmount}
          required
        />
        {!!amount && amt > (balance?.available || 0) && (
          <Text style={{ fontSize: FS.xs, color: theme.danger, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'المبلغ يتجاوز الرصيد المتاح' : 'Amount exceeds available balance'}
          </Text>
        )}

        <NBtn
          label={AR ? 'إرسال طلب السحب' : 'Submit Withdrawal Request'}
          disabled={!canSubmit}
          loading={submitting}
          onPress={handleSubmit}
        />

        {history.length > 0 && (
          <View style={{ gap: SP.md, marginTop: SP.lg }}>
            <NSecHeader title={AR ? 'سجل طلبات السحب' : 'Withdrawal History'} />
            {history.map((h: any, i: number) => (
              <NCard key={h.id || `wd_${i}`}>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                      {Number(h.amount || 0).toFixed(2)} {AR ? 'ريال' : 'SAR'}
                    </Text>
                    <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                      {h.createdAt ? new Date(h.createdAt).toLocaleDateString(AR ? 'ar-SA-u-ca-gregory' : 'en-GB') : ''}{h.iban ? ` · ${String(h.iban).slice(0, 6)}…${String(h.iban).slice(-4)}` : ''}
                    </Text>
                  </View>
                  <NBadge label={statusLabel(h.state)} variant={statusVariant(h.state) as any} />
                </View>
                {h.state === 'REJECTED' && !!h.rejection_reason && (
                  <Text style={{ fontSize: FS.xs, color: theme.danger, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
                    {AR ? `سبب الرفض: ${h.rejection_reason}` : `Rejection reason: ${h.rejection_reason}`}
                  </Text>
                )}
              </NCard>
            ))}
          </View>
        )}
      </View>
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// 12. MEDICAL JOBS BOARD — Premium End-to-End Recruitment System
