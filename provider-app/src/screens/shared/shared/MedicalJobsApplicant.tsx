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


export function MedicalJobsApplicant({ ctx }: any) {
  const { theme, lang, AR, show, user, insets, onBack, onOpenChat, tab, setTab, postType, setPostType, search, setSearch, showFilters, setShowFilters, selectedJob, setSelectedJob, selectedApp, setSelectedApp, filterProf, setFilterProf, filterCity, setFilterCity, postTitle, setPostTitle, postProf, setPostProf, postClass, setPostClass, postContract, setPostContract, postNat, setPostNat, postExp, setPostExp, postDesc, setPostDesc, postContact, setPostContact, postPhone, setPostPhone, postCompany, setPostCompany, postSalary, setPostSalary, applyVisible, setApplyVisible, applyName, setApplyName, applyPhone, setApplyPhone, applyClass, setApplyClass, applyExp, setApplyExp, applyReady, setApplyReady, applyCV, setApplyCV, guestId, guestMine, isGuest, applyCvUrl, setApplyCvUrl, applyScfhs, setApplyScfhs, applyScfhsExp, setApplyScfhsExp, uploadingCV, setUploadingCV, jobs, loading, posting, postCity, setPostCity, applications, inboxLoading, filtered, handlePost, handleApply } = ctx;
    if (selectedJob && applyVisible) {
      return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <View style={{ backgroundColor: theme.surface2, padding: SP.lg, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setApplyVisible(false)} style={{ padding: SP.xs }}><I name={AR ? 'chevronRight' : 'chevronLeft'} size={24} color={theme.text} /></TouchableOpacity>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>{AR ? 'تعبئة بيانات التقديم' : 'Application Details'}</Text>
            <View style={{ width: 32 }} />
          </View>
        
          <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md }}>
            <View style={{ backgroundColor: selectedJob.contact === 'whatsapp' ? withAlpha(tokens.success, 0.15) : theme.primaryLight, padding: SP.lg, borderRadius: R.lg, marginBottom: SP.md }}>
              <Text style={{ fontSize: FS.sm, color: selectedJob.contact === 'whatsapp' ? tokens.success : theme.primary, textAlign: AR ? 'right' : 'left', lineHeight: 22, fontWeight: FW.bold }}>
                {selectedJob.contact === 'whatsapp' 
                  ? (AR ? 'سيتم تجهيز رسالة واتساب تحتوي على بياناتك لإرسالها مباشرة إلى ' : 'A WhatsApp message will be prepared to send to ')
                  : (AR ? 'سيتم إرسال سيرتك الذاتية بأمان إلى صندوق وارد التوظيف (ATS Inbox) الخاص بـ ' : 'Your CV will be securely sent to the ATS Inbox of ')}
                {selectedJob.facility}
              </Text>
            </View>
          
            <NInput label={AR ? 'الاسم الكامل' : 'Full Name'} value={applyName} onChange={setApplyName} required />
            <NInput label={AR ? 'رقم التواصل' : 'Contact Number'} value={applyPhone} onChange={setApplyPhone} kbType="phone-pad" required />
          
            <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: -SP.sm }}>{AR ? 'تصنيف الهيئة (SCFHS)' : 'SCFHS Classification'}</Text>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm }}>
              {['طبيب عام', 'مقيم', 'أخصائي', 'أخصائي أول', 'استشاري', 'غير مصنف'].map(c => (
                <TouchableOpacity key={c} onPress={() => setApplyClass(c)} style={{ paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1, borderColor: applyClass === c ? theme.primary : theme.border, backgroundColor: applyClass === c ? theme.primary : theme.bg }}>
                  <Text style={{ color: applyClass === c ? '#FFF' : theme.textSub, fontSize: FS.xs }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <NInput label={AR ? 'سنوات الخبرة' : 'Years of Experience'} placeholder="5" value={applyExp} onChange={setApplyExp} kbType="numeric" />
            <NInput label={AR ? 'الجاهزية للعمل (المدة)' : 'Ready to Start (Notice Period)'} placeholder={AR ? 'جاهز فوراً، شهر، إلخ' : 'Immediately, 1 month, etc.'} value={applyReady} onChange={setApplyReady} />
          
            <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginTop: SP.md }}>
              {AR ? 'السيرة الذاتية المرفقة (إلزامي)' : 'Attached CV (Required)'}
            </Text>
            <NInput label={AR ? 'رقم ترخيص الهيئة' : 'SCFHS license number'} value={applyScfhs} onChange={setApplyScfhs} />
            <NInput label={AR ? 'انتهاء الترخيص (YYYY-MM-DD)' : 'License expiry (YYYY-MM-DD)'} value={applyScfhsExp} onChange={setApplyScfhsExp} placeholder="2027-01-01" />
            <TouchableOpacity onPress={async () => {
              try {
                setUploadingCV(true);
                const DocPicker: any = await import('expo-document-picker');
                const FS: any = await import('expo-file-system/legacy');
                const picked = await DocPicker.getDocumentAsync({ type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'], copyToCacheDirectory: true });
                if (picked.canceled) return;
                const asset = picked.assets[0];
                const base64 = await FS.readAsStringAsync(asset.uri, { encoding: 'base64' });
                const up = await client.post('/storage/upload', { data_base64: base64, mime: asset.mimeType || 'application/pdf', original_name: asset.name || 'cv.pdf' });
                const url = up?.data?.url || up?.data?.id;
                if (!url) { show(AR ? 'تعذر رفع الملف' : 'Could not upload file', 'error'); return; }
                await client.post('/recruitment/candidate/profile', { cv_url: url, scfhs_license_number: applyScfhs.trim() || undefined, scfhs_license_expiry: applyScfhsExp.trim() || undefined });
                setApplyCvUrl(url);
                setApplyCV(true);
                show(AR ? 'تم رفع السيرة الذاتية' : 'CV uploaded', 'success');
              } catch { show(AR ? 'تعذر رفع الملف' : 'Could not upload file', 'error'); }
              finally { setUploadingCV(false); }
            }} style={{ backgroundColor: applyCV ? theme.successBg : theme.surface2, padding: SP.xl, borderRadius: R.lg, borderWidth: 2, borderColor: applyCV ? theme.success : theme.border, borderStyle: applyCV ? 'solid' : 'dashed', alignItems: 'center', gap: SP.sm }}>
              <I name={applyCV ? "check" : "upload"} size={28} color={applyCV ? theme.success : theme.textSub} />
              <Text style={{ fontSize: FS.sm, color: applyCV ? theme.success : theme.textSub }}>
                {uploadingCV ? (AR ? 'جارٍ الرفع…' : 'Uploading…') : applyCV ? (AR ? 'تم رفع الملف بنجاح' : 'File uploaded') : (AR ? 'اضغط لرفع ملف (PDF, Word, Image)' : 'Tap to upload (PDF, Word, Image)')}
              </Text>
            </TouchableOpacity>

            <NBtn label={AR ? 'إرسال الطلب (Submit)' : 'Submit Application'} onPress={handleApply} disabled={!applyName || !applyPhone || !applyCV} style={{ marginTop: SP.xl, backgroundColor: selectedJob.contact === 'whatsapp' ? tokens.success : theme.primary }} />
          </ScrollView>
        </View>
      );
    }


    if (selectedApp) {
      return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <NHeader title={AR ? 'تفاصيل المتقدم' : 'Applicant Details'} sub={selectedApp.applicantName} onBack={() => setSelectedApp(null)} />
          <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md }}>
            <View style={{ alignItems: 'center', marginBottom: SP.lg }}>
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: SP.sm }}>
                <Text style={{ fontSize: FS['3xl'], fontWeight: FW.bold, color: theme.primary }}>{selectedApp.applicantName.charAt(0)}</Text>
              </View>
              <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{selectedApp.applicantName}</Text>
              <Text style={{ fontSize: FS.md, color: theme.textSub }}>{AR ? 'متقدم على:' : 'Applied for:'} {selectedApp.jobTitle}</Text>
            </View>
          
            <View style={{ backgroundColor: theme.surface, borderRadius: R.lg, padding: SP.lg, borderWidth: 1, borderColor: theme.border, gap: SP.md }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}><Text style={{ color: theme.textSub }}>{AR ? 'التصنيف' : 'SCFHS'}</Text><Text style={{ fontWeight: FW.bold, color: theme.text }}>{selectedApp.scfhs}</Text></View>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}><Text style={{ color: theme.textSub }}>{AR ? 'الخبرة' : 'Experience'}</Text><Text style={{ fontWeight: FW.bold, color: theme.text }}>{selectedApp.exp} {AR ? 'سنوات' : 'years'}</Text></View>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}><Text style={{ color: theme.textSub }}>{AR ? 'الجاهزية' : 'Availability'}</Text><Text style={{ fontWeight: FW.bold, color: theme.text }}>{selectedApp.ready}</Text></View>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}><Text style={{ color: theme.textSub }}>{AR ? 'رقم التواصل' : 'Phone'}</Text><Text style={{ fontWeight: FW.bold, color: theme.text }}>{selectedApp.phone}</Text></View>
            </View>

            <NBtn label={AR ? 'تواصل مع المتقدم عبر واتساب' : 'Contact via WhatsApp'} variant="outline" onPress={() => Linking.openURL(`whatsapp://send?phone=${selectedApp.phone}`)} style={{ borderColor: tokens.success }} />
          </ScrollView>
        </View>
      );
    }

  return null;
}

