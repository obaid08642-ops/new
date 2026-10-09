import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StatusBar, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { Button, Card, FIcon, Icon, Input, Screen } from '../../../packages/ui-native/src';
import { Pill, goBack, useAddMedToCart } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';
import { medMeta, medName, medPrice, needsRx, type Med } from '../../src/utils/pharmacyCatalog';

/**
 * Scan a medicine (second pass, section 3: the old barcode scanner and drug scanner in one screen) — the PharmacyHub family (no board of its own; the hub's search field opens it).
 *
 * A camera on the ink surface of the tokens with a scan frame; a barcode is looked up with
 * GET /medicines/by-barcode/:code. A pack can also be photographed (POST /ai/medicine-image-search), and a manual
 * request is always one tap away. States: asking for the camera, camera refused (ask again, or open the phone's
 * settings), looking up, found, not in the directory, and lookup failed (retry). What a found medicine shows is what the
 * directory sends: no availability or price is drawn that the response does not carry. A barcode can also be typed. On a found
 * medicine, "check interactions" posts its name to POST /ai/drug-interactions (the server adds the medicines saved in the
 * account) and shows the verdict and the hits the server returns, as the web checker does.
 */

const BARCODE_TYPES = ['qr', 'code128', 'code39', 'code93', 'ean13', 'ean8', 'upc_a', 'upc_e', 'datamatrix', 'pdf417', 'itf14'] as const;
const FRAME = 250;
const CORNER = 40;

type Found = { code: string; med: Med };
type IxHit = { severity?: string; note_ar?: string; note?: string };
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

