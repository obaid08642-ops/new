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


export function MedicalJobsBrowseTab({ ctx }: any) {
  const { theme, lang, AR, show, user, insets, onBack, onOpenChat, tab, setTab, postType, setPostType, search, setSearch, showFilters, setShowFilters, selectedJob, setSelectedJob, selectedApp, setSelectedApp, filterProf, setFilterProf, filterCity, setFilterCity, postTitle, setPostTitle, postProf, setPostProf, postClass, setPostClass, postContract, setPostContract, postNat, setPostNat, postExp, setPostExp, postDesc, setPostDesc, postContact, setPostContact, postPhone, setPostPhone, postCompany, setPostCompany, postSalary, setPostSalary, applyVisible, setApplyVisible, applyName, setApplyName, applyPhone, setApplyPhone, applyClass, setApplyClass, applyExp, setApplyExp, applyReady, setApplyReady, applyCV, setApplyCV, guestId, guestMine, isGuest, applyCvUrl, setApplyCvUrl, applyScfhs, setApplyScfhs, applyScfhsExp, setApplyScfhsExp, uploadingCV, setUploadingCV, jobs, loading, posting, postCity, setPostCity, applications, inboxLoading, filtered, handlePost, handleApply } = ctx;
  return (
    <>
        <>
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.textSub, fontSize: FS.md }}>{AR ? 'جاري تحميل الوظائف...' : 'Loading jobs...'}</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}
          ListHeaderComponent={
            <View style={{ marginBottom: SP.lg }}>
              <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث بالمهنة، المستشفى، التخصص...' : 'Search profession, hospital...'} />
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelectedJob(item)} activeOpacity={0.9} style={{ marginBottom: SP.lg }}>
              <View style={{ backgroundColor: theme.surface, borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}>
                <View style={{ backgroundColor: item.type === 'offer' ? theme.primaryLight : theme.successBg, paddingHorizontal: SP.lg, paddingVertical: SP.sm, flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: FS.xs, color: item.type === 'offer' ? theme.primary : theme.success, fontWeight: FW.bold }}>
                    {item.type === 'offer' ? (AR ? 'صاحب عمل (يبحث عن موظفين)' : 'Employer Ad') : (AR ? 'ممارس (يبحث عن عمل)' : 'Job Seeker CV')}
                  </Text>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{item.date}</Text>
                </View>
                
                <View style={{ padding: SP.lg }}>
                  <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: 4 }}>
                    {AR ? item.title_ar : item.title_en}
                  </Text>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: SP.md }}>
                    <I name="mapPin" size={14} color={theme.textSub} />
                    <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{item.facility} • {item.city}</Text>
                  </View>
                  
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.md }}>
                    {[
                      { icon: 'clock', val: AR ? item.type_ar : item.type_en },
                      { icon: 'award', val: item.scfhs },
                      { icon: 'star', val: `${item.exp} ${AR?'س':'Y'}` }
                    ].map((tag, i) => (
                      <View key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, backgroundColor: theme.surface2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.sm }}>
                        <I name={tag.icon as any} size={12} color={theme.textSub} />
                        <Text style={{ fontSize: FS.xs, color: theme.textSub, fontWeight: FW.bold }}>{tag.val}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
        )}
        </>

    </>
  );
}