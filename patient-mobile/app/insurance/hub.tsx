// @ts-nocheck
// app/insurance/hub.tsx — CHI WebView DOM Scraper + Full Backend Integration
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, StatusBar, Modal, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { useGuestGuard } from '../../src/hooks/useGuestGuard';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const { width } = Dimensions.get('window');

// ─── CHI Portal URL ──────────────────────────────────────────────────────────
const CHI_URL = 'https://www.chi.gov.sa/ar/Services/Pages/BeneficiaryInquiry.aspx';

// ─── JavaScript injected into WebView to auto-scrape CHI result table ────────
const CHI_INJECTED_JS = `
(function() {
  // Poll every 800ms for the result table to appear
  var maxTries = 60; // 60 x 800ms = 48s timeout
  var tries = 0;
  var interval = setInterval(function() {
    tries++;
    if (tries > maxTries) {
      clearInterval(interval);
      window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'timeout' }));
      return;
    }

    // Try multiple possible table/result selectors (CHI portal varies)
    var rows = document.querySelectorAll('table tr, .results-table tr, .beneficiary-result tr');
    if (rows.length > 1) {
      clearInterval(interval);
      var extracted = [];
      rows.forEach(function(row, i) {
        if (i === 0) return; // skip header
        var cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          extracted.push({
            company: cells[0] ? cells[0].innerText.trim() : '',
            class: cells[1] ? cells[1].innerText.trim() : '',
            policy_number: cells[2] ? cells[2].innerText.trim() : '',
            network: cells[3] ? cells[3].innerText.trim() : '',
            expiry: cells[4] ? cells[4].innerText.trim() : '',
          });
        }
      });
      if (extracted.length > 0) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'success', data: extracted }));
      }
    }

    // Also check for error messages
    var errEl = document.querySelector('.error-message, .no-result, [class*="error"]');
    if (errEl && errEl.innerText.trim().length > 0) {
      clearInterval(interval);
      window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'error', message: errEl.innerText.trim() }));
    }
  }, 800);
  true; // required return value
})();
`;

// Connected to backend policy store

const QUICK_ACTIONS = [
  { icon: 'search', label: 'فحص التغطية', color: '#23B5CE', bg: '#EBF3FF', route: '/insurance/coverage-check' },
  { icon: 'document', label: 'رفع مطالبة', color: '#7A6BEA', bg: '#EDE9FE', route: '/insurance/submit-claim' },
  { icon: 'hospital', label: 'مزودو الخدمة', color: '#5BA84F', bg: '#DCFCE7', route: '/insurance/network-providers' },
  { icon: 'wallet', label: 'المزايا المتبقية', color: '#F0A526', bg: '#FEF3C7', route: '/insurance/benefits-summary' },
];

