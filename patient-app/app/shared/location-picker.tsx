// @ts-nocheck
// app/shared/location-picker.tsx
// مكوّن اختيار الموقع المشترك — يُستخدم في: صيدلية، تمريض، تحاليل، عناوين
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MapView, { Marker, PROVIDER_DEFAULT, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

// ── Types ──────────────────────────────────────────────────────
interface SavedAddress {
  id: string;
  label: string;
  street?: string;
  city?: string;
  lat?: number;
  lng?: number;
  is_default?: boolean;
}

// ── Main Component ─────────────────────────────────────────────
export default function LocationPickerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams<{ returnTo?: string; mode?: string }>();

  const mapRef = useRef<MapView>(null);

  const [mode, setMode] = useState<"saved" | "map" | "new">("saved");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(
    null,
  );

  // Map pin state
  const [region, setRegion] = useState<Region>({
    latitude: 24.7136,
    longitude: 46.6753,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [pin, setPin] = useState({ lat: 24.7136, lng: 46.6753 });
  const [reverseAddress, setReverseAddress] = useState("");

  // New address form
  const [newAddr, setNewAddr] = useState({
    label: "المنزل",
    street: "",
    building: "",
    floor: "",
    notes: "",
  });

  // ── Load saved addresses ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch("/users/me/addresses");
        const list: SavedAddress[] = Array.isArray(data) ? data : [];
        setSavedAddresses(list);
        const def = list.find((a) => a.is_default) || list[0];
        if (def) setSelectedAddress(def);
      } catch {
        setSavedAddresses([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Get current GPS location ─────────────────────────────────
  const goToMyLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("الإذن مرفوض", "يرجى السماح بالوصول للموقع من الإعدادات.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      setPin({ lat: latitude, lng: longitude });
      mapRef.current?.animateToRegion(newRegion, 800);

      // Reverse geocode
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo.length > 0) {
          const g = geo[0];
          const addr = [g.street, g.district, g.city]
            .filter(Boolean)
            .join("، ");
          setReverseAddress(addr || "الموقع الحالي");
          setNewAddr((prev) => ({ ...prev, street: addr || "" }));
        }
      } catch {}

      setMode("map");
    } catch {
      Alert.alert("خطأ", "تعذّر الحصول على موقعك الحالي.");
    } finally {
      setLocating(false);
    }
  }, []);

  // ── On map drag → update pin + reverse geocode ────────────────
  const handleRegionChangeComplete = useCallback(async (r: Region) => {
    setPin({ lat: r.latitude, lng: r.longitude });
    try {
      const geo = await Location.reverseGeocodeAsync({
        latitude: r.latitude,
        longitude: r.longitude,
      });
      if (geo.length > 0) {
        const g = geo[0];
        const addr = [g.street, g.district, g.city].filter(Boolean).join("، ");
        setReverseAddress(addr || "");
        setNewAddr((prev) => ({ ...prev, street: addr || prev.street }));
      }
    } catch {}
  }, []);

  // ── Save new address to backend ───────────────────────────────
  const handleSaveAndConfirm = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        label: newAddr.label || "المنزل",
        street: newAddr.street,
        building: newAddr.building,
        floor: newAddr.floor,
        notes: newAddr.notes,
        lat: pin.lat,
        lng: pin.lng,
        is_default: false,
      };
      const saved = await apiFetch("/users/me/addresses", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      // Go back with address data
      router.back();
    } catch {
      // Optimistic — go back anyway
      router.back();
    } finally {
      setSaving(false);
    }
  }, [newAddr, pin]);

  // ── Confirm a saved address ───────────────────────────────────
  const handleConfirmSaved = useCallback(() => {
    if (!selectedAddress) return;
    router.back();
  }, [selectedAddress]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Floating header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={90}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? "rgba(9,14,26,0.95)"
                  : "rgba(248,250,254,0.97)",
              },
            ]}
          />
        )}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.06)",
              },
            ]}
          >
            <Icon name="back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <AppText variant="h4" color={colors.textPrimary}>
            عنوان التوصيل
          </AppText>
          <View style={{ width: 44 }} />
        </View>

        {/* Mode tabs */}
        <View style={styles.modeTabs}>
          {[
            { key: "saved", label: "عناويني", icon: "home" },
            { key: "map", label: "على الخريطة", icon: "location" },
            { key: "new", label: "عنوان جديد", icon: "add" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setMode(tab.key as any)}
              style={[
                styles.modeTab,
                {
                  backgroundColor:
                    mode === tab.key
                      ? colors.primary
                      : isDark
                        ? colors.surface
                        : "#fff",
                  borderColor:
                    mode === tab.key ? colors.primary : colors.border,
                },
              ]}
            >
              <Icon
                name={tab.icon}
                size={16}
                color={mode === tab.key ? "#fff" : colors.textTertiary}
              />
              <AppText
                variant="bodySM"
                color={mode === tab.key ? "#fff" : colors.textPrimary}
              >
                {tab.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ══ MODE: Saved Addresses ══ */}
      {mode === "saved" && (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 120 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* GPS button */}
          <TouchableOpacity
            style={[
              styles.gpsBtn,
              {
                backgroundColor: colors.primarySurface,
                borderColor: colors.primary,
              },
            ]}
            onPress={goToMyLocation}
            activeOpacity={0.85}
          >
            {locating ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Icon
                  name="map-marker-radius"
                  size={22}
                  color={colors.primary}
                />
                <AppText variant="labelMD" color={colors.primary}>
                  استخدم موقعي الحالي
                </AppText>
              </>
            )}
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginTop: 40 }}
            />
          ) : savedAddresses.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Icon name="location" size={48} color={colors.textTertiary} />
              <AppText
                variant="bodyMD"
                color={colors.textTertiary}
                align="center"
              >
                لا توجد عناوين محفوظة{"\n"}أضف عنواناً جديداً
              </AppText>
              <TouchableOpacity
                style={[styles.addNewBtn, { backgroundColor: colors.primary }]}
                onPress={() => setMode("new")}
              >
                <Icon name="add" size={18} color="#fff" />
                <AppText variant="labelMD" color="#fff">
                  إضافة عنوان
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <AppText
                variant="labelMD"
                color={colors.textTertiary}
                style={{ marginBottom: 10 }}
              >
                العناوين المحفوظة
              </AppText>
              {savedAddresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  onPress={() => setSelectedAddress(addr)}
                  style={[
                    styles.addrCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor:
                        selectedAddress?.id === addr.id
                          ? colors.primary
                          : colors.border,
                      borderWidth: selectedAddress?.id === addr.id ? 2 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.addrIcon,
                      {
                        backgroundColor:
                          selectedAddress?.id === addr.id
                            ? colors.primarySurface
                            : colors.surfaceSecondary,
                      },
                    ]}
                  >
                    <Icon
                      name={addr.label === "العمل" ? "hospital" : "home"}
                      size={20}
                      color={
                        selectedAddress?.id === addr.id
                          ? colors.primary
                          : colors.textTertiary
                      }
                    />
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
                    <View
                      style={{
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <AppText variant="h6">{addr.label}</AppText>
                      {addr.is_default && (
                        <View
                          style={[
                            styles.defaultBadge,
                            { backgroundColor: colors.primarySurface },
                          ]}
                        >
                          <AppText variant="caption" color={colors.primary}>
                            افتراضي
                          </AppText>
                        </View>
                      )}
                    </View>
                    <AppText variant="caption" color={colors.textTertiary}>
                      {addr.street}
                      {addr.city ? `، ${addr.city}` : ""}
                    </AppText>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor:
                          selectedAddress?.id === addr.id
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                  >
                    {selectedAddress?.id === addr.id && (
                      <View
                        style={[
                          styles.radioDot,
                          { backgroundColor: colors.primary },
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {/* Add new button */}
              <TouchableOpacity
                onPress={() => setMode("new")}
                style={[styles.addNewOutline, { borderColor: colors.primary }]}
              >
                <Icon name="add" size={20} color={colors.primary} />
                <AppText variant="labelMD" color={colors.primary}>
                  إضافة عنوان جديد
                </AppText>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* ══ MODE: Map Picker ══ */}
      {mode === "map" && (
        <View style={[styles.mapFull, { paddingTop: insets.top + 118 }]}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_DEFAULT}
            initialRegion={region}
            userInterfaceStyle={isDark ? "dark" : "light"}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
            onRegionChangeComplete={handleRegionChangeComplete}
          >
            <Marker
              coordinate={{ latitude: pin.lat, longitude: pin.lng }}
              draggable
              onDragEnd={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setPin({ lat: latitude, lng: longitude });
              }}
            />
          </MapView>

          {/* Center crosshair hint */}
          <View style={styles.crosshairHint}>
            <Icon name="location" size={40} color={colors.primary} />
          </View>

          {/* Reverse geocoded address label */}
          {reverseAddress ? (
            <View
              style={[
                styles.reverseLabel,
                {
                  backgroundColor: isDark ? colors.surface : "#fff",
                  borderColor: colors.border,
                },
              ]}
            >
              <Icon name="location" size={16} color={colors.primary} />
              <AppText
                variant="bodySM"
                color={colors.textPrimary}
                style={{ flex: 1, textAlign: "right" }}
              >
                {reverseAddress}
              </AppText>
            </View>
          ) : null}

          {/* My location button on map */}
          <TouchableOpacity
            style={[
              styles.mapLocBtn,
              {
                backgroundColor: isDark ? colors.surface : "#fff",
                top: insets.top + 130,
              },
            ]}
            onPress={goToMyLocation}
          >
            {locating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="map-marker-radius" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ══ MODE: New Address Form ══ */}
      {mode === "new" && (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 120 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Mini map for pin */}
          <View style={styles.miniMapWrap}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              provider={PROVIDER_DEFAULT}
              initialRegion={region}
              userInterfaceStyle={isDark ? "dark" : "light"}
              showsUserLocation
              showsMyLocationButton={false}
              showsCompass={false}
              onRegionChangeComplete={handleRegionChangeComplete}
            >
              <Marker
                coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                draggable
                onDragEnd={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setPin({ lat: latitude, lng: longitude });
                }}
              />
            </MapView>
            <TouchableOpacity
              style={[
                styles.mapLocBtn,
                { top: 10, backgroundColor: isDark ? colors.surface : "#fff" },
              ]}
              onPress={goToMyLocation}
            >
              <Icon name="map-marker-radius" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {reverseAddress ? (
            <View
              style={[
                styles.reverseLabel,
                {
                  backgroundColor: colors.primarySurface,
                  borderColor: colors.primary,
                  marginBottom: 4,
                },
              ]}
            >
              <Icon name="location" size={15} color={colors.primary} />
              <AppText
                variant="caption"
                color={colors.primary}
                style={{ flex: 1, textAlign: "right" }}
              >
                {reverseAddress}
              </AppText>
            </View>
          ) : null}

          {/* Form fields */}
          {[
            {
              key: "label",
              placeholder: "اسم العنوان (مثال: المنزل)",
              icon: "edit",
            },
            { key: "street", placeholder: "الشارع والحي", icon: "location" },
            {
              key: "building",
              placeholder: "رقم المبنى / اسمه",
              icon: "hospital",
            },
            {
              key: "floor",
              placeholder: "الطابق (اختياري)",
              icon: "trending_up",
            },
            {
              key: "notes",
              placeholder: "ملاحظات للمندوب (اختياري)",
              icon: "document",
            },
          ].map((field) => (
            <View
              key={field.key}
              style={[
                styles.inputWrap,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Icon name={field.icon} size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textTertiary}
                value={(newAddr as any)[field.key]}
                onChangeText={(v) =>
                  setNewAddr((prev) => ({ ...prev, [field.key]: v }))
                }
                textAlign="right"
              />
            </View>
          ))}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* ══ Bottom CTA ══ */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: isDark ? colors.surface : "#fff",
            borderTopColor: colors.border,
          },
        ]}
      >
        {mode === "saved" && (
          <TouchableOpacity
            onPress={handleConfirmSaved}
            disabled={!selectedAddress}
            style={[
              styles.ctaBtn,
              {
                backgroundColor: selectedAddress
                  ? colors.primary
                  : colors.border,
              },
            ]}
            activeOpacity={0.85}
          >
            <Icon name="check_circle" size={20} color="#fff" />
            <AppText variant="h6" color="#fff">
              تأكيد العنوان
            </AppText>
          </TouchableOpacity>
        )}
        {mode === "map" && (
          <TouchableOpacity
            onPress={() => setMode("new")}
            style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Icon name="check_circle" size={20} color="#fff" />
            <AppText variant="h6" color="#fff">
              تأكيد الموقع
            </AppText>
          </TouchableOpacity>
        )}
        {mode === "new" && (
          <TouchableOpacity
            onPress={handleSaveAndConfirm}
            disabled={saving}
            style={[
              styles.ctaBtn,
              { backgroundColor: saving ? colors.border : colors.primary },
            ]}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="check_circle" size={20} color="#fff" />
                <AppText variant="h6" color="#fff">
                  حفظ وتأكيد
                </AppText>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 30 },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  modeTabs: {
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },

  scroll: { padding: 16, gap: 12 },

  gpsBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },

  emptyWrap: { alignItems: "center", gap: 12, paddingVertical: 40 },
  addNewBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  addNewOutline: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: 8,
  },

  addrCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
  },
  addrIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  defaultBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioDot: { width: 12, height: 12, borderRadius: 6 },

  mapFull: { ...StyleSheet.absoluteFillObject },
  miniMapWrap: {
    height: 200,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
  },
  crosshairHint: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -40,
    zIndex: 5,
    pointerEvents: "none",
  },
  mapLocBtn: {
    position: "absolute",
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  reverseLabel: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 0,
  },

  inputWrap: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: { flex: 1, fontFamily: "Cairo-Medium", fontSize: 14 },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  ctaBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
  },
});
