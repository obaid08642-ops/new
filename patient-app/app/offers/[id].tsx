// @ts-nocheck
// app/offers/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Share,
  ActivityIndicator
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

// OFFERS_DATA removed — fetched from backend
export default function OfferDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [inclusionsChecked, setInclusionsChecked] = useState<Record<number, boolean>>({});
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const offerId = typeof id === 'string' ? id : '1';

  useEffect(() => {
    apiFetch<any>(`/offers/${offerId}`)
      .then(res => setOffer(res))
      .catch(() => setOffer(null))
      .finally(() => setLoading(false));
  }, [offerId]);

  const toggleCheck = (index: number) => {
    setInclusionsChecked(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `تفقد هذا العرض الرائع من تطبيق نبض بلس: ${offer.title} بسعر ${offer.discountedPrice} ريال فقط في ${offer.provider}!`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleBook = () => {
    // Navigate to consultations booking confirmation or show success
    Alert.alert(
      'تأكيد الحجز',
      `هل ترغب في حجز "${offer.title}" مع "${offer.provider}" بسعر ${offer.discountedPrice} ريال؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'احجز الآن',
          onPress: () => {
            router.push({
              pathname: '/consultations/booking-confirm',
              params: {
                doctorId: 'offer_' + offerId,
                date: 'العرض متوفر',
                time: offer.provider,
                price: offer.discountedPrice.toString(),
                offerTitle: offer.title
              }
            } as any);
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[st.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#23B5CE" />
      </View>
    );
  }

  if (!offer) {
    return (
      <View style={[st.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <AppText variant="h5">\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0639\u0631\u0636</AppText>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <AppText variant="bodySM" color="#23B5CE">\u0627\u0644\u0639\u0648\u062f\u0629</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[st.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Header Image section */}
        <View style={st.imgContainer}>
          <Image source={{ uri: offer.image }} style={st.image} />
          <View
            style={st.gradient}
          />
          {/* Top Bar actions */}
          <View style={[st.topActions, { paddingTop: insets.top + 8 } ]}>
            <IconButton icon="share" bg="rgba(255,255,255,0.25)" color="#fff" onPress={handleShare} />
            <IconButton icon="back" bg="rgba(255,255,255,0.25)" color="#fff" onPress={() => router.back()} />
          </View>

          {/* Title overlay */}
          <View style={st.overlayTitle}>
            <Badge label="ممول" color="#fff" bg="rgba(239,68,68,0.9)" style={{ marginBottom: 6 }}/>
            <AppText variant="h2" color="#fff" style={st.titleText}>{offer.title}</AppText>
            <View style={st.providerRow}>
              <Icon name="hospital" size={16} color="rgba(255,255,255,0.8)" />
              <AppText variant="bodySM" color="rgba(255,255,255,0.9)">{offer.provider}</AppText>
              <View style={st.starRow}>
                <Icon name="star" size={12} color={colors.gold} />
                <AppText variant="labelSM" color={colors.gold}>{offer.rating}</AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Pricing Card */}
        <View style={{ paddingHorizontal: 16, marginTop: -20 }}>
          <Card style={st.priceCard}>
            <View style={st.priceRow}>
              <View style={{ alignItems: 'flex-start' }}>
                <Badge label={`وفر ${offer.originalPrice - offer.discountedPrice} ر.س`} color={colors.success} />
              </View>
              <View style={st.priceAlign}>
                <AppText variant="h1" color={colors.primary}>{offer.discountedPrice} ر.س</AppText>
                <AppText variant="bodySM" color={colors.textTertiary} style={st.strikeThrough}>
                  {offer.originalPrice} ر.س
                </AppText>
              </View>
            </View>
          </Card>
        </View>

        {/* Content sections */}
        <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 16 }}>
          {/* Inclusions Checklist */}
          <Card>
            <SectionHeader title="مشتملات الباقة" />
            <AppText variant="caption" color={colors.textTertiary} style={{ marginBottom: 12 }}>
              اضغط لتحديد البنود للتحقق منها
            </AppText>
            {offer.inclusions.map((item, index) => {
              const isChecked = !!inclusionsChecked[index];
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => toggleCheck(index)}
                  style={[st.inclusionItem, { borderBottomColor: colors.borderLight } ]}>
                  <AppText
                    variant="bodySM"
                    color={isChecked ? colors.textSecondary : colors.textPrimary}
                    style={{ flex: 1, textDecorationLine: isChecked ? 'line-through' : 'none' }}>
                    {item}
                  </AppText>
                  <Icon
                    name={isChecked ? 'check-circle' : 'circle'}
                    size={20}
                    color={isChecked ? colors.success : colors.textTertiary}
                  />
                </TouchableOpacity>
              );
            })}
          </Card>

          {/* Terms & Conditions */}
          <Card>
            <SectionHeader title="الشروط والأحكام" />
            {offer.terms.map((item, index) => (
              <View key={index} style={st.termRow}>
                <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1 }}>
                  • {item}
                </AppText>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>

      {/* Floating Bottom Booking Bar */}
      <View style={[st.bottomBar, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight } ]}>
        <Button label="احجز العرض الآن" variant="gradient" size="lg" icon="calendarCheck" onPress={handleBook} />
      </View>
    </View>
  );
}

import { LinearGradient } from 'expo-linear-gradient';
import { SectionHeader } from '../../src/components/ui';

const st = StyleSheet.create({
  container: { flex: 1 },
  imgContainer: { height: 280, position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  gradient: { ...StyleSheet.absoluteFillObject },
  topActions: { position: 'absolute', top: 0, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  overlayTitle: { position: 'absolute', bottom: 30, right: 16, left: 16, alignItems: 'flex-end' },
  titleText: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3, textAlign: 'right' },
  providerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 },
  starRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginRight: 12 },
  priceCard: { paddingVertical: 14 },
  priceRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  priceAlign: { alignItems: 'flex-end' },
  strikeThrough: { textDecorationLine: 'line-through', marginTop: 2 },
  inclusionItem: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  termRow: { flexDirection: 'row-reverse', paddingVertical: 4 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
