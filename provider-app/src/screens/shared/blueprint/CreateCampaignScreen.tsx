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

export function CreateCampaignScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang, t: tt } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [title, setTitle] = useState('');
 const [origPrice, setOrigPrice] = useState('');
 const [discPrice, setDiscPrice] = useState('');
 const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
 const [endDate, setEndDate] = useState(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
 const [loading, setLoading] = useState(false);

 const handleCreate = async () => {
 if (!title.trim() || !origPrice || !discPrice) {
 show(tt('rrct.9bde3e13'), 'warning');
 return;
 }
 setLoading(true);
 try {
 await client.post('/provider/promotions', {
 title_ar: title,
 title_en: title,
 original_price: parseFloat(origPrice),
 discounted_price: parseFloat(discPrice),
 start_date: startDate,
 end_date: endDate,
 });
 show(tt('rrct.58c8445f'), 'success');
 onBack();
 } catch (err: any) {
 show(tt('rrct.950e30b9'), 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={tt('rrct.66cd7b73')} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.lg }}>
 <NInput label={tt('rrct.93e87b33')} placeholder={tt('rrct.d0efc7dd')} value={title} onChange={setTitle} required />
 <NPriceInput label={tt('rrct.59ada1a4')} value={origPrice} onChange={setOrigPrice} />
 <NPriceInput label={tt('rrct.ba8b259b')} value={discPrice} onChange={setDiscPrice} />
 <NInput label={tt('rrct.86bb1b4d')} placeholder="YYYY-MM-DD" value={startDate} onChange={setStartDate} />
 <NInput label={tt('rrct.916c6ba4')} placeholder="YYYY-MM-DD" value={endDate} onChange={setEndDate} />
 <NBtn label={tt('rrct.39d6d232')} onPress={handleCreate} loading={loading} style={{ marginTop: SP.lg }} />
 </View>
 </NScroll>
 </View>
 );
}

// 1.3 PROVIDER MINI-WEBSITE CONFIG
