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

export function ProviderHomeStats({ onNavigate, stats }: { onNavigate: (s: string) => void; stats: any }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  
  return (
    <View style={{ marginBottom: SP.xl }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
        <NStatCard icon="" label={AR ? 'طلبات اليوم' : "Today's Orders"} value={String(stats.todayCount || 0)} color={tokens.info} style={{ width: '47%' }} />
        <NStatCard icon="" label={AR ? 'طلبات الأسبوع' : "Week's Orders"} value={String(stats.weekCount || 0)} color={tokens.purple} style={{ width: '47%' }} />
        <NStatCard icon="" label={AR ? 'الإيرادات' : "Revenue"} value={String(stats.revenue || 0)} unit={AR ? 'ر' : 'SAR'} color={tokens.success} style={{ width: '47%' }} />
        <NStatCard icon="" label={AR ? 'طلبات جديدة' : 'New Requests'} value={String(stats.pendingCount || 0)} color={tokens.warning} style={{ width: '47%' }} />
      </View>

      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.md, flexWrap: 'wrap' }}>
        <NBtn label={AR ? 'المحفظة والإيرادات' : 'Wallet & Revenue'} icon="wallet" size="sm" style={{ flexBasis: '47%', backgroundColor: theme.surface2, borderColor: theme.border }} labelStyle={{ color: theme.text }} onPress={() => onNavigate('wallet')} />
        <NBtn label={AR ? 'المحادثات' : 'Chats'} icon="chat" size="sm" style={{ flexBasis: '47%', backgroundColor: theme.surface2, borderColor: theme.border }} labelStyle={{ color: theme.text }} onPress={() => onNavigate('chat')} />
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL SYSTEM SETTINGS (Theme, Lang, Face ID)
// ══════════════════════════════════════════════════════════════════════════════

