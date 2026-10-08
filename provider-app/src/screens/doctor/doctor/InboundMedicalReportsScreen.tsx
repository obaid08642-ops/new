import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useTheme, useLang, useToast } from '../../../context';
import { NCard, NBadge, NHeader, NEmpty } from '../../../components/ui';
import { I } from '../../../components/icons';
import client from '../../../api/client';

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
