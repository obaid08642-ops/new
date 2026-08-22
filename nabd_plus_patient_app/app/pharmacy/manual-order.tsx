// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { useCart } from '../../src/context/CartContext';
import { darkColors, lightColors } from '../../src/theme/colors';
import * as ImagePicker from 'expo-image-picker';
import { LocalizedText } from '../../src/components/LocalizedText';

export default function ManualOrderScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';

  const { addItem } = useCart();

  const [medName, setMedName] = useState('');
  const [medDesc, setMedDesc] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleAddToCart = () => {
    // Add custom item to cart
    addItem({
      id: `manual_${Date.now()}`,
      name: medName,
      price: 0, // Price will be updated by pharmacy later
      rx: false,
      icon: 'inventory_2',
      iconColor: '#23B5CE',
      iconBg: '#DEF5F9',
      qty: 1
    });
    router.push('/pharmacy/cart');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + 16 } ]}>
        
        {/* Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.s } ]}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 28 }}>
              {isRTL ? 'arrow_forward' : 'arrow_back'}
            </LocalizedText>
          </TouchableOpacity>
          <LocalizedText style={{ fontFamily: 'Cairo-Black', fontSize: 18, color: colors.n }}>طلب دواء غير متوفر</LocalizedText>
          <View style={{ width: 44 }}/>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          
          <View style={[styles.infoBanner, { backgroundColor: '#DEF5F9' } ]}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 32, marginBottom: 8 }}>inventory_2</LocalizedText>
            <LocalizedText style={{ fontFamily: 'Cairo-Black', fontSize: 16, color: '#141A2A', marginBottom: 4, textAlign: 'center' }}>هنوفره لك بأسرع وقت</LocalizedText>
            <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: '#4C5566', textAlign: 'center', lineHeight: 22 }}>
              اكتب اسم الدواء أو ارفع صورته، وسيقوم الصيدلي بالبحث عنه وإضافته لطلبك لتسعيره.
            </LocalizedText>
          </View>

          {/* Form */}
          <LocalizedText style={[styles.label, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>اسم الدواء <LocalizedText style={{ color: '#F0695C' }}>*</LocalizedText></LocalizedText>
          <TextInput
            style={[styles.input, { backgroundColor: colors.s, borderColor: colors.bd, color: colors.n, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder="مثال: كونجستال أقراص"
            placeholderTextColor={colors.t3}
            value={medName}
            onChangeText={setMedName}
          />

          <LocalizedText style={[styles.label, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>ملاحظات أو تركيز الدواء (اختياري)</LocalizedText>
          <TextInput
            style={[styles.input, { backgroundColor: colors.s, borderColor: colors.bd, color: colors.n, textAlign: isRTL ? 'right' : 'left', height: 100, paddingTop: 16 }]}
            placeholder="أضف أي تفاصيل أخرى تساعد الصيدلي..."
            placeholderTextColor={colors.t3}
            value={medDesc}
            onChangeText={setMedDesc}
            multiline
          />

          {/* Photo Upload */}
          <LocalizedText style={[styles.label, { color: colors.n, textAlign: isRTL ? 'right' : 'left', marginTop: 8 } ]}>صورة الدواء أو الروشتة (اختياري)</LocalizedText>
          {photo ? (
            <View style={[styles.photoWrap, { borderColor: colors.bd } ]}>
              <Image source={{ uri: photo }} style={styles.photo} />
              <TouchableOpacity style={[styles.removeBtn, { backgroundColor: '#F0695C' }]} onPress={() => setPhoto(null)}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 20 }}>close</LocalizedText>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.uploadBox, { backgroundColor: colors.s, borderColor: '#23B5CE' }]} onPress={pickImage}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 32, marginBottom: 8 }}>add_a_photo</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: '#23B5CE' }}>اضغط لرفع صورة الدواء</LocalizedText>
            </TouchableOpacity>
          )}

        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.bd, paddingBottom: insets.bottom + 20 } ]}>
          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: medName.length > 2 ? '#23B5CE' : colors.bd }]} 
            onPress={handleAddToCart}
            disabled={medName.length <= 2}
          >
            <LocalizedText style={{ fontFamily: 'Cairo-Black', fontSize: 16, color: medName.length > 2 ? '#fff' : colors.t3 }}>أضف للسلة</LocalizedText>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  infoBanner: { padding: 24, borderRadius: 24, alignItems: 'center', marginBottom: 24 },
  label: { fontFamily: 'Cairo-Bold', fontSize: 14, marginBottom: 8, marginTop: 16 },
  input: { fontFamily: 'Cairo-Regular', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, fontSize: 14, marginBottom: 8 },
  uploadBox: { height: 120, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  photoWrap: { height: 160, borderRadius: 16, marginTop: 4, borderWidth: 1, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  submitBtn: { padding: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#23B5CE', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }
});
