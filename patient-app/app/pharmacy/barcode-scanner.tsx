import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StatusBar, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { Button, Card, FIcon, Icon, Screen } from '../../../packages/ui-native/src';
import { Pill, goBack, useAddMedToCart } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';
import { medMeta, medName, medPrice, needsRx, onlineOnly, type Med } from '../../src/utils/pharmacyCatalog';

/**
 * The AI scanner beside search (decision 36, changed 2026-10-16; the PharmacyHub family, no board of its own). The camera
 * takes one photo of a medicine pack, its barcode or QR code, or a prescription; POST /ai/scan reads it with the vision
 * model and answers with the closest public-catalogue medicines, which the patient picks from (the catalogue has no
 * barcodes, so nothing is looked up by code). A prescription photo goes through the normal prescription flow on the
 * server (read, saved with the photo for the pharmacist's review) and this screen opens the prescription order. States:
 * asking for the camera, camera refused, reading, closest matches, no match, a picked medicine, and failures (retry). On a
 * picked medicine, "check interactions" posts its name to POST /ai/drug-interactions as before.
 */

const FRAME = 250;
const CORNER = 40;

type Found = { med: Med };
type ScanAnswer = {
  kind?: 'pack' | 'barcode' | 'qr' | 'prescription';
  status?: 'saved' | 'unreadable';
  prescription_id?: string | null;
  reading?: { name?: string | null };
  matches?: Med[];
};
type Problem = 'unknown' | 'error' | 'busy' | 'rxUnreadable';
type IxHit = { severity?: string; code?: string; note_ar?: string; note?: string };
const IX_NOTES = new Set(['bleeding_risk', 'lactic_acidosis', 'high_potassium', 'severe_low_blood_pressure', 'rhabdomyolysis']);
type IxResult = { checked?: number; safe?: boolean; interactions?: IxHit[] };

/** The three levels the checker states; any other word from the server is not drawn as a label. */
function ixLevel(value?: string): { key: string; tone: 'danger' | 'warning' | 'success' } | null {
  const v = (value || '').toLowerCase();
  if (['high', 'severe', 'major', 'critical', 'contraindicated'].includes(v)) return { key: 'pharmacy.scan.ixHigh', tone: 'danger' };
  if (['moderate', 'medium'].includes(v)) return { key: 'pharmacy.scan.ixMedium', tone: 'warning' };
  if (['low', 'minor', 'mild'].includes(v)) return { key: 'pharmacy.scan.ixLow', tone: 'success' };
  return null;
}

/** A route that is a screen of the app (the typed router only knows the generated list). */
const go = (href: string) => router.push(href as Href);

/** What a failed POST /ai/scan means for the patient: apiFetch throws the server's message (422 scan_unreadable, 429 throttler). */
function scanProblem(e: unknown): Problem {
  const message = e instanceof Error ? e.message.toLowerCase() : '';
  if (message.includes('scan_unreadable')) return 'unknown';
  if (message.includes('too many requests')) return 'busy';
  return 'error';
}

