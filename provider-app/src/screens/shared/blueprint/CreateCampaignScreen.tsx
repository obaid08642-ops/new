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
 const { lang } = useLang();
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
 show(AR ? 'يرجى إكمال جميع الحقول الإلزامية' : 'Please complete all required fields', 'warning');
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
 show(AR ? 'تم إرسال العرض للمراجعة بنجاح ' : 'Promotion sent for review successfully ', 'success');
 onBack();
 } catch (err: any) {
 show(AR ? 'فشل إنشاء العرض الترويجي' : 'Failed to create promotion campaign', 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'إنشاء حملة ترويجية' : 'Create Campaign'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.lg }}>
 <NInput label={AR ? 'عنوان الحملة' : 'Campaign Title'} placeholder={AR ? 'مثال: باقة الفحص السريع' : 'e.g. Rapid Checkup Package'} value={title} onChange={setTitle} required />
 <NPriceInput label={AR ? 'السعر الأصلي' : 'Original Price'} value={origPrice} onChange={setOrigPrice} />
 <NPriceInput label={AR ? 'السعر بعد الخصم' : 'Discounted Price'} value={discPrice} onChange={setDiscPrice} />
 <NInput label={AR ? 'تاريخ البدء' : 'Start Date'} placeholder="YYYY-MM-DD" value={startDate} onChange={setStartDate} />
 <NInput label={AR ? 'تاريخ الانتهاء' : 'End Date'} placeholder="YYYY-MM-DD" value={endDate} onChange={setEndDate} />
 <NBtn label={AR ? ' إرسال للموافقة' : ' Submit for Approval'} onPress={handleCreate} loading={loading} style={{ marginTop: SP.lg }} />
 </View>
 </NScroll>
 </View>
 );
}

// 1.3 PROVIDER MINI-WEBSITE CONFIG
