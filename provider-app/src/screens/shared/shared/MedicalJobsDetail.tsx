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


export function MedicalJobsDetail({ ctx }: any) {
  const { t: tt } = useLang();
  const { theme, lang, AR, show, user, insets, onBack, onOpenChat, tab, setTab, postType, setPostType, search, setSearch, showFilters, setShowFilters, selectedJob, setSelectedJob, selectedApp, setSelectedApp, filterProf, setFilterProf, filterCity, setFilterCity, postTitle, setPostTitle, postProf, setPostProf, postClass, setPostClass, postContract, setPostContract, postNat, setPostNat, postExp, setPostExp, postDesc, setPostDesc, postContact, setPostContact, postPhone, setPostPhone, postCompany, setPostCompany, postSalary, setPostSalary, applyVisible, setApplyVisible, applyName, setApplyName, applyPhone, setApplyPhone, applyClass, setApplyClass, applyExp, setApplyExp, applyReady, setApplyReady, applyCV, setApplyCV, guestId, guestMine, isGuest, applyCvUrl, setApplyCvUrl, applyScfhs, setApplyScfhs, applyScfhsExp, setApplyScfhsExp, uploadingCV, setUploadingCV, jobs, loading, posting, postCity, setPostCity, applications, inboxLoading, filtered, handlePost, handleApply } = ctx;
    if (selectedJob && !applyVisible) {
      return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          {/* Modern Header without double padding */}
          <View style={{ backgroundColor: selectedJob.type === 'offer' ? theme.primary : theme.success, padding: SP.lg, paddingBottom: SP.xl, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: '#000', shadowOffset: {width:0, height:6}, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setSelectedJob(null)} style={{ padding: SP.sm, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: R.full }}>
                <I name={AR ? 'chevronRight' : 'chevronLeft'} size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: '#FFF' }}>
                {selectedJob.type === 'offer' ? (tt('rrzd.0adc3b7a')) : (tt('rrzd.eeac2735'))}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={{ alignItems: 'center', marginTop: SP.xl, marginBottom: SP.sm }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginBottom: SP.md, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
                <I name={selectedJob.type === 'offer' ? 'briefcase' : 'user'} size={36} color={selectedJob.type === 'offer' ? theme.primary : theme.success} />
              </View>
              <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: '#FFF', textAlign: 'center' }}>
                {AR ? selectedJob.title_ar : selectedJob.title_en}
              </Text>
              <Text style={{ fontSize: FS.md, color: 'rgba(255,255,255,0.9)', marginTop: SP.xs, fontWeight: FW.bold }}>
                {selectedJob.facility} • {selectedJob.city}
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: SP.xl, paddingBottom: 120 }}>
            {/* Premium Info Grid */}
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
              {[
                { icon: 'award', l: tt('rrzd.f94827be'), v: selectedJob.scfhs },
                { icon: 'clock', l: tt('rrzd.a47b0680'), v: AR ? selectedJob.type_ar : selectedJob.type_en },
                { icon: 'shield', l: tt('rrzd.1f27efff'), v: selectedJob.status },
                { icon: 'star', l: tt('rrzd.985dd715'), v: `${selectedJob.exp} ${tt('qqdk.5f5e1f1e')}` },
                { icon: 'globe', l: tt('rrzd.61abb17f'), v: selectedJob.nat || (tt('rrzd.d088f703')) },
                { icon: 'dollarSign', l: tt('rrzd.4fd3c1e1'), v: selectedJob.salary || (tt('rrzd.5adf44fb')) }
              ].map((f, i) => (
                <View key={i} style={{ width: '47%', backgroundColor: theme.surface, borderRadius: R.lg, padding: SP.md, borderWidth: 1, borderColor: theme.border, alignItems: AR ? 'flex-end' : 'flex-start' }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: SP.sm }}>
                    <I name={f.icon as any} size={16} color={theme.textSub} />
                  </View>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: 2 }}>{f.l}</Text>
                  <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }} numberOfLines={1}>{f.v}</Text>
                </View>
              ))}
            </View>

            <View style={{ backgroundColor: theme.surface, borderRadius: R.xl, padding: SP.xl, borderWidth: 1, borderColor: theme.border }}>
              <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
                {tt('rrzd.495a1b8b')}
              </Text>
              <Text style={{ fontSize: FS.md, color: theme.text, lineHeight: 28, textAlign: AR ? 'right' : 'left' }}>
                {selectedJob.desc}
              </Text>
            </View>
          </ScrollView>

          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: SP.xl, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border, shadowColor: '#000', shadowOffset:{width:0,height:-4}, shadowOpacity:0.05, elevation: 10 }}>
            <TouchableOpacity onPress={() => setApplyVisible(true)} style={{ backgroundColor: selectedJob.contact === 'whatsapp' ? tokens.success : theme.primary, padding: SP.lg, borderRadius: R.full, alignItems: 'center', flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'center', gap: SP.md }}>
              <I name={selectedJob.contact === 'whatsapp' ? "phone" : "send"} size={24} color="#FFF" />
              <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: '#FFF' }}>
                {selectedJob.contact === 'whatsapp' ? (tt('rrzd.cfd2d165')) : (tt('rrzd.dd19db68'))}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

  return null;
}

