/**
 * P22.12 — provider scorecard VIEW (acceptance, time-to-accept,
 * cancellations, ratings, complaints) from the scorecard API.
 *
 * NEEDS-BACKEND: GET /provider/scorecard (self). Until the sibling backend
 * branch ships it, this screen shows an honest unavailable state — never
 * fabricated numbers. Shape mirrors provider-scorecard.math.ts on p22-c.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NBtn, NCard, NHeader, NScroll, NSecHeader, NEmpty, NStatCard } from '../../components/ui';
import { SP, FS, FW } from '../../constants';
import { tokens } from '../../theme/tokens';
import { getMyScorecard, type ProviderScorecard } from '../../api/scorecard';

const TIER_META: Record<string, { ar: string; en: string; color: string }> = {
  excellent: { ar: 'ممتاز', en: 'Excellent', color: tokens.success },
  good: { ar: 'جيد', en: 'Good', color: tokens.info },
  watch: { ar: 'تحت المراقبة', en: 'Watch', color: tokens.warning },
  probation: { ar: 'فترة اختبار', en: 'Probation', color: tokens.error },
};

export function formatTimeToAccept(seconds: number | null, AR: boolean): string {
  if (seconds == null) return AR ? 'لا بيانات' : 'No data';
  if (seconds < 60) return AR ? `${Math.round(seconds)} ثانية` : `${Math.round(seconds)}s`;
  const m = Math.round(seconds / 60);
  return AR ? `${m} دقيقة` : `${m} min`;
}

export function ProviderScorecardScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [card, setCard] = useState<ProviderScorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setUnavailable(false);
    try {
      setCard(await getMyScorecard());
    } catch {
      // NEEDS-BACKEND: no self route yet — honest unavailable, no fake numbers.
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tier = card ? TIER_META[card.tier] || TIER_META.watch : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'بطاقة الأداء' : 'My Scorecard'} onBack={onBack} />
      <NScroll pad>
        {loading && <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />}
        {!loading && unavailable && (
          <>
            <NEmpty
              title={AR ? 'بطاقة الأداء غير متاحة بعد' : 'Scorecard not available yet'}
              subtitle={AR ? 'تُحتسب بطاقتك من بيانات القبول والاستجابة والتقييمات — ستظهر هنا فور تفعيلها' : 'Your card is computed from acceptance, response and rating data — it appears here once enabled'}
            />
            <NBtn label={AR ? 'إعادة المحاولة' : 'Retry'} variant="outline" onPress={load} style={{ marginTop: SP.md }} />
          </>
        )}
        {!loading && !unavailable && card && (
          <>
            <NCard style={{ alignItems: 'center', padding: SP.xl, marginBottom: SP.lg }}>
              <Text style={{ fontSize: 52, fontWeight: FW.xbold, color: tier!.color }}>
                {Math.round(card.reliabilityBlended)}
              </Text>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: tier!.color }}>
                {AR ? tier!.ar : tier!.en}
              </Text>
              <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: SP.xs }}>
                {AR ? 'الموثوقية المدمجة' : 'Blended reliability'}
              </Text>
              {card.breached && card.breachReasons.length > 0 && (
                <Text style={{ fontSize: FS.xs, color: theme.danger, marginTop: SP.sm, textAlign: 'center' }}>
                  {(AR ? 'تنبيه جودة: ' : 'Quality alert: ') + card.breachReasons.join(' · ')}
                </Text>
              )}
            </NCard>

            <NSecHeader title={AR ? 'القبول والاستجابة' : 'Acceptance & Response'} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
              <NStatCard icon="" label={AR ? 'معدل القبول' : 'Acceptance'} value={`${Math.round(card.acceptanceRate * 100)}%`} color={tokens.info} style={{ width: '47%' }} />
              <NStatCard icon="" label={AR ? 'زمن القبول' : 'Time to accept'} value={formatTimeToAccept(card.timeToAcceptMedianSeconds, AR)} color={tokens.purple} style={{ width: '47%' }} />
              <NStatCard icon="" label={AR ? 'الإلغاءات' : 'Cancellations'} value={`${Math.round(card.cancellationRate * 100)}%`} color={tokens.warning} style={{ width: '47%' }} />
              <NStatCard icon="" label={AR ? 'التقييم' : 'Rating'} value={card.avgRating != null ? String(card.avgRating) : (AR ? 'لا يوجد' : 'N/A')} color={tokens.success} style={{ width: '47%' }} />
            </View>

            <NSecHeader title={AR ? 'التقييمات والشكاوى' : 'Ratings & Complaints'} />
            <NCard style={{ marginBottom: SP.md }}>
              <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                {AR
                  ? `عدد التقييمات: ${card.ratingsCount} · الشكاوى المفتوحة: ${card.complaintsOpen} · إجمالي الشكاوى: ${card.complaintsTotal}`
                  : `Ratings: ${card.ratingsCount} · Open complaints: ${card.complaintsOpen} · Total: ${card.complaintsTotal}`}
              </Text>
            </NCard>
            <NBtn label={AR ? 'تحديث' : 'Refresh'} variant="outline" onPress={() => { load().catch(() => show(AR ? 'تعذر التحديث' : 'Refresh failed', 'error')); }} />
          </>
        )}
      </NScroll>
    </View>
  );
}
