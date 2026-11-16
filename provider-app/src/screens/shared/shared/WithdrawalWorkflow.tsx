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
import { payoutErrorText } from '../../../utils/payoutErrors';
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

// The states the server treats as an open request (OPEN_WITHDRAWAL_STATES, provider-payouts.controller.ts).
const PENDING_STATES = ['PENDING_ADMIN_APPROVAL', 'AWAITING_SECOND_APPROVAL', 'APPROVED_FOR_PAYOUT'];

export function WithdrawalWorkflow({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [balance, setBalance] = useState<{ available: number; pending: number; negative: boolean; minimum: number | null } | null>(null);
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
      setBalance({ available: Number(b.available || 0), pending: Number(b.pending || 0), negative: !!b.negative, minimum: Number.isFinite(Number(b.minimum_withdrawal)) ? Number(b.minimum_withdrawal) : null });
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
  // a bank account the reviewer rejected is entered again (posting it resets it to pending review), like a first-time setup
  const bankRejected = bank?.review_status === 'rejected';
  const needsBankSetup = !bank || bankRejected;
  const bankApproved = bank?.review_status === 'approved';
  const awaitingBankApproval = !!bank && !bankApproved && !bankRejected;
  const bankFormValid = !needsBankSetup || (!!bankCode && holderName.trim().length >= 3 && ibanValid);
  const canSubmit = !!balance && !balance.negative && bankApproved && bankFormValid && balance.minimum !== null && !!amt && amt >= balance.minimum && amt <= balance.available && !hasPending && !submitting;

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
        show(tt('wd.c2991123'), 'info');
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
      show(payoutErrorText(err?.response?.data?.message ?? err?.message, AR, tt('wd.07b51425')), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Payout status comes from the server `state` (PENDING_ADMIN_APPROVAL, AWAITING_SECOND_APPROVAL, APPROVED_FOR_PAYOUT, PAID, REJECTED;
  // COMPLETED is the same as PAID on older rows).
  const statusLabel = (st: string) => {
    switch (String(st)) {
      case 'PENDING_ADMIN_APPROVAL': return tt('wd.470e6b0c');
      case 'AWAITING_SECOND_APPROVAL': return tt('wd.6c4de9bc');
      case 'APPROVED_FOR_PAYOUT': return tt('wd.611f5d3d');
      case 'PAID':
      case 'COMPLETED': return tt('wd.b656c0eb');
      case 'REJECTED': return tt('wd.8290f876');
      default: return st || '—';
    }
  };
  const statusVariant = (st: string) => {
    switch (String(st)) {
      case 'PAID':
      case 'COMPLETED': return 'success';
      case 'REJECTED': return 'danger';
      case 'APPROVED_FOR_PAYOUT': return 'info';
      default: return 'warning';
    }
  };

  if (loading) {
    return (
      <NScroll>
        <NHeader title={tt('wd.254223fa')} onBack={onBack} />
        <View style={{ alignItems: 'center', paddingVertical: SP.huge }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </NScroll>
    );
  }

  if (loadErr) {
    return (
      <NScroll>
        <NHeader title={tt('wd.254223fa')} onBack={onBack} />
        <NEmpty
          icon="⚠️"
          title={tt('wd.23234a60')}
          sub={tt('wd.24634fa7')}
          actionLabel={tt('wd.cf333076')}
          onAction={load}
        />
      </NScroll>
    );
  }

  if (submitted) {
    return (
      <NScroll>
        <NHeader title={tt('wd.254223fa')} onBack={onBack} />
        <View style={{ gap: SP.xl, alignItems: 'center', paddingVertical: SP.huge }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.successBg, alignItems: 'center', justifyContent: 'center' }}>
            <I name="check" size={40} color={theme.success} />
          </View>
          <Text style={{ fontSize: FS['2xl'], fontWeight: FW.bold, color: theme.success, textAlign: 'center' }}>
            {tt('wd.7d401936')}
          </Text>
          <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', paddingHorizontal: SP.xl }}>
            {tt('tpat.aaf4c558', { p1: String(amount) })}
            {submittedReference ? `\n${tt('wd.a5cd2670')}${submittedReference}` : ''}
          </Text>
          <NBtn label={tt('wd.80dded2a')} onPress={onBack} />
        </View>
      </NScroll>
    );
  }

  return (
    <NScroll>
      <NHeader title={tt('wd.254223fa')} onBack={onBack} />

      <View style={{ gap: SP.xl }}>
        <NCard style={{ backgroundColor: theme.primaryLight }}>
          <Text style={{ fontSize: FS.sm, color: theme.primary, textAlign: AR ? 'right' : 'left' }}>
            {tt('tpat.1acc1e2b', { p1: String(balance!.available.toFixed(2)) })}
          </Text>
          {balance!.pending > 0 && (
            <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
              {tt('tpat.c6965c99', { p1: String(balance!.pending.toFixed(2)) })}
            </Text>
          )}
        </NCard>

        {balance!.negative && (
          <NCard style={{ backgroundColor: theme.dangerBg }}>
            <Text style={{ fontSize: FS.sm, color: theme.danger, textAlign: AR ? 'right' : 'left' }}>
              {tt('wd.d1549e74')}
            </Text>
          </NCard>
        )}

        {hasPending && (
          <NCard style={{ backgroundColor: theme.warnBg }}>
            <Text style={{ fontSize: FS.sm, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
              {tt('wd.0a9de506')}
            </Text>
          </NCard>
        )}

        {bank && (
          <NCard>
            <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
              {tt('wd.4f490c96')}
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
              {tt('wd.74856d26')}
            </Text>
          </NCard>
        )}

        {bankRejected && (
          <NCard style={{ backgroundColor: theme.dangerBg }}>
            <Text style={{ fontSize: FS.sm, color: theme.danger, textAlign: AR ? 'right' : 'left' }}>
              {t('audit2.withdrawal.bankRejected')}
              {bank?.reviewer_note ? `\n${bank.reviewer_note}` : ''}
            </Text>
          </NCard>
        )}

        {needsBankSetup && (
          <View style={{ gap: SP.md }}>
            <NSecHeader title={bankRejected ? (t('audit2.withdrawal.correctBank')) : (t('audit2.withdrawal.setupBank'))} />
            <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
              {tt('wd.2c7000c1')}
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
              label={tt('wd.1e55e237')}
              value={holderName}
              onChange={setHolderName}
              required
            />
            <NInput
              label={tt('wd.6e50daf7')}
              placeholder="SA00 0000 0000 0000 0000 0000"
              value={iban}
              onChange={setIban}
              caps="characters"
              maxLen={34}
              required
              error={iban.length > 0 && !ibanValid ? (tt('wd.354eb4ba')) : undefined}
            />
          </View>
        )}

        <NPriceInput
          label={balance?.minimum != null ? (tt('tpat.35ad995b', { p1: String(balance.minimum) })) : (tt('wd.1c123269'))}
          value={amount}
          onChange={setAmount}
          required
        />
        {!!amount && amt > (balance?.available || 0) && (
          <Text style={{ fontSize: FS.xs, color: theme.danger, textAlign: AR ? 'right' : 'left' }}>
            {tt('wd.3be6ccf6')}
          </Text>
        )}

        <NBtn
          label={tt('wd.5b0405b0')}
          disabled={!canSubmit}
          loading={submitting}
          onPress={handleSubmit}
        />

        {history.length > 0 && (
          <View style={{ gap: SP.md, marginTop: SP.lg }}>
            <NSecHeader title={tt('wd.a82e7ee1')} />
            {history.map((h: any, i: number) => (
              <NCard key={h.id || `wd_${i}`}>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                      {Number(h.amount || 0).toFixed(2)} {tt('wd.0e39e6ca')}
                    </Text>
                    <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                      {h.createdAt ? new Date(h.createdAt).toLocaleDateString(AR ? 'ar-SA-u-ca-gregory' : 'en-GB') : ''}{h.iban ? ` · ${String(h.iban).slice(0, 6)}…${String(h.iban).slice(-4)}` : ''}
                    </Text>
                  </View>
                  <NBadge label={statusLabel(h.state)} variant={statusVariant(h.state) as any} />
                </View>
                {h.state === 'REJECTED' && !!h.rejection_reason && (
                  <Text style={{ fontSize: FS.xs, color: theme.danger, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
                    {tt('tpat.3376487d', { p1: String(h.rejection_reason) })}
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
