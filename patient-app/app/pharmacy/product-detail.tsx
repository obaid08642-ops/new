// @ts-nocheck
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated, Modal, Dimensions, Image, Alert
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { useCart } from '../../src/context/CartContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import { apiFetch, R2_PUBLIC_URL, BASE_URL } from '../../src/utils/api';

const { width } = Dimensions.get('window');
const IMAGE_BASE_URL = BASE_URL.replace('/api/v1', '') + '/static/images';

// Accordion Component
function DetailAccordion({ title, icon, content, colors, isRTL, defaultOpen = false, isWarning = false }: any) {
  const [open, setOpen] = useState(defaultOpen);
  if (!content || content === 'null' || (Array.isArray(content) && content.length === 0)) return null;
  const themeColor = isWarning ? '#F0695C' : '#23B5CE';
  const bg = isWarning ? '#FEEFED' : colors.s;
  const border = isWarning ? '#F0695C44' : colors.bd;

  return (
    <View style={[styles.accordion, { backgroundColor: bg, borderColor: border } ]}>
      <TouchableOpacity style={[styles.accHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1 }}>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: themeColor, fontSize: 24, marginHorizontal: 8 }}>{icon}</Text>
          <Text style={{ fontFamily: 'Cairo-Black', fontSize: 18, color: isWarning ? '#141A2A' : colors.n }}>{title}</Text>
        </View>
        <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 24 }}>
          {open ? 'expand_less' : 'expand_more'}
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={[styles.accContent, { borderTopColor: border } ]}>
          <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 14, lineHeight: 24, color: isWarning ? '#4C5566' : colors.t2, textAlign: isRTL ? 'right' : 'left' }}>
            {Array.isArray(content) ? content.join('\n') : content}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';
  const { addItem, updateQty, items } = useCart();

  const [med, setMed] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  
  const [isZoomVisible, setIsZoomVisible] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const qty = items.find(i => i.id === id)?.qty || 0;
  const inCart = qty > 0;

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/medicines/${id}`);
        if (data && data.id) {
           setMed(data);
           
           // Fetch images logic
           const baseImg = data.image;
           if (baseImg) {
              const baseNameParts = baseImg.split('_1.');
              const basePrefix = baseNameParts[0]; // e.g. "234430"
              const ext = baseImg.split('.').pop() || 'webp';
              
              const checkUrls = [
                `${IMAGE_BASE_URL}/${baseImg}`,
                `${IMAGE_BASE_URL}/${basePrefix}_2.${ext}`,
                `${IMAGE_BASE_URL}/${basePrefix}_img_2.${ext}`,
                `${IMAGE_BASE_URL}/${basePrefix}_3.${ext}`,
                `${IMAGE_BASE_URL}/${basePrefix}_img_3.${ext}`
              ];

              const validImages: string[] = [];
              for (const url of checkUrls) {
                 try {
                   const res = await fetch(url, { method: 'HEAD' });
                   if (res.ok) validImages.push(url);
                 } catch (e) {}
              }
              if (validImages.length === 0) validImages.push(`${IMAGE_BASE_URL}/${baseImg}`);
              setImages(validImages);
           }
           
           // Fetch alternatives
           try {
              const altData = await apiFetch(`/medicines/${id}/alternatives`);
              if (Array.isArray(altData)) setAlternatives(altData);
           } catch (e) {}
        }
      } catch {
        setMed(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleAdd = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();
    
    if (!med) return;

    if (med.requires_prescription || med.rx) {
       Alert.alert(
         isRTL ? 'مطلوب وصفة طبية' : 'Prescription Required',
         isRTL ? 'هذا الدواء يتطلب إرفاق روشتة طبية سارية. سيُطلب منك رفعها في سلة المشتريات لإتمام الطلب.' : 'This medicine requires a valid prescription. You will be asked to upload it in the cart.',
         [{ text: isRTL ? 'موافق' : 'OK' }]
       );
    }

    addItem({
      id: med.id,
      name: isRTL ? (med.name_ar || med.name) : (med.name_en || med.name),
      price: med.price || 0,
      rx: med.rx || med.requires_prescription || false,
      image: med.image,
      icon: med.icon || 'medication',
      iconColor: med.iconColor || '#23B5CE',
      iconBg: med.iconBg || '#DEF5F9',
    });
  }, [med, addItem, scaleAnim, isRTL]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color="#23B5CE" />
      </View>
    );
  }

  if (!med) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 18, color: colors.t2 }}>
          {isRTL ? 'المنتج غير موجود' : 'Product Not Found'}
        </Text>
      </View>
    );
  }

  const name = isRTL ? (med.name_ar || med.name) : (med.name_en || med.name);
  const description = isRTL ? med.description_ar : med.description_en;
  const dosage = isRTL ? med.dosage_ar : med.dosage_en;
  const warnings = isRTL ? med.warnings_ar : med.warnings_en;
  const sideEffects = isRTL ? med.side_effects_ar : med.side_effects_en;

  const seoTitle = `${name} | ${med.active_ingredient || ''} | صيدلية نبض`;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg } ]}>
      <Stack.Screen options={{ title: seoTitle, headerShown: false }} />

      {/* ─── Header Overlay ─── */}
      <View style={[styles.headerOverlay, { paddingTop: insets.top } ]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#141A2A', fontSize: 26 }}>
            {isRTL ? 'arrow_forward' : 'arrow_back'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/pharmacy/cart')}>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#141A2A', fontSize: 26 }}>shopping_cart</Text>
          {items.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={{ fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 10 }}>{items.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>

        {/* ─── Image Gallery (Scrollable) ─── */}
        <View style={styles.galleryContainer}>
          {images.length > 0 ? (
             <ScrollView 
               horizontal 
               pagingEnabled 
               showsHorizontalScrollIndicator={false}
               onMomentumScrollEnd={(e) => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
               style={{ width, height: width }}
             >
                {images.map((img, i) => (
                  <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => setIsZoomVisible(true)}>
                    <Image source={{ uri: img }} style={{ width, height: width, resizeMode: 'contain', backgroundColor: '#fff' }} />
                  </TouchableOpacity>
                ))}
             </ScrollView>
          ) : (
            <View style={[styles.placeholderHero, { backgroundColor: med.iconBg || '#DEF5F9', width, height: width } ]}>
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 110, color: med.iconColor || '#23B5CE' }}>
                {med.icon || 'medication'}
              </Text>
            </View>
          )}

          {images.length > 1 && (
            <View style={styles.pagination}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, { backgroundColor: i === activeImage ? '#23B5CE' : '#CBD5E1' }]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.content}>
          
          {/* ─── Primary Info ─── */}
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', marginBottom: 20 }}>
            {med.manufacturer && (
              <Text style={[styles.manufacturer, { color: '#23B5CE' } ]}>{med.manufacturer}</Text>
            )}
            
            <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
              <Text style={[styles.medName, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>{name}</Text>
            </View>

            <View style={[styles.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
              <Text style={[styles.price, { color: '#F0695C' } ]}>{(med.price || 0).toFixed(2)}</Text>
              <Text style={[styles.currency, { color: '#F0695C' } ]}>ر.س</Text>

              {(med.rx || med.requires_prescription) && (
                <View style={[styles.rxBadge, { marginRight: isRTL ? 12 : 0, marginLeft: isRTL ? 0 : 12 } ]}>
                  <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#F0695C', fontSize: 14, marginRight: 4 }}>warning</Text>
                  <Text style={{ fontFamily: 'Cairo-Bold', color: '#F0695C', fontSize: 11 }}>{isRTL ? 'وصفة طبية' : 'Prescription'}</Text>
                </View>
              )}
            </View>
          </View>

          {/* ─── Tags / Form ─── */}
          <View style={[styles.pillsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
            {med.form && <InfoPill icon="category" pillTitle={isRTL ? "النوع" : "Form"} label={med.form} colors={colors} tint="#7A6BEA" bg={isDark ? '#2D2A4A' : '#EBE8FC'} isRTL={isRTL} />}
            {med.strength && <InfoPill icon="scale" pillTitle={isRTL ? "التركيز" : "Strength"} label={med.strength} colors={colors} tint="#F0A526" bg={isDark ? '#4A3515' : '#FEF6E8'} isRTL={isRTL} />}
            {med.active_ingredient && <InfoPill icon="science" pillTitle={isRTL ? "المادة الفعالة" : "Active Ingredient"} label={med.active_ingredient} colors={colors} tint="#2BB89C" bg={isDark ? '#153A33' : '#E8F8F5'} isRTL={isRTL} />}
          </View>

          {/* ─── Alternatives (Moved Up) ─── */}
          {alternatives && alternatives.length > 0 && (
            <View style={styles.altSection}>
              <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
                <Text style={[styles.sectionTitle, { color: colors.n } ]}>{isRTL ? 'بدائل مقترحة (نفس المادة الفعالة)' : 'Alternatives'}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.altScroll, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
                {alternatives.map((alt: any) => {
                  const altName = isRTL ? (alt.name_ar || alt.name) : (alt.name_en || alt.name);
                  return (
                    <TouchableOpacity key={alt.id} style={[styles.altCard, { backgroundColor: colors.s, borderColor: colors.bd }]} onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: alt.id } })}>
                      <View style={styles.altIconWrap}>
                        <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 24, color: '#23B5CE' }}>{alt.icon || 'medication'}</Text>
                      </View>
                      <Text style={[styles.altName, { color: colors.n }]} numberOfLines={1}>{altName}</Text>
                      <Text style={[styles.altCompany, { color: colors.t3 }]} numberOfLines={1}>{alt.manufacturer || '---'}</Text>
                      <Text style={[styles.altPrice, { color: '#23B5CE' } ]}>{(alt.price || 0).toFixed(2)} ر.س</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ─── Expandable Details ─── */}
          <View style={styles.detailsGroup}>
            <DetailAccordion title={isRTL ? "الوصف والتفاصيل" : "Description"} icon="info" content={description || med.d} colors={colors} isRTL={isRTL} defaultOpen={true} />
            <DetailAccordion title={isRTL ? "الجرعة وطريقة الاستخدام" : "Dosage & Usage"} icon="medication" content={dosage} colors={colors} isRTL={isRTL} />
            <DetailAccordion title={isRTL ? "الأعراض الجانبية" : "Side Effects"} icon="sick" content={sideEffects} colors={colors} isRTL={isRTL} />
            <DetailAccordion title={isRTL ? "تحذيرات وموانع الاستخدام" : "Warnings & Precautions"} icon="warning" content={warnings} colors={colors} isRTL={isRTL} isWarning={true} />
          </View>

        </View>
      </ScrollView>

      {/* ─── Sticky Bottom Bar ─── */}
      <View style={[styles.bottomBar, { backgroundColor: colors.s, borderTopColor: colors.bd, paddingBottom: Math.max(insets.bottom, 12) + 12 } ]}>
        {inCart ? (
          <View style={[styles.qtyControlFull, { backgroundColor: colors.bg, borderColor: colors.bd } ]}>
            <TouchableOpacity onPress={() => updateQty(med.id, 1)} style={[styles.qtyBtnFull, { backgroundColor: colors.s } ]}>
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 28 }}>add</Text>
            </TouchableOpacity>
            <Text style={{ fontFamily: 'Cairo-Black', color: '#23B5CE', fontSize: 22, marginHorizontal: 20 }}>{qty}</Text>
            <TouchableOpacity onPress={() => updateQty(med.id, -1)} style={[styles.qtyBtnFull, { backgroundColor: colors.s } ]}>
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 28 }}>remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={[styles.addCartBtnWrap, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
              style={[styles.addCartBtn, { backgroundColor: '#23B5CE' }]}
              onPress={handleAdd}
              activeOpacity={0.85}
            >
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 22, marginRight: 10 }}>add_shopping_cart</Text>
              <Text style={{ fontFamily: 'Cairo-Black', color: '#fff', fontSize: 16 }}>{isRTL ? 'أضف إلى السلة' : 'Add to Cart'}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* ─── Zoom Modal ─── */}
      <Modal visible={isZoomVisible} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: Math.max(insets.top, 20), right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }} onPress={() => setIsZoomVisible(false)}>
            <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 28 }}>close</Text>
          </TouchableOpacity>
          
          <ScrollView 
            maximumZoomScale={3} 
            minimumZoomScale={1} 
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', width, height: '100%' }} showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
             <Image source={{ uri: images[activeImage] }} style={{ width, height: width, resizeMode: 'contain' }} />
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

function InfoPill({ icon, label, pillTitle, colors, tint, bg, isRTL }: any) {
  const textColor = tint || colors.t2;
  const bgColor = bg || colors.s;
  return (
    <View style={[styles.pill, { backgroundColor: bgColor, borderColor: colors.bd, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' } ]}>
      <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: textColor, fontSize: 22, marginHorizontal: 6 }}>{icon}</Text>
      <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', justifyContent: 'center' }}>
        {pillTitle && <Text style={{ fontFamily: 'Cairo-Bold', color: textColor, fontSize: 10, opacity: 0.8, marginBottom: -2 }}>{pillTitle}</Text>}
        <Text style={{ fontFamily: 'Cairo-Black', color: textColor, fontSize: 13 }}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cartBadge: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#F0695C', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff' },
  
  galleryContainer: { width, height: width, backgroundColor: '#fff', position: 'relative' },
  placeholderHero: { justifyContent: 'center', alignItems: 'center' },
  pagination: { position: 'absolute', bottom: 16, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 8, width: 8, borderRadius: 4 },
  
  content: { paddingHorizontal: 20, paddingTop: 24 },
  titleRow: { width: '100%', alignItems: 'center' },
  medName: { fontFamily: 'Cairo-Black', fontSize: 24, lineHeight: 34 },
  manufacturer: { fontFamily: 'Cairo-Bold', fontSize: 15, marginBottom: 4 },
  priceRow: { alignItems: 'center', marginTop: 12 },
  price: { fontFamily: 'Cairo-Black', fontSize: 32 },
  currency: { fontFamily: 'Cairo-Bold', fontSize: 15, marginHorizontal: 4, marginTop: 10 },
  rxBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEEFED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#F0695C44' },
  pillsRow: { flexWrap: 'wrap', marginBottom: 28 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  
  detailsGroup: { gap: 16, marginBottom: 24 },
  accordion: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  accHeader: { justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  accContent: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, borderTopWidth: 1 },
  
  altSection: { marginBottom: 30, marginTop: 10 },
  sectionHeaderRow: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontFamily: 'Cairo-Black', fontSize: 18 },
  altScroll: { paddingBottom: 8 },
  altCard: { width: 140, padding: 14, borderRadius: 18, borderWidth: 1, marginRight: 12, alignItems: 'center' },
  altIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#DEF5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  altName: { fontFamily: 'Cairo-Bold', fontSize: 14, marginBottom: 4, textAlign: 'center' },
  altCompany: { fontFamily: 'Cairo-Regular', fontSize: 12, marginBottom: 10, textAlign: 'center' },
  altPrice: { fontFamily: 'Cairo-Black', fontSize: 16 },
  
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 14, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 10 },
  addCartBtnWrap: {},
  addCartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 20, shadowColor: '#23B5CE', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  qtyControlFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  qtyBtnFull: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
});
