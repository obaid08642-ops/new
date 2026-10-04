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
import { W } from './_shared';

export function LiveOrderAlarmModal({
 visible,
 onAccept,
 onDecline,
 timeoutSeconds = 120,
 patientName = '—',
 serviceType = '—'
}: {
 visible: boolean;
 onAccept: () => void;
 onDecline: () => void;
 timeoutSeconds?: number;
 patientName?: string;
 serviceType?: string;
}) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';

 const [timeLeft, setTimeLeft] = useState(timeoutSeconds);
 const pulseAnim = useRef(new Animated.Value(1)).current;

 useEffect(() => {
 if (!visible) return;
 setTimeLeft(timeoutSeconds);

 // Vibration alerts loop
 const vInterval = setInterval(() => {
 Vibration.vibrate([100, 300, 100, 300]);
 }, 1500);

 // Ticking countdown
 const tInterval = setInterval(() => {
 setTimeLeft(prev => {
 if (prev <= 1) {
 clearInterval(tInterval);
 clearInterval(vInterval);
 onDecline(); // Auto-decline when timer expires
 return 0;
 }
 return prev - 1;
 });
 }, 1000);

 // Alert pulse animation
 Animated.loop(
 Animated.sequence([
 Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
 Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
 ])
 ).start();

 return () => {
 clearInterval(tInterval);
 clearInterval(vInterval);
 Vibration.cancel();
 };
 }, [visible]);

 if (!visible) return null;

 return (
 <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 99999, justifyContent: 'center', alignItems: 'center' }]}>
 <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center', gap: SP.lg }}>
 
 <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: theme.danger, alignItems: 'center', justifyContent: 'center', shadowColor: theme.danger, shadowRadius: 20, shadowOpacity: 0.8 }}>
 <Text style={{ color: '#FFF', fontSize: FS['4xl'], fontWeight: '800' }}>{timeLeft}s</Text>
 </View>

 <Text style={{ color: '#FFF', fontSize: FS['3xl'], fontWeight: FW.bold, textAlign: 'center' }}>
 {AR ? 'طلب كشف عاجل وارد!' : 'Incoming Urgent Request!'}
 </Text>

 <View style={{ backgroundColor: theme.surface, padding: SP.xl, borderRadius: R.xl, width: W * 0.85, gap: SP.md, alignItems: 'center' }}>
 <NAvatar name={patientName} size={64} />
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{patientName}</Text>
 <NBadge label={serviceType} variant="danger" />
 
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginTop: SP.xs }}>
 {AR ? 'الرجاء الاستجابة الفورية قبل انتهاء مهلة مؤشر الاستجابة (SLA)' 
 : 'Please respond immediately before SLA countdown expiration'}
 </Text>

 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, width: '100%', marginTop: SP.lg }}>
 <TouchableOpacity onPress={onDecline} style={{ flex: 1, backgroundColor: theme.surface2, borderColor: theme.border, borderWidth: 1, paddingVertical: SP.md, borderRadius: R.md, alignItems: 'center' }}>
 <Text style={{ color: theme.danger, fontWeight: FW.bold }}>{AR ? 'رفض الطلب' : 'Reject'}</Text>
 </TouchableOpacity>

 <TouchableOpacity onPress={onAccept} style={{ flex: 1, backgroundColor: theme.primary, paddingVertical: SP.md, borderRadius: R.md, alignItems: 'center' }}>
 <Text style={{ color: '#FFF', fontWeight: FW.bold }}>{AR ? 'قبول الطلب' : 'Accept Request'}</Text>
 </TouchableOpacity>
 </View>
 </View>

 </Animated.View>
 </View>
 );
}

// 2.3 CRM HUB & REVENUE INTELLIGENCE
