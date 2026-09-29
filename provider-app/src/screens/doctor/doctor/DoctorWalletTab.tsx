import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AppointmentStatus } from '../../../types/contracts';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Platform, Modal, TextInput,
 RefreshControl, Switch, ActivityIndicator, KeyboardAvoidingView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NSkeleton, NOnlineToggle,
 NBottomNav, NDivider, NPriceInput, NProfileImageUploader
} from '../../../components/ui';
import { I, IBg } from '../../../components/icons';
import { SP, R, FS, FW, API_BASE } from '../../../constants';
import { buildHeaders, Vault, SK } from '../../../security/Security';
import client from '../../../api/client';
import { useServicesCatalog, getInsuranceCatalog, useSpecialtiesCatalog } from '../../../api/catalogs';
import { VideoCallRoom } from '../../shared/VideoCallRoom';
import { InsuranceRequestsScreen } from '../../shared/InsuranceRequestsScreen';
import { WithdrawalWorkflow, MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, GlobalSystemSettings, ChatSystem, MediaConfigScreen } from '../../shared/SharedScreens';
import { DoctorStatsRow } from '../components/DoctorStatsRow';
import { DoctorUrgentRequests } from '../components/DoctorUrgentRequests';
import { DoctorQueueList } from '../components/DoctorQueueList';
import { FacilityInvitationsScreen } from '../FacilityInvitationsScreen';
import {
 PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights, AiMedicalCopilot,
 SmartOutboundReferralNetwork, SosDispatchScreen, GpsRouterScreen
} from '../../shared/BlueprintScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens } from '../../../theme/tokens';
import { styles } from './_shared';

import { PatientFileScreen } from './PatientFileScreen';

// ══════════════════════════════════════════════════════════════════════════════
// NO-SHOW MANAGEMENT SCREEN
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// WALLET TAB
// ══════════════════════════════════════════════════════════════════════════════
export function DoctorWalletTab({ onNavigate }: { onNavigate: (s: string) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  
  const [wallet, setWallet] = useState({ available: 0, escrow: 0, dues: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await client.get('/provider/wallet');
        if (res.data) setWallet(res.data);
        const txRes = await client.get('/provider/wallet/transactions');
        setTransactions(txRes.data || []);
      } catch (err) { 
        setWallet({ available: 0, escrow: 0, dues: 0 });
        setTransactions([]);
      }
    };
    fetchWallet();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
          {AR ? 'المحفظة والإيرادات' : 'Wallet & Revenue'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
        <NStatCard label={AR ? 'الرصيد المتاح للسحب' : 'Available for Withdrawal'} value={`${wallet.available} SAR`} icon="wallet" />
        <NStatCard label={AR ? 'مبالغ معلقة التأمين' : 'Insurance Escrow'} value={`${wallet.escrow} SAR`} icon="shield" color={theme.warn} />
        <NStatCard label={AR ? 'مستحقات المنصة / المديونية' : 'Nabdah Dues'} value={`${wallet.dues} SAR`} icon="info" color={theme.danger} />
        
        <NBtn label={AR ? 'طلب سحب رصيد' : 'Withdraw Funds'} icon="money" onPress={() => onNavigate('withdrawal_workflow')} style={{ marginTop: SP.md }} />
        <NBtn label={AR ? 'التقارير والإحصائيات' : 'Revenue Insights & Reports'} variant="outline" onPress={() => onNavigate('revenue_insights')} style={{ marginTop: SP.sm }} />
        
        <NCard style={{ marginTop: SP.xl, backgroundColor: theme.infoBg }}>
          <Text style={{ fontSize: FS.sm, color: theme.info, textAlign: AR ? 'right' : 'left', lineHeight: 20 }}>
            {AR ? 'عمولة المنصة: 15% من كل معاملة يتم تحصيلها نقداً أو عبر التأمين.\nيتم إيقاف الحساب تلقائياً إذا تجاوزت المديونية -500 ريال.' : 'Platform commission: 15% per transaction.\nAccount is automatically suspended if dues exceed -500 SAR.'}
          </Text>
        </NCard>

        <View style={{ marginTop: SP.xl }}>
          <NSecHeader title={AR ? 'سجل العمليات الأخير' : 'Recent Transactions'} />
        </View>
        {transactions.map(tx => (
          <NCard key={tx.id} style={{ marginBottom: SP.sm }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, alignItems: AR ? 'flex-end' : 'flex-start' }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.semi, color: theme.text }}>{tx.title}</Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4 }}>{tx.date}</Text>
              </View>
              <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: tx.type === 'CREDIT' ? theme.success : theme.danger }}>
                {tx.type === 'CREDIT' ? '+' : ''}{tx.amount} {AR ? 'ر' : 'SAR'}
              </Text>
            </View>
          </NCard>
        ))}
        {transactions.length === 0 && (
          <NEmpty title={AR ? 'لا توجد عمليات' : 'No Transactions'} sub={AR ? 'لم تقم بأي عمليات مالية بعد' : 'You have no financial transactions yet.'} icon="wallet" />
        )}
      </ScrollView>
    </View>
  );
}
