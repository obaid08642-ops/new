import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, ErrorState } from '../../../packages/ui-native/src';
import { ConsultScreen, InfoRow, Section, useConsultFormat } from '../../src/components/consult/ConsultKit';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch, downloadProtected } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';
import { NationalIdForm } from '../../src/components/consult/NationalIdForm';
import { isReportId, readReportDetail, type MedicalReportDetail } from '../../src/utils/medicalReport';
import { shareFile } from '../../src/utils/shareFile';

/**
 * PT-08: one medical report, drawn like the invoice: serial, issue time, doctor with specialty and licence, the patient and the ID
 * number in full, the consultation, the recommended rest period, the reason (the diagnosis only when the doctor chose to show it), the
 * Seha state, a revoked banner with the reason, and the PDF to download and share (GET /care/sick-leaves/:id and /pdf). The footer
 * says official sick leave is issued through Seha and that this is not a government document.
 */
export default function MedicalReportScreen() {
  const { theme, t, c, flow, lang, k, num } = useScreenUi();
  const { date, dateTime } = useConsultFormat();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = raw && isReportId(raw) ? raw : null;
  const [report, setReport] = useState<MedicalReportDetail | null>(null);
  const [failed, setFailed] = useState(id === null);
  const [busy, setBusy] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setFailed(false);
    apiFetch<unknown>(`/care/sick-leaves/${encodeURIComponent(id)}`)
      .then((answer) => {
        const next = readReportDetail(answer);
        if (next) setReport(next);
        else setFailed(true);
      })
      .catch((e) => {
        logError('medical-reports:detail', e);
        setFailed(true);
      });
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const sharePdf = async () => {
    if (!report || busy) return;
    setBusy(true);
    setPdfFailed(false);
    try {
      const uri = await downloadProtected(`/care/sick-leaves/${encodeURIComponent(report.id)}/pdf`, `medical-report-${report.serial ?? report.id}.pdf`);
      if (!uri) {
        setPdfFailed(true);
        return;
      }
      await shareFile(uri, 'application/pdf', k('medreport.detailTitle'));
    } catch (e) {
      logError('medical-reports:pdf', e);
      setPdfFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/medical-reports' as Href));
  const none = k('medreport.notAvailable');
  const specialty = report ? (lang === 'ar' ? report.specialtyAr ?? report.specialtyEn : report.specialtyEn ?? report.specialtyAr) : null;

  return (
    <ConsultScreen title={k('medreport.detailTitle')} onBack={back} testID="medical-report-screen">
      <View style={COLUMN}>
        {failed || !report ? (
          failed ? <ErrorState title={k('medreport.loadError')} retryLabel={k('common.retry')} onRetry={id ? load : undefined} theme={theme} /> : null
        ) : (
          <View style={{ gap: 16 }}>
            {report.revoked ? <Notice tone="danger" text={report.revokeReason ? `${k('medreport.revoked')}: ${report.revokeReason}` : k('medreport.revoked')} /> : null}
            <Section title={report.serial ?? k('medreport.detailTitle')}>
              <InfoRow label={k('medreport.issuedAt')} value={report.issuedAt ? dateTime(report.issuedAt) : none} />
              <InfoRow label={k('medreport.doctor')} value={report.doctorName ?? none} />
              <InfoRow label={k('medreport.specialty')} value={specialty ?? none} />
              <InfoRow label={k('medreport.licence')} value={report.licenceNo ?? none} />
              <InfoRow label={k('medreport.patient')} value={report.patientName ?? none} />
              <InfoRow label={k('medreport.idNumber')} value={report.idNumber ?? none} />
              <InfoRow label={k('medreport.consultation')} value={report.consultationAt ? date(report.consultationAt) : none} />
              <InfoRow label={k('medreport.bookingRef')} value={report.bookingRef ?? none} last />
            </Section>
            <Section title={k('medreport.restPeriod')}>
              <InfoRow label={k('medreport.from')} value={report.from ? date(report.from) : none} />
              <InfoRow label={k('medreport.to')} value={report.to ? date(report.to) : none} />
              <InfoRow label={k('medreport.days')} value={report.days !== null ? num(report.days) : none} last={!report.reason && !report.diagnosis} />
              {report.reason ? <InfoRow label={k('medreport.reason')} value={report.reason} last={!report.diagnosis} /> : null}
              {report.diagnosis ? <InfoRow label={k('medreport.diagnosis')} value={report.diagnosis} last /> : null}
            </Section>
            <Notice tone="info" text={report.sehaNumber ? k('medreport.sehaRegistered', { number: report.sehaNumber }) : k('medreport.sehaPending')} />
            <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k('medreport.footer')}</Text>
            {report.needsNationalId ? (
              <>
                <Notice tone="info" text={k('consult.nationalId.neededForPdf')} />
                <NationalIdForm onSaved={load} />
              </>
            ) : (
              <>
                {pdfFailed ? <Notice tone="danger" text={k('medreport.pdfError')} /> : null}
                <Button label={k('medreport.sharePdf')} size="lg" fullWidth loading={busy} onPress={() => void sharePdf()} theme={theme} testID="medical-report-pdf" />
              </>
            )}
          </View>
        )}
      </View>
    </ConsultScreen>
  );
}
