import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Card, FIcon, Input, type FillIconName } from '../../../packages/ui-native/src';
import { ConsultList, ConsultScreen, Section, goBack, useConsultFormat } from '../../src/components/consult/ConsultKit';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { pickLocalized } from '../../src/utils/localize';

/**
 * Share a report with the doctor — board Consult's card list. The reports are GET /medical-reports/mine; the chosen
 * ones go out as a text bundle through the device share sheet, and one report can be shared with a named doctor on the
 * platform (POST /medical-reports/:id/share, DELETE /medical-reports/:id/share/:doctorId; the doctors come from
 * GET /care/doctors?q=). Nothing is drawn that the server did not send.
 */

interface Report {
  id: string;
  title_ar?: string;
  title_en?: string;
  facility_name?: string;
  doctor_name?: string;
  issued_at?: string;
  createdAt?: string;
  summary?: string;
  diagnosis?: string;
  lab_booking_id?: string;
  radiology_booking_id?: string;
}
interface DoctorHit {
  id: string;
  name_ar?: string;
  name_en?: string;
  specialty?: string;
  city?: string;
}
interface ShareRow {
  doctor_id: string;
  doctor_name?: string;
  shared_at?: string;
}

const list = <T,>(res: unknown, extra?: string): T[] => {
  if (Array.isArray(res)) return res as T[];
  const r = res as Record<string, unknown> | null;
  const inner = r?.data ?? (extra ? r?.[extra] : undefined);
  return Array.isArray(inner) ? (inner as T[]) : [];
};

