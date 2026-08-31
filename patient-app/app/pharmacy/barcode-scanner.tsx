// @ts-nocheck
import React, { useRef, useState } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { apiFetch } from '../../src/utils/api';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { pickLocalized } from '../../src/utils/localize';

export default function BarcodeScannerScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<any>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const cameraRef = useRef<CameraView | null>(null);

  // Identify a medicine by photographing its packaging (Gemini vision on the
  // backend) — the real fallback since most catalog items carry no barcode.
  const captureAndIdentify = async () => {
    if (aiBusy || busyRef.current) return;
    setAiError(null);
    setAiBusy(true);
    busyRef.current = true;
    try {
      const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.4 });
      if (!photo?.base64) throw new Error('capture_failed');
      const ai = await apiFetch<any>('/ai/medicine-image-search', {
        method: 'POST',
        body: JSON.stringify({ image_base64: photo.base64 }),
      });
      const name = String(ai?.name || '').trim();
      if (!name || name.toLowerCase() === 'unknown') {
        setAiError('لم نتمكن من التعرف على العبوة — قرّب الكاميرا من اسم الدواء وحاول مجدداً');
        return;
      }
      const res = await apiFetch<any>(`/medicines?search=${encodeURIComponent(name)}&limit=5`);
      const items = Array.isArray(res) ? res : (res?.items || res?.data || []);
      if (items.length > 0) {
        const m = items[0];
        router.push({ pathname: '/pharmacy/product-detail', params: { id: m.id || m._id, name: pickLocalized(m.name_ar, m.name_en) } });
      } else {
        router.push({ pathname: '/search', params: { q: name } });
      }
    } catch {
      setAiError('تعذّر تحليل الصورة — تحقق من الاتصال وحاول مجدداً');
    } finally {
      setAiBusy(false);
      busyRef.current = false;
    }
  };

  const lookup = async (code: string) => {
    setLookingUp(true);
    try {
      const res = await apiFetch<any>(`/medicines/by-barcode/${encodeURIComponent(code)}`);
      if (res?.found && res.medicine) {
        const m = res.medicine;
        setResult({
          barcode: code,
          id: m.id,
          name: pickLocalized(m.name_ar, m.name_en),
          dose: pickLocalized(m.dosage_ar, m.dosage_en) || null,
          brand: m.manufacturer || null,
          price: typeof m.price === 'number' && m.price > 0 ? m.price : null,
          available: true,
          requiresRx: !!m.requires_prescription,
        });
      } else {
        setNotFound(code);
      }
    } catch {
      setNotFound(code);
    } finally {
      setLookingUp(false);
      busyRef.current = false;
    }
  };

  const onBarcodeScanned = ({ data }: { data?: string }) => {
    const code = String(data || '').trim();
    if (!code || busyRef.current || result || notFound) return;
    busyRef.current = true;
    lookup(code);
  };

  const reset = () => { setResult(null); setNotFound(null); busyRef.current = false; };

  const handleAddToCart = () => {
    router.push({ pathname: '/pharmacy/product-detail', params: { id: result.id || result.barcode, name: result.name } });
  };

  return (
    <View style={[st.c, { backgroundColor: '#000' } ]}>
      <StatusBar barStyle="light-content" />

      {/* Header overlay */}
      <View style={[st.hdr, { paddingTop: insets.top + 8 } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4" color="#fff">مسح الباركود</AppText>
        <IconButton icon="back" bg="rgba(255,255,255,0.18)" color="#fff" onPress={() => router.back()} />
      </View>

      {!result && !notFound ? (
        <View style={st.cameraArea}>
          {!permission ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : !permission.granted ? (
            <>
              <AppText variant="bodySM" color="rgba(255,255,255,0.85)" align="center">
                نحتاج إذن الكاميرا لمسح باركود الدواء
              </AppText>
              <Button label="منح إذن الكاميرا" variant="gradient" icon="photo_camera" onPress={requestPermission} style={{ marginTop: 16 }} />
            </>
          ) : (
            <>
              <View style={st.scanFrame}>
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr', 'code128', 'code39', 'code93', 'ean13', 'ean8', 'upc_a', 'upc_e', 'datamatrix', 'pdf417', 'itf14'],
                  }}
                  onBarcodeScanned={onBarcodeScanned}
                />
                <View style={[st.corner, st.tl]} />
                <View style={[st.corner, st.tr]} />
                <View style={[st.corner, st.bl]} />
                <View style={[st.corner, st.br]} />
              </View>
              {lookingUp && <ActivityIndicator size="small" color="#fff" style={{ marginTop: 16 }} />}
              <AppText variant="bodySM" color="rgba(255,255,255,0.8)" align="center" style={{ marginTop: 24 }}>
                وجّه الكاميرا نحو باركود أو QR code الدواء
              </AppText>

              {/* AI photo identification — works even when the product has no barcode */}
              <Button
                label={aiBusy ? 'جارٍ تحليل الصورة…' : 'صوّر عبوة الدواء للتعرف عليها'}
                variant="gradient"
                icon="document_scanner"
                loading={aiBusy}
                onPress={captureAndIdentify}
                style={{ marginTop: 20, alignSelf: 'stretch' }}
              />
              {aiError && (
                <AppText variant="caption" color="#FCA5A5" align="center" style={{ marginTop: 8 }}>{aiError}</AppText>
              )}
            </>
          )}

          {/* Manual entry */}
          <TouchableOpacity onPress={() => router.push('/pharmacy/request')} style={{ marginTop: 16 }}>
            <AppText variant="labelMD" color="rgba(255,255,255,0.8)">لم أجد الدواء؟ أضفه يدوياً</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[st.resultArea, { backgroundColor: colors.background } ]}>
          {result && (
            <Card style={{ gap: 12, marginTop: 40 }}>
              <View style={{ alignItems: 'center', gap: 10 }}>
                <View style={[st.foundIcon, { backgroundColor: colors.successSurface } ]}>
                  <Icon name="check_circle" size={40} color={colors.success} />
                </View>
                <AppText variant="h4" align="center">تم التعرف على الدواء</AppText>
              </View>

              <View style={[st.infoRow, { borderColor: colors.borderLight } ]}>
                <View style={[st.drugIcon, { backgroundColor: colors.primarySurface } ]}>
                  <Icon name="medication" size={28} color={colors.primary} />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}>
                  <AppText variant="h5">{result.name}</AppText>
                  {(result.brand || result.dose) && (
                    <AppText variant="bodySM" color={colors.textTertiary}>{[result.brand, result.dose].filter(Boolean).join(' · ')}</AppText>
                  )}
                  <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                    <Badge label={result.available ? 'متوفر' : 'غير متوفر'} color={result.available ? colors.success : colors.error} />
                    {result.requiresRx && <Badge label="يتطلب وصفة" color={colors.warning} />}
                  </View>
                  {result.price !== null && <AppText variant="h4" color={colors.primary}>{result.price} ر.س</AppText>}
                </View>
              </View>

              <AppText variant="caption" color={colors.textTertiary} align="center">الباركود: {result.barcode}</AppText>

              <View style={{ gap: 8 }}>
                <Button label="عرض التفاصيل وإضافة للسلة" variant="gradient" icon="shopping_cart" onPress={handleAddToCart} />
                <Button label="مسح دواء آخر" variant="outline" icon="qr_code_scanner" onPress={reset} />
              </View>
            </Card>
          )}

          {notFound && (
            <Card style={{ gap: 12, marginTop: 40 }}>
              <View style={{ alignItems: 'center', gap: 10 }}>
                <View style={[st.foundIcon, { backgroundColor: colors.errorSurface } ]}>
                  <Icon name="search_off" size={40} color={colors.error} />
                </View>
                <AppText variant="h4" align="center">لم يُعثر على الدواء</AppText>
                <AppText variant="bodySM" color={colors.textTertiary} align="center">
                  الباركود {notFound} غير مسجّل في دليل الأدوية
                </AppText>
              </View>
              <View style={{ gap: 8 }}>
                <Button label="التعرف بالذكاء الاصطناعي (تصوير العبوة)" variant="gradient" icon="document_scanner" onPress={() => { setNotFound(null); busyRef.current = false; }} />
                <Button label="إضافة الدواء يدوياً" variant="outline" icon="add" onPress={() => router.push('/pharmacy/request')} />
                <Button label="مسح باركود آخر" variant="outline" icon="qr_code_scanner" onPress={reset} />
              </View>
            </Card>
          )}
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  cameraArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  scanFrame: { width: 250, height: 250, position: 'relative', overflow: 'hidden', borderRadius: 12 },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#10B981', borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  resultArea: { flex: 1, padding: 16 },
  foundIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  infoRow: { flexDirection: 'row-reverse', gap: 14, alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1 },
  drugIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
