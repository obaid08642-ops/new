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

export function GlobalSystemSettings() {
  const { theme, toggle: toggleTheme, mode } = useTheme();
  const { lang, toggle: toggleLang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  
  const [bioEnabled, setBioEnabled] = useState(false);

  useEffect(() => {
    Vault.get(SK.BIOENABLED).then(v => setBioEnabled(v === '1'));
  }, []);

  const handleBioToggle = async (val: boolean) => {
    setBioEnabled(val);
    await Vault.set(SK.BIOENABLED, val ? '1' : '0');
    show(val ? (AR ? 'تم تفعيل الدخول بالبصمة' : 'Face ID Enabled') : (AR ? 'تم إيقاف الدخول بالبصمة' : 'Face ID Disabled'), 'success');
  };

  return (
    <NCard style={{ marginBottom: SP.xl, gap: SP.md }}>
      <NSecHeader title={AR ? 'إعدادات النظام' : 'System Settings'} />
      
      {/* Theme Toggle */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
          <Text style={{ fontSize: 20 }}>{mode ==='dark'?'':''}</Text>
          <Text style={{ color: theme.text, fontSize: FS.md }}>{AR ? 'الوضع الليلي' : 'Dark Mode'}</Text>
        </View>
        <Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ true: theme.primary }} />
      </View>

      <NDivider style={{ marginVertical: SP.xs }} />

      {/* Language Toggle */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
          <I name="globe" size={20} color={theme.primary} />
          <Text style={{ color: theme.text, fontSize: FS.md }}>{AR ? 'اللغة الإنجليزية' : 'Arabic Language'}</Text>
        </View>
        <Switch value={lang === 'en'} onValueChange={toggleLang} trackColor={{ true: theme.primary }} />
      </View>

      <NDivider style={{ marginVertical: SP.xs }} />

      {/* Face ID Toggle */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
          <I name="user" size={20} color={theme.textSub} />
          <Text style={{ color: theme.text, fontSize: FS.md }}>{AR ? 'الدخول بالبصمة / Face ID' : 'Face ID Login'}</Text>
        </View>
        <Switch value={bioEnabled} onValueChange={handleBioToggle} trackColor={{ true: theme.primary }} />
      </View>
    </NCard>
  );
}

