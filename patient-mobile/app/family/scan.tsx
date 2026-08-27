// @ts-nocheck
// family/scan.tsx — Scan a family invite QR code (from family/invite.tsx)
import React, { useRef, useState } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useApp } from '../../src/context/AppContext';
import { AppText, Button, IconButton } from '../../src/components/ui';

// Extract the invite code from a scanned payload:
//   https://nabdahplus.app/join/ABC123  →  ABC123
//   ABC123 (raw code)                   →  ABC123
function extractInviteCode(raw: string): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  const m = s.match(/\/join\/([A-Za-z0-9-]+)/i);
  if (m) return m[1].toUpperCase();
  if (/^[A-Za-z0-9-]{4,12}$/.test(s)) return s.toUpperCase();
  return null;
}

export default function FamilyScanScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [invalid, setInvalid] = useState(false);
  const busyRef = useRef(false);

  const onBarcodeScanned = ({ data }: { data?: string }) => {
    if (busyRef.current) return;
    const code = extractInviteCode(String(data || ''));
    if (!code) {
      setInvalid(true);
      setTimeout(() => setInvalid(false), 2000);
      return;
    }
    busyRef.current = true;
    router.replace({ pathname: '/family/join', params: { code } });
  };

  return (
    <View style={[st.c, { backgroundColor: '#000' }]}>
      <StatusBar barStyle="light-content" />
      <View style={[st.hdr, { paddingTop: insets.top + 8 }]}>
        <View style={{ width: 40 }} />
        <AppText variant="h4" color="#fff">مسح دعوة العائلة</AppText>
        <IconButton icon="back" bg="rgba(255,255,255,0.18)" color="#fff" onPress={() => router.back()} />
      </View>

      <View style={st.cameraArea}>
        {!permission ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : !permission.granted ? (
          <>
            <AppText variant="bodySM" color="rgba(255,255,255,0.85)" align="center">
              نحتاج إذن الكاميرا لمسح QR الخاص بالدعوة
            </AppText>
            <Button label="منح إذن الكاميرا" variant="gradient" icon="photo_camera" onPress={requestPermission} style={{ marginTop: 16 }} />
          </>
        ) : (
          <>
            <View style={st.scanFrame}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={onBarcodeScanned}
              />
              <View style={[st.corner, st.tl]} />
              <View style={[st.corner, st.tr]} />
              <View style={[st.corner, st.bl]} />
              <View style={[st.corner, st.br]} />
            </View>
            <AppText variant="bodySM" color={invalid ? '#F87171' : 'rgba(255,255,255,0.8)'} align="center" style={{ marginTop: 24 }}>
              {invalid ? 'هذا الرمز ليس دعوة عائلية صالحة' : 'وجّه الكاميرا نحو QR الدعوة من تطبيق فرد عائلتك'}
            </AppText>
          </>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  cameraArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scanFrame: { width: 260, height: 260, borderRadius: 24, overflow: 'hidden' },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: '#23B5CE', borderWidth: 4 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
});
