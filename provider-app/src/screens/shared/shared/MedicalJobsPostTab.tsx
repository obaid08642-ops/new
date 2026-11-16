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


export function MedicalJobsPostTab({ ctx }: any) {
  const { t: tt } = useLang();
  const { theme, lang, AR, show, user, insets, onBack, onOpenChat, tab, setTab, postType, setPostType, search, setSearch, showFilters, setShowFilters, selectedJob, setSelectedJob, selectedApp, setSelectedApp, filterProf, setFilterProf, filterCity, setFilterCity, postTitle, setPostTitle, postProf, setPostProf, postClass, setPostClass, postContract, setPostContract, postNat, setPostNat, postExp, setPostExp, postDesc, setPostDesc, postContact, setPostContact, postPhone, setPostPhone, postCompany, setPostCompany, postSalary, setPostSalary, applyVisible, setApplyVisible, applyName, setApplyName, applyPhone, setApplyPhone, applyClass, setApplyClass, applyExp, setApplyExp, applyReady, setApplyReady, applyCV, setApplyCV, guestId, guestMine, isGuest, applyCvUrl, setApplyCvUrl, applyScfhs, setApplyScfhs, applyScfhsExp, setApplyScfhsExp, uploadingCV, setUploadingCV, jobs, loading, posting, postCity, setPostCity, applications, inboxLoading, filtered, handlePost, handleApply } = ctx;
  return (
    <>
        <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.lg, paddingBottom: 100 }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.sm }}>
            <TouchableOpacity onPress={() => setPostType('offer')} style={{ flex: 1, padding: SP.xl, borderRadius: R.lg, borderWidth: 2, borderColor: postType === 'offer' ? theme.primary : theme.border, backgroundColor: postType === 'offer' ? theme.primaryLight : theme.surface, alignItems: 'center' }}>
              <I name="briefcase" size={32} color={postType === 'offer' ? theme.primary : theme.textSub} />
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md, textAlign: 'center' }}>{tt('qqdm.8831a411')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPostType('request')} style={{ flex: 1, padding: SP.xl, borderRadius: R.lg, borderWidth: 2, borderColor: postType === 'request' ? theme.success : theme.border, backgroundColor: postType === 'request' ? theme.successBg : theme.surface, alignItems: 'center' }}>
              <I name="user" size={32} color={postType === 'request' ? theme.success : theme.textSub} />
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md, textAlign: 'center' }}>{tt('qqdm.ee1cf705')}</Text>
            </TouchableOpacity>
          </View>

          <NInput label={postType === 'offer' ? (tt('mjp.5dd7105a')) : (tt('mjp.36168891'))} placeholder={tt('mjp.424cfd1c')} value={postTitle} onChange={setPostTitle} required />
          
          <NInput label={postType === 'offer' ? (tt('mjp.a0b55075')) : (tt('mjp.e08e55dc'))} placeholder={tt('mjp.fefc981c')} value={postCompany} onChange={setPostCompany} />

          <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{tt('mjp.72210f54')}</Text>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm }}>
            {[ { id: 'doctor', ar: 'طبيب', en: 'Doctor' }, { id: 'nurse', ar: 'تمريض', en: 'Nurse' }, { id: 'pharmacist', ar: 'صيدلي', en: 'Pharmacist' }, { id: 'lab', ar: 'مختبر', en: 'Lab' }, { id: 'radio', ar: 'أشعة', en: 'Radiology' } ].map((p) => (
              <TouchableOpacity key={p.id} onPress={() => setPostProf(p.id)} style={{ paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1, borderColor: postProf === p.id ? theme.primary : theme.border, backgroundColor: postProf === p.id ? theme.primary : theme.surface }}>
                <Text style={{ color: postProf === p.id ? '#FFF' : theme.text, fontSize: FS.sm }}>{AR ? p.ar : p.en}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{tt('mjp.be527eee')}</Text>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm }}>
            {['طبيب عام', 'مقيم', 'أخصائي', 'أخصائي أول', 'استشاري', 'غير مصنف'].map(c => (
              <TouchableOpacity key={c} onPress={() => setPostClass(c)} style={{ paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.md, borderWidth: 1, borderColor: postClass === c ? theme.primary : theme.border, backgroundColor: postClass === c ? theme.primaryLight : theme.bg }}>
                <Text style={{ color: postClass === c ? theme.primary : theme.textSub, fontSize: FS.xs, fontWeight: postClass === c ? FW.bold : FW.reg }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
            <View style={{ flex: 1 }}>
              <NInput label={tt('mjp.095d1753')} placeholder={tt('mjp.5a350aaf')} value={postCity} onChange={setPostCity} required />
            </View>
            <View style={{ flex: 1 }}>
              <NInput label={tt('mjp.0a4591df')} placeholder={tt('mjp.9b98f44c')} value={postNat} onChange={setPostNat} />
            </View>
            <View style={{ flex: 1 }}>
              <NInput label={tt('mjp.0e10b6b3')} placeholder="5" value={postExp} onChange={setPostExp} kbType="numeric" />
            </View>
          </View>

          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.xs }}>{tt('mjp.af2da87b')}</Text>
              <View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: R.md }}>
                {['fulltime', 'parttime', 'locum'].map(t => (
                  <TouchableOpacity key={t} onPress={() => setPostContract(t)} style={{ padding: SP.sm, borderBottomWidth: t==='locum'?0:1, borderBottomColor: theme.border, backgroundColor: postContract === t ? theme.primaryLight : theme.bg }}>
                    <Text style={{ color: postContract === t ? theme.primary : theme.textSub, fontSize: FS.xs, textAlign: 'center' }}>{t==='fulltime' ? (tt('mjp.75369466')) : t==='parttime' ? (tt('mjp.517860f1')) : (tt('mjp.e47f675f'))}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <NInput label={tt('mjp.52229f10')} placeholder={tt('mjp.a039df8b')} value={postSalary} onChange={setPostSalary} />
            </View>
          </View>

          {postType === 'offer' && (
            <View style={{ marginTop: SP.sm }}>
              <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{tt('mjp.4963bc7a')}</Text>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
                <TouchableOpacity onPress={() => setPostContact('inbox')} style={{ flex: 1, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: postContact === 'inbox' ? theme.primary : theme.border, alignItems: 'center', backgroundColor: postContact === 'inbox' ? theme.primaryLight : theme.surface }}>
                  <I name="inbox" size={24} color={postContact === 'inbox' ? theme.primary : theme.textSub} />
                  <Text style={{ color: theme.text, fontSize: FS.xs, marginTop: 4, textAlign: 'center', fontWeight: FW.bold }}>{tt('mjp.883278a0')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPostContact('whatsapp')} style={{ flex: 1, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: postContact === 'whatsapp' ? tokens.success : theme.border, alignItems: 'center', backgroundColor: postContact === 'whatsapp' ? withAlpha(tokens.success, 0.15) : theme.surface }}>
                  <I name="phone" size={24} color={postContact === 'whatsapp' ? tokens.success : theme.textSub} />
                  <Text style={{ color: theme.text, fontSize: FS.xs, marginTop: 4, textAlign: 'center', fontWeight: FW.bold }}>{tt('mjp.fcb966ac')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Guest Forced WhatsApp constraint info */}
          {postType === 'request' && (
            <View style={{ backgroundColor: withAlpha(tokens.warning, 0.15), padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: tokens.warning, marginTop: SP.sm }}>
              <Text style={{ color: '#F57C00', fontSize: FS.xs, textAlign: AR ? 'right' : 'left', lineHeight: 18 }}>
                {tt('mjp.b554b8b2')}
              </Text>
            </View>
          )}

          {(postContact === 'whatsapp' || postType === 'request') && (
            <NInput label={tt('mjp.be3f576a')} placeholder="05xxxxxxxx" value={postPhone} onChange={setPostPhone} kbType="phone-pad" required />
          )}

          <NInput label={tt('mjp.3daa7669')} placeholder={tt('mjp.1ba7d28b')} value={postDesc} onChange={setPostDesc} multi lines={4} />

          <NBtn label={posting ? (tt('mjp.e560f8bd')) : (tt('mjp.a9c688e2'))} onPress={handlePost} disabled={posting || !postTitle || !postProf || !postCity || ((postContact === 'whatsapp' || postType === 'request') && !postPhone)} style={{ marginTop: SP.md }} />
        </ScrollView>

    </>
  );
}