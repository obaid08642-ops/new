import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';

import { EmptyState, ErrorState } from '../../../packages/ui-native/src';
import { ConsultScreen, useConsultFormat } from '../../src/components/consult/ConsultKit';
import { Row } from '../../src/components/health/HealthKit';
import { COLUMN, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';
import { readReportList, type MedicalReportRow } from '../../src/utils/medicalReport';

/**
 * PT-08: "تقرير طبي / Medical report": the patient's reports with a recommended rest period, newest first (GET /care/sick-leaves, the
 * route keeps its old name). Never called "sick leave" (owner decision 2026-11-09): official sick leave is issued through Seha.
 */
export default function MedicalReportsScreen() {
  const { theme, k, num } = useScreenUi();
  const { date } = useConsultFormat();
  const [rows, setRows] = useState<MedicalReportRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    apiFetch<unknown>('/care/sick-leaves')
      .then((answer) => setRows(readReportList(answer)))
      .catch((e) => {
        logError('medical-reports:list', e);
        setFailed(true);
      });
  }, []);
  useEffect(() => { load(); }, [load]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as Href));
  return (
    <ConsultScreen title={k('medreport.listTitle')} onBack={back} testID="medical-reports-screen">
      <View style={COLUMN}>
        {failed ? (
          <ErrorState title={k('medreport.loadError')} retryLabel={k('common.retry')} onRetry={load} theme={theme} />
        ) : rows !== null && rows.length === 0 ? (
          <EmptyState icon="file-text" tone="blue" title={k('medreport.listEmpty')} body={k('medreport.listEmptyBody')} theme={theme} />
        ) : (
          (rows ?? []).map((r, index) => {
            const period = r.from && r.to ? `${date(r.from)} – ${date(r.to)}${r.days ? ` · ${k('medreport.daysCount', { n: num(r.days) })}` : ''}` : '';
            const seha = r.sehaNumber ? k('medreport.sehaRegistered', { number: r.sehaNumber }) : k('medreport.sehaPending');
            return (
              <Row
                key={r.id}
                icon="file-text"
                tone="blue"
                title={r.serial ?? k('medreport.detailTitle')}
                subtitle={[period, r.doctorName, r.revoked ? k('medreport.revoked') : seha].filter(Boolean).join(' · ')}
                onPress={() => router.push({ pathname: '/medical-reports/[id]', params: { id: r.id } } as unknown as Href)}
                last={index === (rows ?? []).length - 1}
                testID={`medical-report-${r.id}`}
              />
            );
          })
        )}
      </View>
    </ConsultScreen>
  );
}
