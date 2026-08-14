// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useApp } from "../../src/context/AppContext";
import { useCart } from "../../src/context/CartContext";
import { darkColors, lightColors } from "../../src/theme/colors";

export default function ScanPrescriptionScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === "ar" || lang === "ur";

  const { setPrescriptionUrl, addItem } = useCart();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const pickImage = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("عذراً", "نحتاج صلاحية الكاميرا لالتقاط صورة الوصفة.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
        });
      } else {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("عذراً", "نحتاج صلاحية المعرض لاختيار صورة الوصفة.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setImageUri(result.assets[0].uri);
        processOCR(result.assets[0].uri, result.assets[0].base64 || "");
      }
    } catch (e) {
      console.log("Error picking image", e);
    }
  };

  const processOCR = async (uri: string, base64Str: string) => {
    setLoading(true);
    setStatusText(
      "جاري تحليل الوصفة الطبية واستخراج الأدوية عن طريق الذكاء الاصطناعي...",
    );

    try {
      // 1. Call AI OCR API
      const { apiFetch } = require("../../src/utils/api");
      const response = await apiFetch("/ai/prescription-ocr", {
        method: "POST",
        body: JSON.stringify({
          image_base64: "data:image/jpeg;base64," + base64Str,
        }),
      });

      setStatusText("تم استخراج الأدوية بنجاح! جاري إضافتها للسلة...");
      setPrescriptionUrl(uri);

      // 2. Add medicines to cart
      if (response && response.medicines && Array.isArray(response.medicines)) {
        for (const m of response.medicines) {
          // We might need to map AI response to cart item structure
          await addItem({
            id: m.id || m.medicine_id || `ocr-${Math.random()}`,
            name: m.name_ar || m.name || m.name_en || "دواء",
            price: m.price || 0,
            rx: true, // Assuming prescription items need rx
            icon: "vaccines",
            iconColor: "#F0695C",
            iconBg: "#FEEFED",
            qty: m.qty || m.quantity || 1,
          });
        }
      }

      setTimeout(() => {
        setLoading(false);
        router.push("/pharmacy/cart");
      }, 1000);
    } catch (e) {
      console.log("OCR Error", e);
      setStatusText("حدث خطأ أثناء تحليل الروشتة. يرجى المحاولة مرة أخرى.");
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg, paddingTop: insets.top + 16 },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.s }]}
        >
          <Text
            style={{
              fontFamily: "MaterialSymbolsRounded",
              color: colors.n,
              fontSize: 28,
            }}
          >
            {isRTL ? "arrow_forward" : "arrow_back"}
          </Text>
        </TouchableOpacity>
        <Text
          style={{ fontFamily: "Cairo-Black", fontSize: 18, color: colors.n }}
        >
          مسح وصفة طبية
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.infoBanner, { backgroundColor: "#DEF5F9" }]}>
          <Text
            style={{
              fontFamily: "MaterialSymbolsRounded",
              color: "#23B5CE",
              fontSize: 32,
              marginBottom: 8,
            }}
          >
            document_scanner
          </Text>
          <Text
            style={{
              fontFamily: "Cairo-Black",
              fontSize: 16,
              color: "#141A2A",
              marginBottom: 4,
              textAlign: "center",
            }}
          >
            الذكاء الاصطناعي بخدمتك
          </Text>
          <Text
            style={{
              fontFamily: "Cairo-Regular",
              fontSize: 13,
              color: "#4C5566",
              textAlign: "center",
              lineHeight: 22,
            }}
          >
            قم بتصوير الروشتة أو رفعها من الاستوديو، وسيقوم النظام باستخراج
            الأدوية وإضافتها للسلة تلقائياً.
          </Text>
        </View>

        {!imageUri ? (
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: colors.s, borderColor: "#23B5CE" },
              ]}
              onPress={() => pickImage(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: "#23B5CE" }]}>
                <Text
                  style={{
                    fontFamily: "MaterialSymbolsRounded",
                    color: "#fff",
                    fontSize: 32,
                  }}
                >
                  photo_camera
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "Cairo-Black",
                  fontSize: 16,
                  color: colors.n,
                }}
              >
                التقاط صورة
              </Text>
              <Text
                style={{
                  fontFamily: "Cairo-Regular",
                  fontSize: 13,
                  color: colors.t2,
                }}
              >
                استخدم الكاميرا لتصوير الروشتة الآن
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: colors.s, borderColor: colors.bd },
              ]}
              onPress={() => pickImage(false)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.t2 }]}>
                <Text
                  style={{
                    fontFamily: "MaterialSymbolsRounded",
                    color: "#fff",
                    fontSize: 32,
                  }}
                >
                  photo_library
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "Cairo-Black",
                  fontSize: 16,
                  color: colors.n,
                }}
              >
                اختر من المعرض
              </Text>
              <Text
                style={{
                  fontFamily: "Cairo-Regular",
                  fontSize: 13,
                  color: colors.t2,
                }}
              >
                رفع صورة محفوظة في هاتفك
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.processingContainer}>
            <View
              style={[styles.imagePreviewWrapper, { borderColor: "#23B5CE" }]}
            >
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />

              {loading && (
                <View
                  style={[
                    styles.overlay,
                    { backgroundColor: "rgba(20,26,42,0.8)" },
                  ]}
                >
                  <ActivityIndicator size="large" color="#23B5CE" />
                  <Text
                    style={{
                      fontFamily: "Cairo-Bold",
                      fontSize: 16,
                      color: "#fff",
                      marginTop: 16,
                      textAlign: "center",
                      lineHeight: 24,
                    }}
                  >
                    {statusText}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  content: { padding: 20, flex: 1 },
  infoBanner: {
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  buttonsContainer: { gap: 16 },
  actionBtn: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  iconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  processingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreviewWrapper: {
    width: "90%",
    aspectRatio: 3 / 4,
    borderRadius: 20,
    borderWidth: 2,
    overflow: "hidden",
    backgroundColor: "#e0e0e0",
  },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});