export default function BarcodeScannerScreen() {
  const { theme, t, c, dir, flow, k, money, lang } = useScreenUi();
  const addToCart = useAddMedToCart();
  const [permission, requestPermission] = useCameraPermissions();
  const [found, setFound] = useState<Found | null>(null);
  const [matches, setMatches] = useState<{ name: string; meds: Med[] } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProblem, setAiProblem] = useState<Problem | null>(null);
  const [ix, setIx] = useState<{ state: 'idle' | 'busy' | 'error' | 'done'; result?: IxResult }>({ state: 'idle' });
  const busyRef = useRef(false);
  const cameraRef = useRef<CameraView | null>(null);

  const checkInteractions = async (med: Med) => {
    setIx({ state: 'busy' });
    try {
      const result = await apiFetch<IxResult>('/ai/drug-interactions', { method: 'POST', body: JSON.stringify({ drugs: [medName(med)] }) });
      setIx({ state: 'done', result });
    } catch (e) {
      logError('pharmacy:barcode-scanner:interactions', e);
      setIx({ state: 'error' });
    }
  };

  const reset = () => {
    setIx({ state: 'idle' });
    setFound(null);
    setMatches(null);
    setAiProblem(null);
    busyRef.current = false;
  };

  // one photo: the server reads it and answers with the closest catalogue medicines, or the saved prescription
  const scan = async () => {
    if (aiBusy || busyRef.current) return;
    setAiProblem(null);
    setAiBusy(true);
    busyRef.current = true;
    try {
      const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.5 });
      if (!photo?.base64) throw new Error('capture_failed');
      const answer = await apiFetch<ScanAnswer>('/ai/scan', { method: 'POST', body: JSON.stringify({ image_base64: photo.base64, mime_type: 'image/jpeg' }) });
      if (answer?.kind === 'prescription') {
        if (answer.status === 'saved' && answer.prescription_id) {
          router.replace({ pathname: '/pharmacy/rx-order', params: { prescriptionId: String(answer.prescription_id) } });
        } else {
          setAiProblem('rxUnreadable');
        }
        return;
      }
      const meds = Array.isArray(answer?.matches) ? answer.matches.filter((m) => m && m.id) : [];
      setMatches({ name: String(answer?.reading?.name || '').trim(), meds });
    } catch (e) {
      logError('pharmacy:barcode-scanner:scan', e);
      setAiProblem(scanProblem(e));
    } finally {
      setAiBusy(false);
      busyRef.current = false;
    }
  };

  const onInverse = c.text.onInverse;
  const onInverseSoft = c.text.onInverseSecondary;

  const header = (
    <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={k('pharmacy.back')}
        onPress={goBack}
        hitSlop={4}
        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.bg.surface, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name={dir === 'rtl' ? 'caret-right' : 'caret-left'} size={22} theme={theme} />
      </Pressable>
      <Text accessibilityRole="header" style={{ flex: 1, ...scale(t, 'h4'), color: onInverse, textAlign: 'center' }}>{k('pharmacy.hub.scanBarcode')}</Text>
      <View style={{ width: 44 }} />
    </View>
  );

  const corner = (side: 'tl' | 'tr' | 'bl' | 'br') => ({
    position: 'absolute' as const,
    width: CORNER,
    height: CORNER,
    borderColor: onInverse,
    ...(side[0] === 't' ? { top: 0, borderTopWidth: 3 } : { bottom: 0, borderBottomWidth: 3 }),
    ...(side[1] === 'l' ? { start: 0, borderStartWidth: 3 } : { end: 0, borderEndWidth: 3 }),
    ...(side === 'tl' ? { borderTopStartRadius: 12 } : side === 'tr' ? { borderTopEndRadius: 12 } : side === 'bl' ? { borderBottomStartRadius: 12 } : { borderBottomEndRadius: 12 }),
  });

  const manual = (
    <Pressable accessibilityRole="link" accessibilityLabel={k('pharmacy.barcode.manual')} onPress={() => go('/pharmacy/rx-order?via=type')} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}>
      <Text style={{ ...scale(t, 'label', 'medium'), color: onInverse, textAlign: 'center', textDecorationLine: 'underline' }}>{k('pharmacy.barcode.manual')}</Text>
    </Pressable>
  );

  let body: React.ReactNode;
  if (found) {
    const price = medPrice(found.med);
    const meta = medMeta(found.med);
    body = (
      <Card theme={theme}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <FIcon icon="check-circle" tone="mint" size={64} theme={theme} />
          <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, textAlign: 'center' }}>{k('pharmacy.barcode.found')}</Text>
        </View>
        <View style={{ gap: 6, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border.subtle }}>
          <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{medName(found.med)}</Text>
          {meta ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{meta}</Text> : null}
          {needsRx(found.med) ? <Pill label={k('pharmacy.needsRx')} tone="warning" /> : null}
          {onlineOnly(found.med) ? <Pill label={k('pharmacy.product.exclusive')} tone="info" /> : null}
          {price ? (
            <Text style={{ ...scale(t, 'h4'), color: c.text.price, ...flow }}>
              {money(price)} <Text style={{ ...scale(t, 'meta', 'regular') }}>{k('pharmacy.currency')}</Text>
            </Text>
          ) : null}
        </View>
        <View style={{ gap: 8 }}>
          <Button
            label={k('pharmacy.addToCart')}
            size="lg"
            fullWidth
            onPress={() => {
              addToCart(found.med);
              go('/pharmacy/cart');
            }}
            theme={theme}
          />
          <Button label={k('pharmacy.barcode.details')} variant="outline" fullWidth onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: found.med.id, name: medName(found.med) } })} theme={theme} />
          <Button label={ix.state === 'busy' ? k('pharmacy.scan.ixChecking') : k('pharmacy.scan.ixCheck')} variant="outline" fullWidth loading={ix.state === 'busy'} onPress={() => void checkInteractions(found.med)} theme={theme} />
          <Button label={k('pharmacy.barcode.scanAnother')} variant="secondary" fullWidth onPress={reset} theme={theme} />
        </View>
        {ix.state === 'error' ? (
          <Text accessibilityRole="alert" style={{ ...scale(t, 'meta', 'regular'), color: c.status.danger.fg, textAlign: 'center' }}>{k('pharmacy.scan.ixFailed')}</Text>
        ) : null}
        {ix.state === 'done' && ix.result ? (
          <View accessibilityLiveRegion="polite" style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderColor: c.border.subtle }}>
            <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{ix.result.safe ? k('pharmacy.scan.ixSafe') : k('pharmacy.scan.ixAttention')}</Text>
            {(ix.result.interactions || []).map((h, i) => {
              const level = ixLevel(h.severity);
              // The note is translated from its code; the Arabic server sentence is never shown in another language.
              const note = h.code && IX_NOTES.has(h.code) ? k(`pharmacy.scan.ix.${h.code}`) : lang === 'ar' ? h.note_ar || h.note : h.note;
              return (
                <View key={`${h.severity}-${i}`} style={{ gap: 4 }}>
                  {level ? <Pill label={k(level.key)} tone={level.tone} /> : null}
                  {note ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{note}</Text> : null}
                </View>
              );
            })}
            <Text style={{ ...scale(t, 'caption', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.scan.ixAdvisory')}</Text>
          </View>
        ) : null}
      </Card>
    );
  } else if (matches && matches.meds.length > 0) {
    body = (
      <Card theme={theme}>
        <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('pharmacy.barcode.matchesTitle')}</Text>
        {matches.name ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.barcode.matchesNote', { name: matches.name })}</Text> : null}
        <View style={{ gap: 8 }}>
          {matches.meds.map((med) => {
            const meta = medMeta(med);
            return (
              <Pressable
                key={String(med.id)}
                accessibilityRole="button"
                accessibilityLabel={medName(med)}
                onPress={() => setFound({ med })}
                style={{ minHeight: 56, paddingVertical: 10, paddingHorizontal: 12, gap: 4, borderWidth: 1, borderColor: c.border.subtle, borderRadius: 12 }}
              >
                <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{medName(med)}</Text>
                {meta ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{meta}</Text> : null}
                {needsRx(med) ? <Pill label={k('pharmacy.needsRx')} tone="warning" /> : null}
              </Pressable>
            );
          })}
        </View>
        <Button label={k('pharmacy.barcode.scanAnother')} variant="secondary" fullWidth onPress={reset} theme={theme} />
      </Card>
    );
  } else if (matches) {
    body = (
      <Card theme={theme}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <FIcon icon="magnifying-glass" tone="amber" size={64} theme={theme} />
          <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, textAlign: 'center' }}>{k('pharmacy.barcode.noMatchTitle')}</Text>
          <Text style={{ ...scale(t, 'label', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.barcode.noMatchBody')}</Text>
        </View>
        <View style={{ gap: 8 }}>
          <Button label={k('pharmacy.hub.manualRequest')} size="lg" fullWidth onPress={() => go('/pharmacy/rx-order?via=type')} theme={theme} />
          <Button label={k('pharmacy.barcode.scanAnother')} variant="secondary" fullWidth onPress={reset} theme={theme} />
        </View>
      </Card>
    );
  } else if (!permission) {
    body = <ActivityIndicator accessibilityLabel={k('pharmacy.loading')} size="large" color={onInverse} />;
  } else if (!permission.granted) {
    body = (
      <View style={{ alignItems: 'center', gap: 16 }}>
        <Text accessibilityRole="alert" style={{ ...scale(t, 'label', 'regular'), lineHeight: 22, color: onInverse, textAlign: 'center' }}>
          {permission.canAskAgain ? k('pharmacy.barcode.permBody') : k('pharmacy.barcode.permBlocked')}
        </Text>
        {permission.canAskAgain ? (
          <Button label={k('pharmacy.barcode.permAllow')} onPress={() => void requestPermission()} theme={theme} />
        ) : (
          <Button label={k('pharmacy.openSettings')} onPress={() => void Linking.openSettings()} theme={theme} />
        )}
        {manual}
      </View>
    );
  } else {
    body = (
      <View style={{ alignItems: 'center', alignSelf: 'stretch', gap: 16 }}>
        <View accessibilityLabel={k('pharmacy.barcode.frame')} style={{ width: FRAME, height: FRAME, borderRadius: 12, overflow: 'hidden' }}>
          <CameraView ref={cameraRef} style={{ width: FRAME, height: FRAME }} facing="back" />
          <View pointerEvents="none" style={corner('tl')} />
          <View pointerEvents="none" style={corner('tr')} />
          <View pointerEvents="none" style={corner('bl')} />
          <View pointerEvents="none" style={corner('br')} />
        </View>
        <Text style={{ ...scale(t, 'label', 'regular'), color: onInverseSoft, textAlign: 'center' }}>{k('pharmacy.barcode.aim')}</Text>
        <Button label={aiBusy ? k('pharmacy.barcode.photoBusy') : k('pharmacy.barcode.photo')} fullWidth loading={aiBusy} onPress={() => void scan()} theme={theme} testID="scan-take" />
        {aiProblem ? (
          <Text accessibilityRole="alert" style={{ ...scale(t, 'meta', 'regular'), color: onInverse, textAlign: 'center' }}>
            {aiProblem === 'unknown' ? k('pharmacy.barcode.photoUnknown') : aiProblem === 'busy' ? k('pharmacy.barcode.busy') : aiProblem === 'rxUnreadable' ? k('pharmacy.scan.unreadable') : k('pharmacy.barcode.photoError')}
          </Text>
        ) : null}
        {manual}
      </View>
    );
  }

  return (
    <Screen theme={theme} direction={dir} header={header} background={c.bg.inverse} testID="barcode-scanner-screen">
      <StatusBar barStyle="light-content" />
      <View style={{ ...COLUMN, flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 24 }}>{body}</View>
    </Screen>
  );
}
