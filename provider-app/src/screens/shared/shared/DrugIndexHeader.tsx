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


export function DrugIndexHeader({ ctx }: any) {
  const { theme, AR, insets, onBack, headerHeight, headerOpacity } = ctx;
  return (
    <>
     <Animated.View style={{ height: headerHeight, overflow: 'hidden', backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border, paddingTop: Math.max(insets.top, SP.sm) }}>
       <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: SP.md, marginTop: SP.sm }}>
         <TouchableOpacity onPress={onBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}>
           <I name="back" size={20} color={theme.text} />
         </TouchableOpacity>
         <Animated.Text style={{ flex: 1, fontSize: FS.xl, fontWeight: FW.bold, color: theme.text, textAlign: 'center', opacity: headerOpacity }}>
           {AR ? 'دليل الأدوية الطبي' : 'Medical Drug Index'}
         </Animated.Text>
         <View style={{ width: 40 }} />
       </View>
     </Animated.View>
    </>
  );
}

