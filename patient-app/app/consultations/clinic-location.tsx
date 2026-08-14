// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Linking,
  Platform
} from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { resolveColor, darkColors, lightColors } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

export default function ClinicLocationScreen() {
  const { appointmentId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (appointmentId) {
      apiFetch(`/care/appointments/${appointmentId}`)
        .then((res: any) => { setData(res?.data || res); setLoading(false); })
        .catch(() => { setData(null); setLoading(false); });
    } else {
      setData(null); setLoading(false);
    }
  }, [appointmentId]);

  const lat = data?.lat || data?.clinic_lat || 24.7136;
  const lng = data?.lng || data?.clinic_lng || 46.6753;

  const openDirections = () => {
    const name = data?.clinic_name || 'العيادة';
    const url = Platform.select({
      ios: `maps:0,0?q=${name}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${name})`,
    });
    if (url) Linking.openURL(url);
  };

  if (loading) return (
    <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' } ]}>
      <ActivityIndicator color={resolveColor('var(--p)')} size="large" />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.bd } ]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: 'center' }}>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 24 }}>arrow_forward</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.n }}>موقع العيادة</Text>
        <View style={{ width: 40 }}/>
      </View>

      {/* ── Real MapView ── */}
      <View style={styles.mapBox}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFill}
          userInterfaceStyle={isDark ? 'dark' : 'light'}
          initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }} showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker coordinate={{ latitude: lat, longitude: lng }} title={data?.clinic_name} tracksViewChanges={false} />
        </MapView>
      </View>

      <View style={{ padding: 16 }}>
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={[styles.duoIcon, { backgroundColor: resolveColor('var(--ps)') } ]}>
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 24 }}>business</Text>
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.n }}>{data?.clinic_name || 'عيادة الطبيب'}</Text>
              <Text style={{ fontSize: 10, color: colors.t3 }}>{data?.address}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 11, color: colors.t2, lineHeight: 18, textAlign: isRTL ? 'right' : 'left' }}>
            {data?.details}
          </Text>
        </View>

        <TouchableOpacity style={[styles.directionsBtn, { backgroundColor: colors.n, marginTop: 24 }]} onPress={openDirections}>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 19, color: '#fff', marginRight: 8 }}>directions_car</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>فتح الاتجاهات</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  mapBox: { height: 230, overflow: 'hidden' },
  duoIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  directionsBtn: { width: '100%', padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }
});
