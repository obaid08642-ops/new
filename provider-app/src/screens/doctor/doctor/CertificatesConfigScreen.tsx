import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AppointmentStatus } from '../../../types/contracts';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Platform, Modal, TextInput,
 RefreshControl, Switch, ActivityIndicator, KeyboardAvoidingView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio } from 'expo-av';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NSkeleton, NOnlineToggle,
 NBottomNav, NDivider, NPriceInput, NProfileImageUploader
} from '../../../components/ui';
import { I, IBg } from '../../../components/icons';
import { SP, R, FS, FW, API_BASE } from '../../../constants';
import { buildHeaders, Vault, SK } from '../../../security/Security';
import client from '../../../api/client';
import { useServicesCatalog, getInsuranceCatalog, useSpecialtiesCatalog } from '../../../api/catalogs';
import { VideoCallRoom } from '../../shared/VideoCallRoom';
import { InsuranceRequestsScreen } from '../../shared/InsuranceRequestsScreen';
import { WithdrawalWorkflow, MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, GlobalSystemSettings, ChatSystem, MediaConfigScreen } from '../../shared/SharedScreens';
import { DoctorStatsRow } from '../components/DoctorStatsRow';
import { DoctorUrgentRequests } from '../components/DoctorUrgentRequests';
import { DoctorQueueList } from '../components/DoctorQueueList';
import { FacilityInvitationsScreen } from '../FacilityInvitationsScreen';
import {
 PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights, AiMedicalCopilot,
 SmartOutboundReferralNetwork, SosDispatchScreen, GpsRouterScreen
} from '../../shared/BlueprintScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens } from '../../../theme/tokens';

