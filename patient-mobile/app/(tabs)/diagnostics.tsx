// @ts-nocheck
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter, Tabs, useFocusEffect } from 'expo-router';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import Animated, { FadeInUp, FadeInDown, FadeIn, SlideInUp, FadeInRight, ZoomIn, SlideInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

import { apiFetch } from '../../src/utils/api';
import { normalizeLabList, normalizeLabService } from '../../src/utils/labMappers';
import { resolveEffectiveAddress, formatAddressLine } from '../../src/utils/selectedAddress';

export default function DiagnosticsHub() {
  const router = useRouter();
  const { colors } = useApp();
  const { items, itemCount, addItem } = useDiagnosticsCart();

  const [mainTab, setMainTab] = useState<'labs' | 'radiology'>('labs');
  const [serviceType, setServiceType] = useState<'home' | 'clinic'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const [packages, setPackages] = useState<any[]>([]);
  const [testsPart1, setTestsPart1] = useState<any[]>([]);
  const [testsPart2, setTestsPart2] = useState<any[]>([]);
  const [radiologyServices, setRadiologyServices] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState<any>(null);
  const [addressLoaded, setAddressLoaded] = useState(false);

  // Reload the effective delivery address whenever the tab gains focus
  // (covers returning from the address picker).
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const addr = await resolveEffectiveAddress();
        if (active) {
          setDeliveryAddress(addr);
          setAddressLoaded(true);
        }
      })();
      return () => { active = false; };
    }, [])
  );

  React.useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [pkgsRes, testsRes, radsRes, labsRes] = await Promise.all([
          apiFetch('/labs/packages').catch(() => ({ data: [] })),
          apiFetch('/labs/services').catch(() => ({ data: [] })),
          apiFetch('/radiology/services').catch(() => ({ data: [] })),
          apiFetch('/providers?type=lab').catch(() => ({ data: [] }))
        ]);

        setPackages(normalizeLabList(pkgsRes?.data || pkgsRes || []));

        const allTests = normalizeLabList(testsRes?.data || testsRes || []);
        setTestsPart1(allTests.slice(0, Math.ceil(allTests.length / 2)));
        setTestsPart2(allTests.slice(Math.ceil(allTests.length / 2)));

        setRadiologyServices(normalizeLabList(radsRes?.data || radsRes || []));

        const labsData = labsRes?.data || labsRes;
        if (Array.isArray(labsData) && labsData.length > 0) {
          setLabs(labsData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background } ]}>
      <Tabs.Screen options={{ headerShown: false }} />

      {/* Custom Top Header */}
      <View style={[styles.topHeader, { backgroundColor: colors.background, borderBottomColor: colors.border } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h2" style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary }}>المختبرات والأشعة</AppText>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <TouchableOpacity
            onPress={() => (router.push as any)('/diagnostics/orders')}
            style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}
          >
            <Icon name="file-document-outline" size={20} color={colors.primary} style={{ marginLeft: I18nManager.isRTL ? 0 : 8, marginRight: I18nManager.isRTL ? 8 : 0 }}/>
            <AppText style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>طلباتي والنتائج</AppText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Search Bar - NOW AT THE VERY TOP */}
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
          <Icon name="magnify" size={24} color={colors.primary} />
          <TextInput
            placeholder={mainTab === 'labs' ? "ابحث عن تحليل، باقة، أو مختبر..." : "ابحث عن نوع الأشعة أو المركز..."}
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.textPrimary, textAlign: I18nManager.isRTL ? 'right' : 'right' }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginHorizontal: 8 }}>
              <Icon name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowFilters(true)}>
            <Icon name="tune" size={24} color={colors.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Main Tab Toggle: Labs vs Radiology */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={[styles.mainTabToggle, { backgroundColor: colors.border } ]}>
          <TouchableOpacity
            style={[styles.mainTabBtn, mainTab === 'labs' && { backgroundColor: colors.surface, shadowColor: '#000', elevation: 2 }]}
            onPress={() => setMainTab('labs')}
          >
            <Icon name="flask-outline" size={22} color={mainTab === 'labs' ? colors.primary : colors.textSecondary} />
            <AppText style={[styles.toggleText, { color: mainTab === 'labs' ? colors.primary : colors.textSecondary } ]}>التحاليل الطبية</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTabBtn, mainTab === 'radiology' && { backgroundColor: colors.surface, shadowColor: '#000', elevation: 2 }]}
            onPress={() => setMainTab('radiology')}
          >
            <Icon name="radiology-box-outline" size={22} color={mainTab === 'radiology' ? colors.primary : colors.textSecondary} />
            <AppText style={[styles.toggleText, { color: mainTab === 'radiology' ? colors.primary : colors.textSecondary } ]}>الأشعة والتصوير</AppText>
          </TouchableOpacity>
        </Animated.View>

        {/* Service Type Selection (Home vs Clinic) - NOW GLOBALLY VISIBLE FOR BOTH */}
        <Animated.View entering={FadeInDown.duration(400).delay(150)} style={[styles.serviceToggle, { backgroundColor: colors.surface } ]}>
          <TouchableOpacity
            style={[styles.toggleBtn, serviceType === 'home' && { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }]}
            onPress={() => setServiceType('home')}
          >
            <Icon name="home-variant-outline" size={22} color={serviceType === 'home' ? '#fff' : colors.textSecondary} />
            <AppText style={[styles.toggleText, { color: serviceType === 'home' ? '#fff' : colors.textSecondary } ]}>{mainTab === 'labs' ? 'سحب عينة منزلي' : 'أشعة منزلية'}</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, serviceType === 'clinic' && { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }]}
            onPress={() => setServiceType('clinic')}
          >
            <Icon name="hospital-box-outline" size={22} color={serviceType === 'clinic' ? '#fff' : colors.textSecondary} />
            <AppText style={[styles.toggleText, { color: serviceType === 'clinic' ? '#fff' : colors.textSecondary } ]}>{mainTab === 'labs' ? 'زيارة المختبر' : 'زيارة المركز'}</AppText>
          </TouchableOpacity>
        </Animated.View>

        {/* Location Indicator for Home Visit */}
        {serviceType === 'home' && (
          <Animated.View entering={ZoomIn.duration(300)} style={styles.locationIndicator}>
            <View style={[styles.locationIconWrap, { backgroundColor: `${colors.secondary}15` }]} >
              <Icon name="map-marker-radius-outline" size={18} color={colors.secondary} />
            </View>
            <AppText style={{ flex: 1, fontSize: 13, color: colors.textPrimary, marginLeft: 8, textAlign: 'right' }}>
              {deliveryAddress ? (
                <>التوصيل إلى: <AppText style={{fontWeight: 'bold'}}>{formatAddressLine(deliveryAddress)}</AppText></>
              ) : addressLoaded ? (
                'لم تحدد عنواناً للتوصيل بعد'
              ) : (
                'جاري تحميل العنوان...'
              )}
            </AppText>
            <TouchableOpacity onPress={() => (router.push as any)('/delivery/address-select')}>
              <AppText style={{ fontSize: 13, color: colors.primary, fontWeight: 'bold' }}>{deliveryAddress ? 'تغيير' : 'اختيار'}</AppText>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Insurance Golden Button */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <TouchableOpacity style={styles.insuranceCard} onPress={() => (router.push as any)('/diagnostics/insurance-upload')}>
            <View style={styles.insuranceGradient}>
              <View style={[styles.insuranceIconWrap, { backgroundColor: colors.surface } ]}>
                <Icon name="shield-check" size={32} color="#F5A623" />
              </View>
              <View style={styles.insuranceText}>
                <AppText style={{ color: '#fff', fontWeight: '900', fontSize: 16, textAlign: 'right' }}>هل لديك تأمين طبي أو وصفة؟</AppText>
                <AppText style={{ color: 'rgba(255,255,255,0.95)', fontSize: 12, marginTop: 4, textAlign: 'right' }}>ارفع الوصفة لمعرفة التغطية واحجز موعدك فوراً</AppText>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Labs Section */}
        {mainTab === 'labs' && (
          <>
            {/* Packages Carousel */}
            <Animated.View entering={FadeInRight.duration(500).delay(300)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <TouchableOpacity onPress={() => (router.push as any)('/diagnostics/packages')}>
                  <AppText style={{ color: colors.secondary, fontWeight: 'bold' }}>عرض الكل</AppText>
                </TouchableOpacity>
                <AppText variant="h3" color={colors.textPrimary}>باقات التحاليل الشاملة</AppText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {packages.map((pkg, index) => (
                  <Animated.View key={pkg.id} entering={FadeInRight.delay(300 + (index * 100))}>
                    <TouchableOpacity style={[styles.pkgCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => (router.push as any)(`/diagnostics/package-detail?id=${pkg.id}&serviceType=${serviceType}`)}>
                      {pkg.isPopular && (
                        <View style={styles.popularBadge}>
                          <AppText style={{ fontSize: 10, color: '#fff', fontWeight: 'bold' }}>الأكثر طلباً</AppText>
                        </View>
                      )}
                      <View style={[styles.pkgIcon, { backgroundColor: `${pkg.color}15`, overflow: 'hidden' }]} >
                        {pkg.image
                          ? <Image source={{ uri: pkg.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          : <Icon name={pkg.icon as any} size={32} color={pkg.color} />}
                      </View>
                      <AppText style={{ fontWeight: 'bold', fontSize: 15, marginTop: 16, color: colors.textPrimary, textAlign: 'right' }}>{pkg.name}</AppText>
                      <AppText style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, height: 34, lineHeight: 16, textAlign: 'right' }} numberOfLines={2}>{pkg.desc}</AppText>
                      <View style={styles.priceRow}>
                        <View style={{ alignItems: 'flex-end' }}>
                          {pkg.oldPrice && <AppText style={{ fontSize: 11, color: colors.textSecondary, textDecorationLine: 'line-through' }}>{pkg.oldPrice} ر.س</AppText>}
                          <AppText style={{ fontSize: 18, fontWeight: '900', color: colors.primary }}>{pkg.price} <AppText style={{ fontSize: 10, color: colors.primary }}>ر.س</AppText></AppText>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </ScrollView>
            </Animated.View>

            {/* Individual Tests Part 1 */}
            <Animated.View entering={FadeInDown.duration(500).delay(400)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View />
                <AppText variant="h3" color={colors.textPrimary}>تحاليل شائعة الفحص</AppText>
              </View>
              {testsPart1.map((test, index) => (
                <Animated.View key={test.id} entering={FadeInDown.delay(400 + (index * 100))}>
                  <TouchableOpacity style={[styles.testItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => (router.push as any)(`/diagnostics/test-detail?id=${test.id}`)}>

                    <View style={[styles.testIconWrap, { backgroundColor: `${test.color}15`, overflow: 'hidden' }]} >
                      {test.image
                        ? <Image source={{ uri: test.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        : <Icon name={test.icon as any} size={28} color={test.color} />}
                    </View>

                    <View style={styles.testTextWrap}>
                      <AppText style={{ fontWeight: 'bold', fontSize: 14, color: colors.textPrimary, textAlign: 'left' }}>{test.name}</AppText>
                      <AppText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'left' }}>{test.desc}</AppText>
                      <AppText style={{ fontSize: 16, fontWeight: '900', color: colors.primary, marginTop: 6, textAlign: 'left' }}>{test.price} ر.س</AppText>
                    </View>

                    {items.some(i => i.id === test.id) ? (
                      <View style={[styles.addBtnRed, { backgroundColor: '#4CAF50' } ]}>
                        <Icon name="check-bold" size={18} color="#fff" />
                        <AppText style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginLeft: 4 }}>مضاف للسلة</AppText>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.addBtnRed, { backgroundColor: '#E53935' }]}
                        onPress={() => addItem({ id: test.id, name: test.name, price: typeof test.price === 'string' ? parseInt(test.price) : test.price, kind: 'lab' })}
                      >
                        <Icon name="cart-plus" size={18} color="#fff" />
                        <AppText style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginLeft: 4 }}>أضف للسلة</AppText>
                      </TouchableOpacity>
                    )}

                  </TouchableOpacity>
                </Animated.View>
              ))}
            </Animated.View>

            {/* Specific Labs */}
            <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View />
                <AppText variant="h3" color={colors.textPrimary}>تصفح حسب المختبر المعتمد</AppText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {labs.map((lab, index) => (
                  <Animated.View key={lab.id} entering={FadeInRight.delay(500 + (index * 100))}>
                    <TouchableOpacity style={[styles.labCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => (router.push as any)(`/diagnostics/lab/${lab.id}`)}>
                      <View style={[styles.labAvatar, { backgroundColor: `${colors.secondary}15` }]} >
                        <Icon name={lab.logo as any} size={24} color={colors.secondary} />
                      </View>
                      <AppText style={{ fontWeight: 'bold', fontSize: 13, color: colors.textPrimary, marginTop: 8 }}>{lab.name}</AppText>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </ScrollView>
            </Animated.View>

            {/* Individual Tests Part 2 */}
            <Animated.View entering={FadeInDown.duration(500).delay(600)} style={styles.section}>
              {testsPart2.map((test, index) => (
                <Animated.View key={test.id} entering={FadeInDown.delay(600 + (index * 100))}>
                  <TouchableOpacity style={[styles.testItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => (router.push as any)(`/diagnostics/test-detail?id=${test.id}`)}>

                    <View style={[styles.testIconWrap, { backgroundColor: `${test.color}15`, overflow: 'hidden' }]} >
                      {test.image
                        ? <Image source={{ uri: test.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        : <Icon name={test.icon as any} size={28} color={test.color} />}
                    </View>

                    <View style={styles.testTextWrap}>
                      <AppText style={{ fontWeight: 'bold', fontSize: 14, color: colors.textPrimary, textAlign: 'left' }}>{test.name}</AppText>
                      <AppText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'left' }}>{test.desc}</AppText>
                      <AppText style={{ fontSize: 16, fontWeight: '900', color: colors.primary, marginTop: 6, textAlign: 'left' }}>{test.price} ر.س</AppText>
                    </View>

                    {items.some(i => i.id === test.id) ? (
                      <View style={[styles.addBtnRed, { backgroundColor: '#4CAF50' } ]}>
                        <Icon name="check-bold" size={18} color="#fff" />
                        <AppText style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginLeft: 4 }}>مضاف للسلة</AppText>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.addBtnRed, { backgroundColor: '#E53935' }]}
                        onPress={() => addItem({ id: test.id, name: test.name, price: parseInt(test.price), kind: 'lab' })}
                      >
                        <Icon name="cart-plus" size={18} color="#fff" />
                        <AppText style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginLeft: 4 }}>أضف للسلة</AppText>
                      </TouchableOpacity>
                    )}

                  </TouchableOpacity>
                </Animated.View>
              ))}
            </Animated.View>
          </>
        )}

        {/* Radiology Section */}
        {mainTab === 'radiology' && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.section}>
            <View style={[styles.insuranceCard, { backgroundColor: `${colors.primary}10`, padding: 16, marginBottom: 24, flexDirection: 'row-reverse', alignItems: 'center' }]} >
              <Icon name="information" size={24} color={colors.primary} style={{ marginHorizontal: 8 }}/>
              <AppText style={{ flex: 1, color: colors.textPrimary, fontSize: 13, lineHeight: 20, textAlign: 'right' }}>
                {serviceType === 'home'
                  ? 'نوفر لك أحدث أجهزة الأشعة المتنقلة مع طاقم فني متخصص لإجراء الفحوصات في راحة منزلك مع إصدار تقارير طبية معتمدة.'
                  : 'تتطلب بعض خدمات الأشعة والتصوير الطبي المعقدة زيارة للمركز. يمكنك حجز موعدك والدفع مسبقاً لتجنب الانتظار.'}
              </AppText>
            </View>

            {radiologyServices
              .filter(rad => serviceType === 'clinic' || rad.homeAvailable)
              .map((rad, index) => (
              <Animated.View key={rad.id} entering={FadeInDown.delay(100 + (index * 100))}>
                <TouchableOpacity style={[styles.testItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => (router.push as any)(`/diagnostics/test-detail?id=${rad.id}&isRadiology=true`)}>

                  <View style={[styles.testIconWrap, { backgroundColor: `${rad.color}15`, borderRadius: 16, overflow: 'hidden' }]} >
                    {rad.image
                      ? <Image source={{ uri: rad.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      : <Icon name={rad.icon as any} size={32} color={rad.color} />}
                  </View>

                  <View style={styles.testTextWrap}>
                    <AppText style={{ fontWeight: 'bold', fontSize: 15, color: colors.textPrimary, textAlign: 'left' }}>{rad.name}</AppText>
                    <AppText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'left' }}>{rad.desc}</AppText>
                    <AppText style={{ fontSize: 16, fontWeight: '900', color: colors.primary, marginTop: 6, textAlign: 'left' }}>{rad.price} ر.س</AppText>
                  </View>

                  <TouchableOpacity
                    style={[styles.addBtnRed, { backgroundColor: colors.primary }]}
                    onPress={() => (router.push as any)({ pathname: '/diagnostics/checkout', params: { serviceType, labName: rad.name, total: String(rad.price || ''), isRadiology: 'true', radiologyType: rad.name, serviceId: rad.id } })}
                  >
                    <Icon name="calendar-check" size={18} color="#fff" />
                    <AppText style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginLeft: 4 }}>احجز الآن</AppText>
                  </TouchableOpacity>

                </TouchableOpacity>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        <View style={{ height: 100 }}/>
      </ScrollView>

      {/* Floating Global Cart Button */}
      {mainTab === 'labs' && itemCount > 0 && (
        <Animated.View entering={SlideInDown.duration(400)} style={styles.floatingCartWrap}>
          <TouchableOpacity
            style={[styles.floatingCart, { backgroundColor: colors.primary }]}
            onPress={() => (router.push as any)('/diagnostics/cart')}
          >
            <View style={[styles.floatingCartBadge, { backgroundColor: colors.surface } ]}>
              <AppText style={{ color: colors.primary, fontWeight: 'bold', fontSize: 14 }}>{itemCount}</AppText>
            </View>
            <AppText style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: I18nManager.isRTL ? 0 : 12, marginRight: I18nManager.isRTL ? 12 : 0 }}>إتمام الحجز والدفع</AppText>
            <View style={{ flex: 1 }}/>
            <Icon name="arrow-left-circle" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}


      {/* Global Filter Bottom Sheet */}
      {showFilters && (
        <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setShowFilters(false)} />
          <Animated.View entering={SlideInUp.duration(300)} style={[styles.filterSheet, { backgroundColor: colors.surface } ]}>
            <View style={styles.sheetHandle} />
            <AppText style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center', marginBottom: 20 }}>تصفية النتائج</AppText>

            <View style={styles.filterOptions}>
              {[
                { id: 'all', label: 'الكل', icon: 'border-all' },
                { id: 'tests', label: 'التحاليل الطبية فقط', icon: 'flask-outline' },
                { id: 'packages', label: 'باقات وعروض التحاليل', icon: 'tag-multiple' },
                { id: 'labs', label: 'المختبرات فقط', icon: 'hospital-building' },
                { id: 'highest_rated', label: 'الأعلى تقييماً', icon: 'star' },
                { id: 'nearest', label: 'الأقرب إليك', icon: 'map-marker' },
                { id: 'lowest_price', label: 'الأقل سعراً', icon: 'cash' },
                { id: 'home_visit', label: 'سحب منزلي متاح', icon: 'home-plus' },
              ].map(f => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => { setActiveFilter(f.id); setShowFilters(false); }} style={[styles.filterOptionRow, { borderColor: activeFilter === f.id ? colors.primary : colors.border, backgroundColor: activeFilter === f.id ? `${colors.primary}10` : colors.background }]} >
                  <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center' }}>
                    <Icon name={f.icon as any} size={24} color={activeFilter === f.id ? colors.primary : colors.textSecondary} style={{ marginRight: I18nManager.isRTL ? 0 : 12, marginLeft: I18nManager.isRTL ? 12 : 0 }}/>
                    <AppText style={{ fontSize: 16, fontWeight: activeFilter === f.id ? 'bold' : 'normal', color: activeFilter === f.id ? colors.primary : colors.textPrimary }}>{f.label}</AppText>
                  </View>
                  {activeFilter === f.id && <Icon name="check-circle" size={24} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </Animated.View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, zIndex: 10 },
  scrollContent: { padding: 20 },
  searchBar: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, height: 56, marginBottom: 20, borderWidth: 1 },
  searchInput: { flex: 1, marginHorizontal: 12, fontSize: 15, fontFamily: 'Cairo-Regular' },
  mainTabToggle: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', borderRadius: 16, padding: 4, marginBottom: 16 },
  mainTabBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  serviceToggle: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', borderRadius: 16, padding: 6, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  toggleBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  toggleText: { fontSize: 14, fontWeight: 'bold' },
  locationIndicator: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4 },
  locationIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  insuranceCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 24, shadowColor: '#F5A623', shadowOpacity: 0.3, shadowRadius: 15, elevation: 6 },
  insuranceGradient: { flexDirection: 'row', alignItems: 'center', padding: 24, justifyContent: 'space-between', backgroundColor: '#B87714' },
  insuranceIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  insuranceText: { flex: 1, paddingRight: 16 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  horizontalScroll: { gap: 16, paddingHorizontal: 4, paddingBottom: 10 },
  pkgCard: { width: width * 0.45, borderRadius: 24, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  popularBadge: { position: 'absolute', top: -10, right: 16, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  pkgIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 },

  testItem: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
  testIconWrap: { width: 88, height: 88, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: I18nManager.isRTL ? 0 : 12, marginRight: I18nManager.isRTL ? 12 : 0 },
  testTextWrap: { flex: 1, paddingHorizontal: 8 },
  addBtnRed: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, shadowColor: '#E53935', shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },

  labCard: { width: width * 0.35, borderRadius: 20, padding: 16, borderWidth: 1, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8, elevation: 2 },
  labAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },

  floatingCartWrap: { position: 'absolute', bottom: 100, left: 20, right: 20, zIndex: 100 },
  // رفعنا السلة للأعلى لكي لا تتغطى بشريط التنقل السفلي
  floatingCart: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', padding: 16, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 },
  floatingCartBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },

  filterSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 120, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 20 },
  filterOptions: { gap: 12 },
  filterOptionRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1 }
});
