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

export function SosDispatchScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate: (s: string, p?: any) => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [activeSos, setActiveSos] = useState<any[]>([]);
 const [loadingSos, setLoadingSos] = useState(true);
 const [claiming, setClaiming] = useState<string | null>(null);

 const fetchActive = async () => {
   // Real active emergencies only — no demo broadcasts.
   try {
     const r = await client.get('/emergency/active');
     setActiveSos(Array.isArray(r.data) ? r.data : (r.data?.items || []));
   } catch { setActiveSos([]); } finally { setLoadingSos(false); }
 };
 useEffect(() => { fetchActive(); }, []);

 const triggerSos = async () => {
   // Real panic alert: provider's own identity (from JWT) + real GPS position.
   try {
     let location: any = undefined;
     try {
       const Location = require('expo-location');
       const { status } = await Location.requestForegroundPermissionsAsync();
       if (status === 'granted') {
         const pos = await Location.getCurrentPositionAsync({});
         location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
       }
     } catch { /* location optional */ }
     await client.post('/emergency/trigger', { location, severity: 'critical' });
     show(AR ? 'تم إرسال نداء الاستغاثة لمركز التحكم' : 'SOS Sent to Command Center', 'success');
   } catch (err) {
     show(AR ? 'حدث خطأ في الإرسال' : 'Error sending SOS', 'error');
   }
 };

 const claimSos = async (sos: any) => {
   const id = sos.id || sos._id;
   if (!id) return;
   setClaiming(id);
   try {
     await client.post(`/emergency/${id}/claim`, {});
     show(AR ? 'تم قبول النداء — الحالة الآن مسندة إليك' : 'SOS claimed — case assigned to you', 'success');
     onNavigate('gps_router', { emergency: sos });
   } catch (e: any) {
     show(e?.response?.data?.message || (AR ? 'تعذر قبول النداء' : 'Could not claim SOS'), 'error');
     fetchActive();
   } finally { setClaiming(null); }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'منصة الاستغاثة والطوارئ' : 'Emergency & SOS'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>

 <NCard style={{ backgroundColor: theme.danger + '22', borderColor: theme.danger, borderWidth: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.danger, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'هل تواجه حالة طوارئ؟' : 'Facing an emergency?'}
 </Text>
 <NBtn label={AR ? 'إرسال نداء استغاثة (SOS)' : 'Send SOS Alert'} style={{ marginTop: SP.md, backgroundColor: theme.danger }} onPress={triggerSos} />
 </NCard>

 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'نداءات الاستغاثة النشطة:' : 'Active SOS Cases:'}
 </Text>
 {loadingSos ? (
 <ActivityIndicator color={theme.primary} />
 ) : activeSos.length === 0 ? (
 <NCard>
 <Text style={{ color: theme.textSub, textAlign: 'center' }}>{AR ? 'لا توجد نداءات استغاثة نشطة حالياً.' : 'No active SOS cases right now.'}</Text>
 </NCard>
 ) : activeSos.map(sos => (
 <NCard key={sos.id || sos._id} style={{ gap: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{sos.patient_name || sos.title || (AR ? 'نداء استغاثة' : 'SOS Case')}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.danger }}>{sos.state || sos.status || ''}</Text>
 </View>
 {!!(sos.symptoms) && (
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{sos.symptoms}</Text>
 )}
 <NBtn label={claiming === (sos.id || sos._id) ? (AR ? 'جارٍ القبول…' : 'Claiming…') : (AR ? 'قبول النداء والتحرك' : 'Accept & Dispatch')} onPress={() => claimSos(sos)} />
 </NCard>
 ))}
 </View>
 </NScroll>
 </View>
 );
}
