import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '../../../../packages/ui-native/src';
import { tokens } from '../../../../packages/design-tokens/dist/ts/tokens';
import type { ReceiptView } from '../../utils/receipt';
import { NabdLogo } from '../NabdLogo';
import { useConsultFormat } from '../consult/ConsultKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';

const PRINT_MS = 800;
const TOOTH = 12;

/**
 * The simplified tax invoice as a thermal receipt (same layout as patient-web/components-next/receipt): the paper slides out of a
 * slot in 800 ms, then Download PDF and Share fade in; with the OS's reduce-motion setting it is simply there. Seller, VAT number and
 * time come from the signed QR, the amounts are the invoice's own, and rows the backend does not send are not drawn.
 */
export function ReceiptPaper({ receipt, onDownload, onShare, busy }: { receipt: ReceiptView; onDownload: () => void; onShare: () => void; busy: boolean }) {
  const { k, t, c, theme, flow, num, money } = useScreenUi();
  const fmt = useConsultFormat();
  const light = tokens('light').color;
  const [height, setHeight] = useState(0);
  const slide = useRef(new Animated.Value(0)).current;
  const appear = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => { if (live) setReduced(on); }).catch(() => { if (live) setReduced(false); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (reduced === null || height === 0) return;
    if (reduced) { slide.setValue(1); appear.setValue(1); return; }
    Animated.sequence([
      Animated.timing(slide, { toValue: 1, duration: PRINT_MS, easing: Easing.bezier(0.2, 0.7, 0.2, 1), useNativeDriver: true }),
      Animated.timing(appear, { toValue: 1, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, [reduced, height, slide, appear]);

  const when = fmt.dateTime(receipt.issuedAt);
  const price = (n: number) => k('pharmacy.price', { n: money(n) });
  const rate = num(Math.round(receipt.vatRate * 100));
  const label = { ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow };
  const value = { ...scale(t, 'meta', 'regular'), color: c.text.primary };
  const row = (name: string, text: string, strong = false) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, ...(strong ? { borderTopWidth: 1, borderTopColor: c.border.hairline, paddingTop: 6 } : {}) }}>
      <Text style={strong ? { ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow } : label}>{name}</Text>
      <Text style={strong ? { ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary } : value}>{text}</Text>
    </View>
  );
  const dash = { borderTopWidth: 1, borderStyle: 'dashed' as const, borderColor: c.border.strong, paddingTop: 12, gap: 6 };

  return (
    <View style={{ alignItems: 'center', gap: 16 }} testID="receipt-stage">
      <View style={{ width: '100%', maxWidth: 352, height: 10, borderRadius: 5, backgroundColor: c.text.primary, zIndex: 1 }} />
      <View style={{ width: '100%', maxWidth: 352, overflow: 'hidden', marginTop: -26, paddingTop: 8 }}>
        <Animated.View
          testID="receipt-paper"
          onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
          style={{ transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-Math.max(height, 1), 0] }) }] }}
        >
          <View style={{ backgroundColor: c.bg.surface, padding: 20, gap: 14, borderWidth: 1, borderColor: c.border.hairline }}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <NabdLogo size={40} label={k('receipt.brand')} />
              <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, textAlign: 'center' }}>{receipt.seller?.seller ?? k('receipt.brand')}</Text>
              <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary }}>{k('receipt.simplified')}</Text>
            </View>
            <View style={dash}>
              {receipt.seller ? row(k('receipt.vatNumber'), receipt.seller.vatNumber) : null}
              {row(k('receipt.invoiceNo'), receipt.invoiceNo)}
              {when ? row(k('receipt.dateTime'), when) : null}
            </View>
            <View style={dash}>
              {row(k('receipt.subtotal'), price(receipt.subtotal))}
              {row(k('receipt.vat', { rate }), price(receipt.vatAmount))}
              {row(k('receipt.total'), price(receipt.total), true)}
            </View>
            {receipt.qr ? (
              <View accessibilityLabel={k('receipt.qr')} style={{ alignSelf: 'center', padding: 10, backgroundColor: light.bg.surface }}>
                <QRCode value={receipt.qr} size={144} color={light.text.primary} backgroundColor={light.bg.surface} />
              </View>
            ) : null}
          </View>
          {/* the perforated bottom edge: a row of canvas-coloured diamonds over the paper's lower edge */}
          <View style={{ flexDirection: 'row', height: TOOTH / 2, overflow: 'hidden', backgroundColor: c.bg.surface }}>
            {Array.from({ length: 30 }, (_, i) => (
              <View key={i} style={{ width: TOOTH, height: TOOTH, marginTop: -TOOTH / 2, backgroundColor: c.bg.canvas, transform: [{ rotate: '45deg' }, { scale: 0.85 }] }} />
            ))}
          </View>
        </Animated.View>
      </View>
      <Animated.View style={{ opacity: appear, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
        <Button theme={theme} label={k('receipt.downloadPdf')} onPress={onDownload} loading={busy} />
        <Button theme={theme} label={k('receipt.share')} variant="outline" onPress={onShare} disabled={busy} />
      </Animated.View>
    </View>
  );
}
