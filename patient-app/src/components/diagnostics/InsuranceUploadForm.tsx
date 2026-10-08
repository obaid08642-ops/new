import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { Button, FIcon, Radio, Segmented } from '../../../../packages/ui-native/src';
import { ConsultScreen, RX_TONE, Section } from '../consult/ConsultKit';
import { Block, INSURANCE_TONE, LabCard, LinkCard, Mark, goBackDiag, useDiagText } from './DiagKit';
import { showLocalizedAlert } from '../LocalizedAlert';
import { Notice } from '../pharmacy/OfferKit';
import { PickButton } from '../pharmacy/PharmacyKit';
import { ResultHero } from '../consult/ConsultKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { useDiagnosticsCart } from '../../context/DiagnosticsCartContext';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { normalizeProviders, rowsOf, type LabProvider } from '../../utils/labMappers';
import { pickLocalized } from '../../utils/localize';

type Rec = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
const idOf = (r: Rec): string => str(r.id ?? r.code);
const nameOf = (r: Rec): string => str(pickLocalized(r.name_ar as string | undefined, r.name as string | undefined) ?? r.code);

/** First state of the insurance step (board RxUpload): the prescription or doctor's request, what was read, the insurance, the visit and the lab, then send. After sending, the same route shows the provider's answer (insurance-approval, `orderId` in the URL). */
export default function InsuranceUploadForm() {
  const { theme, t, c, k, flow } = useScreenUi();
  const text = useDiagText();
  const { items, setPrescriptionUrl, setPaymentType, clearCart } = useDiagnosticsCart();
  // Scheduling context forwarded from checkout (day/time/lab); the booking is created with the real /labs|radiology/bookings calls
  const bookingParams = useLocalSearchParams<{ labId?: string; labName?: string; serviceType?: string; dayIso?: string; time?: string }>();
  const paramLabId = first(bookingParams.labId);
  const paramLabName = first(bookingParams.labName);
  const paramDayIso = first(bookingParams.dayIso);
  const paramTime = first(bookingParams.time);
  const paramServiceType = first(bookingParams.serviceType);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showInsPicker, setShowInsPicker] = useState(false);
  const [uploadedImg, setUploadedImg] = useState<string | null>(null);
  const [uploadedB64, setUploadedB64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Auto-fill from the profile
  const [selCompany, setSelCompany] = useState<string>('');
  const [selClass, setSelClass] = useState<string>('');
  const [visitType, setVisitType] = useState<'clinic' | 'home'>(paramServiceType === 'home' ? 'home' : 'clinic');
  const [selLab, setSelLab] = useState<string | null>(paramLabId || null);
  const [nearbyLabs, setNearbyLabs] = useState<LabProvider[]>([]);
  const [ocrItems, setOcrItems] = useState<string[] | null>(null);
  const [companies, setCompanies] = useState<Rec[]>([]);
  const [networks, setNetworks] = useState<Rec[]>([]);
  const [insuranceCatalogUnavailable, setInsuranceCatalogUnavailable] = useState(false);

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        setNearbyLabs(normalizeProviders(await apiFetch<unknown>('/providers?type=lab')));
      } catch (e) {
        logError('diagnostics:insurance-approval:upload:labs', e);
      }
    };
    const fetchCompanies = async () => {
      try {
        const list = rowsOf(await apiFetch<unknown>('/insurance/companies')) as Rec[];
        setCompanies(list);
        setInsuranceCatalogUnavailable(list.length === 0);
      } catch (e) {
        logError('diagnostics:insurance-approval:upload:insurance', e);
        setCompanies([]);
        setInsuranceCatalogUnavailable(true);
      }
    };
    const autofillProfile = async () => {
      try {
        const me = await apiFetch<{ insurance?: Rec; data?: { insurance?: Rec } }>('/users/me/profile');
        const ins = me?.insurance || me?.data?.insurance || null;
        if (ins && (ins.company_id || ins.provider)) {
          if (ins.company_id) setSelCompany(String(ins.company_id));
          else if (ins.provider) {
            const list = rowsOf(await apiFetch<unknown>('/insurance/companies').catch(() => null)) as Rec[];
            const match = list.find((co) => String(co.id || co.company_id || '').toLowerCase() === String(ins.provider).toLowerCase());
            if (match) setSelCompany(String(match.id || match.company_id));
          }
          if (ins.class || ins.plan_class) setSelClass(String(ins.class || ins.plan_class));
        }
      } catch {
        // the manual picker remains as the fallback
      }
    };
    void fetchLabs();
    void fetchCompanies();
    void autofillProfile();
  }, []);

  useEffect(() => {
    if (!selCompany) {
      setNetworks([]);
      return;
    }
    (async () => {
      try {
        setNetworks(rowsOf(await apiFetch<unknown>(`/insurance/companies/${selCompany}/networks`)) as Rec[]);
      } catch {
        setNetworks([]);
      }
    })();
  }, [selCompany]);

  const activeCompany = companies.find((co) => co.id === selCompany || co.code === selCompany);
  const activeClass = networks.find((n) => n.id === selClass || n.code === selClass);

  const handlePick = async (source: 'camera' | 'gallery') => {
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showLocalizedAlert(k('diag.upload.sorry'), k('diag.upload.cameraDenied'));
        return;
      }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8, base64: true });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showLocalizedAlert(k('diag.upload.sorry'), k('diag.upload.galleryDenied'));
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8, base64: true });
    }
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setUploadedImg(asset.uri);
      setUploadedB64(asset.base64 || null);
      setStep(2);
      // Real OCR through the AI gateway
      setOcrItems(null);
      try {
        const res = await apiFetch<{ items?: Array<{ raw_name_string?: unknown }> }>('/ai/ocr-translate', {
          method: 'POST',
          body: JSON.stringify({ image_base64: asset.base64 || '', target_lang: 'ar' }),
        });
        const names = (Array.isArray(res?.items) ? res.items : []).map((it) => it?.raw_name_string).filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
        if (names.length > 0) setOcrItems(names);
      } catch (e) {
        logError('diagnostics:insurance-approval:upload', e);
      } finally {
        setStep(3);
      }
    }
  };

  const getFilteredLabs = () => nearbyLabs.filter((lab) => !(visitType === 'home' && !lab.homeVisit)).slice(0, visitType === 'home' ? 2 : 3);

  const send = async () => {
    if (submitting) return;
    const labItems = items.filter((it) => it.kind !== 'radiology');
    const radioItems = items.filter((it) => it.kind === 'radiology');
    if (!labItems.length && !radioItems.length) {
      showLocalizedAlert(k('diag.upload.cartEmpty'), k('diag.upload.cartEmptyBody'));
      return;
    }
    if (!selLab) {
      showLocalizedAlert(k('diag.upload.pickLab'), k('diag.upload.pickLabBody'));
      return;
    }
    if (!paramDayIso || !paramTime) {
      showLocalizedAlert(k('diag.upload.noSlot'), k('diag.upload.noSlotBody'));
      return;
    }
    const [h, m] = String(paramTime).split(':').map(Number);
    const scheduled = new Date(`${paramDayIso}T00:00:00`);
    scheduled.setHours(h || 0, m || 0, 0, 0);
    if (scheduled.getTime() < Date.now()) {
      showLocalizedAlert(k('diag.upload.past'), k('diag.upload.pastBody'));
      return;
    }
    setSubmitting(true);
    try {
      setPaymentType('insurance');
      if (uploadedImg) setPrescriptionUrl(uploadedImg);
      const selectedLabData = nearbyLabs.find((l) => l.id === selLab);
      const locationType = visitType === 'home' ? 'home' : 'facility';
      let bookingId: string | null = null;
      if (labItems.length) {
        const created = await apiFetch<{ id?: string; booking_id?: string; data?: { id?: string } }>('/labs/bookings', {
          method: 'POST',
          body: JSON.stringify({
            items: labItems.map((it) => ({ service_id: it.id })),
            scheduled_at: scheduled.toISOString(),
            location_type: locationType,
            payment_method: 'insurance',
            provider_account_id: String(selLab),
          }),
        });
        bookingId = created?.id || created?.booking_id || created?.data?.id || null;
      }
      for (const it of radioItems) {
        const created = await apiFetch<{ id?: string; booking_id?: string; data?: { id?: string } }>('/radiology/bookings', {
          method: 'POST',
          body: JSON.stringify({
            service_id: it.id,
            scheduled_at: scheduled.toISOString(),
            location_type: locationType,
            payment_method: 'insurance',
            provider_account_id: String(selLab),
          }),
        });
        if (!bookingId) bookingId = created?.id || created?.booking_id || created?.data?.id || null;
      }
      if (!bookingId) throw new Error(k('diag.upload.createFailed'));
      // Attach the insurance / doctor-request image (best effort: the booking stands for the clinic without it; home requires it server-side)
      if (uploadedB64) {
        try {
          await apiFetch(`/labs/bookings/${bookingId}/documents`, {
            method: 'POST',
            body: JSON.stringify({ kind: 'doctor_request', url_or_b64: `data:image/jpeg;base64,${uploadedB64}` }),
          });
        } catch (docErr) {
          logError('diagnostics:insurance-approval:upload:doc', docErr);
        }
      }
      await clearCart().catch(() => null);
      router.replace({ pathname: '/diagnostics/insurance-approval', params: { labName: paramLabName || selectedLabData?.name, visitType, orderId: bookingId } } as unknown as Href);
    } catch (e: unknown) {
      logError('diagnostics:insurance-approval:upload', e);
      showLocalizedAlert(k('diag.upload.error'), e instanceof Error && e.message ? e.message : k('diag.upload.errorBody'));
    } finally {
      setSubmitting(false);
    }
  };

  const companyLine = activeCompany ? `${nameOf(activeCompany)}${activeClass ? ` - ${nameOf(activeClass)}` : ''}` : k('diag.upload.pickInsurance');
  const footer = step === 3 && selLab ? <Button theme={theme} size="lg" fullWidth loading={submitting} label={k('diag.upload.send')} onPress={() => void send()} /> : undefined;

  return (
    <ConsultScreen testID="diagnostics-insurance-upload" title={k('diag.upload.title')} onBack={goBackDiag} footer={footer}>
      {step === 1 ? (
        <>
          <View style={{ borderRadius: 28, borderWidth: 2, borderStyle: 'dashed', borderColor: c.border.strong, backgroundColor: c.bg.surface, padding: 20, alignItems: 'center', gap: 10 }}>
            <FIcon icon="prescription" tone={RX_TONE} size={72} theme={theme} />
            <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, textAlign: 'center' }}>{k('diag.upload.pick')}</Text>
            <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, textAlign: 'center' }}>{k('diag.upload.hint')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              <PickButton ink name="camera" label={k('diag.upload.camera')} onPress={() => void handlePick('camera')} />
              <PickButton name="image" label={k('diag.upload.gallery')} onPress={() => void handlePick('gallery')} />
            </View>
          </View>
          <LinkCard icon="stethoscope" tone="blue" title={k('diag.upload.noRequest')} body={k('diag.upload.talkGp')} onPress={() => router.push('/consultations' as Href)} />
        </>
      ) : null}

      {step === 2 ? <ResultHero icon="sparkle" tone="info" title={k('diag.upload.analyzing')} body={k('diag.upload.analyzingBody')} /> : null}

      {step === 3 ? (
        <>
          <Section title={k('diag.upload.readTitle')} actionLabel={k('diag.upload.again')} onAction={() => setStep(1)}>
            <Block gap={12}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View style={{ width: 60, height: 80, borderRadius: 12, overflow: 'hidden', backgroundColor: c.bg.canvas }}>
                  {uploadedImg ? <Image accessibilityIgnoresInvertColors source={{ uri: uploadedImg }} style={{ width: '100%', height: '100%' }} /> : null}
                </View>
                <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k('diag.upload.attached')}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: c.border.hairline }} />
              {ocrItems && ocrItems.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('diag.upload.readFrom')}</Text>
                  {ocrItems.map((name, i) => (
                    <View key={`${name}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Mark kind="check" size={16} color={c.status.success.fg} />
                      <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Notice tone="info" text={k('diag.upload.readFailed')} />
              )}
            </Block>
          </Section>

          <Section title={k('diag.upload.insurance')}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${companyLine}, ${k('diag.addr.change')}`}
              onPress={() => setShowInsPicker(!showInsPicker)}
              style={({ pressed }) => ({ minHeight: 56, borderRadius: 20, borderWidth: 1, borderColor: c.border.hairline, backgroundColor: c.bg.surface, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.9 : 1 })}
            >
              <FIcon icon="shield-check" tone={INSURANCE_TONE} size={40} theme={theme} />
              <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{companyLine}</Text>
              <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.link }}>{k('diag.addr.change')}</Text>
            </Pressable>
            {showInsPicker ? (
              <View style={{ borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, paddingHorizontal: 4 }}>
                {companies.map((co, i) => (
                  <Radio
                    key={idOf(co)}
                    theme={theme}
                    label={nameOf(co)}
                    selected={selCompany === idOf(co)}
                    divider={i < companies.length - 1 || (selCompany !== '' && networks.length > 0)}
                    onChange={() => {
                      setSelCompany(idOf(co));
                      setSelClass('');
                    }}
                  />
                ))}
                {selCompany !== ''
                  ? networks.map((n, i) => (
                      <Radio
                        key={idOf(n)}
                        theme={theme}
                        label={nameOf(n)}
                        meta={k('diag.upload.network')}
                        selected={selClass === idOf(n)}
                        divider={i < networks.length - 1}
                        onChange={() => {
                          setSelClass(idOf(n));
                          setShowInsPicker(false);
                        }}
                      />
                    ))
                  : null}
                {insuranceCatalogUnavailable ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, padding: 12, ...flow }}>{k('diag.upload.catalogDown')}</Text> : null}
              </View>
            ) : null}
          </Section>

          <Section title={k('diag.upload.visit')}>
            <Segmented
              theme={theme}
              label={k('diag.upload.visit')}
              value={visitType}
              onChange={(v) => {
                setVisitType(v === 'home' ? 'home' : 'clinic');
                setSelLab(null);
              }}
              options={[
                { value: 'clinic', label: k('diag.place.visitLab') },
                { value: 'home', label: k('diag.place.homeLab') },
              ]}
            />
          </Section>

          <Section title={k('diag.upload.labs')}>
            {getFilteredLabs().map((lab) => (
              <LabCard
                key={lab.id}
                name={lab.name}
                line={[lab.distance !== null ? k('diag.upload.away', { d: text.distance(lab.distance) }) : '', lab.rating !== null ? k('diag.rating', { n: String(lab.rating) }) : ''].filter(Boolean).join(' · ')}
                selected={selLab === lab.id}
                onPress={() => setSelLab(lab.id)}
              />
            ))}
          </Section>
        </>
      ) : null}
    </ConsultScreen>
  );
}
