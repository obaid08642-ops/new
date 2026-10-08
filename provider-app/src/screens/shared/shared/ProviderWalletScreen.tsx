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
  const { theme } = useTheme(); const { lang } = useLang(); const { user } = useAuth(); const AR = lang === 'ar';
  const [balance, setBalance] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingEscrow, setPendingEscrow] = useState(0);
  const [lockedAmount, setLockedAmount] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [commission, setCommission] = useState<number | null>(null);
  const [commissionCash, setCommissionCash] = useState<number | null>(null);
  const [commissionIns, setCommissionIns] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const [wRes, txRes] = await Promise.all([
          client.get('/provider/payouts/balance'),
          client.get('/provider/wallet/transactions').catch(() => ({ data: [] })),
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
      } catch (err) {
        console.warn('Failed to fetch wallet', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'المحفظة والإيرادات' : 'Wallet & Revenue'} onBack={embedded ? undefined : onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg }}>
        <NCard style={{ backgroundColor: theme.primary, alignItems: 'center', padding: SP.xxl, marginBottom: SP.lg }}>
          <Text style={{ color: '#fff', opacity: 0.8, fontSize: FS.sm }}>{AR ? 'الرصيد المتاح للسحب' : 'Available Balance'}</Text>
          <Text style={{ color: '#fff', fontSize: 36, fontWeight: FW.bold, marginVertical: SP.sm }}>
            {balance} <Text style={{ fontSize: FS.md }}>{AR ? 'ريال' : 'SAR'}</Text>
          </Text>
          <NBtn 
            label={AR ? 'طلب سحب' : 'Request Withdrawal'} 
            onPress={() => onNavigate && onNavigate('withdrawal_workflow')} 
            style={{ backgroundColor: '#fff', marginTop: SP.md }} 
            labelStyle={{ color: theme.primary }} 
          />
        </NCard>

        {revenueRoute && onNavigate ? (
          <NBtn label={AR ? 'التقارير والإحصائيات' : 'Revenue Insights & Reports'} variant="outline" onPress={() => onNavigate(revenueRoute)} style={{ marginBottom: SP.lg }} />
        ) : null}

        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.md }}>
          <NStatCard icon="trendingUp" label={AR ? 'إجمالي الإيرادات' : 'Total Revenue'} value={String(totalRevenue)} unit={AR ? 'ر' : 'SAR'} color={theme.success} style={{ flex: 1 }} />
          <NStatCard icon="clock" label={AR ? 'أرصدة معلقة (Escrow)' : 'Pending (Escrow)'} value={String(pendingEscrow)} unit={AR ? 'ر' : 'SAR'} color={theme.warn} style={{ flex: 1 }} />
        </View>

        {lockedAmount > 0 && (
          <NCard style={{ marginBottom: SP.md }}>
            <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
              {AR ? `محجوز لطلبات سحب قيد المعالجة: ${lockedAmount} ر.س` : `Reserved for withdrawals in progress: ${lockedAmount} SAR`}
            </Text>
          </NCard>
        )}

        <NCard style={{ marginBottom: SP.lg, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.info + '20', justifyContent: 'center', alignItems: 'center' }}>
            <I name="receipt" size={22} color={theme.info} />
          </View>
          <View style={{ flex: 1, alignItems: AR ? 'flex-end' : 'flex-start' }}>
            <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{AR ? 'نسبة عمولة المنصة المحددة لك' : 'Your platform commission rate'}</Text>
            <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>
              {commissionCash !== null ? (AR ? `كاش ${commissionCash}% • تأمين ${commissionIns !== null ? commissionIns : commissionCash}%` : `Cash ${commissionCash}% • Insurance ${commissionIns !== null ? commissionIns : commissionCash}%`) : (AR ? 'يحددها الأدمن عند الاعتماد' : 'Set by admin at approval')}
            </Text>
            {(totalRevenue > 0 && commissionCash !== null) && (
              <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
                {AR ? `صافيك التقريبي: ${Math.round(totalRevenue * (1 - commissionCash / 100))} ر.س` : `Your approx. net: ${Math.round(totalRevenue * (1 - commissionCash / 100))} SAR`}
              </Text>
            )}
          </View>
        </NCard>

        <NSecHeader title={AR ? 'سجل العمليات' : 'Transaction History'} />
        {!loading && transactions.length === 0 && (
          <NEmpty title={AR ? 'لا توجد معاملات بعد' : 'No transactions yet'} subtitle={AR ? 'ستظهر المدفوعات والعمولات هنا' : 'Payments and commissions will appear here'} />
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
              {(tx.type === 'CREDIT' || tx.type === 'EARNING') ? '+' : '-'}{Math.abs(tx.amount || 0)} {AR ? 'ر' : 'SAR'}
            </Text>
          </NCard>
        ))}
      </ScrollView>
    </View>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// GENERIC PROVIDER HOME STATS & QUICK ACTIONS
