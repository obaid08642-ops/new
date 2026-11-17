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

// One wallet for every provider role. Used as a stack route (with a back button) and as the doctor's Wallet tab
// (`embedded`, no back button). `revenueRoute` adds a link to the role's revenue report when the navigator has one.
export function ProviderWalletScreen({ onBack, onNavigate, embedded, revenueRoute }: { onBack?: () => void; onNavigate?: (s: string) => void; embedded?: boolean; revenueRoute?: string }) {
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const { user } = useAuth(); const AR = lang === 'ar';
  const [balance, setBalance] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingEscrow, setPendingEscrow] = useState(0);
  const [lockedAmount, setLockedAmount] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [commission, setCommission] = useState<number | null>(null);
  const [commissionCash, setCommissionCash] = useState<number | null>(null);
  const [commissionIns, setCommissionIns] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [loadErr, setLoadErr] = useState(false);

  const fetchWallet = useCallback(async () => {
      setLoading(true); setLoadErr(false);
      try {
        // Both reads must succeed: a failed history read used to show "No transactions yet" next to a real balance.
        const [wRes, txRes] = await Promise.all([
          client.get('/provider/payouts/balance'),
          client.get('/provider/wallet/transactions'),
        ]);
        // Real per-provider commission rates set by the admin (cash % + insurance %)
        client.get('/provider/me').then((meRes: any) => {
          const prof = meRes.data?.profile || {};
          const fallback = prof.commission_rate;
          const cash = prof.commission_cash_pct !== undefined && prof.commission_cash_pct !== null ? Number(prof.commission_cash_pct) : fallback;
          const ins = prof.commission_insurance_pct !== undefined && prof.commission_insurance_pct !== null ? Number(prof.commission_insurance_pct) : fallback;
          if (cash !== undefined && cash !== null) { setCommissionCash(Number(cash)); setCommission(Number(cash)); }
          if (ins !== undefined && ins !== null) setCommissionIns(Number(ins));
        }).catch(() => {});
        // Single balance source (same ledger the withdrawal check uses): available, pending, locked, lifetime earned.
        setBalance(Number(wRes.data?.available || 0));
        setPendingEscrow(Number(wRes.data?.pending || 0));
        setLockedAmount(Number(wRes.data?.locked || 0));
        setTotalRevenue(Number(wRes.data?.lifetime_earned || 0));
        setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
      } catch {
        // never draw 0 SAR for a balance that was not read
        setLoadErr(true);
      } finally {
        setLoading(false);
      }
  }, []);
  useEffect(() => { void fetchWallet(); }, [fetchWallet]);

  if (loadErr) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <NHeader title={tt('wallet.4bb94d0d')} onBack={embedded ? undefined : onBack} />
        <NEmpty
          icon="alert"
          title={tt('wallet.d412c6f1')}
          sub={tt('wallet.6c9b51f0')}
          actionLabel={tt('wallet.cf333076')}
          onAction={() => { void fetchWallet(); }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('wallet.4bb94d0d')} onBack={embedded ? undefined : onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg }}>
        <NCard style={{ backgroundColor: theme.primary, alignItems: 'center', padding: SP.xxl, marginBottom: SP.lg }}>
          <Text style={{ color: C.white, opacity: 0.8, fontSize: FS.sm }}>{tt('wallet.a0b8ab41')}</Text>
          <Text style={{ color: C.white, fontSize: 36, fontWeight: FW.bold, marginVertical: SP.sm }}>
            {balance} <Text style={{ fontSize: FS.md }}>{tt('wallet.0e39e6ca')}</Text>
          </Text>
          <NBtn 
            label={tt('wallet.209888a8')} 
            onPress={() => onNavigate && onNavigate('withdrawal_workflow')} 
            style={{ backgroundColor: C.white, marginTop: SP.md }} 
            labelStyle={{ color: theme.primary }} 
          />
        </NCard>

        {revenueRoute && onNavigate ? (
          <NBtn label={tt('wallet.c58f931e')} variant="outline" onPress={() => onNavigate(revenueRoute)} style={{ marginBottom: SP.lg }} />
        ) : null}

        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.md }}>
          <NStatCard icon="trendingUp" label={tt('wallet.b4d65b0a')} value={String(totalRevenue)} unit={tt('wallet.a629499b')} color={theme.success} style={{ flex: 1 }} />
          <NStatCard icon="clock" label={tt('wallet.9f2e5ce9')} value={String(pendingEscrow)} unit={tt('wallet.a629499b')} color={theme.warn} style={{ flex: 1 }} />
        </View>

        {lockedAmount > 0 && (
          <NCard style={{ marginBottom: SP.md }}>
            <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
              {tt('tpas.8ff433c3', { p1: String(lockedAmount) })}
            </Text>
          </NCard>
        )}

        <NCard style={{ marginBottom: SP.lg, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.info + '20', justifyContent: 'center', alignItems: 'center' }}>
            <I name="receipt" size={22} color={theme.info} />
          </View>
          <View style={{ flex: 1, alignItems: AR ? 'flex-end' : 'flex-start' }}>
            <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{tt('wallet.9e335702')}</Text>
            <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>
              {commissionCash !== null ? (tt('tpas.91d3bcfb', { p1: String(commissionCash), p2: String(commissionIns !== null ? commissionIns : commissionCash) })) : (tt('wallet.5775987a'))}
            </Text>
            {(totalRevenue > 0 && commissionCash !== null) && (
              <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
                {tt('tpas.95ceaea9', { p1: String(Math.round(totalRevenue * (1 - commissionCash / 100))) })}
              </Text>
            )}
          </View>
        </NCard>

        <NSecHeader title={tt('wallet.41306385')} />
        {!loading && transactions.length === 0 && (
          <NEmpty title={tt('wallet.225d7df7')} subtitle={tt('wallet.16bfa75b')} />
        )}
        {transactions.map((tx: any, idx) => (
          <NCard key={tx.id || idx} style={{ marginBottom: SP.md, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: (tx.type === 'CREDIT' || tx.type === 'EARNING') ? theme.success + '20' : theme.warn + '20', justifyContent: 'center', alignItems: 'center' }}>
              <I name={(tx.type === 'CREDIT' || tx.type === 'EARNING') ? 'arrowDownLeft' : 'arrowUpRight'} size={20} color={(tx.type === 'CREDIT' || tx.type === 'EARNING') ? theme.success : theme.warn} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{tx.title || tx.desc}</Text>
              <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{tx.date}</Text>
            </View>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: (tx.type === 'CREDIT' || tx.type === 'EARNING') ? theme.success : theme.warn }}>
              {(tx.type === 'CREDIT' || tx.type === 'EARNING') ? '+' : '-'}{Math.abs(tx.amount || 0)} {tt('wallet.a629499b')}
            </Text>
          </NCard>
        ))}
      </ScrollView>
    </View>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// GENERIC PROVIDER HOME STATS & QUICK ACTIONS
