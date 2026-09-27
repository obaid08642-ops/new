import { buildHeaders } from '../../../security/Security';
import { API_BASE } from '../../../constants';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Dimensions, Switch, Platform, Alert, Vibration,
 ActivityIndicator, TextInput, Linking
} from 'react-native';
import { useTheme, useLang, useToast } from '../../../context';
import client from '../../../api/client';
import { useServicesCatalog } from '../../../api/catalogs';
import {
 NBtn, NCard, NInput, NBadge, NHeader, NScroll, NDivider,
 NPriceInput, NToggle, NSearch, NSecHeader, NStatCard, NAvatar,
 NSheet, NEmpty
} from '../../../components/ui';
import { I, IBg } from '../../../components/icons';
import { SP, R, FS, FW, C } from '../../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function GpsRouterScreen({ patient, onBack }: { patient: any; onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 // Real claimed emergency passed from SosDispatchScreen — never demo data.
 const emergency = patient?.emergency;
 const emergencyId = emergency?.id || emergency?._id;

 const [started, setStarted] = useState(false);
 const [watchSub, setWatchSub] = useState<any>(null);

 const startTrip = async () => {
   if (!emergencyId) {
     show(AR ? 'لا توجد حالة طوارئ مسندة — اقبل نداء أولاً' : 'No assigned emergency — claim an SOS first', 'error');
     return;
   }
   try {
     const Location = require('expo-location');
     const { status } = await Location.requestForegroundPermissionsAsync();
     if (status !== 'granted') {
       show(AR ? 'إذن الموقع مطلوب للملاحة الحية' : 'Location permission is required for live routing', 'error');
       return;
     }
     // Push real unit GPS to the emergency record (ownership enforced server-side).
     const sub = await Location.watchPositionAsync(
       { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 50 },
       async (pos: any) => {
         try {
           await client.post(`/emergency/${emergencyId}/track`, {
             lat: pos.coords.latitude, lng: pos.coords.longitude,
           });
         } catch { /* transient network — keep watching */ }
       }
     );
     setWatchSub(sub);
     setStarted(true);
     show(AR ? 'تم بدء الرحلة — موقعك يُبث للمريض والمركز' : 'Trip started — your position is streamed', 'success');
   } catch (err) {
     show(AR ? 'حدث خطأ' : 'Error starting trip', 'error');
   }
 };

 const confirmArrival = async () => {
   try { watchSub?.remove?.(); } catch {}
   if (emergencyId) {
     try {
       const Location = require('expo-location');
       const pos = await Location.getCurrentPositionAsync({}).catch(() => null);
       await client.post(`/emergency/${emergencyId}/track`, {
         lat: pos?.coords?.latitude, lng: pos?.coords?.longitude, arrived: true,
       });
     } catch { /* arrival best-effort; trip positions already streamed */ }
   }
   show(AR ? 'تم تسجيل الوصول للمريض بنجاح' : 'Arrival logged', 'success');
   onBack();
 };

 useEffect(() => () => { try { watchSub?.remove?.(); } catch {} }, [watchSub]);

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'خرائط الملاحة والطوارئ' : 'Emergency GPS Router'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 
 <NCard style={{ height: 280, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', borderColor: theme.border, borderStyle: 'dashed', borderWidth: 2 }}>
 <I name="map" size={44} color={theme.textSub} />
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md }}>
 {started ? (AR ? 'الملاحة نشطة — يتم بث موقعك الآن' : 'Navigation active — streaming your position') : (AR ? 'ابدأ الرحلة لتفعيل الملاحة الحية' : 'Start the trip to enable live routing')}
 </Text>
 {!!emergency?.location && (
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: SP.xs }}>
 {AR ? 'موقع الحالة:' : 'Case location:'} {emergency.location.lat?.toFixed?.(5)}, {emergency.location.lng?.toFixed?.(5)}
 </Text>
 )}
 </NCard>

 <NCard style={{ gap: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'بيانات المريض وموقع الإسعاف' : 'Dispatch details'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'المريض:' : 'Patient:'} {emergency?.patient_name || (AR ? '—' : '—')}
 </Text>
 {!!emergency?.patient_phone && (
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'الهاتف:' : 'Phone:'} {emergency.patient_phone}
 </Text>
 )}
 {!!emergency?.symptoms && (
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'الأعراض:' : 'Symptoms:'} {emergency.symptoms}
 </Text>
 )}
 </NCard>

 {!started ? (
   <NBtn label={AR ? 'بدء التحرك (Start Trip)' : 'Start Trip'} onPress={startTrip} />
 ) : (
   <NBtn label={AR ? ' تأكيد الوصول للمريض' : ' Confirm Arrival'} onPress={confirmArrival} />
 )}
 </View>
 </NScroll>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 5: SPECIALIZED PROVIDER WORKFLOWS
// ══════════════════════════════════════════════════════════════════════════════

