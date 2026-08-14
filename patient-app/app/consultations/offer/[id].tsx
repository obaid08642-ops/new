// @ts-nocheck
import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { useApp } from '../../../src/context/AppContext';
import { lightColors, darkColors, resolveColor } from '../../../src/theme/colors';
const promos: any[] = [];

const { width } = Dimensions.get('window');

export default function OfferDetails() {
  const { id } = useLocalSearchParams();
  const { isDark, lang } = useApp() as any;
  const insets = useSafeAreaInsets();
  const isRTL = lang === 'ar' || lang === 'ur';
  const colors = isDark ? darkColors : lightColors;

  const offerIndex = parseInt(id as string) || 0;
  const offer = promos[offerIndex] || promos[0];

  const goBack = () => router.back();

  const [providersList, setProvidersList] = React.useState([
    { id: 'p1', name: 'عيادات المسواك لطب الأسنان', type: 'مجمع عيادات', price: offer[2], rating: '4.9', distance: '1.2 كم', img: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&q=80' },
    { id: 'p2', name: 'مستشفى دله', type: 'مستشفى عام', price: (parseInt(offer[2].replace(/,/g, '')) + 200).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","), rating: '4.7', distance: '3.5 كم', img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&q=80' },
    { id: 'p3', name: 'مستوصف ابتسامة الطبي', type: 'مستوصف', price: (parseInt(offer[2].replace(/,/g, '')) - 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","), rating: '4.5', distance: '5.0 كم', img: 'https://images.unsplash.com/photo-1581595220887-f4f24fb6b941?w=400&q=80' }
  ]);

  React.useEffect(() => {
    async function fetchOfferProviders() {
      try {
        const res = await apiFetch(`/promotions/offers/${id}/providers`);
        if (res?.data && res.data.length > 0) setProvidersList(res.data);
      } catch (e) {
        // Keep initial fallback list
      }
    }
    fetchOfferProviders();
  }, [id]);

  const [selectedProvider, setSelectedProvider] = React.useState(providersList[0]?.id || 'p1');

  const [day, setDay] = React.useState(0);
  const [period, setPeriod] = React.useState(0);
  const [time, setTime] = React.useState(0);

  const { daysArr, dnumsArr, dmonArr } = React.useMemo(() => {
    const d = [];
    const dn = [];
    const dm = [];
    const today = new Date();
    
    const arDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const enDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const arMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const isAr = lang === 'ar';
    
    const toArNum = (n: number) => n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      let dayName = '';
      if (i === 0) dayName = isAr ? 'اليوم' : 'Today';
      else if (i === 1) dayName = isAr ? 'غداً' : 'Tomorrow';
      else dayName = isAr ? arDays[date.getDay()] : enDays[date.getDay()];
      
      d.push(dayName);
      dn.push(isAr ? toArNum(date.getDate()) : date.getDate().toString());
      dm.push(isAr ? arMonths[date.getMonth()] : enMonths[date.getMonth()]);
    }
    
    return { daysArr: d, dnumsArr: dn, dmonArr: dm };
  }, [lang]);

  const perArr = lang === 'ar' ? ['صباحي', 'ظهيرة', 'مسائي', 'ليلي'] : ['Morning', 'Noon', 'Evening', 'Night'];
  const timesArr = lang === 'ar' ? [['٧:٠٠ ص', '٨:٠٠ ص', '٩:٠٠ ص'], ['١٢:٠٠ م', '١:٠٠ م', '٢:٠٠ م'], ['٤:٠٠ م', '٥:٠٠ م'], ['٩:٠٠ م', '١٠:٠٠ م']] : [['7:00 AM', '8:00 AM'], ['12:00 PM', '1:00 PM'], ['4:00 PM'], ['9:00 PM']];


  const heroImage = offerIndex === 0 ? 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&q=80' : 
                    offerIndex === 1 ? 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&q=80' :
                                       'https://images.unsplash.com/photo-1520286828599-28c11e6ed1ab?w=800&q=80';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg } ]}>
      {/* Floating Back Button */}
      <View style={{ position: 'absolute', top: Math.max(insets.top, 20), left: 16, right: 16, zIndex: 10, paddingHorizontal: 16, justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={goBack} style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.3)' } ]}>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 24, color: '#fff' }}>{isRTL ? 'arrow_forward' : 'arrow_back'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero Header */}
        <View style={{ width: '100%', height: 320 }}>
          <Image source={{ uri: heroImage }} style={{ width: '100%', height: '100%' }} />
          <View  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}/>
          
          <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <View style={{ backgroundColor: resolveColor(offer[4]), paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 8 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{offer[1]}</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: colors.n, marginBottom: 4 }}>{offer[0]}</Text>
          </View>
        </View>

        <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: colors.n, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>تفاصيل العرض</Text>
        <Text style={{ fontSize: 14, color: colors.t2, lineHeight: 24, textAlign: isRTL ? 'right' : 'left', marginBottom: 24 }}>
          استفد من هذا العرض الحصري واهتم بصحتك بأفضل الأسعار. يشمل هذا العرض كشفية كاملة، استشارة مع الطبيب المختص، وتطبيق الخطة العلاجية باستخدام أحدث التقنيات والأجهزة الطبية المتطورة لضمان أفضل نتيجة ممكنة لك ولعائلتك.
        </Text>

        <View style={{ paddingHorizontal: 16, justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: colors.n }}>مقدمو الخدمة</Text>
          <Text style={{ fontSize: 13, color: colors.t3, fontWeight: '700' }}>اختر العيادة المناسبة</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 24 }} contentContainerStyle={{ paddingRight: 40 }}>
          {providersList.map((prov) => {
            const isSelected = selectedProvider === prov.id;
            return (
              <TouchableOpacity 
                key={prov.id} 
                activeOpacity={0.9} 
                onPress={() => setSelectedProvider(prov.id)}
                style={[
                  styles.providerCard, 
                  { backgroundColor: colors.s, borderColor: isSelected ? resolveColor('var(--p)') : colors.bd, borderWidth: isSelected ? 2 : 1 } ]}>
                <Image source={{ uri: prov.img }} style={{ width: '100%', height: 90, borderTopLeftRadius: 18, borderTopRightRadius: 18 }} />
                {isSelected && (
                  <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: resolveColor('var(--p)'), width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 16 }}>check</Text>
                  </View>
                )}
                <View style={{ padding: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: colors.n, marginBottom: 4 }} numberOfLines={1}>{prov.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.t3, marginBottom: 8 }}>{prov.type} • {prov.distance}</Text>
                  
                  <View style={{ paddingHorizontal: 16, justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <View style={{ paddingHorizontal: 16, alignItems: 'center' }}>
                      <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#FFB800', fontSize: 14, marginLeft: isRTL ? 2 : 0, marginRight: isRTL ? 0 : 2 }}>star</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.n }}>{prov.rating}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: resolveColor('var(--p)') }}>{prov.price} <Text style={{ fontSize: 9 }}>ر.س</Text></Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: colors.n, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>اختر موعد الحجز</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10, paddingHorizontal: 16, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            {daysArr.map((d, i) => {
              const isActive = day === i;
              return (
                <TouchableOpacity key={i} onPress={() => { setDay(i); setPeriod(0); setTime(0); }} style={[styles.dayCard, { backgroundColor: isActive ? colors.n : colors.s, borderColor: isActive ? 'transparent' : colors.bd, marginRight: isRTL ? 0 : 7, marginLeft: isRTL ? 7 : 0 } ]}>
                  <Text style={{ fontSize: 9.5, color: isActive ? 'rgba(255,255,255,0.5)' : colors.t3, marginBottom: 3 }}>{d}</Text>
                  <View style={[styles.dayNumWrap, { backgroundColor: isActive ? resolveColor('var(--p)') : colors.s, borderColor: isActive ? 'transparent' : colors.bd } ]}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: isActive ? '#fff' : colors.n }}>{dnumsArr[i]}</Text>
                  </View>
                  <Text style={{ fontSize: 8, color: isActive ? 'rgba(255,255,255,0.4)' : colors.t3, marginTop: 2 }}>{dmonArr[i]}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Modern Period & Time Selectors */}
          <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {perArr.map((p, i) => {
                const isActive = period === i;
                const pIcons = ['wb_sunny', 'light_mode', 'nights_stay', 'bedtime'];
                return (
                  <TouchableOpacity 
                    key={i} 
                    onPress={() => { setPeriod(i); setTime(0); }} style={{ 
                      flex: 1, minWidth: '22%', paddingVertical: 10, borderRadius: 16, 
                      backgroundColor: isActive ? resolveColor('var(--p)') : colors.s, 
                      borderColor: isActive ? resolveColor('var(--p)') : colors.bd, 
                      borderWidth: 1, alignItems: 'center', justifyContent: 'center',
                      shadowColor: isActive ? resolveColor('var(--p)') : 'transparent',
                      shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8
                    }}
                  >
                    <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: isActive ? '#fff' : colors.t3, fontSize: 18, marginBottom: 4 }}>{pIcons[i % 4]}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isActive ? '#fff' : colors.t2 }}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={{ paddingHorizontal: 16, flexWrap: 'wrap', flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12, justifyContent: 'center' }}>
            {timesArr[period].map((t, i) => {
              const isActive = time === i;
              return (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => setTime(i)} 
                  style={{ 
                    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, 
                    backgroundColor: isActive ? colors.n : 'transparent', 
                    borderColor: isActive ? 'transparent' : colors.bd, 
                    borderWidth: 1.5,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: isActive ? colors.bg : colors.n }}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20), borderTopColor: colors.bd } ]}>
        <View style={{ paddingHorizontal: 16, justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={{ fontSize: 11, color: colors.t3, marginBottom: 2 }}>السعر الإجمالي</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: colors.n }}>
              {providers.find(p => p.id === selectedProvider)?.price} <Text style={{ fontSize: 12, color: colors.t3 }}>ر.س</Text>
            </Text>
          </View>
          <TouchableOpacity onPress={() => (router.push as any)({ pathname: `/consultations/book/${id}`, params: { day, period, time, visitType: 'clinic' } })} style={[styles.bookBtn, { backgroundColor: resolveColor('var(--p)') } ]}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', marginLeft: isRTL ? 8 : 0, marginRight: isRTL ? 0 : 8 }}>تأكيد وحجز</Text>
            <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 20 }}>arrow_forward</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconButton: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8
  },
  providerCard: {
    width: 180,
    borderRadius: 20,
    marginRight: 12,
    marginLeft: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    flexDirection: 'row'
  },
  dayCard: { width: 56, paddingVertical: 8, borderRadius: 14, alignItems: 'center', borderWidth: 1.5 },
  dayNumWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  timeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: 'var(--p)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8
  }
});
