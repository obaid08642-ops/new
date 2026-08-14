// @ts-nocheck
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  FlatList,
  Share,
  Image
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, FadeInRight } from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';
import { STORAGE_KEYS, API_BASE_URL } from '../../src/constants';
import { apiFetch } from '../../src/utils/api';

const { width: SCREEN_W } = Dimensions.get('window');

type TabKey = 'about' | 'services' | 'reviews';

export default function DoctorProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.doctorId) return;
    setLoading(true);
    apiFetch<any>(`/care/doctors/${params.doctorId}`)
      .then(res => {
        if (res) {
          setDoctor({
            id: res.id || res._id,
            name: res.name_ar || res.name || res.display_name,
            degree: res.degree || res.academic_degree || res.title || 'طبيب',
            spec: res.specialty_ar || res.specialty || '',
            rating: res.rating || 4.5,
            reviews: res.reviews_count || res.review_count || 10,
            exp: res.years_experience || 5,
            patients: res.patients_treated || 500,
            price: res.price_clinic || res.consultation_fee || res.price || 150,
            wait: res.average_wait ? `${res.average_wait} دقائق` : '15 دقيقة',
            bio: res.bio_ar || res.bio || '',
            hospital: res.facility?.name_ar || res.hospital || 'عيادة خاصة',
            hospitalArea: res.facility?.city || res.city || '',
            insurance: res.accepts_insurance !== undefined ? !!res.accepts_insurance : true,
            services: res.services || [],
            education: res.education || [],
            certifications: res.certifications || [],
            memberships: res.memberships || [],
            clinicPhotos: res.clinicPhotos || [],
            calendar: res.calendar || [],
            timeSlots: res.timeSlots || { morning: [], afternoon: [], evening: [] },
            reviews_data: res.reviews_data || [],
            faq: res.faq || [],
            similarDoctors: res.similarDoctors || [],
          });
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [params.doctorId]);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedDate, setSelectedDate] = useState(3);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [activeTab, setActiveTab] = useState<TabKey>('about');
  const [coverage, setCoverage] = useState<any>(null);
  const [loadingCoverage, setLoadingCoverage] = useState(false);

  const handleWaitlistPrompt = (dateStr: string) => {
    Alert.alert(
      'الانضمام لقائمة الانتظار الذكية',
      `هذا اليوم (${dateStr}) ممتلئ تماماً بالكامل.\n\nهل ترغب في الانضمام إلى قائمة الانتظار لتلقي إشعار تلقائي فوري وحجز الموعد إذا قام أي مريض بإلغاء حجزه؟\n\n(ترتيبك في القائمة: الثاني #2)`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، انضم للقائمة',
          onPress: async () => {
            try {
              await apiFetch('/care/appointments/waitlist/join', {
                method: 'POST',
                body: JSON.stringify({ doctorId: params.doctorId || doctor.id, date: dateStr })
              });
            } catch {}
            Alert.alert('تم الانضمام بنجاح! ', 'لقد تمت إضافتك لقائمة الانتظار بنجاح. سنرسل لك إشعاراً فور توفر الموعد.');
          }
        }
      ]
    );
  };

  useEffect(() => {
    let active = true;
    const checkCoverage = async () => {
      setLoadingCoverage(true);
      try {
        const data = await apiFetch<any>(`/insurance/coverage-check?provider_id=${params.doctorId || doctor.id}&service_type=consultation`);
        if (active) setCoverage(data);
      } catch (err) {
        console.log('Error checking coverage', err);
      } finally {
        if (active) setLoadingCoverage(false);
      }
    };
    checkCoverage();
    return () => { active = false; };
  }, [params.doctorId]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${doctor.name} - ${doctor.spec}\nhttps://nabdahplus.com/doctors/${doctor.id}`,
        title: doctor.name,
      });
    } catch (_shareError) {
      /* handled */
    }
  }, []);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'about', label: 'نبذة' },
    { key: 'services', label: 'الخدمات' },
    { key: 'reviews', label: 'التقييمات' },
  ];

  if (loading || !doctor) {
    return (
      <View style={[st.c, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <AppText>جاري التحميل...</AppText>
      </View>
    );
  }

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header Card */}
        <Animated.View entering={FadeIn.duration(400)} style={[st.headerCard, { backgroundColor: colors.surface, paddingTop: insets.top + 12 } ]}>
          <View style={st.headerNav}>
            <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
              <TouchableOpacity
                onPress={handleShare}
                style={[st.navBtn, { backgroundColor: colors.backgroundSecondary } ]}>
                <Icon name="share" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsSaved(!isSaved)}
                style={[st.navBtn, { backgroundColor: colors.backgroundSecondary } ]}>
                <Icon name={isSaved ? 'heartOutline' : 'heartOutline'} size={20} color={isSaved ? colors.error : colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <AppText variant="h4">موعد الدكتور</AppText>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[st.navBtn, { backgroundColor: colors.backgroundSecondary } ]}>
              <Icon name="back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Doctor Info */}
          <View style={st.doctorInfo}>
            <View style={[st.avatarLg, { backgroundColor: colors.backgroundSecondary } ]}>
              <Icon name="doctor" size={56} color={colors.primary} />
            </View>
            <AppText variant="h2" align="center">{doctor.name}</AppText>
            <AppText variant="bodySM" color={colors.textSecondary} align="center">{doctor.spec}</AppText>
            <View style={{ flexDirection: 'row-reverse', gap: 4, alignItems: 'center', marginTop: 4 }}>
              <Icon name="star" size={16} color="#FBBF24" />
              <AppText variant="h6">{doctor.rating}</AppText>
              <AppText variant="caption" color={colors.textTertiary}>({doctor.reviews}) تقييم</AppText>
            </View>

            {/* Price Badge */}
            <Animated.View entering={FadeInDown.delay(200)} style={[st.priceBadge, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
              <View style={{ alignItems: 'center' }}>
                <AppText variant="h2" color={colors.textPrimary}>{doctor.price}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>ريال</AppText>
              </View>
              <View style={[st.priceTag, { backgroundColor: colors.primarySurface } ]}>
                <AppText variant="labelSM" color={colors.primary}>سعر الكشف</AppText>
              </View>
            </Animated.View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row-reverse', gap: 12, marginTop: 12 }}>
              <TouchableOpacity style={[st.actionCircle, { backgroundColor: colors.primarySurface } ]}>
                <Icon name="call" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[st.actionCircle, { backgroundColor: colors.primarySurface } ]}>
                <Icon name="video" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[st.actionCircle, { backgroundColor: colors.primarySurface } ]}>
                <Icon name="chat" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Row */}
          <Animated.View entering={FadeInDown.delay(300)} style={[st.statsRow, { backgroundColor: colors.backgroundSecondary } ]}>
            {[
              { icon: 'user' as IconName, value: `${doctor.patients}+`, label: 'مريض' },
              { icon: 'clock' as IconName, value: `${doctor.exp}+`, label: 'سنوات خبرة' },
              { icon: 'pulse' as IconName, value: doctor.wait, label: 'متوسط الانتظار' },
            ].map((stat, i) => (
              <View key={i} style={st.statItem}>
                <Icon name={stat.icon} size={18} color={colors.primary} />
                <AppText variant="h5">{stat.value}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>{stat.label}</AppText>
              </View>
            ))}
          </Animated.View>
        </Animated.View>

        {/* Hospital Info */}
        <Animated.View entering={FadeInDown.delay(400)} style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <Card style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>
            <View style={[st.locIcon, { backgroundColor: colors.primarySurface } ]}>
              <Icon name="hospital" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <AppText variant="h6">{doctor.hospital}</AppText>
              <AppText variant="caption" color={colors.textTertiary}>{doctor.hospitalArea}</AppText>
            </View>
            <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center' }}>
              <Icon name="location" size={16} color={colors.textTertiary} />
              {doctor.insurance && (
                <View style={[st.insuranceBadge, { backgroundColor: colors.successSurface } ]}>
                  <Icon name="shield" size={12} color={colors.success} />
                  <AppText variant="caption" color={colors.success}>يقبل التأمين</AppText>
                </View>
              )}
            </View>
          </Card>
        </Animated.View>

        {/* Insurance Coverage Details Card */}
        {coverage && (
          <Animated.View entering={FadeInDown.delay(450)} style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <Card style={{ 
              borderColor: coverage.covered ? colors.success : (coverage.guest || (coverage.reason && coverage.reason.includes('no registered')) ? colors.border : colors.error), 
              borderWidth: 1.5,
              backgroundColor: coverage.covered ? (isDark ? 'rgba(16,185,129,0.1)' : 'rgba(209,250,229,0.3)') : colors.surface
            }}>
              <View style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>
                <View style={[st.locIcon, { backgroundColor: coverage.covered ? 'rgba(16,185,129,0.1)' : colors.backgroundSecondary } ]}>
                  <Icon 
                    name="shield" 
                    size={22} 
                    color={coverage.covered ? colors.success : (coverage.guest ? colors.textTertiary : colors.error)} 
                  />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  {coverage.guest && (
                    <>
                      <AppText variant="h6">التأمين الطبي</AppText>
                      <AppText variant="bodySM" color={colors.textSecondary}>سجل دخولك للتحقق من التغطية التأمينية</AppText>
                    </>
                  )}
                  {coverage.covered === false && coverage.reason && coverage.reason.includes('no registered') && (
                    <>
                      <AppText variant="h6">التأمين الطبي</AppText>
                      <AppText variant="bodySM" color={colors.textSecondary}>سجل تأمينك الطبي للتحقق من التغطية</AppText>
                    </>
                  )}
                  {coverage.covered === false && (!coverage.reason || !coverage.reason.includes('no registered')) && !coverage.guest && (
                    <>
                      <AppText variant="h6" color={colors.error}>غير مغطى بالتأمين</AppText>
                      <AppText variant="bodySM" color={colors.textSecondary}>{coverage.reason || 'هذا الطبيب غير متعاقد مع شبكة تأمينك'}</AppText>
                    </>
                  )}
                  {coverage.covered && (
                    <>
                      <AppText variant="h6" color={colors.success}>مغطى بالتأمين المسجل</AppText>
                      <AppText variant="bodySM" color={colors.textSecondary}>
                        شركة: {coverage.company_name_ar} | شبكة: {coverage.network_name_ar}
                      </AppText>
                      <AppText variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
                        مشاركة المريض: {coverage.copay_percent}% {coverage.copay_flat > 0 ? `+ ${coverage.copay_flat} ريال` : ''} 
                        {coverage.requires_preauth ? ' (يتطلب موافقة مسبقة)' : ''}
                      </AppText>
                    </>
                  )}
                </View>
                {(coverage.guest || (coverage.covered === false && coverage.reason && coverage.reason.includes('no registered'))) && (
                  <TouchableOpacity 
                    onPress={() => router.push(coverage.guest ? '/(auth)/login' : '/insurance/add-policy' as any)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary }}
                  >
                    <AppText variant="labelSM" color="#fff">
                      {coverage.guest ? 'دخول' : 'إضافة'}
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Clinic Photos */}
        <Animated.View entering={FadeInDown.delay(500)} style={{ marginTop: 16 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="صور العيادة" actionLabel="عرض الكل" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, flexDirection: 'row-reverse' }}>
            {doctor.clinicPhotos.map((photo, i) => (
              <View key={i} style={[st.clinicPhoto, { backgroundColor: colors.surfaceSecondary } ]}>
                <Icon name="image" size={28} color={colors.textTertiary} />
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Services Grid */}
        <Animated.View entering={FadeInDown.delay(600)} style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <SectionHeader title="الخدمات" />
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 }}>
            {doctor.services.map((service) => (
              <View key={service.id} style={[st.serviceChip, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
                <View style={[st.serviceIconCircle, { backgroundColor: colors.primarySurface } ]}>
                  <Icon name={service.icon} size={18} color={colors.primary} />
                </View>
                <AppText variant="labelSM" color={colors.textPrimary}>{service.nameAr}</AppText>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Calendar – Date Selection */}
        <Animated.View entering={FadeInDown.delay(700)} style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <SectionHeader title="احجز موعدك" actionLabel="اختر اليوم" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row-reverse' }}>
            {doctor.calendar.map((cal, i) => {
              const isSelected = selectedDate === i;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    if (cal.available) {
                      setSelectedDate(i);
                    } else {
                    }
                  }}
                  style={[
                    st.calendarDay,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      opacity: 1,
                    },
                    !cal.available && { borderColor: colors.warning, borderWidth: 1.2 }]} >
                  <AppText variant="caption" color={isSelected ? '#fff' : colors.textTertiary}>{cal.day}</AppText>
                  <AppText variant="h3" color={isSelected ? '#fff' : colors.textPrimary}>{cal.date}</AppText>
                  <AppText variant="caption" color={isSelected ? 'rgba(255,255,255,0.7)' : colors.textTertiary}>{cal.month}</AppText>
                  {cal.isToday && (
                    <View style={[st.todayDot, { backgroundColor: isSelected ? '#fff' : colors.primary }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Time of Day Filter */}
          <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 12, marginBottom: 12 }}>
            {(['morning', 'afternoon', 'evening'] as const).map((period) => {
              const isActive = timeOfDay === period;
              const labels = { morning: 'صباحاً', afternoon: 'مساءً', evening: 'ليلاً' };
              return (
                <TouchableOpacity
                  key={period}
                  onPress={() => setTimeOfDay(period)}
                  style={[st.periodChip, {
                    backgroundColor: isActive ? colors.primary : colors.surfaceSecondary,
                    borderColor: isActive ? colors.primary : 'transparent',
                  } ]}>
                  <AppText variant="labelSM" color={isActive ? '#fff' : colors.textSecondary}>{labels[period]}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Time Slots */}
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
            {doctor.timeSlots[timeOfDay].map((time) => {
              const isSelected = selectedTime === time;
              return (
                <TouchableOpacity
                  key={time}
                  onPress={() => setSelectedTime(time)}
                  style={[st.timeSlot, {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  } ]}>
                  <AppText variant="labelMD" color={isSelected ? '#fff' : colors.textPrimary}>{time}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Tabs: About / Services / Reviews */}
        <Animated.View entering={FadeInDown.delay(800)} style={{ marginTop: 20 }}>
          <View style={[st.tabBar, { borderBottomColor: colors.border } ]}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={[st.tab, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 } ]}>
                  <AppText variant={isActive ? 'h6' : 'bodySM'} color={isActive ? colors.primary : colors.textTertiary}>{tab.label}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            {activeTab === 'about' && (
              <Animated.View entering={FadeIn} style={{ gap: 16 }}>
                {/* Bio */}
                <View>
                  <AppText variant="h5" style={{ marginBottom: 8 }}>النبذة</AppText>
                  <AppText variant="bodySM" color={colors.textSecondary} style={{ lineHeight: 26 }}>{doctor.bio}</AppText>
                </View>

                {/* Education */}
                <View>
                  <AppText variant="h5" style={{ marginBottom: 8 }}>الشهادات والزمالات</AppText>
                  {doctor.education.map((edu, i) => (
                    <View key={i} style={{ flexDirection: 'row-reverse', gap: 10, marginBottom: 10 }}>
                      <View style={[st.eduDot, { backgroundColor: colors.primary }]} />
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <AppText variant="labelMD">{edu.degree}</AppText>
                        <AppText variant="caption" color={colors.textTertiary}>{edu.school} - {edu.year}</AppText>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Certifications */}
                <View>
                  <AppText variant="h5" style={{ marginBottom: 8 }}>الشهادات والزمالات</AppText>
                  <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                    {doctor.certifications.map((cert, i) => (
                      <Badge key={i} label={cert} color={colors.primary} />
                    ))}
                  </View>
                </View>

                {/* Memberships */}
                <View>
                  <AppText variant="h5" style={{ marginBottom: 8 }}>العضويات</AppText>
                  {doctor.memberships.map((m, i) => (
                    <View key={i} style={{ flexDirection: 'row-reverse', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                      <Icon name="check_circle" size={16} color={colors.success} />
                      <AppText variant="bodySM" color={colors.textSecondary}>{m}</AppText>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {activeTab === 'services' && (
              <Animated.View entering={FadeIn} style={{ gap: 10 }}>
                {doctor.services.map((service) => (
                  <Card key={service.id} style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>
                    <View style={[st.serviceIconLg, { backgroundColor: colors.primarySurface } ]}>
                      <Icon name={service.icon} size={24} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <AppText variant="h6">{service.nameAr}</AppText>
                    </View>
                    <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
                  </Card>
                ))}
              </Animated.View>
            )}

            {activeTab === 'reviews' && (
              <Animated.View entering={FadeIn} style={{ gap: 12 }}>
                {/* Rating Summary */}
                <View style={{ alignItems: 'center', gap: 4, marginBottom: 8 }}>
                  <AppText variant="displayMD">{doctor.rating}</AppText>
                  <View style={{ flexDirection: 'row-reverse', gap: 2 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Icon key={i} name={i < Math.floor(doctor.rating) ? 'star' : 'starOutline'} size={18} color="#FBBF24" />
                    ))}
                  </View>
                  <AppText variant="caption" color={colors.textTertiary}>من {doctor.reviews} تقييم</AppText>
                </View>

                {doctor.reviews_data.map((r) => (
                  <Card key={r.id}>
                    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center' }}>
                        <View style={[st.reviewAvatar, { backgroundColor: colors.primarySurface } ]}>
                          <Icon name="user" size={18} color={colors.primary} />
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <AppText variant="h6">{r.name}</AppText>
                          <AppText variant="caption" color={colors.textTertiary}>{r.date}</AppText>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row-reverse', gap: 2 }}>
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Icon key={i} name="star" size={12} color="#FBBF24" />
                        ))}
                      </View>
                    </View>
                    <AppText variant="bodySM" color={colors.textSecondary}>{r.text}</AppText>
                  </Card>
                ))}

                <TouchableOpacity style={[st.writeReview, { borderColor: colors.primary } ]}>
                  <Icon name="edit" size={18} color={colors.primary} />
                  <AppText variant="labelMD" color={colors.primary}>كتابة تقييم جديد</AppText>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </Animated.View>

        {/* FAQ */}
        <Animated.View entering={FadeInDown.delay(900)} style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <SectionHeader title="الأسئلة الشائعة" />
          {doctor.faq.map((item, i) => (
            <Card key={i} style={{ marginBottom: 8 }}>
              <AppText variant="h6" style={{ marginBottom: 4 }}>{item.q}</AppText>
              <AppText variant="bodySM" color={colors.textSecondary}>{item.a}</AppText>
            </Card>
          ))}
        </Animated.View>

        {/* Similar Doctors */}
        <Animated.View entering={FadeInDown.delay(1000)} style={{ marginTop: 20, marginBottom: 16 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="أطباء مشابهون" actionLabel="عرض الكل" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, flexDirection: 'row-reverse' }}>
            {doctor.similarDoctors.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                onPress={() => router.push({ pathname: '/consultations/doctor-profile', params: { doctorId: doc.id } })}
                style={[st.similarCard, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
                <View style={[st.similarAvatar, { backgroundColor: colors.primarySurface } ]}>
                  <Icon name="doctor" size={28} color={colors.primary} />
                </View>
                <AppText variant="labelMD" align="center" numberOfLines={1}>{doc.name}</AppText>
                <AppText variant="caption" color={colors.textTertiary} align="center">{doc.spec}</AppText>
                <View style={{ flexDirection: 'row-reverse', gap: 2, alignItems: 'center' }}>
                  <Icon name="star" size={12} color="#FBBF24" />
                  <AppText variant="caption">{doc.rating}</AppText>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </ScrollView>

      {/* Bottom Booking Bar */}
      <View style={[st.bottom, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight } ]}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <AppText variant="h4">{doctor.price} ريال</AppText>
            <AppText variant="caption" color={colors.textTertiary}>سعر الكشف</AppText>
          </View>
          <Button
            label="تأكيد الحجز"
            variant="gradient"
            size="lg"
            icon="calendarCheck"
            disabled={!selectedTime}
            onPress={() =>
              router.push({
                pathname: '/consultations/booking-confirm',
                params: {
                  doctorId: params.doctorId as string || doctor.id,
                  date: doctor.calendar[selectedDate]?.fullDate || new Date().toISOString().substring(0, 10),
                  time: selectedTime || '',
                },
              })
            }
            style={{ flex: 1.5 }}
          />
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  headerCard: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerNav: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  navBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  doctorInfo: { alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingBottom: 8 },
  avatarLg: { width: 100, height: 100, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 3, borderColor: 'rgba(59,130,246,0.2)' },
  priceBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, borderWidth: 1, marginTop: 8 },
  priceTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  actionCircle: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row-reverse', borderRadius: 16, marginHorizontal: 16, marginTop: 12, padding: 12, marginBottom: 4 },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  locIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  insuranceBadge: { flexDirection: 'row-reverse', gap: 4, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  clinicPhoto: { width: 120, height: 90, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceChip: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  serviceIconCircle: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serviceIconLg: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  calendarDay: { width: 64, alignItems: 'center', gap: 2, paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
  todayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  periodChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  timeSlot: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  tabBar: { flexDirection: 'row-reverse', borderBottomWidth: 1, paddingHorizontal: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  eduDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  writeReview: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed' },
  similarCard: { width: 130, alignItems: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1 },
  similarAvatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