export function CertificatesConfigScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [certs, setCerts] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [uploading, setUploading] = useState(false);
 const [docType, setDocType] = useState('medical_license');
 const DOC_TYPES = ['medical_license', 'professional_cv', 'national_id', 'commercial_registration', 'facility_license', 'iban_letter', 'vat_certificate', 'other'];

 async function load() {
   setLoading(true);
   try {
     const res = await client.get('/provider/kyc/documents');
     const d = res?.data?.data || res?.data || {};
     setCerts(Array.isArray(d.documents) ? d.documents : []);
   } catch {
     show(AR ? 'تعذر تحميل المستندات' : 'Could not load documents', 'error');
   } finally {
     setLoading(false);
   }
 }

 useEffect(() => { load(); }, []);

 async function handleUpload() {
   try {
     const DocPicker: any = await import('expo-document-picker');
     const FS: any = await import('expo-file-system');
     const picked = await DocPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
     const uri = picked?.assets?.[0]?.uri || picked?.uri;
     if (!uri) return;
     const mime = picked?.assets?.[0]?.mimeType || 'application/pdf';
     const name = picked?.assets?.[0]?.name || 'document';
     setUploading(true);
     const base64 = await FS.readAsStringAsync(uri, { encoding: 'base64' });
     await client.post('/provider/kyc/documents', { doc_type: docType, file: { data_base64: base64, mime, original_name: name } });
     show(AR ? 'تم رفع المستند وهو قيد المراجعة' : 'Document uploaded and under review', 'success');
     load();
   } catch (err: any) {
     show(err?.response?.data?.message || (AR ? 'تعذر رفع المستند' : 'Upload failed'), 'error');
   } finally {
     setUploading(false);
   }
 }

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? 'الشهادات والمؤهلات' : 'Qualifications'} onBack={onBack} />
 <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md }}>
 {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> : certs.length === 0 ? (
 <NCard><Text style={{ color: theme.textSub, textAlign: 'center' }}>{AR ? 'لا توجد مستندات بعد' : 'No documents yet'}</Text></NCard>
 ) : certs.map((c: any) => (
 <NCard key={String(c.id || c.doc_type)} style={{ marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{c.doc_type}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{c.review_status || c.status || ''}</Text>
 </NCard>
 ))}
 <NSecHeader title={AR ? 'رفع مستند جديد' : 'Upload new document'} />
 <NCard>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6, marginBottom: SP.md }}>
 {DOC_TYPES.map((t) => (
 <TouchableOpacity key={t} onPress={() => setDocType(t)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: docType === t ? theme.primary : theme.border, backgroundColor: docType === t ? theme.primary : theme.surface2 }}>
 <Text style={{ color: docType === t ? '#FFF' : theme.text, fontSize: FS.xs }}>{t}</Text>
 </TouchableOpacity>
 ))}
 </View>
 <NBtn label={AR ? 'اختيار ملف ورفع' : 'Pick file & upload'} loading={uploading} onPress={handleUpload} />
 </NCard>
 </ScrollView>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// PHOTOS & MEDIA SCREEN
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// PRE-VISIT CHAT (PHASE 2)
// ══════════════════════════════════════════════════════════════════════════════
export function PreVisitChatScreen({ apt, onBack, onNavigate }: { apt: any, onBack: () => void, onNavigate: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  // the conversation the patient opened from consultations/chat-with-doctor
  const loadChat = useCallback(async () => {
    if (!apt?.id) return;
    try {
      const res = await client.get(`/provider/chat/appointment/${encodeURIComponent(apt.id)}`);
      const rows = res.data?.messages || [];
      setMessages(rows.map((m: any) => ({ id: m.id, text: m.body, sender: m.sender_id === apt?.patient_id ? 'patient' : 'doctor', attachment: m.attachment_url || '' })));
    } catch { /* keep what is on screen */ }
  }, [apt?.id, apt?.patient_id]);
  useEffect(() => { loadChat(); const t = setInterval(loadChat, 8000); return () => clearInterval(t); }, [loadChat]);

  const handleSend = async () => {
    if (!msg.trim()) return;
    setLoading(true);
    try {
      await client.post('/provider/chat/send', { appointment_id: apt?.id, message: msg });
      setMessages(prev => [...prev, { id: Date.now().toString(), text: msg, sender: 'doctor', attachment: '' }]);
      setMsg('');
    } catch (err) {
      show(AR ? 'فشل إرسال الرسالة' : 'Failed to send message', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'محادثة ما قبل الموعد' : 'Pre-visit Chat'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg }}>
        <Text style={{ textAlign: 'center', color: theme.textSub, marginBottom: SP.lg }}>
          {AR ? 'يُفتح هذا الشات قبل 15 دقيقة لرفع المستندات' : 'Opens 15 mins early for document uploads'}
        </Text>
        
        {messages.map(m => (
          <NCard key={m.id} style={{ padding: SP.lg, marginBottom: SP.sm, backgroundColor: m.sender === 'doctor' ? theme.primary + '15' : theme.surface2 }}>
            <Text style={{ color: theme.text, textAlign: m.sender === 'doctor' ? (AR ? 'left' : 'right') : (AR ? 'right' : 'left') }}>{m.text}</Text>
            {m.attachment ? <Text style={{ color: theme.primary, marginTop: SP.xs, textAlign: AR ? 'right' : 'left' }}>📎 {m.attachment}</Text> : null}
          </NCard>
        ))}
      </ScrollView>
      <View style={{ padding: SP.lg, borderTopWidth: 1, borderColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, alignItems: 'center' }}>
        <View style={{ flex: 1 }}><NInput value={msg} onChange={setMsg} placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'} /></View>
        <NBtn label={AR ? 'إرسال' : 'Send'} onPress={handleSend} disabled={loading || !msg.trim()} style={{ width: 100 }} />
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INBOUND MEDICAL REPORTS SCREEN (Radiology & Labs)
// ══════════════════════════════════════════════════════════════════════════════

export function InboundMedicalReportsScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

    const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    client.get('/provider/reports/inbound')
      .then((res) => {
        if (!active) return;
        const rows = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        setReports(rows.map((row: any) => ({
          id: row.id,
          type: String(row.type || row.service_type || row.kind || 'REPORT').toUpperCase(),
          patientName: row.patient_name || row.patient?.full_name || '—',
          testName: row.test_name || row.service_name || row.title || '—',
          status: row.status || row.state || 'PUBLISHED',
          date: row.published_at || row.completed_at || row.updatedAt || row.createdAt || '',
          pdfUrl: row.pdf_url || row.report_pdf_url || row.file_url,
          dicomViewerUrl: row.dicom_viewer_url || row.dicomViewerUrl,
        })));
        setLoadError(null);
      })
      .catch(() => {
        if (!active) return;
        setReports([]);
        setLoadError(AR ? 'تعذر تحميل التقارير من الخادم. حاول مرة أخرى.' : 'Unable to load reports from the server. Please try again.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [AR]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'التقارير الطبية الواردة' : 'Inbound Medical Reports'} onBack={onBack} />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          {reports.length === 0 ? (
            <NEmpty title={loadError ? (AR ? 'تعذر تحميل التقارير' : 'Unable to load reports') : (AR ? 'لا توجد تقارير' : 'No Reports')} sub={loadError || (AR ? 'لا توجد نتائج جاهزة حتى الآن' : 'No results available yet.')} icon="folder" />
          ) : (
            reports.map(report => (
              <NCard key={report.id} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                    <I name={report.type === 'RADIOLOGY' ? 'camera' : 'flask'} size={24} color={theme.primary} />
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, textAlign: AR ? 'right' : 'left' }}>{report.testName}</Text>
                      <Text style={{ fontSize: 14, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{report.patientName} • {report.date}</Text>
                    </View>
                  </View>
                  <NBadge label={report.status} variant="success" size="sm" />
                </View>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 8, marginTop: 16 }}>
                  {report.dicomViewerUrl && (
                    <TouchableOpacity 
                      onPress={() => Linking.openURL(report.dicomViewerUrl).catch(() => show(AR ? 'فشل فتح العارض' : 'Failed to open viewer', 'error'))}
                      style={{ flex: 1, backgroundColor: theme.info, padding: 8, borderRadius: 8, alignItems: 'center', flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'center', gap: 4 }}>
                      <I name="eye" size={16} color="#FFF" />
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{AR ? 'عرض صور الأشعة' : 'DICOM Viewer'}</Text>
                    </TouchableOpacity>
                  )}
                  {report.pdfUrl && (
                    <TouchableOpacity 
                      onPress={() => Linking.openURL(report.pdfUrl).catch(() => show(AR ? 'فشل فتح التقرير' : 'Failed to open report', 'error'))}
                      style={{ flex: 1, backgroundColor: theme.primary, padding: 8, borderRadius: 8, alignItems: 'center', flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'center', gap: 4 }}>
                      <I name="fileText" size={16} color="#FFF" />
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{AR ? 'تقرير PDF' : 'PDF Report'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </NCard>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
