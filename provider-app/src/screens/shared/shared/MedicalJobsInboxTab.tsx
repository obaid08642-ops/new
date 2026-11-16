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
  const { t: tt } = useLang();
  const { theme, lang, AR, show, user, insets, onBack, onOpenChat, tab, setTab, postType, setPostType, search, setSearch, showFilters, setShowFilters, selectedJob, setSelectedJob, selectedApp, setSelectedApp, filterProf, setFilterProf, filterCity, setFilterCity, postTitle, setPostTitle, postProf, setPostProf, postClass, setPostClass, postContract, setPostContract, postNat, setPostNat, postExp, setPostExp, postDesc, setPostDesc, postContact, setPostContact, postPhone, setPostPhone, postCompany, setPostCompany, postSalary, setPostSalary, applyVisible, setApplyVisible, applyName, setApplyName, applyPhone, setApplyPhone, applyClass, setApplyClass, applyExp, setApplyExp, applyReady, setApplyReady, applyCV, setApplyCV, guestId, guestMine, isGuest, applyCvUrl, setApplyCvUrl, applyScfhs, setApplyScfhs, applyScfhsExp, setApplyScfhsExp, uploadingCV, setUploadingCV, jobs, loading, posting, postCity, setPostCity, applications, myApplications, inboxLoading, filtered, handlePost, handleApply } = ctx;
  // A visitor sees the device-bound submissions; a signed-in provider sees their own applications and the ATS inbox.
  if (!isGuest) {
    return (
      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{tt('sxza.0aeb29d8')}</Text>
        {inboxLoading ? (
          <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginVertical: SP.xl }}>{tt('sxza.7cfb0a55')}</Text>
        ) : (myApplications || []).length === 0 ? (
          <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.lg }}>{tt('sxza.896b6b95')}</Text>
        ) : (myApplications || []).map((a: any) => (
          <NCard key={a.id} style={{ marginBottom: SP.sm }}>
            <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>{a.job?.title || '—'}</Text>
            <Text style={{ color: theme.textSub, fontSize: FS.xs, textAlign: AR ? 'right' : 'left' }}>
              {a.status || 'submitted'}{a.applied_at ? ` · ${new Date(a.applied_at).toISOString().split('T')[0]}` : ''}
            </Text>
          </NCard>
        ))}

        <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', marginVertical: SP.xl, lineHeight: 22 }}>
          {tt('sxza.15dc850e')}
        </Text>
        {inboxLoading ? (
          <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginVertical: SP.xl }}>{tt('sxza.3df37af2')}</Text>
        ) : applications.length === 0 ? (
          <NEmpty title={tt('sxza.b3c60a21')} subtitle={tt('sxza.90080248')} />
        ) : applications.map((app: any) => (
          <TouchableOpacity key={app.id} onPress={() => setSelectedApp(app)} activeOpacity={0.8} style={{ backgroundColor: theme.surface, borderRadius: R.lg, padding: SP.lg, borderWidth: 1, borderColor: theme.border, marginBottom: SP.md, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: {width:0, height:2}, elevation: 2 }}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.primary }}>{app.applicantName.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{app.applicantName}</Text>
              <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: 2 }}>{tt('sxza.2199ba4f')} {app.jobTitle}</Text>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginTop: SP.xs }}>
                <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold }}>{app.scfhs}</Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub }}>• {app.exp} {tt('sxza.22d92c71')}</Text>
              </View>
            </View>
            <View style={{ padding: SP.sm, backgroundColor: theme.surface2, borderRadius: R.full }}>
              <I name={AR ? 'chevronLeft' : 'chevronRight'} size={20} color={theme.primary} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }
  return (
    <>
        <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
          <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', marginBottom: SP.xl, lineHeight: 22 }}>
            {tt('sxza.9844b77c')}
          </Text>
          {inboxLoading ? (
            <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginVertical: SP.xl }}>{tt('sxza.7cfb0a55')}</Text>
          ) : (
            <>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{tt('sxza.d2dcb7a3')}</Text>
              {(guestMine?.jobs || []).length === 0 ? <Text style={{ color: theme.textSub }}>{tt('sxza.782ca2ac')}</Text> : null}
              {(guestMine?.jobs || []).map((j: any) => (
                <NCard key={j.id} style={{ marginBottom: SP.sm }}>
                  <Text style={{ color: theme.text, fontWeight: FW.bold }}>{j.title}</Text>
                  <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{j.status === 'draft' ? (tt('sxza.60396818')) : j.status}</Text>
                </NCard>
              ))}
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md }}>{tt('sxza.0aeb29d8')}</Text>
              {(guestMine?.applications || []).length === 0 ? <Text style={{ color: theme.textSub }}>{tt('sxza.896b6b95')}</Text> : null}
              {(guestMine?.applications || []).map((a: any) => (
                <NCard key={a.id} style={{ marginBottom: SP.sm }}>
                  <Text style={{ color: theme.text }}>{a.status || 'submitted'}</Text>
                </NCard>
              ))}
            </>
          )}
        </ScrollView>

    </>
  );
}