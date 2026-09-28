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
import { DrugSection } from './MedicalJobsScreen';


export function DrugIndexCard({ item, ctx }: any) {
  const { theme, AR, setSelectedDrug } = ctx;
  return (
    <>
     <NCard key={item.id} style={{ marginBottom: SP.md }} onPress={() => setSelectedDrug(item)}>
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
     {resolveImageUri(item.image) ? (
       <Image source={{ uri: resolveImageUri(item.image)! }} style={{ width: 56, height: 56, borderRadius: R.md, backgroundColor: theme.surface2 }} resizeMode="contain" />
     ) : (
       <IBg name="pill" size={18} color={theme.primary} bg={`${theme.primary}12`} />
     )}
     <View style={{ flex: 1 }}>
     <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }} numberOfLines={2}>
     {AR ? item.name_ar : item.name_en}
     </Text>
     <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }} numberOfLines={1}>
      {AR ? `المادة الفعالة: ${item.active_ar || '—'}` : `Active: ${item.active_en || '—'}`}
     </Text>
     <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }} numberOfLines={1}>
      {[item.category_ar, item.form].filter(Boolean).join(' · ')}
     </Text>
     </View>
     <View style={{ alignItems: 'flex-end' }}>
     <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary }}>
     {item.price} {AR ? 'ريال' : 'SAR'}
     </Text>
     {item.requires_prescription && (
     <NBadge label={AR ? 'بوصفة' : 'Rx'} variant="danger" size="xs" style={{ marginTop: 4 }} />
     )}
     {item.potentially_unavailable && (
     <NBadge label={AR ? 'قد يكون غير متوفر' : 'May be unavailable'} variant="warning" size="xs" style={{ marginTop: 4 }} />
     )}
     </View>
     </View>
     </NCard>
    </>
  );
}

