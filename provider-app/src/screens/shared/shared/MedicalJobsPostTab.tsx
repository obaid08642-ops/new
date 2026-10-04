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
  const { theme, lang, AR, show, user, insets, onBack, onOpenChat, tab, setTab, postType, setPostType, search, setSearch, showFilters, setShowFilters, selectedJob, setSelectedJob, selectedApp, setSelectedApp, filterProf, setFilterProf, filterCity, setFilterCity, postTitle, setPostTitle, postProf, setPostProf, postClass, setPostClass, postContract, setPostContract, postNat, setPostNat, postExp, setPostExp, postDesc, setPostDesc, postContact, setPostContact, postPhone, setPostPhone, postCompany, setPostCompany, postSalary, setPostSalary, applyVisible, setApplyVisible, applyName, setApplyName, applyPhone, setApplyPhone, applyClass, setApplyClass, applyExp, setApplyExp, applyReady, setApplyReady, applyCV, setApplyCV, guestId, guestMine, isGuest, applyCvUrl, setApplyCvUrl, applyScfhs, setApplyScfhs, applyScfhsExp, setApplyScfhsExp, uploadingCV, setUploadingCV, jobs, loading, posting, postCity, setPostCity, applications, inboxLoading, filtered, handlePost, handleApply } = ctx;
  return (
    <>
        <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.lg, paddingBottom: 100 }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.sm }}>
            <TouchableOpacity onPress={() => setPostType('offer')} style={{ flex: 1, padding: SP.xl, borderRadius: R.lg, borderWidth: 2, borderColor: postType === 'offer' ? theme.primary : theme.border, backgroundColor: postType === 'offer' ? theme.primaryLight : theme.surface, alignItems: 'center' }}>
              <I name="briefcase" size={32} color={postType === 'offer' ? theme.primary : theme.textSub} />
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md, textAlign: 'center' }}>{AR ? 'أنا صاحب عمل\n(أبحث عن موظفين)' : 'Employer\n(Looking for staff)'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPostType('request')} style={{ flex: 1, padding: SP.xl, borderRadius: R.lg, borderWidth: 2, borderColor: postType === 'request' ? theme.success : theme.border, backgroundColor: postType === 'request' ? theme.successBg : theme.surface, alignItems: 'center' }}>
              <I name="user" size={32} color={postType === 'request' ? theme.success : theme.textSub} />
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md, textAlign: 'center' }}>{AR ? 'أنا باحث عن عمل\n(أريد وظيفة)' : 'Job Seeker\n(Looking for job)'}</Text>
            </TouchableOpacity>
          </View>

          <NInput label={postType === 'offer' ? (AR ? 'المسمى الوظيفي المطلوب' : 'Job Title') : (AR ? 'الوظيفة التي تبحث عنها' : 'Desired Title')} placeholder={AR ? 'مثال: أخصائي باطنة' : 'e.g. Internal Med'} value={postTitle} onChange={setPostTitle} required />
          
          <NInput label={postType === 'offer' ? (AR ? 'اسم المنشأة أو المستشفى (اختياري)' : 'Facility Name') : (AR ? 'جهة العمل الحالية (اختياري)' : 'Current Facility')} placeholder={AR ? 'اكتب اسم المنشأة...' : 'Facility Name'} value={postCompany} onChange={setPostCompany} />

          <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? 'المهنة:' : 'Profession:'}</Text>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm }}>
            {[ { id: 'doctor', ar: 'طبيب', en: 'Doctor' }, { id: 'nurse', ar: 'تمريض', en: 'Nurse' }, { id: 'pharmacist', ar: 'صيدلي', en: 'Pharmacist' }, { id: 'lab', ar: 'مختبر', en: 'Lab' }, { id: 'radio', ar: 'أشعة', en: 'Radiology' } ].map((p) => (
              <TouchableOpacity key={p.id} onPress={() => setPostProf(p.id)} style={{ paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1, borderColor: postProf === p.id ? theme.primary : theme.border, backgroundColor: postProf === p.id ? theme.primary : theme.surface }}>
                <Text style={{ color: postProf === p.id ? '#FFF' : theme.text, fontSize: FS.sm }}>{AR ? p.ar : p.en}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? 'تصنيف الهيئة (SCFHS):' : 'Classification:'}</Text>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm }}>
            {['طبيب عام', 'مقيم', 'أخصائي', 'أخصائي أول', 'استشاري', 'غير مصنف'].map(c => (
              <TouchableOpacity key={c} onPress={() => setPostClass(c)} style={{ paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.md, borderWidth: 1, borderColor: postClass === c ? theme.primary : theme.border, backgroundColor: postClass === c ? theme.primaryLight : theme.bg }}>
                <Text style={{ color: postClass === c ? theme.primary : theme.textSub, fontSize: FS.xs, fontWeight: postClass === c ? FW.bold : FW.reg }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
            <View style={{ flex: 1 }}>
              <NInput label={AR ? 'المدينة' : 'City'} placeholder={AR ? 'مثال: الرياض' : 'e.g. Riyadh'} value={postCity} onChange={setPostCity} required />
            </View>
            <View style={{ flex: 1 }}>
              <NInput label={AR ? 'الجنسية المطلوبة' : 'Nationality'} placeholder={AR ? 'مثال: مفتوح، سعودي' : 'e.g. Any, Saudi'} value={postNat} onChange={setPostNat} />
            </View>
            <View style={{ flex: 1 }}>
              <NInput label={AR ? 'سنوات الخبرة' : 'Experience'} placeholder="5" value={postExp} onChange={setPostExp} kbType="numeric" />
            </View>
          </View>

          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.xs }}>{AR ? 'نوع العقد' : 'Contract'}</Text>
              <View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: R.md }}>
                {['fulltime', 'parttime', 'locum'].map(t => (
                  <TouchableOpacity key={t} onPress={() => setPostContract(t)} style={{ padding: SP.sm, borderBottomWidth: t==='locum'?0:1, borderBottomColor: theme.border, backgroundColor: postContract === t ? theme.primaryLight : theme.bg }}>
                    <Text style={{ color: postContract === t ? theme.primary : theme.textSub, fontSize: FS.xs, textAlign: 'center' }}>{t==='fulltime' ? (AR?'دوام كامل':'Full Time') : t==='parttime' ? (AR?'دوام جزئي':'Part Time') : (AR?'لوكم/زيارة':'Locum')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <NInput label={AR ? 'الراتب (اختياري)' : 'Salary (Optional)'} placeholder={AR ? 'يحدد لاحقاً' : 'Negotiable'} value={postSalary} onChange={setPostSalary} />
            </View>
          </View>

          {postType === 'offer' && (
            <View style={{ marginTop: SP.sm }}>
              <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{AR ? 'آلية استلام طلبات التوظيف (الـ CV):' : 'Application Reception:'}</Text>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
                <TouchableOpacity onPress={() => setPostContact('inbox')} style={{ flex: 1, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: postContact === 'inbox' ? theme.primary : theme.border, alignItems: 'center', backgroundColor: postContact === 'inbox' ? theme.primaryLight : theme.surface }}>
                  <I name="inbox" size={24} color={postContact === 'inbox' ? theme.primary : theme.textSub} />
                  <Text style={{ color: theme.text, fontSize: FS.xs, marginTop: 4, textAlign: 'center', fontWeight: FW.bold }}>{AR ? 'صندوق الوارد (ATS)' : 'ATS Inbox'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPostContact('whatsapp')} style={{ flex: 1, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: postContact === 'whatsapp' ? tokens.success : theme.border, alignItems: 'center', backgroundColor: postContact === 'whatsapp' ? withAlpha(tokens.success, 0.15) : theme.surface }}>
                  <I name="phone" size={24} color={postContact === 'whatsapp' ? tokens.success : theme.textSub} />
                  <Text style={{ color: theme.text, fontSize: FS.xs, marginTop: 4, textAlign: 'center', fontWeight: FW.bold }}>{AR ? 'واتساب' : 'WhatsApp'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Guest Forced WhatsApp constraint info */}
          {postType === 'request' && (
            <View style={{ backgroundColor: withAlpha(tokens.warning, 0.15), padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: tokens.warning, marginTop: SP.sm }}>
              <Text style={{ color: '#F57C00', fontSize: FS.xs, textAlign: AR ? 'right' : 'left', lineHeight: 18 }}>
                {AR ? 'بما أنك لا تملك حساب مستشفى (زائر)، التواصل سيكون حصراً عبر الواتساب، لذلك إدخال رقم الجوال الزامي للشركات للوصول إليك.' : 'As a guest job seeker, communication is strictly via WhatsApp. Phone number is required.'}
              </Text>
            </View>
          )}

          {(postContact === 'whatsapp' || postType === 'request') && (
            <NInput label={AR ? 'رقم الواتساب للتواصل' : 'WhatsApp Number'} placeholder="05xxxxxxxx" value={postPhone} onChange={setPostPhone} kbType="phone-pad" required />
          )}

          <NInput label={AR ? 'الوصف والتفاصيل' : 'Details'} placeholder={AR ? 'اكتب التفاصيل هنا...' : 'Write details...'} value={postDesc} onChange={setPostDesc} multi lines={4} />

          <NBtn label={posting ? (AR ? 'جاري النشر...' : 'Publishing...') : (AR ? 'نشر الإعلان' : 'Publish Ad')} onPress={handlePost} disabled={posting || !postTitle || !postProf || !postCity || ((postContact === 'whatsapp' || postType === 'request') && !postPhone)} style={{ marginTop: SP.md }} />
        </ScrollView>

    </>
  );
}