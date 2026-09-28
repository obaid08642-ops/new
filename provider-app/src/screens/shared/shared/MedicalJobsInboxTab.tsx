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


export function MedicalJobsInboxTab({ ctx }: any) {
  const { theme, lang, AR, show, user, insets, onBack, onOpenChat, tab, setTab, postType, setPostType, search, setSearch, showFilters, setShowFilters, selectedJob, setSelectedJob, selectedApp, setSelectedApp, filterProf, setFilterProf, filterCity, setFilterCity, postTitle, setPostTitle, postProf, setPostProf, postClass, setPostClass, postContract, setPostContract, postNat, setPostNat, postExp, setPostExp, postDesc, setPostDesc, postContact, setPostContact, postPhone, setPostPhone, postCompany, setPostCompany, postSalary, setPostSalary, applyVisible, setApplyVisible, applyName, setApplyName, applyPhone, setApplyPhone, applyClass, setApplyClass, applyExp, setApplyExp, applyReady, setApplyReady, applyCV, setApplyCV, guestId, guestMine, isGuest, applyCvUrl, setApplyCvUrl, applyScfhs, setApplyScfhs, applyScfhsExp, setApplyScfhsExp, uploadingCV, setUploadingCV, jobs, loading, posting, postCity, setPostCity, applications, inboxLoading, filtered, handlePost, handleApply } = ctx;
  return (
    <>
        <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
          <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', marginBottom: SP.xl, lineHeight: 22 }}>
            {AR ? 'طلباتك كضيف — مرتبطة بهذا الجهاز فقط وتختفي بحذف التطبيق' : 'Your guest submissions — bound to this device only, removed if the app is deleted'}
          </Text>
          {inboxLoading ? (
            <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginVertical: SP.xl }}>{AR ? 'جارٍ التحميل...' : 'Loading...'}</Text>
          ) : (
            <>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR ? 'إعلاناتي' : 'My posts'}</Text>
              {(guestMine?.jobs || []).length === 0 ? <Text style={{ color: theme.textSub }}>{AR ? 'لا توجد إعلانات' : 'No posts'}</Text> : null}
              {(guestMine?.jobs || []).map((j: any) => (
                <NCard key={j.id} style={{ marginBottom: SP.sm }}>
                  <Text style={{ color: theme.text, fontWeight: FW.bold }}>{j.title}</Text>
                  <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{j.status === 'draft' ? (AR ? 'قيد مراجعة الإدارة' : 'Under admin review') : j.status}</Text>
                </NCard>
              ))}
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md }}>{AR ? 'تقديماتي' : 'My applications'}</Text>
              {(guestMine?.applications || []).length === 0 ? <Text style={{ color: theme.textSub }}>{AR ? 'لا توجد تقديمات' : 'No applications'}</Text> : null}
              {(guestMine?.applications || []).map((a: any) => (
                <NCard key={a.id} style={{ marginBottom: SP.sm }}>
                  <Text style={{ color: theme.text }}>{a.status || 'submitted'}</Text>
                </NCard>
              ))}
            </>
          )}
        </ScrollView>

        <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
          <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', marginBottom: SP.xl, lineHeight: 22 }}>
            {AR ? 'هذا هو صندوق وارد التوظيف (ATS) الخاص بالمنشأة. جميع السير الذاتية المرسلة على إعلاناتك تظهر هنا.' : 'This is the facility ATS Inbox. All CVs applied to your offers will appear here.'}
          </Text>

          {inboxLoading ? (
            <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginVertical: SP.xl }}>{AR ? 'جاري تحميل الطلبات...' : 'Loading applications...'}</Text>
          ) : applications.length === 0 ? (
            <NEmpty title={AR ? 'لا توجد طلبات توظيف' : 'No applications'} subtitle={AR ? 'عندما يتقدم أحد الممارسين على إعلاناتك ستظهر طلباتهم هنا' : 'Applications to your job posts will appear here'} />
          ) : applications.map(app => (
            <TouchableOpacity key={app.id} onPress={() => setSelectedApp(app)} activeOpacity={0.8} style={{ backgroundColor: theme.surface, borderRadius: R.lg, padding: SP.lg, borderWidth: 1, borderColor: theme.border, marginBottom: SP.md, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: {width:0, height:2}, elevation: 2 }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.primary }}>{app.applicantName.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{app.applicantName}</Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: 2 }}>{AR ? 'متقدم على:' : 'Applied for:'} {app.jobTitle}</Text>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginTop: SP.xs }}>
                  <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold }}>{app.scfhs}</Text>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub }}>• {app.exp} {AR ? 'سنوات خبرة' : 'years exp'}</Text>
                </View>
              </View>
              <View style={{ padding: SP.sm, backgroundColor: theme.surface2, borderRadius: R.full }}>
                <I name={AR ? 'chevronLeft' : 'chevronRight'} size={20} color={theme.primary} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

    </>
  );
}