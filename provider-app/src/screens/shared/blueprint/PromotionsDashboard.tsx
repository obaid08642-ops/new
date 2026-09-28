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
import { _styles } from './_shared';

export function PromotionsDashboard({ onBack, onNavigate }: { onBack: () => void; onNavigate: (s: string) => void }) {
 const insets = useSafeAreaInsets();
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [promos, setPromos] = useState<any[]>([]);
 const [loading, setLoading] = useState(false);

 const fetchPromos = useCallback(async () => {
 setLoading(true);
 try {
 const res = await client.get('/provider/promotions');
 setPromos(res.data);
 } catch (e) {
 show(AR ? 'فشل تحميل العروض الترويجية' : 'Failed to load promotions', 'error');
 } finally {
 setLoading(false);
 }
 }, [AR, show]);

 useEffect(() => {
 fetchPromos();
 }, [fetchPromos]);

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[_styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 16) }]}>
 <TouchableOpacity onPress={onBack}><I name="back" size={20} color={theme.primary} /></TouchableOpacity>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{AR ? 'مركز العروض الترويجية' : 'Promotions Center'}</Text>
 <TouchableOpacity onPress={() => onNavigate('create_promo')}><I name="plus" size={20} color={theme.primary} /></TouchableOpacity>
 </View>

 <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SP.xl, paddingBottom: 100 }}>
 <NSecHeader title={AR ? 'العروض النشطة والمستمرة' : 'Active Promotions'} />
 {loading && <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} />}
 {!loading && promos.length === 0 && (
 <Text style={{ textAlign: 'center', color: theme.textSub, marginVertical: SP.xl }}>
 {AR ? 'لا توجد عروض ترويجية حالياً' : 'No promotions available'}
 </Text>
 )}
 {promos.map(item => (
 <NCard key={item._id || item.id} style={{ marginBottom: SP.lg }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
 {AR ? (item.title_ar || item.title_en) : (item.title_en || item.title_ar)}
 </Text>
 <NBadge
 label={AR ? (item.status === 'approved' ? 'مقبول' : item.status === 'pending' ? 'انتظار' : 'مؤرشف') : item.status.toUpperCase()}
 variant={item.status === 'approved' ? 'success' : item.status === 'pending' ? 'warning' : 'primary'}
 size="xs"
 />
 </View>
 <NDivider style={{ marginVertical: SP.sm }} />
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}> {item.discounted_price} {AR?'ريال':'SAR'} <Text style={{ textDecorationLine:'line-through' }}>{item.original_price} {AR?'ريال':'SAR'}</Text></Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}> {new Date(item.end_date).toLocaleDateString()}</Text>
 </View>
 </NCard>
 ))}

 <NBtn label={AR ? ' إنشاء عرض جديد' : ' Create New Promotion'} onPress={() => onNavigate('create_promo')} style={{ marginTop: SP.xl }} />
 </ScrollView>
 </View>
 );
}

// 1.2 CREATE PROMOTION SCREEN
