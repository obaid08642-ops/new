// @ts-nocheck
// app/wallet/hub.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Animated, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { useGuestGuard } from '../../src/hooks/useGuestGuard';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

const { width } = Dimensions.get('window');

const BALANCE = 847.50;
const CASHBACK_PENDING = 32.00;

const QUICK_ACTIONS: any[] = [
  { id: 'topup', icon: 'add_card', label: 'شحن المحفظة', route: '/wallet/topup' },
  { id: 'transfer', icon: 'send', label: 'تحويل', route: '/wallet/transfer' },
  { id: 'history', icon: 'history', label: 'السجل', route: '/wallet/transactions' },
];

const CARDS: any[] = []; /* DB Connected */

// Credit Card Component
const CreditCardView = ({ card, isDark }: any) => (
  <View
    style={styles.creditCard}
  >
    <View style={styles.cardShimmer} />
    <View style={styles.cardTop}>
      <AppText variant="bodySM">بطاقة محفوظة</AppText>
      <View style={styles.cardTypeBadge}>
        <AppText variant="bodySM">{card.type.toUpperCase()}</AppText>
      </View>
    </View>
    <AppText variant="bodySM">•••• •••• •••• {card.last4}</AppText>
    <View style={styles.cardBottom}>
      <AppText variant="bodySM">{card.expiry}</AppText>
      <AppText variant="bodySM">{card.name}</AppText>
    </View>
    {card.isDefault && (
      <View style={styles.defaultCardBadge}>
        <AppText variant="bodySM">افتراضية</AppText>
      </View>
    )}
  </View>
);