export default function ShareReportScreen() {
  const { theme, t, c, flow, k, num } = useScreenUi();
  const { date } = useConsultFormat();
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'offline' | 'ready'>('loading');
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  // Server-side sharing with a specific doctor (POST /medical-reports/:id/share).
  const [target, setTarget] = useState<Report | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<DoctorHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setReports(list<Report>(await apiFetch('/medical-reports/mine?limit=100')));
      setStatus('ready');
    } catch (e) {
      logError('consultations:share-report', e);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const title = (r: Report) => pickLocalized(r.title_ar, r.title_en) || k('consult.share.reportFallback');

  const handleShare = async () => {
    const chosen = reports.filter((r) => selected.includes(r.id));
    if (chosen.length === 0) return;
    setSending(true);
    try {
      const text = chosen
        .map((r) => [`■ ${title(r)}`, r.facility_name || r.doctor_name || '', date(r.issued_at || r.createdAt, true), r.summary ? `${k('consult.share.bundleSummary')}: ${r.summary}` : '', r.diagnosis ? `${k('consult.share.bundleDiagnosis')}: ${r.diagnosis}` : ''].filter(Boolean).join('\n'))
        .join('\n\n');
      await Share.share({ message: `${k('consult.share.bundleHead')}\n\n${text}` });
      goBack();
    } catch {
      showLocalizedAlert(k('consult.share.errorTitle'), k('consult.share.errorBody'));
    } finally {
      setSending(false);
    }
  };

  const loadShares = async (reportId: string) => {
    setSharesLoading(true);
    try {
      const res = await apiFetch<{ data?: Record<string, unknown> } & Record<string, unknown>>(`/medical-reports/${reportId}`);
      const d = (res?.data as Record<string, unknown> | undefined) ?? res ?? {};
      const ids = Array.isArray(d.shared_with_doctor_ids) ? (d.shared_with_doctor_ids as string[]) : [];
      const hist = Array.isArray(d.share_history) ? (d.share_history as ShareRow[]) : [];
      setShares(hist.filter((h) => ids.includes(h.doctor_id)));
    } catch {
      setShares([]);
    } finally {
      setSharesLoading(false);
    }
  };

  const openServerShare = (report: Report) => {
    setTarget(report);
    setQuery('');
    setHits([]);
    void loadShares(report.id);
  };

  const searchDoctors = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    try {
      setHits(list<DoctorHit>(await apiFetch(`/care/doctors?q=${encodeURIComponent(query.trim())}&limit=10`), 'items'));
    } catch {
      setHits([]);
    } finally {
      setSearching(false);
    }
  };

  const doShare = async (doc: DoctorHit) => {
    if (!target || sharing) return;
    setSharing(true);
    try {
      await apiFetch(`/medical-reports/${target.id}/share`, { method: 'POST', body: JSON.stringify({ doctor_profile_id: doc.id, doctor_name: pickLocalized(doc.name_ar, doc.name_en) }) });
      await loadShares(target.id);
      showLocalizedAlert(k('consult.share.doneTitle'), k('consult.share.doneBody'));
    } catch (e) {
      showLocalizedAlert(k('consult.share.failedTitle'), e instanceof Error && e.message ? e.message : k('consult.share.tryLater'));
    } finally {
      setSharing(false);
    }
  };

  const doRevoke = async (doctorId: string) => {
    if (!target) return;
    try {
      await apiFetch(`/medical-reports/${target.id}/share/${encodeURIComponent(doctorId)}`, { method: 'DELETE' });
      await loadShares(target.id);
    } catch (e) {
      showLocalizedAlert(k('consult.share.revokeFailed'), e instanceof Error && e.message ? e.message : k('consult.share.tryLater'));
    }
  };

  if (target) {
    return (
      <ConsultScreen title={k('consult.share.title')} onBack={() => setTarget(null)} testID="share-report-doctor">
        <Card theme={theme}>
          <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{title(target)}</Text>
          <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, marginTop: 4, ...flow }}>{k('consult.share.platformNote')}</Text>
        </Card>
        <Section title={k('consult.share.findDoctor')}>
          <Input label={k('consult.share.doctorField')} placeholder={k('consult.share.doctorPlaceholder')} value={query} onChange={setQuery} startIcon="search" theme={theme} testID="share-doctor-query" />
          <Button label={k('consult.share.search')} size="md" fullWidth loading={searching} onPress={() => void searchDoctors()} theme={theme} />
          {hits.map((d) => (
            <Card key={d.id} theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{pickLocalized(d.name_ar, d.name_en) || k('consult.doctorFallback')}</Text>
                  <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{[d.specialty, d.city].filter(Boolean).join(' · ')}</Text>
                </View>
                <Button label={k('consult.share.share')} size="sm" loading={sharing} onPress={() => void doShare(d)} theme={theme} />
              </View>
            </Card>
          ))}
        </Section>
        <Section title={k('consult.share.sharedWith')}>
          {sharesLoading ? (
            <ActivityIndicator color={c.text.secondary} accessibilityLabel={k('consult.loading')} />
          ) : shares.length === 0 ? (
            <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.share.sharedNone')}</Text>
          ) : (
            shares.map((h) => (
              <Card key={h.doctor_id} theme={theme}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{h.doctor_name || k('consult.doctorFallback')}</Text>
                    <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{date(h.shared_at)}</Text>
                  </View>
                  <Button label={k('consult.share.revoke')} variant="outline" size="sm" onPress={() => void doRevoke(h.doctor_id)} theme={theme} />
                </View>
              </Card>
            ))
          )}
        </Section>
      </ConsultScreen>
    );
  }

  const footer =
    selected.length > 0 ? (
      <>
        {selected.length === 1 ? (
          <Button label={k('consult.share.withDoctor')} variant="outline" size="md" fullWidth onPress={() => { const r = reports.find((x) => x.id === selected[0]); if (r) openServerShare(r); }} theme={theme} />
        ) : null}
        <Button label={k('consult.share.shareN', { n: num(selected.length) })} size="lg" fullWidth startIcon="arrows-left-right" loading={sending} onPress={() => void handleShare()} theme={theme} testID="share-send" />
      </>
    ) : undefined;

  return (
    <ConsultList
      testID="share-report-screen"
      title={k('consult.share.title')}
      top={<Notice tone="info" text={k('consult.share.intro')} />}
      data={reports}
      status={status}
      onRetry={() => void load()}
      footer={footer}
      empty={{ icon: 'file-text', title: k('consult.share.empty'), actionLabel: k('consult.share.backToReports'), onAction: () => router.push('/health/records?tab=reports' as Href) }}
      keyExtractor={(r) => r.id}
      renderItem={(r) => {
        const on = selected.includes(r.id);
        const icon: FillIconName = r.lab_booking_id ? 'test-tube' : r.radiology_booking_id ? 'scan' : 'file-text';
        return (
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={title(r)} onPress={() => toggle(r.id)} style={{ minHeight: 44 }}>
            <Card theme={theme} padding="sm" testID={`report-${r.id}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: on ? 0 : 1.5, borderColor: c.border.strong, backgroundColor: on ? c.action.selected.bg : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <Glyph name="check-circle" size={20} color={c.action.selected.fg} /> : null}
                </View>
                <FIcon icon={icon} tone={r.lab_booking_id ? 'violet' : r.radiology_booking_id ? 'violet' : 'blue'} size={44} theme={theme} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{title(r)}</Text>
                  <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{[r.facility_name || r.doctor_name, date(r.issued_at || r.createdAt, true)].filter(Boolean).join(' · ')}</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        );
      }}
    />
  );
}
