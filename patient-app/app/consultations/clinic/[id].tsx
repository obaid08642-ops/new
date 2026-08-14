// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useApp } from '../../../src/context/AppContext';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../../../src/utils/api';
import { Icon } from '../../../src/components/Icon';

const { width } = Dimensions.get('window');

export default function ClinicProfile() {
  const { id } = useLocalSearchParams();
  const { isRTL, colors, isDark, lang } = useApp() as any;
  const insets = useSafeAreaInsets();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<any>(`/care/facilities/${id}`)
      .then(res => {
        setData(res?.data || res || null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>المنشأة غير موجودة</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} bounces={false} showsVerticalScrollIndicator={false}>
        
        {/* Cover Image */}
        <View style={{ width: '100%', height: 280, position: 'relative' }}>
          <Image source={{ uri: data?.image || 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&q=80&w=800' }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <View  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }}/>
          
          <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', top: Math.max(insets.top, 20), left: isRTL ? undefined : 20, right: isRTL ? 20 : undefined, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 20, color: colors.textPrimary }}>{isRTL ? 'arrow_forward' : 'arrow_back'}</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={{ marginTop: -40, backgroundColor: colors.background, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24 }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{lang === 'ar' ? 'مستشفى وعيادات' : 'Hospital & Clinics'}</Text>
            </View>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#F59E0B', fontSize: 18 }}>star</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>4.9</Text>
            </View>
          </View>

          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left', marginBottom: 16 }}>{data?.name_ar || 'مستشفى وعيادات نبض بلس'}</Text>

          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 24, gap: 8 }}>
            <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.textTertiary, fontSize: 18 }}>location_on</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>{data?.city || 'الرياض، المملكة العربية السعودية'}</Text>
          </View>

          <Text style={{ fontSize: 19.5, fontWeight: '900', color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left', marginBottom: 12 }}>{lang === 'ar' ? 'نبذة عن المستشفى' : 'About Hospital'}</Text>
          <Text style={{ fontSize: 15.5, color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', lineHeight: 24, marginBottom: 30 }}>
            {data?.description_ar || (lang === 'ar' ? 'مستشفى نبض بلس هو منشأة طبية حديثة تقدم أعلى مستويات الرعاية الصحية باستخدام أحدث التقنيات وأفضل الكوادر الطبية في جميع التخصصات.' : 'Nabd Plus Hospital is a modern medical facility providing the highest standards of healthcare using the latest technologies and best medical staff across all specialties.')}
          </Text>

          {data?.doctors && data.doctors.length > 0 && (
            <>
              <Text style={{ fontSize: 19.5, fontWeight: '900', color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left', marginBottom: 16 }}>{lang === 'ar' ? 'أطباء المستشفى' : 'Hospital Doctors'}</Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                {data.doctors.map((doc: any, i: number) => (
                  <TouchableOpacity key={doc.id || i} onPress={() => router.push(`/consultations/doctor-profile?doctorId=${doc.id}`)} style={{ width: 140, backgroundColor: colors.surface, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="doctor" size={40} color={colors.primary} />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 4 }} numberOfLines={1}>{doc.name_ar || doc.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center' }}>{doc.specialty_ar || doc.specialty}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

        </View>
      </ScrollView>
    </View>
  );
}
