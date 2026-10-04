import { API_BASE } from '../../../constants';
import { buildHeaders } from '../../../security/Security';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppointmentStatus } from '../../../types/contracts';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Switch, TextInput,
 KeyboardAvoidingView, Platform, Linking, ActivityIndicator, Image
} from 'react-native';
import client from '../../../api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NDivider, NPriceInput, NCheckbox
} from '../../../components/ui';
import { I, IBg, RatingStars } from '../../../components/icons';
import { SP, R, FS, FW, C } from '../../../constants';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { resolveImageUri, resolveGallery } from '../../../utils/imageUrl';
import { useInsuranceCatalog } from '../../../api/catalogs';
import { SK, Vault } from '../../../security/Security';
import { tokens, withAlpha } from '../../../theme/tokens';
import { st } from './MedicalDrugIndexScreen';
import { NOTIF_TYPES } from './ChatSystem';

export function NotificationsCenter({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [filter, setFilter] = useState<'all' | 'unread'>('all');
 const [notifs, setNotifs] = useState<any[]>([]);

 useEffect(() => {
   client.get('/provider/notifications')
     .then(res => setNotifs(res.data || []))
     .catch(() => setNotifs([]));
 }, []);

 const filtered = filter === 'all' ? notifs : notifs.filter(n => !n.read);
 const unreadCount = notifs.filter(n => !n.read).length;

 const markAllRead = async () => {
   try {
     await client.post('/provider/notifications/read-all', {});
     setNotifs(prev => prev.map(n => ({ ...n, read: true })));
     show(AR ? 'تم قراءة الكل' : 'All marked read', 'success');
   } catch { show(AR ? 'تعذر مسح الإشعارات' : 'Could not clear notifications', 'error'); }
 };

 const markRead = async (id: string) => {
   setNotifs(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
   try {
     await client.post(`/provider/notifications/${encodeURIComponent(id)}/read`, {});
   } catch {
     // Optimistic update stands; a fresh fetch on focus reconciles.
   }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[st.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
 <TouchableOpacity onPress={onBack}><I name="back" size={20} color={theme.primary} /></TouchableOpacity>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{AR ? 'الإشعارات' : 'Notifications'}</Text>
 {unreadCount > 0 && (
 <TouchableOpacity onPress={markAllRead}>
 <Text style={{ fontSize: FS.sm, color: theme.primary, fontWeight: FW.semi }}>{AR ? 'قراءة الكل' : 'Read All'}</Text>
 </TouchableOpacity>
 )}
 </View>

 {/* Filter */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, padding: SP.lg }}>
 {[{ k: 'all', ar: 'الكل', en: 'All' }, { k: 'unread', ar: `غير مقروءة (${unreadCount})`, en: `Unread (${unreadCount})` }].map(f => (
 <TouchableOpacity key={f.k} onPress={() => setFilter(f.k as any)}
 style={[st.chip, { backgroundColor: filter === f.k ? theme.primary : theme.surface2, borderColor: filter === f.k ? theme.primary : theme.border, flex: 1 }]}>
 <Text style={{ color: filter === f.k ? '#FFF' : theme.text, fontSize: FS.sm, fontWeight: FW.semi, textAlign: 'center' }}>{AR ? f.ar : f.en}</Text>
 </TouchableOpacity>
 ))}
 </View>

 <FlatList data={filtered} keyExtractor={i => i.id}
 contentContainerStyle={{ paddingHorizontal: SP.lg, paddingBottom: 100 }}
 renderItem={({ item: notif }) => {
 const cfg = NOTIF_TYPES[notif.type] ?? NOTIF_TYPES.system;
 return (
 <TouchableOpacity onPress={() => markRead(notif.id)}
 style={[st.notifRow, { backgroundColor: notif.read ? 'transparent' : `${cfg.color}08`, borderBottomColor: theme.border }]}>
 <IBg name={cfg.icon} size={16} color={cfg.color} bg={`${cfg.color}15`} />
 <View style={{ flex: 1, marginHorizontal: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 2 }}>
 <Text style={{ fontSize: FS.md, fontWeight: notif.read ? FW.reg : FW.bold, color: theme.text }}>{AR ? notif.title_ar : notif.title_en}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{notif.time}</Text>
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }} numberOfLines={2}>{AR ? notif.body_ar : notif.body_en}</Text>
 </View>
 {!notif.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cfg.color }} />}
 </TouchableOpacity>
 );
 }}
 ListEmptyComponent={<NCard style={{ alignItems: 'center', padding: SP.xxl }}>
 <IBg name="bell" size={28} color={theme.textSub} bg={theme.surface2} />
 <Text style={{ fontSize: FS.md, color: theme.textSub, marginTop: SP.lg }}>{AR ? 'لا توجد إشعارات' : 'No notifications'}</Text>
 </NCard>}
 />
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════
// 03. SUPPORT CENTER — Tickets + FAQ