export default function BarcodeScannerScreen() {
  const { theme, t, c, dir, flow, k, money, lang } = useScreenUi();
  const addToCart = useAddMedToCart();
  const [permission, requestPermission] = useCameraPermissions();
  const [found, setFound] = useState<Found | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [lookupFailed, setLookupFailed] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProblem, setAiProblem] = useState<'unknown' | 'error' | null>(null);
  const [typed, setTyped] = useState('');
  const [ix, setIx] = useState<{ state: 'idle' | 'busy' | 'error' | 'done'; result?: IxResult }>({ state: 'idle' });
  const busyRef = useRef(false);
  const cameraRef = useRef<CameraView | null>(null);

  const idle = !found && !notFound && !lookupFailed;

  const lookup = async (code: string) => {
    setLookingUp(true);
    setLookupFailed(null);
    try {
      const res = await apiFetch<{ found?: boolean; medicine?: Med }>(`/medicines/by-barcode/${encodeURIComponent(code)}`);
      if (res?.found && res.medicine) setFound({ code, med: res.medicine });
      else setNotFound(code);
    } catch (e) {
      // a failed request is not "not in the directory": it can be retried
      logError('pharmacy:barcode-scanner:lookup', e);
      setLookupFailed(code);
    } finally {
      setLookingUp(false);
      busyRef.current = false;
    }
  };

  const onBarcodeScanned = ({ data }: { data?: string }) => {
    const code = String(data || '').trim();
    if (!code || busyRef.current || !idle) return;
    busyRef.current = true;
    void lookup(code);
  };

  const lookupTyped = () => {
    const code = typed.trim();
    if (!code || busyRef.current || lookingUp) return;
    busyRef.current = true;
    void lookup(code);
  };

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
    setTyped('');
    setFound(null);
    setNotFound(null);
    setLookupFailed(null);
    busyRef.current = false;
  };

  // a pack photographed: the backend names the medicine, the directory finds it (works for packs with no barcode)
  const identify = async () => {
    if (aiBusy || busyRef.current) return;
    setAiProblem(null);
    setAiBusy(true);
    busyRef.current = true;
    try {
      const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.4 });
      if (!photo?.base64) throw new Error('capture_failed');
      const ai = await apiFetch<{ name?: string }>('/ai/medicine-image-search', { method: 'POST', body: JSON.stringify({ image_base64: photo.base64 }) });
      const name = String(ai?.name || '').trim();
      if (!name || name.toLowerCase() === 'unknown') {
        setAiProblem('unknown');
        return;
      }
      const res = await apiFetch<Med[] | { items?: Med[]; data?: Med[] }>(`/medicines?search=${encodeURIComponent(name)}&limit=5`);
      const rows = Array.isArray(res) ? res : res?.items || res?.data || [];
      const first = rows[0];
      if (first) router.push({ pathname: '/pharmacy/product-detail', params: { id: String(first.id || first._id), name: medName(first) } });
      else router.push({ pathname: '/search', params: { q: name } });
    } catch (e) {
      logError('pharmacy:barcode-scanner:identify', e);
      setAiProblem('error');
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
          {price ? (
            <Text style={{ ...scale(t, 'h4'), color: c.text.price, ...flow }}>
              {money(price)} <Text style={{ ...scale(t, 'meta', 'regular') }}>{k('pharmacy.currency')}</Text>
            </Text>
          ) : null}
        </View>
        <Text style={{ ...scale(t, 'caption', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.barcode.code', { code: found.code })}</Text>
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
              const note = lang === 'ar' ? h.note_ar || h.note : h.note;
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
  } else if (notFound) {
    body = (
      <Card theme={theme}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <FIcon icon="magnifying-glass" tone="amber" size={64} theme={theme} />
          <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, textAlign: 'center' }}>{k('pharmacy.barcode.notFoundTitle')}</Text>
          <Text style={{ ...scale(t, 'label', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.barcode.notFoundBody', { code: notFound })}</Text>
        </View>
        <View style={{ gap: 8 }}>
          <Button label={k('pharmacy.barcode.photo')} size="lg" fullWidth onPress={reset} theme={theme} />
          <Button label={k('pharmacy.hub.manualRequest')} variant="outline" fullWidth onPress={() => go('/pharmacy/rx-order?via=type')} theme={theme} />
          <Button label={k('pharmacy.barcode.scanAnotherCode')} variant="secondary" fullWidth onPress={reset} theme={theme} />
        </View>
      </Card>
    );
  } else if (lookupFailed) {
    body = (
      <Card theme={theme}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <FIcon icon="warning" tone="amber" size={64} theme={theme} />
          <Text accessibilityRole="alert" style={{ ...scale(t, 'h4'), color: c.text.primary, textAlign: 'center' }}>{k('pharmacy.barcode.errorTitle')}</Text>
          <Text style={{ ...scale(t, 'label', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.error.body')}</Text>
        </View>
        <View style={{ gap: 8 }}>
          <Button
            label={k('pharmacy.retry')}
            size="lg"
            fullWidth
            loading={lookingUp}
            onPress={() => {
              busyRef.current = true;
              void lookup(lookupFailed);
            }}
            theme={theme}
          />
          <Button label={k('pharmacy.barcode.scanAnotherCode')} variant="secondary" fullWidth onPress={reset} theme={theme} />
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
          <CameraView ref={cameraRef} style={{ width: FRAME, height: FRAME }} facing="back" barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }} onBarcodeScanned={onBarcodeScanned} />
          <View pointerEvents="none" style={corner('tl')} />
          <View pointerEvents="none" style={corner('tr')} />
          <View pointerEvents="none" style={corner('bl')} />
          <View pointerEvents="none" style={corner('br')} />
        </View>
        {lookingUp ? <ActivityIndicator accessibilityLabel={k('pharmacy.barcode.looking')} size="small" color={onInverse} /> : null}
        <Text style={{ ...scale(t, 'label', 'regular'), color: onInverseSoft, textAlign: 'center' }}>{k('pharmacy.barcode.aim')}</Text>
        <Button label={aiBusy ? k('pharmacy.barcode.photoBusy') : k('pharmacy.barcode.photo')} fullWidth loading={aiBusy} onPress={() => void identify()} theme={theme} />
        {aiProblem ? (
          <Text accessibilityRole="alert" style={{ ...scale(t, 'meta', 'regular'), color: onInverse, textAlign: 'center' }}>
            {aiProblem === 'unknown' ? k('pharmacy.barcode.photoUnknown') : k('pharmacy.barcode.photoError')}
          </Text>
        ) : null}
        <View style={{ alignSelf: 'stretch', flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Input label={k('pharmacy.scan.typeCode')} value={typed} onChange={setTyped} keyboardType="number" theme={theme} />
          </View>
          <Button label={k('pharmacy.scan.typeGo')} variant="secondary" loading={lookingUp} onPress={lookupTyped} theme={theme} />
        </View>
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
