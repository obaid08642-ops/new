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


import { MedicalJobsBrowseTab } from './MedicalJobsBrowseTab';
import { MedicalJobsPostTab } from './MedicalJobsPostTab';
import { MedicalJobsInboxTab } from './MedicalJobsInboxTab';
import { MedicalJobsDetail } from './MedicalJobsDetail';
import { MedicalJobsApplicant } from './MedicalJobsApplicant';

export function MedicalJobsScreen({ onBack, onOpenChat }: { onBack: () => void, onOpenChat?: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [tab, setTab] = useState<'browse' | 'post' | 'inbox'>('browse');
  const [postType, setPostType] = useState<'offer' | 'request'>('offer');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  // Filters State
  const [filterProf, setFilterProf] = useState<string | null>(null);
  const [filterCity, setFilterCity] = useState<string | null>(null);

  // Forms
  const [postTitle, setPostTitle] = useState('');
  const [postProf, setPostProf] = useState('');
  const [postClass, setPostClass] = useState('أخصائي');
  const [postContract, setPostContract] = useState('fulltime');
  const [postNat, setPostNat] = useState('');
  const [postExp, setPostExp] = useState('');
  const [postDesc, setPostDesc] = useState('');
  const [postContact, setPostContact] = useState('inbox');
  const [postPhone, setPostPhone] = useState('');
  const [postCompany, setPostCompany] = useState('');
  const [postSalary, setPostSalary] = useState('');

  // Application
  const [applyVisible, setApplyVisible] = useState(false);
  const [applyName, setApplyName] = useState('');
  const [applyPhone, setApplyPhone] = useState('');
  const [applyClass, setApplyClass] = useState('');
  const [applyExp, setApplyExp] = useState('');
  const [applyReady, setApplyReady] = useState('');
  const [applyCV, setApplyCV] = useState<boolean>(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestMine, setGuestMine] = useState<any | null>(null);
  const isGuest = !user?.id;
  useEffect(() => {
    if (user?.id) return;
    (async () => {
      try {
        let id = await AsyncStorage.getItem('guest_device_id');
        if (!id) {
          id = `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
          await AsyncStorage.setItem('guest_device_id', id);
        }
        setGuestId(id);
      } catch { /* guest mode unavailable */ }
    })();
  }, [user?.id]);
  const [applyCvUrl, setApplyCvUrl] = useState<string | null>(null);
  const [applyScfhs, setApplyScfhs] = useState('');
  const [applyScfhsExp, setApplyScfhsExp] = useState('');
  const [uploadingCV, setUploadingCV] = useState(false);

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [postCity, setPostCity] = useState('');

  const mapJob = (j: any) => ({
    id: j.id,
    type: j.post_type === 'request' ? 'request' : 'offer',
    title_ar: j.title || '', title_en: j.title || '',
    facility: j.company || j.facility_name || '', city: j.location || '',
    profession: j.scfhs_role || '', scfhs: j.scfhs_role || '',
    exp: j.experience_years != null ? String(j.experience_years) : '',
    type_ar: '', type_en: '',
    status: j.status || '', desc: j.description || '',
    contact: j.contact_preference || 'inbox', phone: j.contact_phone || '',
    date: j.createdAt ? new Date(j.createdAt).toISOString().split('T')[0] : '',
    salary: j.salary_range || '', nat: j.nationality || '',
    contract: j.contract_type || '',
    requirements: j.requirements || [],
  });

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await client.get('/recruitment/jobs');
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setJobs(list.map(mapJob));
      } catch (err) {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const [applications, setApplications] = useState<any[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  useEffect(() => {
    if (tab !== 'inbox') return;
    if (!user?.id && guestId) {
      setInboxLoading(true);
      client.get('/recruitment/guest/mine', { params: { device_id: guestId } }).then(r => {
        const d = r?.data || {};
        setGuestMine(d);
      }).catch(() => setGuestMine(null)).finally(() => setInboxLoading(false));
      return;
    }
    if (!user?.id) return;
    setInboxLoading(true);
    (async () => {
      try {
        const jobsRes = await client.get('/recruitment/jobs', { params: { facility_id: user.id } });
        const myJobs = Array.isArray(jobsRes.data) ? jobsRes.data : (jobsRes.data?.data || []);
        const all: any[] = [];
        for (const job of myJobs) {
          try {
            const appsRes = await client.get(`/recruitment/jobs/${job.id}/applications`);
            (Array.isArray(appsRes.data) ? appsRes.data : []).forEach((a: any) => all.push({
              id: a.id,
              jobTitle: job.title || '',
              applicantName: a.candidate?.full_name || (AR ? 'متقدم' : 'Applicant'),
              phone: a.candidate?.phone || '',
              scfhs: a.candidate?.scfhs_license_status || a.candidate?.scfhs_license_number || '',
              exp: typeof a.candidate?.experience_years === 'number' ? String(a.candidate.experience_years) : (Array.isArray(a.candidate?.experiences) && a.candidate.experiences.length ? `${a.candidate.experiences.length} entries` : '—'),
              ready: a.cover_letter || '',
              date: a.applied_at ? new Date(a.applied_at).toISOString().split('T')[0] : '',
              status: a.status || 'submitted',
            }));
          } catch { /* job not owned or no access — skip */ }
        }
        setApplications(all);
      } catch {
        setApplications([]);
      } finally {
        setInboxLoading(false);
      }
    })();
  }, [tab, user?.id]);

  const filtered = jobs.filter(j =>
    (((AR ? j.title_ar : j.title_en) || '').toLowerCase().includes(search.toLowerCase()) || (j.facility || '').includes(search)) &&
    (filterProf ? j.profession === filterProf : true) &&
    (filterCity ? j.city === filterCity : true)
  );

  const handlePost = async () => {
    if (!postTitle.trim() || !postCity.trim()) {
      show(AR ? 'أدخل المسمى الوظيفي والمدينة' : 'Enter job title and city', 'warning');
      return;
    }
    if (isGuest && !guestId) {
      show(AR ? 'تعذر وضع الضيف — أعد فتح الشاشة' : 'Guest mode unavailable — reopen the screen', 'error');
      return;
    }
    setPosting(true);
    try {
      if (isGuest) {
        const roleMap: Record<string, string> = { doctor: 'doctor', nurse: 'nurse', pharmacist: 'pharmacist', lab: 'lab', radio: 'radiology' };
        await client.post('/recruitment/jobs/guest', {
          device_id: guestId,
          title: postTitle.trim(),
          description: postDesc.trim() || postTitle.trim(),
          scfhs_role: roleMap[postProf] || 'doctor',
          post_type: postType,
          company: postCompany.trim() || undefined,
          contact_phone: postPhone.trim() || undefined,
          contact_preference: postContact,
          nationality: postNat.trim() || undefined,
          experience_years: postExp.trim() ? Number(postExp) : undefined,
          contract_type: postContract,
          location: postCity.trim(),
          salary_range: postSalary.trim() || undefined,
        });
        show(AR ? 'تم إرسال طلبك — سيظهر بعد مراجعة الإدارة' : 'Submitted — visible after admin review', 'success');
        setTab('browse');
        return;
      }
      const roleMap: Record<string, string> = { doctor: 'doctor', nurse: 'nurse', pharmacist: 'pharmacist', lab: 'lab', radio: 'radiology' };
      const res = await client.post('/recruitment/jobs', {
        title: postTitle.trim(),
        description: postDesc.trim() || postTitle.trim(),
        scfhs_role: roleMap[postProf] || 'doctor',
        post_type: postType,
        company: postCompany.trim() || undefined,
        contact_phone: postPhone.trim() || undefined,
        contact_preference: postContact,
        nationality: postNat.trim() || undefined,
        experience_years: postExp.trim() ? Number(postExp) : undefined,
        contract_type: postContract,
        location: postCity.trim(),
        salary_range: postSalary.trim() || undefined,
        requirements: [
          postProf ? (AR ? `المهنة: ${postProf}` : `Profession: ${postProf}`) : '',
          postExp ? (AR ? `خبرة ${postExp} سنوات` : `${postExp} years experience`) : '',
          postNat ? (AR ? `الجنسية: ${postNat}` : `Nationality: ${postNat}`) : '',
          postContract === 'fulltime' ? (AR ? 'دوام كامل' : 'Full-Time') : postContract === 'parttime' ? (AR ? 'دوام جزئي' : 'Part-Time') : (AR ? 'لوكم / زيارات' : 'Locum'),
        ].filter(Boolean),
        status: 'published',
      });
      const created = res.data;
      setJobs([mapJob({ ...created, title: created?.title || postTitle.trim() }), ...jobs]);
      show(AR ? 'تم نشر الإعلان بنجاح' : 'Posted successfully', 'success');
      setTab('browse');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'تعذر نشر الإعلان — نشر الوظائف متاح للمنشآت الصحية فقط' : 'Could not post — job posting is limited to healthcare facilities'), 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleApply = async () => {
    setApplyVisible(false);
    if (isGuest) {
      if (!guestId) { show(AR ? 'تعذر وضع الضيف' : 'Guest mode unavailable', 'error'); return; }
      try {
        await client.post(`/recruitment/jobs/${selectedJob.id}/guest-apply`, {
          device_id: guestId, name: applyName.trim(), phone: applyPhone.trim(),
          cover_letter: [applyClass ? (AR ? `التصنيف: ${applyClass}` : `Classification: ${applyClass}`) : '', applyExp ? (AR ? `الخبرة: ${applyExp} سنوات` : `Experience: ${applyExp} years`) : '', applyReady || ''].filter(Boolean).join('\n'),
        });
        show(AR ? 'تم إرسال طلبك لصاحب العمل' : 'Application sent to employer', 'success');
      } catch (e: any) {
        show(typeof e?.response?.data?.message === 'string' ? e.response.data.message : (AR ? 'تعذر إرسال الطلب' : 'Could not apply'), 'error');
      }
      setTimeout(() => setSelectedJob(null), 1500);
      return;
    }

    if (selectedJob.contact === 'whatsapp') {
      show(AR ? 'جاري تحويلك للواتساب...' : 'Opening WhatsApp...', 'success');
      setTimeout(() => Linking.openURL(`whatsapp://send?phone=${selectedJob.phone}&text=أتقدم لوظيفة ${selectedJob.title_ar}`), 800);
      setTimeout(() => setSelectedJob(null), 1500);
      return;
    }
    try {
      await client.post(`/recruitment/jobs/${selectedJob.id}/apply`, {
        cover_letter: [
          applyName ? (AR ? `الاسم: ${applyName}` : `Name: ${applyName}`) : '',
          applyPhone ? (AR ? `الجوال: ${applyPhone}` : `Phone: ${applyPhone}`) : '',
          applyClass ? (AR ? `التصنيف: ${applyClass}` : `Classification: ${applyClass}`) : '',
          applyExp ? (AR ? `الخبرة: ${applyExp} سنوات` : `Experience: ${applyExp} years`) : '',
          applyReady || '',
        ].filter(Boolean).join('\n'),
      });
      show(AR ? 'تم إرسال طلبك لصاحب العمل بنجاح' : 'Application sent to employer', 'success');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      if (e?.response?.status === 401) {
        show(AR ? 'التقديم على الوظائف يتطلب تسجيل الدخول أو إنشاء حساب أولاً' : 'Applying requires signing in or creating an account first', 'info');
      } else {
        show(typeof msg === 'string' ? msg : (AR ? 'تعذر إرسال الطلب — أكمل ملفك الوظيفي (السيرة الذاتية ورخصة الهيئة) أولاً' : 'Could not apply — complete your candidate profile (CV & SCFHS license) first'), 'error');
      }
    }
    setTimeout(() => setSelectedJob(null), 1500);
  };


  const ctx: any = { theme, lang, AR, show, user, insets, onBack, onOpenChat, tab, setTab, postType, setPostType, search, setSearch, showFilters, setShowFilters, selectedJob, setSelectedJob, selectedApp, setSelectedApp, filterProf, setFilterProf, filterCity, setFilterCity, postTitle, setPostTitle, postProf, setPostProf, postClass, setPostClass, postContract, setPostContract, postNat, setPostNat, postExp, setPostExp, postDesc, setPostDesc, postContact, setPostContact, postPhone, setPostPhone, postCompany, setPostCompany, postSalary, setPostSalary, applyVisible, setApplyVisible, applyName, setApplyName, applyPhone, setApplyPhone, applyClass, setApplyClass, applyExp, setApplyExp, applyReady, setApplyReady, applyCV, setApplyCV, guestId, guestMine, isGuest, applyCvUrl, setApplyCvUrl, applyScfhs, setApplyScfhs, applyScfhsExp, setApplyScfhsExp, uploadingCV, setUploadingCV, jobs, loading, posting, postCity, setPostCity, applications, inboxLoading, filtered, handlePost, handleApply };
  if (selectedJob && !applyVisible) { return <MedicalJobsDetail ctx={ctx} />; }
  if (selectedJob && applyVisible) { return <MedicalJobsApplicant ctx={ctx} />; }
  if (selectedApp) { return <MedicalJobsApplicant ctx={ctx} />; }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* HEADER — top safe-area inset applied here (App.tsx only provides the context) */}
      <View style={{ backgroundColor: theme.bg, paddingBottom: SP.md, paddingTop: Math.max(insets.top, SP.sm), paddingHorizontal: SP.lg }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: SP.lg }}>
          <TouchableOpacity onPress={onBack} style={{ padding: SP.sm, backgroundColor: theme.primary, borderRadius: R.full, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', shadowColor: theme.primary, shadowOffset: {width:0,height:2}, shadowOpacity: 0.3, elevation: 4 }}>
            <I name={AR ? 'chevronRight' : 'chevronLeft'} size={24} color="var(--nabd-bg.surface-light)" />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: FS.xl, fontWeight: FW.xbold, color: theme.text }}>{AR ? 'الوظائف الطبية' : 'Medical Jobs'}</Text>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={{ padding: SP.sm, backgroundColor: theme.primaryLight, borderRadius: R.full, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <I name="filter" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.xs, backgroundColor: theme.surface2, padding: 4, borderRadius: R.lg }}>
          <TouchableOpacity onPress={() => setTab('browse')} style={{ flex: 1, paddingVertical: SP.md, borderRadius: R.md, alignItems: 'center', backgroundColor: tab === 'browse' ? theme.surface : 'transparent', shadowColor: tab==='browse'?'#000':'transparent', shadowOpacity:0.1, shadowRadius:4, elevation: tab==='browse'?2:0 }}>
            <Text style={{ color: tab === 'browse' ? theme.primary : theme.textSub, fontSize: FS.sm, fontWeight: FW.bold }}>{AR ? 'تصفح الوظائف' : 'Browse'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('post')} style={{ flex: 1, paddingVertical: SP.md, borderRadius: R.md, alignItems: 'center', backgroundColor: tab === 'post' ? theme.surface : 'transparent', shadowColor: tab==='post'?'#000':'transparent', shadowOpacity:0.1, shadowRadius:4, elevation: tab==='post'?2:0 }}>
            <Text style={{ color: tab === 'post' ? theme.primary : theme.textSub, fontSize: FS.sm, fontWeight: FW.bold }}>{AR ? 'إضافة إعلان' : 'Post Ad'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('inbox')} style={{ flex: 1, paddingVertical: SP.md, borderRadius: R.md, alignItems: 'center', backgroundColor: tab === 'inbox' ? theme.surface : 'transparent', shadowColor: tab==='inbox'?'#000':'transparent', shadowOpacity:0.1, shadowRadius:4, elevation: tab==='inbox'?2:0 }}>
            <Text style={{ color: tab === 'inbox' ? theme.primary : theme.textSub, fontSize: FS.sm, fontWeight: FW.bold }}>{AR ? 'الوارد (ATS)' : 'Inbox'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─────────────────── BROWSE JOBS ─────────────────── */}
      {tab === 'browse' && <MedicalJobsBrowseTab ctx={ctx} />}
      {tab === 'post' && <MedicalJobsPostTab ctx={ctx} />}
      {tab === 'inbox' && <MedicalJobsInboxTab ctx={ctx} />}


      {/* FILTERS SHEET */}
      <NSheet visible={showFilters} onClose={() => setShowFilters(false)} title={AR ? 'تصفية وبحث متقدم' : 'Advanced Filters'}>
        <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.lg, paddingBottom: 60 }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? 'المهنة:' : 'Profession:'}</Text>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm }}>
            {[{ id: 'doctor', ar: 'طبيب', en: 'Doctor' }, { id: 'pharmacist', ar: 'صيدلي', en: 'Pharmacist' }, { id: 'nurse', ar: 'تمريض', en: 'Nurse' }, { id: 'lab', ar: 'مختبر', en: 'Lab' }, { id: 'radiology', ar: 'أشعة', en: 'Radiology' }].map(p => (
              <TouchableOpacity key={p.id} onPress={() => setFilterProf(filterProf === p.id ? null : p.id)} style={{ paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1, borderColor: filterProf === p.id ? theme.primary : theme.border, backgroundColor: filterProf === p.id ? theme.primaryLight : theme.bg }}>
                <Text style={{ color: filterProf === p.id ? theme.primary : theme.textSub, fontSize: FS.xs }}>{AR ? p.ar : p.en}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? 'المدينة:' : 'City:'}</Text>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm }}>
            {['الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة'].map(c => (
              <TouchableOpacity key={c} onPress={() => setFilterCity(filterCity === c ? null : c)} style={{ paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1, borderColor: filterCity === c ? theme.primary : theme.border, backgroundColor: filterCity === c ? theme.primaryLight : theme.bg }}>
                <Text style={{ color: filterCity === c ? theme.primary : theme.textSub, fontSize: FS.xs }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <NBtn label={AR ? 'تطبيق الفرز' : 'Apply Filter'} onPress={() => setShowFilters(false)} style={{ marginTop: SP.md }} />
        </ScrollView>
      </NSheet>
    </View>
  );

}






// 13. MEDICAL DRUG INDEX — reference index (no ordering)
// ══════════════════════════════════════════════════════════════════
/** Collapsible info section for the drug profile page (mirrors the patient app). */
export function DrugSection({ title, content, warn, defaultOpen }: { title: string; content: any; warn?: boolean; defaultOpen?: boolean }) {
 const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
 const [open, setOpen] = useState(!!defaultOpen);
 const text = Array.isArray(content) ? content.filter(Boolean).join('، ') : (content ? String(content) : '');
 if (!text) return null;
 return (
 <View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: R.md, backgroundColor: theme.surface, overflow: 'hidden', marginBottom: SP.sm }}>
   <TouchableOpacity onPress={() => setOpen(!open)} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', padding: SP.md, gap: SP.sm }}>
     <Text style={{ flex: 1, fontSize: FS.sm, fontWeight: FW.bold, color: warn ? tokens.error : theme.text, textAlign: AR ? 'right' : 'left' }}>{title}</Text>
     <Text style={{ color: theme.textSub, fontSize: FS.md }}>{open ? '−' : '+'}</Text>
   </TouchableOpacity>
   {open && (
     <Text style={{ paddingHorizontal: SP.md, paddingBottom: SP.md, fontSize: FS.sm, color: theme.textSub, lineHeight: 22, textAlign: AR ? 'right' : 'left' }}>{text}</Text>
   )}
 </View>
 );
}

