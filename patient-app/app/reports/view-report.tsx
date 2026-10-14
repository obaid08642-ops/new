import React from 'react';
import { Share, Text, View } from 'react-native';
import { useLocalSearchParams, type Href } from 'expo-router';

import { Card, EmptyState, FIcon } from '../../../packages/ui-native/src';
import { CARE_TONE, Gate, InfoRow, Section, ShareGlyph, goBack, useConsultFormat } from '../../src/components/consult/ConsultKit';
import { HealthScreen, Pill, bodyOf, useRemote } from '../../src/components/health/HealthKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { pickLocalized } from '../../src/utils/localize';

/**
 * A medical report (restyle only): GET /reports/:id with the real fields of the report, the title, the facility, the date, the
 * doctor, the summary, the diagnosis, the body, the recommendations and the lab categories. A part the report does not have is
 * not drawn. "Share" shares the text of the report. The old "analyse with AI" button is gone (no governed workflow exists).
 */

const TYPES = ['clinic_note', 'discharge_summary', 'surgery_report', 'consultation_note', 'second_opinion', 'medical_certificate', 'referral', 'other'];

interface Report {
  id?: string; title_ar?: string; title_en?: string; facility_name?: string; lab?: string; issued_at?: string; createdAt?: string; date?: string;
  doctor_name?: string; doctor?: string; report_type?: string; critical?: boolean; summary?: string; diagnosis?: string; body?: string; recommendations?: string;
  categories?: Array<{ name?: string; tests?: Array<{ name?: string; value?: string | number; unit?: string; status?: string }> }>;
}

export default function ViewReportScreen() {
  const { k, theme, t, c, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { status, data, reload } = useRemote(async () => {
    if (!id) throw new Error('missing_id');
    return bodyOf<Report>(await apiFetch(`/reports/${id}`));
  }, [id], 'reports:view-report');
  const report = data;
  const title = report ? pickLocalized(report.title_ar, report.title_en) || k('health.records.report') : '';
  const text = (label: string, value?: string) => (value ? (
    <Section title={label}>
      <Card theme={theme}>
        <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{value}</Text>
      </Card>
    </Section>
  ) : null);

  const share = () => {
    if (!report) return;
    const lines = [title, report.facility_name || report.doctor_name || '', report.summary ? `\n${k('health.report.summary')}: ${report.summary}` : '', report.diagnosis ? `\n${k('health.report.diagnosis')}: ${report.diagnosis}` : '', report.recommendations ? `\n${k('health.report.recommendations')}: ${report.recommendations}` : ''];
    Share.share({ message: lines.filter(Boolean).join('\n') }).catch(() => undefined);
  };

  const hasLab = Array.isArray(report?.categories) && (report?.categories?.length ?? 0) > 0;
  const empty = report && !report.summary && !report.diagnosis && !report.body && !hasLab;

  return (
    <HealthScreen
      title={k('health.report.title')}
      onBack={() => goBack('/health/records?tab=reports' as Href)}
      actions={report ? [{ key: 'share', label: k('health.records.share'), icon: <ShareGlyph />, onPress: share }] : undefined}
      testID="view-report-screen"
    >
      <Gate status={status} onRetry={() => void reload()} errorTitle={k('health.report.error')}>
        {report ? (
          <>
            <Card theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FIcon icon="file-text" tone={CARE_TONE} size={48} theme={theme} />
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{title}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    <Pill label={TYPES.includes(String(report.report_type)) ? k(`health.report.type.${report.report_type}`) : k('health.records.report')} tone="neutral" />
                    {report.critical ? <Pill label={k('health.report.critical')} tone="danger" /> : null}
                  </View>
                </View>
              </View>
              <View>
                <InfoRow label={k('health.report.facility')} value={report.facility_name || report.lab || ''} />
                <InfoRow label={k('health.report.date')} value={fmt.date(report.issued_at || report.createdAt || report.date, true)} />
                <InfoRow label={k('health.report.doctor')} value={report.doctor_name || report.doctor || ''} last />
              </View>
            </Card>
            {text(k('health.report.summary'), report.summary)}
            {text(k('health.report.diagnosis'), report.diagnosis)}
            {text(k('health.report.body'), report.body)}
            {text(k('health.report.recommendations'), report.recommendations)}
            {hasLab ? report.categories?.map((cat, ci) => (
              <Section key={ci} title={cat.name ?? ''}>
                <Card theme={theme}>
                  <View>
                    {(cat.tests ?? []).map((test, ti, all) => (
                      <View key={ti} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: ti === all.length - 1 ? 0 : 1, borderBottomColor: c.border.hairline }}>
                        <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.primary, flex: 1, minWidth: 0, ...flow }}>{test.name}</Text>
                        <Text style={{ ...scale(t, 'small', 'bold'), color: test.status === 'normal' ? c.status.success.fg : c.status.danger.fg }}>{`${test.value ?? ''} ${test.unit ?? ''}`.trim()}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </Section>
            )) : null}
            {empty ? <EmptyState icon="file-text" tone={CARE_TONE} title={k('health.report.empty')} theme={theme} /> : null}
          </>
        ) : null}
      </Gate>
    </HealthScreen>
  );
}
