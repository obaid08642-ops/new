// @ts-nocheck
// app/offers/[id].tsx — تفاصيل العرض: بيانات حقيقية من /offers/:id + مقدمو الخدمة من /promotions/offers/:id/providers
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar, Share, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { pickLocalized } from '../../src/utils/localize';
import { dateLocale } from '@/utils/dates';

export default function OfferDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [offer, setOffer] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const offerId = typeof id === 'string' ? id : '';

  const load = React.useCallback(() => {
    if (!offerId) { setLoadError(true); setLoading(false); return; }
    setLoading(true);
    setLoadError(false);
    apiFetch<any>(`/offers/${offerId}`)
      .then(res => {
        setOffer(res || null);
        if (!res) setLoadError(true);
      })
      .catch(() => { setOffer(null); setLoadError(true); })
      .finally(() => setLoading(false));
    apiFetch<any>(`/promotions/offers/${offerId}/providers`)
      .then(res => setProviders(Array.isArray(res) ? res : []))
      .catch(() => setProviders([]));
  }, [offerId]);

  useEffect(() => { load(); }, [load]);

  const title = pickLocalized(offer?.title_ar, offer?.title_en) || '';
  const providerName = offer?.provider?.name || '';
  const hasImage = !!offer?.image;
  const target = offer?.target || {};
  const inclusions: string[] = Array.isArray(target.inclusions) ? target.inclusions : [];
  const terms: string[] = Array.isArray(target.terms) ? target.terms : [];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `عرض "${title}"${providerName ? ` من ${providerName}` : ''} بسعر ${offer.discounted_price} ر.س بدلاً من ${offer.original_price} ر.س — عبر تطبيق نبض بلس`,
      });
    } catch {}
  };

  const handleBookProvider = (p: any) => {
    // Providers from this endpoint are provider_profiles; doctors open the booking flow
    if (p?.id) {
      router.push({ pathname: '/consultations/book/[id]', params: { id: p.id } } as any);
    }
  };

  if (loading) {
    return (
      <View style={[st.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!offer) {
    return (
      <View style={[st.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 }]}>
        <Icon name="tag" size={52} color={colors.textTertiary} />
        <AppText variant="h5" align="center">{loadError ? 'تعذر تحميل العرض' : 'لم يتم العثور على العرض'}</AppText>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          {loadError && <Button label="إعادة المحاولة" variant="primary" icon="refresh" onPress={load} />}
          <Button label="العودة" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={hasImage ? 'light-content' : isDark ? 'light-content' : 'dark-content'} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Header — real image when available, branded gradient otherwise */}
        <View style={[st.imgContainer, { backgroundColor: colors.primary }]}>
          {hasImage && <Image source={{ uri: offer.image }} style={st.image} />}
          {!hasImage && (
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <Icon name="tag" size={110} color="rgba(255,255,255,0.18)" />
            </View>
          )}
          <View style={[st.topActions, { paddingTop: insets.top + 8 }]}>
            <IconButton icon="share" bg="rgba(255,255,255,0.25)" color="#fff" onPress={handleShare} />
            <IconButton icon="back" bg="rgba(255,255,255,0.25)" color="#fff" onPress={() => router.back()} />
          </View>

          <View style={st.overlayTitle}>
            {!!target.sponsored && <Badge label="ممول" color="#fff" bg="rgba(239,68,68,0.9)" style={{ marginBottom: 6 }} />}
            <AppText variant="h2" color="#fff" style={st.titleText}>{title}</AppText>
            {!!providerName && (
              <View style={st.providerRow}>
                <Icon name="hospital" size={16} color="rgba(255,255,255,0.8)" />
                <AppText variant="bodySM" color="rgba(255,255,255,0.9)">{providerName}</AppText>
              </View>
            )}
          </View>
        </View>

        {/* Pricing Card */}
        <View style={{ paddingHorizontal: 16, marginTop: -20 }}>
          <Card style={st.priceCard}>
            <View style={st.priceRow}>
              <View style={{ alignItems: 'flex-start' }}>
                {offer.original_price > offer.discounted_price && (
                  <Badge label={`وفر ${offer.original_price - offer.discounted_price} ر.س`} color={colors.success} />
                )}
              </View>
              <View style={st.priceAlign}>
                <AppText variant="h1" color={colors.primary}>{offer.discounted_price} ر.س</AppText>
                <AppText variant="bodySM" color={colors.textTertiary} style={st.strikeThrough}>
                  {offer.original_price} ر.س
                </AppText>
              </View>
            </View>
          </Card>
        </View>

        {/* Validity */}
        {(offer.start_date || offer.end_date) && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Card style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
              <Icon name="calendar" size={20} color={colors.primary} />
              <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1, textAlign: 'right' }}>
                {offer.end_date
                  ? `العرض ساري حتى ${new Date(offer.end_date).toLocaleDateString(dateLocale(), { year: 'numeric', month: 'long', day: 'numeric' })}`
                  : `يبدأ العرض في ${new Date(offer.start_date).toLocaleDateString(dateLocale(), { year: 'numeric', month: 'long', day: 'numeric' })}`}
              </AppText>
            </Card>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 16 }}>
          {/* Inclusions — only when the campaign defines them */}
          {inclusions.length > 0 && (
            <Card>
              <AppText variant="h5" style={{ marginBottom: 10, textAlign: 'right' }}>مشتملات الباقة</AppText>
              {inclusions.map((item, index) => (
                <View key={index} style={[st.inclusionItem, { borderBottomColor: colors.borderLight }]}>
                  <AppText variant="bodySM" color={colors.textPrimary} style={{ flex: 1 }}>{item}</AppText>
                  <Icon name="check-circle" size={20} color={colors.success} />
                </View>
              ))}
            </Card>
          )}

          {/* Terms — only when the campaign defines them */}
          {terms.length > 0 && (
            <Card>
              <AppText variant="h5" style={{ marginBottom: 10, textAlign: 'right' }}>الشروط والأحكام</AppText>
              {terms.map((item, index) => (
                <View key={index} style={st.termRow}>
                  <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1 }}>• {item}</AppText>
                </View>
              ))}
            </Card>
          )}

          {/* Bookable providers for this offer */}
          <Card>
            <AppText variant="h5" style={{ marginBottom: 10, textAlign: 'right' }}>احجز العرض لدى</AppText>
            {providers.length === 0 ? (
              <AppText variant="bodySM" color={colors.textTertiary} style={{ textAlign: 'right' }}>
                {providerName ? `سيتم الحجز لدى ${providerName}` : 'لا يوجد مقدمو خدمة متاحون لهذا العرض حالياً'}
              </AppText>
            ) : (
              providers.map((p, i) => (
                <TouchableOpacity
                  key={p.id || i}
                  onPress={() => handleBookProvider(p)}
                  style={[st.providerCard, { borderColor: colors.borderLight }]}
                  activeOpacity={0.8}
                >
                  <View style={[st.providerIcon, { backgroundColor: colors.primarySurface }]}>
                    <Icon name="hospital" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                    <AppText variant="h6">{p.name}</AppText>
                    <AppText variant="caption" color={colors.textTertiary}>
                      {[p.specialty, p.city].filter(Boolean).join(' — ')}
                    </AppText>
                    {p.rating_avg > 0 && (
                      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                        <Icon name="star" size={12} color={colors.gold} />
                        <AppText variant="caption" color={colors.textSecondary}>{p.rating_avg} ({p.rating_count})</AppText>
                      </View>
                    )}
                  </View>
                  <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ))
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  imgContainer: { height: 280, position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  topActions: { position: 'absolute', top: 0, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  overlayTitle: { position: 'absolute', bottom: 30, right: 16, left: 16, alignItems: 'flex-end' },
  titleText: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3, textAlign: 'right' },
  providerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 },
  priceCard: { paddingVertical: 14 },
  priceRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  priceAlign: { alignItems: 'flex-end' },
  strikeThrough: { textDecorationLine: 'line-through', marginTop: 2 },
  inclusionItem: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  termRow: { flexDirection: 'row-reverse', paddingVertical: 4 },
  providerCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  providerIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