export default function WalletHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { isGuest, requireAuth } = useGuestGuard();
  if (isGuest) { requireAuth(); return null; }

  const [showBalance, setShowBalance] = useState(true);
  const [activeCard, setActiveCard] = useState(0);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    // Fetch balance
    apiFetch<{ balance: number }>('/wallet/balance')
      .then(res => setBalance(res.balance))
      .catch(() => {});

    // Fetch transactions
    apiFetch<any>('/wallet/transactions?page=1&limit=4')
      .then(res => {
        if (res && res.transactions) {
          const mapped = res.transactions.map((tx: any) => ({
            id: tx.id,
            desc: tx.description,
            type: tx.type,
            amount: tx.type === 'debit' ? -tx.amount : tx.amount,
            date: new Date(tx.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            icon: tx.type === 'credit' ? 'wallet' : 'pill',
            category: tx.referenceType === 'booking' ? 'استشارة' : tx.referenceType === 'refund' ? 'استرداد' : 'شحن',
          }));
          setTransactions(mapped);
        }
      })
      .catch(() => {});
  }, []);


  const [spendingData, setSpendingData] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/wallet/spending-data')
      .then((res: any) => setSpendingData(Array.isArray(res) ? res : []))
      .catch(() => {});
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />

      {/* Premium Header */}
      <View
        style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        {/* Background orbs */}
        <View style={styles.headerOrb1} />
        <View style={styles.headerOrb2} />

        <View style={styles.headerRow}>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setShowBalance(!showBalance)} style={styles.hBtn}>
              <Icon name="info" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <AppText variant="bodySM">محفظة نبض </AppText>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Balance Display */}
        <View style={styles.balanceSection}>
          <AppText variant="bodySM">الرصيد المتاح</AppText>
          <View style={styles.balanceRow}>
            <AppText variant="bodySM">ر</AppText>
            <AppText variant="bodySM">
              {showBalance ? balance.toFixed(2) : '•••.••'}
            </AppText>
          </View>
          {CASHBACK_PENDING > 0 && (
            <View style={styles.cashbackBadge}>
              <AppText variant="bodySM">
                 {CASHBACK_PENDING} ريال كاشباك قيد الترحيل
              </AppText>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          {QUICK_ACTIONS.map(action => (
            <TouchableOpacity
              key={action.id}
              onPress={() => router.push(action.route as any)}
              style={styles.quickActionBtn}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionCircle, { backgroundColor: colors.surface, shadowColor: colors.shadowColor } ]}>
                <Icon name={action.icon} size={22} color={colors.primary} />
              </View>
              <AppText variant="labelSM" color="#fff">{action.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Saved Cards Carousel */}
        <View style={styles.cardsSection}>
          <View style={[styles.sectionHeader, { paddingHorizontal: 20 } ]}>
            <TouchableOpacity style={[styles.addCardBtn, { backgroundColor: colors.primarySurface } ]}>
              <Icon name="add" size={14} color={colors.primary} />
              <AppText variant="bodySM">إضافة بطاقة</AppText>
            </TouchableOpacity>
            <AppText variant="bodySM">بطاقاتي المحفوظة</AppText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }} pagingEnabled snapToInterval={width - 32} decelerationRate="fast"
            onMomentumScrollEnd={e => setActiveCard(Math.round(e.nativeEvent.contentOffset.x / (width - 32)))}
          >
            {CARDS.map(card => (
              <CreditCardView key={card.id} card={card} isDark={isDark} />
            ))}
          </ScrollView>
          <View style={styles.cardsDots}>
            {CARDS.map((_, i) => (
              <View key={i} style={[styles.cardDot, i === activeCard && styles.cardDotActive]} />
            ))}
          </View>
        </View>

        {/* Spending Analysis */}
        <View style={[styles.spendingCard, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16 } ]}>
          <View style={[styles.sectionHeader, { marginBottom: 14 } ]}>
            <AppText variant="bodySM">
              {spendingData.reduce((s, d) => s + d.amount, 0).toLocaleString()} ريال
            </AppText>
            <AppText variant="bodySM">إنفاقك هذا الشهر</AppText>
          </View>

          {/* Horizontal bar chart */}
          {spendingData.map((item, i) => (
            <View key={i} style={styles.spendRow}>
              <AppText variant="bodySM">{item.amount} ر</AppText>
              <View style={[styles.spendBarBg, { backgroundColor: colors.border } ]}>
                <View style={[styles.spendBarFill, { width: `${item.pct}%`, backgroundColor: item.color }]} />
              </View>
              <View style={styles.spendLeft}>
                <AppText variant="bodySM">●</AppText>
                <AppText variant="bodySM">{item.cat}</AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Recent Transactions */}
        <View style={[styles.txSection, { marginHorizontal: 16, marginTop: 14, backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <View style={[styles.sectionHeader, { marginBottom: 8 } ]}>
            <TouchableOpacity onPress={() => router.push('/wallet/transactions')}>
              <AppText variant="bodySM">عرض الكل</AppText>
            </TouchableOpacity>
            <AppText variant="bodySM">آخر المعاملات</AppText>
          </View>

          {transactions.map(tx => (
            <View key={tx.id} style={[styles.txRow, { borderBottomColor: colors.border } ]}>
              <View style={styles.txLeft}>
                <AppText variant="bodySM">
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} ر
                </AppText>
                <AppText variant="bodySM">{tx.date}</AppText>
              </View>
              <View style={styles.txInfo}>
                <AppText variant="bodySM">{tx.desc}</AppText>
                <View style={[styles.txCatBadge, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary } ]}>
                  <AppText variant="bodySM">{tx.category}</AppText>
                </View>
              </View>
              <View style={[styles.txIconWrap, {
                backgroundColor: tx.type === 'credit' || tx.type === 'topup' ? (isDark ? 'rgba(91,168,79,0.15)' : '#DCFCE7') : (isDark ? 'rgba(35,181,206,0.15)' : '#EBF3FF'),
              } ]}>
                <Icon name={tx.icon as any} size={18} color={tx.type === 'credit' || tx.type === 'topup' ? colors.success : colors.primary} />
              </View>
            </View>
          ))}
        </View>

        {/* Cashback Section */}
        <View style={[styles.cashbackCard, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16, marginTop: 14 } ]}>
          <View style={styles.cashbackInner}>
            <View>
              <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="favorite" size={16} color={colors.primary} /><AppText variant="bodySM">برنامج الكاشباك</AppText></View>
              <AppText variant="bodySM">
                احصل على كاشباك تلقائي على كل معاملة:{'\n'}
                استشارات <AppText variant="bodySM">5%</AppText> • صيدلية <AppText variant="bodySM">3%</AppText> • تحاليل <AppText variant="bodySM">4%</AppText>
              </AppText>
            </View>
            <Icon name="wallet" size={20} color={colors.primary} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 24, overflow: 'hidden' },
  headerOrb1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.04)', top: -80, right: -50 },
  headerOrb2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(0,201,167,0.06)', bottom: -40, left: -20 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerRight: {},
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  balanceSection: { alignItems: 'center', marginBottom: 24 },
  balanceLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '400', marginBottom: 4 },
  balanceRow: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 6 },
  balanceAmount: { color: '#fff', fontSize: 46, fontFamily: 'Cairo-ExtraBold', lineHeight: 52 },
  balanceCurrency: { color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  cashbackBadge: { backgroundColor: 'rgba(34,197,94,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, marginTop: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  cashbackText: { color: '#4ADE80', fontSize: 12, fontWeight: '700' },
  quickActionsRow: { flexDirection: 'row-reverse', justifyContent: 'space-around' },
  quickActionBtn: { alignItems: 'center', gap: 6 },
  quickActionCircle: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  quickActionIcon: { fontSize: 22 },
  quickActionLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700' },
  cardsSection: { marginTop: 20, marginBottom: 6 },
  sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  seeAll: { fontSize: 13, fontWeight: '700' },
  addCardBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  addCardText: { fontSize: 12, fontWeight: '700' },
  creditCard: { width: width - 40, height: 180, borderRadius: 22, padding: 20, position: 'relative', overflow: 'hidden' },
  cardShimmer: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60 },
  cardTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 24 },
  cardBalance: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '400' },
  cardTypeBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  cardTypeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  cardNumber: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 3, marginBottom: 20 },
  cardBottom: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  cardName: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '800' },
  cardExpiry: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '400' },
  defaultCardBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(34,197,94,0.3)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)' },
  defaultCardText: { color: '#4ADE80', fontSize: 9, fontWeight: '800' },
  cardsDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  cardDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.15)' },
  cardDotActive: { width: 18, backgroundColor: '#23B5CE' },
  spendingCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  spendingTotal: { fontSize: 18, fontFamily: 'Cairo-ExtraBold' },
  spendRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 10 },
  spendLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, width: 70 },
  spendIcon: { fontSize: 8 },
  spendCat: { fontSize: 11, fontWeight: '400' },
  spendBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  spendBarFill: { height: '100%', borderRadius: 4 },
  spendAmount: { fontSize: 12, fontWeight: '800', width: 60, textAlign: 'left' },
  txSection: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  txRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1 },
  txIconWrap: { width: 40, height: 40, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  txIcon: { fontSize: 18 },
  txInfo: { flex: 1, alignItems: 'flex-end', gap: 4 },
  txDesc: { fontSize: 13, fontWeight: '700' },
  txCatBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  txCatText: { fontSize: 10, fontWeight: '400' },
  txLeft: { alignItems: 'center', gap: 2 },
  txAmount: { fontSize: 14, fontFamily: 'Cairo-ExtraBold' },
  txDate: { fontSize: 9, fontWeight: '400' },
  cashbackCard: { borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cashbackInner: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  cbTitle: { color: '#16A34A', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  cbDesc: { color: '#166534', fontSize: 12, fontWeight: '400', lineHeight: 20 },
});