export default function InsuranceHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { isGuest, requireAuth } = useGuestGuard();
  // Insurance is one of the ONLY two guest-restricted areas (with family).
  if (isGuest) { requireAuth('insurance'); return null; }

  const [policies, setPolicies] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);

  useEffect(() => {
    async function loadInsurance() {
      try {
        const ins = await apiFetch('/users/me/insurance');
        if (ins && ins.provider) {
          setPolicies([{
            id: '1',
            company: ins.provider,
            logo: 'shield',
            color: '#E30613', // could map based on provider
            policyNumber: ins.policy_number,
            memberId: ins.member_id || ins.policy_number || 'غير متاح',
            type: 'تتطلب التغطية مراجعة لكل خدمة',
            endDate: ins.expiry_date || 'غير محدد',
            isActive: Boolean(ins.active ?? true),
            isDefault: true,
            network: ins.network,
          }]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPolicies(false);
      }
    }
    async function loadClaims() {
      try {
        const res = await apiFetch('/insurance/claims/my');
        setClaims(res || []);
      } catch (err) {
        console.error('Error fetching claims', err);
      }
    }
    loadInsurance();
    loadClaims();
  }, []);

  const defaultPolicy = policies.find(p => p.isDefault) || policies[0];

  // ── CHI WebView scraper state ─────────────────────────────────────────────
  const [chiVisible, setChiVisible] = useState(false);
  const [chiLoading, setChiLoading] = useState(true);
  const [chiScraped, setChiScraped] = useState(false);
  const [chiSaving, setChiSaving] = useState(false);
  const webviewRef = useRef<any>(null);

  // ── Handle message from CHI WebView JS ───────────────────────────────────
  const handleWebViewMessage = useCallback(async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);

      if (msg.status === 'timeout') {
        showLocalizedAlert('انتهت المهلة', 'لم يتم العثور على نتائج تأمين. تأكد من إدخال رقم الهوية والضغط على استعلام.');
        return;
      }
      if (msg.status === 'error') {
        showLocalizedAlert('خطأ في الاستعلام', msg.message || 'تعذّر جلب بيانات التأمين من بوابة الضمان.');
        return;
      }
      if (msg.status === 'success' && msg.data?.length > 0) {
        const item = msg.data[0];
        setChiScraped(true);
        setChiSaving(true);
        try {
          // Save scraped insurance to backend
          const saved = await apiFetch('/insurance/save-policy', {
            method: 'POST',
            body: JSON.stringify({
              provider: item.company,
              policy_number: item.policy_number || 'CHI-SCRAPED',
              network: item.network || item.class,
              class: item.class || 'A',
              expiry_date: item.expiry || '',
              member_name: '',
              national_id: '',
              verified: true,
              ocr_extracted: true,
            }),
          }).catch(() => null);

          setChiVisible(false);
          showLocalizedAlert(
            'تم سحب بيانات التأمين تلقائياً',
            `شركة التأمين: ${item.company}\nرقم البوليصة: ${item.policy_number}\nالفئة: ${item.class}\nشبكة: ${item.network}`,
            [{ text: 'موافق' }]
          );
          // Refresh policies list
          setPolicies(prev => [{
            ...prev[0],
            company: item.company || prev[0].company,
            policyNumber: item.policy_number || prev[0].policyNumber,
            network: item.class || prev[0].network,
          }]);
        } catch (_) {
          showLocalizedAlert('خطأ', 'تم سحب البيانات لكن فشل حفظها. يرجى المحاولة لاحقاً.');
        } finally {
          setChiSaving(false);
        }
      }
    } catch (_) {
      // JSON parse error — ignore
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="add" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/insurance/add-policy')} />
          <AppText variant="h3" color={colors.textPrimary}>التأمين الصحي</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ marginHorizontal: 16, marginTop: 12 }}>

        {/* Active Policy Card */}
        {loadingPolicies ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 40 }}/>
        ) : defaultPolicy ? (
        <View
          style={[styles.policyCard, { backgroundColor: defaultPolicy.color } ]}>
          <View style={styles.policyShimmer} />
          <View style={styles.policyTop}>
            <View style={styles.policyBadge}>
              <View style={styles.activeDot} />
              <AppText variant="caption" color="#4ADE80">نشط</AppText>
            </View>
            <View style={styles.policyCompany}>
              <Icon name={defaultPolicy.logo as any} size={32} color="#fff" />
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="h6" color="#fff">{defaultPolicy.company}</AppText>
                <AppText variant="caption" color="rgba(255,255,255,0.75)">{defaultPolicy.type}</AppText>
              </View>
            </View>
          </View>

          <View style={styles.policyMeta}>
            {[
              { label: 'رقم العضوية', val: defaultPolicy.memberId },
              { label: 'ينتهي في', val: defaultPolicy.endDate },
              { label: 'الشبكة', val: defaultPolicy.network },
            ].map((m, i) => (
              <View key={i} style={{ alignItems: 'center' }}>
                <AppText variant="caption" color="rgba(255,255,255,0.6)">{m.label}</AppText>
                <AppText variant="bodySM" color="#fff" style={{ fontWeight: '700' }}>{m.val}</AppText>
              </View>
            ))}
          </View>

          <View style={styles.limitSection}>
            <AppText variant="caption" color="rgba(255,255,255,0.8)" style={{ textAlign: 'right', lineHeight: 18 }}>
              لا توجد لدينا حدود سنوية أو أرصدة تغطية مؤكدة من شركة التأمين. افحص تغطية الخدمة قبل الحجز، وتبقى الموافقة النهائية لمراجعة المزود.
            </AppText>
          </View>
        </View>
        ) : (
          <View style={[styles.policyCard, { backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', paddingVertical: 40 } ]}>
            <AppText variant="h6" color="#fff">لا توجد بوليصة تأمين نشطة</AppText>
            <AppText variant="bodySM" color="rgba(255,255,255,0.7)">أضف بوليصتك للاستفادة من التغطية</AppText>
          </View>
        )}

        {/* CHI Scraper Button */}
        <TouchableOpacity
          onPress={() => { setChiVisible(true); setChiLoading(true); setChiScraped(false); }} style={styles.chiBtn}
          activeOpacity={0.85}
        >
          <Icon name="search" size={16} color="#fff" />
          <AppText variant="bodySM" color="#fff" style={{ fontWeight: '800', marginRight: 6 }}>
            استعلام تلقائي عن تأميني (بوابة الضمان الصحي)
          </AppText>
        </TouchableOpacity>
      </View>
        {/* Quick Actions */}
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((a, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => router.push(a.route as any)}
              style={[styles.quickCard, { backgroundColor: isDark ? colors.surface : a.bg } ]}>
              <View style={[styles.quickIconWrap, { backgroundColor: a.color + '20' } ]}>
                <Icon name={a.icon as any} size={22} color={a.color} />
              </View>
              <AppText variant="caption" style={{ fontWeight: '700', marginTop: 4 }}>{a.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Coverage Summary */}
        <View style={[styles.section, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={() => router.push('/insurance/benefits-summary')}>
              <AppText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>تفاصيل</AppText>
            </TouchableOpacity>
            <AppText variant="h6">ملخص التغطية</AppText>
          </View>
          <View style={[styles.covCard, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary, flex: 1 }]}>
            <Icon name="shield" size={22} color={colors.primary} />
            <AppText variant="bodySM" style={{ textAlign: 'right', lineHeight: 21, marginTop: 8 }}>
              لا تتوفر نسب تغطية مؤكدة في التطبيق. استخدم «فحص التغطية» لكل خدمة؛ الطلب يبقى قيد مراجعة المزود أو شركة التأمين ولا يُعد موافقة تلقائية.
            </AppText>
          </View>
        </View>

        {/* Deductible Card */}
        <View style={[styles.deductCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={() => router.push('/insurance/policy-detail' as any)}>
              <AppText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>تفاصيل</AppText>
            </TouchableOpacity>
            <AppText variant="h6">التحمّل</AppText>
          </View>
          <View style={[styles.deductItem, { backgroundColor: isDark ? colors.surfaceSecondary : '#EFF6FF', marginBottom: 10 }]}>
            <AppText variant="bodySM" style={{ textAlign: 'right' }}>غير مؤكد</AppText>
            <AppText variant="caption" color={colors.textSecondary}>يحدد التحمل الفعلي بعد مراجعة طلب الخدمة</AppText>
          </View>
          <View style={[{ backgroundColor: isDark ? colors.surfaceSecondary : '#EBF3FF', borderRadius: 12, padding: 10 } ]}>
            <AppText variant="caption" style={{ textAlign: 'right', lineHeight: 18 }}>
              التحمّل هو المبلغ الذي تدفعه أنت من كل فاتورة قبل أن تبدأ التغطية
            </AppText>
          </View>
        </View>

        {/* My Policies List */}
        <View style={{ marginBottom: 14 }}>
          <View style={[styles.sectionHeader, { paddingHorizontal: 16 } ]}>
            <TouchableOpacity onPress={() => router.push('/insurance/add-policy')}>
              <AppText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>+ إضافة</AppText>
            </TouchableOpacity>
            <AppText variant="h6">بوليصاتي ({policies.length})</AppText>
          </View>
          {policies.map(policy => (
            <TouchableOpacity
              key={policy.id}
              onPress={() => router.push({ pathname: '/insurance/policy-detail', params: { policyId: policy.id } })}
              style={[styles.policyListCard, { backgroundColor: isDark ? colors.surface : colors.white }]}
              activeOpacity={0.85}
            >
              <View style={{ alignItems: 'center', gap: 6 }}>
                {policy.isDefault && (
                  <View style={[styles.defaultBadge]} >
                    <AppText variant="caption" color="#fff" style={{ fontSize: 9 }}>افتراضي</AppText>
                  </View>
                )}
                <View style={[styles.policyStatusDot, { backgroundColor: policy.isActive ? '#5BA84F' : '#F0695C' }]} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                <AppText variant="h6">{policy.company}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>{policy.type}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>{policy.policyNumber}</AppText>
              </View>
              <AppText style={{ fontSize: 28 }}>{policy.logo}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Claims */}
        <View style={{ marginBottom: 14 }}>
          <View style={[styles.sectionHeader, { paddingHorizontal: 16 } ]}>
            <TouchableOpacity onPress={() => router.push('/insurance/claim-tracking')}>
              <AppText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>عرض الكل</AppText>
            </TouchableOpacity>
            <AppText variant="h6">آخر المطالبات</AppText>
          </View>
          {claims.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
               <AppText variant="caption" color={colors.textSecondary}>لا توجد مطالبات سابقة</AppText>
            </View>
          ) : claims.slice(0, 3).map((claim, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => router.push('/insurance/claim-tracking')}
              style={[styles.claimCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
              <View style={{ alignItems: 'center', gap: 2 }}>
                <AppText variant="h6" style={{ fontFamily: 'Cairo-ExtraBold' }}>{claim.covered} ر</AppText>
                <AppText variant="caption" color={colors.textSecondary}>مغطّى</AppText>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                <AppText variant="bodySM" style={{ fontWeight: '800' }}>{claim.service}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>الإجمالي: {claim.amount} ريال</AppText>
              </View>
              <View style={[styles.claimStatus, { backgroundColor: claim.status === 'approved' || claim.status === 'reimbursed' ? (isDark ? 'rgba(91,168,79,0.15)' : '#DCFCE7') : (isDark ? 'rgba(35,181,206,0.15)' : '#EBF3FF') } ]}>
                <AppText variant="caption" color={claim.status === 'approved' || claim.status === 'reimbursed' ? (isDark ? colors.success : '#16A34A') : (isDark ? colors.primary : '#2563EB')}>
                  {claim.status === 'approved' ? 'موافق' : claim.status === 'reimbursed' ? 'استرداد' : 'قيد المراجعة'}
                </AppText>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ── CHI WebView Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={chiVisible}
        animationType="slide"
        onRequestClose={() => setChiVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Modal Header */}
          <View
            style={[styles.chiModalHeader, { paddingTop: insets.top + 8 } ]}>
            <TouchableOpacity onPress={() => setChiVisible(false)} style={styles.chiCloseBtn}>
              <Icon name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <AppText variant="h6" color="#fff">بوابة الضمان الصحي</AppText>
            <View style={{ width: 36 }}/>
          </View>

          {/* Info Banner */}
          <View style={[styles.chiInfoBanner, { backgroundColor: isDark ? '#1E3A5F' : '#EBF3FF' } ]}>
            <AppText variant="caption" color={isDark ? '#93C5FD' : '#1D4ED8'} style={{ textAlign: 'right', lineHeight: 18 }}>
              أدخل رقم هويتك في الموقع واضغط "استعلام". سيقوم التطبيق تلقائياً بسحب بيانات تأمينك وحفظها بدون أي نسخ ولصق.
            </AppText>
          </View>

          {chiLoading && (
            <View style={styles.chiLoadingBar}>
              <ActivityIndicator size="small" color={colors.primary} />
              <AppText variant="caption" color={colors.textSecondary} style={{ marginRight: 8 }}>
                جاري تحميل بوابة الضمان الصحي...
              </AppText>
            </View>
          )}

          {chiSaving && (
            <View style={[styles.chiSavingOverlay]} >
              <ActivityIndicator size="large" color="#fff" />
              <AppText variant="h6" color="#fff" style={{ marginTop: 12 }}>جاري حفظ بيانات التأمين...</AppText>
            </View>
          )}

          <WebView
            ref={webviewRef}
            source={{ uri: CHI_URL }} injectedJavaScript={CHI_INJECTED_JS}
            onMessage={handleWebViewMessage}
            onLoadStart={() => setChiLoading(true)}
            onLoadEnd={() => setChiLoading(false)}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState={false}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  policyCard: { borderRadius: 20, padding: 18, overflow: 'hidden', position: 'relative', marginBottom: 14 },
  policyShimmer: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', top: -80, left: -40 },
  policyTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  policyCompany: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  policyBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: 'rgba(34,197,94,0.25)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  activeDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#5BA84F' },
  policyMeta: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 14 },
  limitSection: { gap: 6 },
  limitRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  limitBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  limitFill: { height: '100%', backgroundColor: '#5BA84F', borderRadius: 4 },
  chiBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  quickGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', padding: 16, gap: 10 },
  quickCard: { width: (width - 52) / 2, borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  quickIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  section: { marginHorizontal: 16, marginBottom: 14, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  coverageGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  covCard: { width: (width - 92) / 3, borderRadius: 14, padding: 10, alignItems: 'center', gap: 4 },
  covBar: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  covFill: { height: '100%', borderRadius: 2 },
  deductCard: { marginHorizontal: 16, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, marginBottom: 14 },
  deductItem: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  policyListCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  defaultBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: '#23B5CE' },
  policyStatusDot: { width: 10, height: 10, borderRadius: 5 },
  claimCard: { marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  claimStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  // CHI Modal
  chiModalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  chiCloseBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  chiInfoBanner: { padding: 12, marginHorizontal: 16, marginTop: 10, borderRadius: 14 },
  chiLoadingBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 8 },
  chiSavingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 999, justifyContent: 'center', alignItems: 'center' },
});
