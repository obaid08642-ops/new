// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { apiFetch } from '../../src/utils/api';

export default function BarcodeScannerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (!scanning) return;
    setScanning(false);
    setErrorMessage(null);
    try {
      const medicine = await apiFetch(`/patient/pharmacy/medicines/barcode/${encodeURIComponent(data)}`);
      setResult(medicine);
    } catch (error: any) {
      setResult(null);
      setErrorMessage(error?.message || 'لم يتم العثور على دواء موثق لهذا الباركود.');
    }
  };

  const handleAddToCart = () => {
    if (!result?.id) return;
    router.push({ pathname: '/pharmacy/product-detail', params: { id: result.barcode, name: result.name } });
  };

  return (
    <View style={[st.c, { backgroundColor: colors.textPrimary } ]}>
      <StatusBar barStyle="light-content" />

      {/* Header overlay */}
      <View style={[st.hdr, { paddingTop: insets.top + 8 } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4" color="#fff">مسح الباركود</AppText>
        <IconButton icon="back" bg="rgba(255,255,255,0.18)" color="#fff" onPress={() => router.back()} />
      </View>

      {!permission ? (
        <View style={st.cameraArea}><AppText variant="bodySM" color="#fff">جاري التحقق من إذن الكاميرا…</AppText></View>
      ) : !permission.granted ? (
        <View style={st.cameraArea}>
          <AppText variant="bodySM" color="#fff" align="center">يلزم إذن الكاميرا لمسح الباركود.</AppText>
          <Button label="السماح بالكاميرا" variant="outline" icon="photo_camera" onPress={requestPermission} style={{ marginTop: 20, borderColor: 'rgba(255,255,255,0.4)' }}/>
        </View>
      ) : scanning ? (
        <View style={st.cameraArea}>
          <CameraView style={st.camera} onBarcodeScanned={handleBarcodeScanned} barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }} />
          <View pointerEvents="none" style={st.scanFrame}>
            <View style={[st.corner, st.tl]} /><View style={[st.corner, st.tr]} />
            <View style={[st.corner, st.bl]} /><View style={[st.corner, st.br]} />
          </View>
          <AppText variant="bodySM" color="rgba(255,255,255,0.8)" align="center" style={{ marginTop: 24 }}>
            وجّه الكاميرا نحو باركود أو QR code الدواء
          </AppText>

          {/* Manual entry */}
          <TouchableOpacity onPress={() => router.push('/pharmacy/drug-not-found')} style={{ marginTop: 16 }}>
            <AppText variant="labelMD" color="rgba(255,255,255,0.8)">لم أجد الدواء؟ أضفه يدوياً</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[st.resultArea, { backgroundColor: colors.background } ]}>
          {result ? (
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
                  <AppText variant="bodySM" color={colors.textTertiary}>{result.brand} · {result.dose}</AppText>
                  <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                    <Badge label="دواء موثق" color={colors.success} />
                    {result.requiresRx && <Badge label="يتطلب وصفة" color={colors.warning} />}
                  </View>
                  <AppText variant="h4" color={colors.primary}>{result.price == null ? 'السعر غير متاح' : `${result.price} ر.س`}</AppText>
                </View>
              </View>

              <AppText variant="caption" color={colors.textTertiary} align="center">الباركود: {result.barcode}</AppText>

              <View style={{ gap: 8 }}>
                <Button label="عرض التفاصيل وإضافة للسلة" variant="gradient" icon="shopping_cart" onPress={handleAddToCart} />
                <Button label="مسح دواء آخر" variant="outline" icon="qr_code_scanner" onPress={() => { setScanning(true); setResult(null); }} />
              </View>
            </Card>
          ) : (
            <Card style={{ gap: 14, marginTop: 40, alignItems: 'center' }}>
              <Icon name="error" size={40} color={colors.error} />
              <AppText variant="bodyMD" align="center">{errorMessage || 'تعذر التحقق من الباركود.'}</AppText>
              <Button label="المسح مرة أخرى" variant="outline" icon="qr_code_scanner" onPress={() => { setScanning(true); setErrorMessage(null); }} />
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
  camera: { ...StyleSheet.absoluteFillObject },
  scanFrame: { width: 250, height: 250, position: 'relative', zIndex: 2 },
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
