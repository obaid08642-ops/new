// @ts-nocheck
// app/map/index.tsx — الخريطة التفاعلية الكاملة — مربوطة بالـ Backend
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  Platform,
  Keyboard,
  Linking,
  FlatList
} from 'react-native';
import { LocalizedTextInput as TextInput } from '@/components/LocalizedTextInput';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

// ─────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────
const PROVIDER_TYPES = [
  { id: 'all',      label: 'الكل',       icon: 'hospital-building', color: '#23B5CE' },
  { id: 'doctor',   label: 'أطباء',      icon: 'doctor',            color: '#23B5CE' },
  { id: 'hospital', label: 'مستشفيات',   icon: 'hospital-building', color: '#F0695C' },
  { id: 'pharmacy', label: 'صيدليات',    icon: 'pill',              color: '#5BA84F' },
  { id: 'lab',      label: 'مختبرات',    icon: 'flask',             color: '#7A6BEA' },
  { id: 'nursing',  label: 'تمريض',      icon: 'account-nurse',     color: '#00C9A7' },
];

// Providers will be fetched from API

// ─────────────────────────────────────────────────────────────
// 3D HOLOGRAM MARKER (خمس أشكال مختلفة - واحدة لكل نوع)
// ─────────────────────────────────────────────────────────────
const HologramMarker3D = ({
  provider,
  isSelected,
}: {
  provider: any;
  isSelected: boolean;
}) => {
  const scale = isSelected ? 1.35 : 1;
  const lift  = isSelected ? -28 : -16;

  // كل نوع له شكل مختلف للقاعدة
  const baseShapes: Record<string, object> = {
    hospital: { borderRadius: 6,  width: 38, height: 38 },   // مربع
    doctor:   { borderRadius: 19, width: 38, height: 38 },   // دائرة
    pharmacy: { borderRadius: 3,  width: 42, height: 30 },   // مستطيل
    lab:      { borderRadius: 8,  width: 32, height: 38, transform: [{ rotate: '45deg' }] }, // معين
    nursing:  { borderRadius: 12, width: 38, height: 38 },   // مدوّر
  };

  const baseShape = baseShapes[provider.type] || baseShapes.hospital;

  return (
    <View style={styles.holoWrap}>
      {/* — light beam from base up — */}
      <View
        style={[
          styles.beam,
          {
            width: isSelected ? 22 : 14,
            height: isSelected ? 40 : 28,
            bottom: 18,
            transform: [{ scaleX: scale }],
          },
        ]}/>

      {/* — isometric base platform — */}
      <View
        style={[
          styles.holoBase,
          baseShape as any,
          {
            backgroundColor: provider.color + '35',
            borderColor: provider.color + (isSelected ? 'FF' : '80'),
            transform: [
              ...(((baseShape as any).transform) || []),
              { rotateX: '55deg' } as any,
              { scale },
            ],
          },
        ]}/>

      {/* — floating icon bubble — */}
      <View
        style={[
          styles.holoIcon,
          {
            backgroundColor: isSelected ? provider.color : provider.color + 'D0',
            shadowColor: provider.color,
            shadowOpacity: isSelected ? 1 : 0.6,
            shadowRadius: isSelected ? 18 : 10,
            elevation: isSelected ? 18 : 8,
            transform: [
              { translateY: lift },
              { scale },
            ],
          },
        ]}>
        <Icon name={provider.icon} size={isSelected ? 22 : 18} color="#fff" />
      </View>

      {/* — open / closed dot — */}
      <View
        style={[
          styles.availDot,
          {
            backgroundColor: provider.isOpen ? '#22C55E' : '#EF4444',
            bottom: isSelected ? 22 : 18,
            transform: [{ translateY: lift }, { scale }],
          },
        ]}/>

      {/* — name label when selected — */}
      {isSelected && (
        <View
          style={[
            styles.markerLabel,
            { backgroundColor: provider.color, bottom: lift * -1 + 12 },]} >
          <AppText variant="bodySM" color="#fff" style={{ fontSize: 9, fontWeight: '700' }}>
            {provider.name}
          </AppText>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const mapRef = useRef<MapView>(null);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  const [providers, setProviders] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [userInsurance, setUserInsurance] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  // ── Fetch providers from backend using user coordinates
  const fetchProviders = useCallback(async (lat?: number, lng?: number) => {
    try {
      const query = new URLSearchParams();
      if (selectedType !== 'all') query.set('type', selectedType);
      if (lat) query.set('lat', lat.toString());
      if (lng) query.set('lng', lng.toString());
      query.set('radius', '15'); // 15km radius
      const res = await apiFetch(`/providers/map?${query.toString()}`);
      // Backend returns array of providers with lat/lng fields
      const data = Array.isArray(res) ? res : (res?.data ?? res?.results ?? []);
      if (data.length > 0) {
        // Normalize backend fields to our UI fields
        const normalized = data.map((p: any) => ({
          id: String(p.id || p._id),
          name: p.name || p.name_ar || p.full_name || p.clinic_name || 'مزود خدمة',
          type: p.type || p.provider_type || 'doctor',
          rating: p.rating || p.avg_rating || 4.5,
          reviews: p.reviews_count || p.total_reviews || 0,
          distance: p.distance_km || p.distance || 1.0,
          eta: p.eta_minutes || Math.round((p.distance_km || 1) * 4),
          isOpen: p.is_available ?? p.is_open ?? true,
          price: p.consultation_fee || p.price || 0,
          lat: p.lat || p.latitude || p.location?.lat || 24.7136,
          lng: p.lng || p.longitude || p.location?.lng || 46.6753,
          specialties: p.specialties || p.services || [],
          insurance: p.accepted_insurance || p.insurance_providers || [],
          icon: p.type === 'pharmacy' ? 'pill' : p.type === 'lab' ? 'flask' : p.type === 'nursing' ? 'account-nurse' : p.type === 'hospital' ? 'hospital-building' : 'doctor',
          color: p.type === 'pharmacy' ? '#5BA84F' : p.type === 'lab' ? '#7A6BEA' : p.type === 'nursing' ? '#00C9A7' : p.type === 'hospital' ? '#F0695C' : '#23B5CE',
          available: p.is_available ?? true,
          image: p.profile_image || p.image || p.avatar || `https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&q=80`,
        }));
        setProviders(normalized);
      }
      // else keep FALLBACK_PROVIDERS
    } catch { /* keep fallback */ }
  }, [selectedType]);

  // ── Fetch providers + insurance on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      // Fetch insurance
      try {
        const ins = await apiFetch('/user/insurance');
        if (alive) setUserInsurance(ins?.data?.provider ?? ins?.provider ?? null);
      } catch (_) {}
      // Providers fetched after getting location
    })();
    return () => { alive = false; };
  }, []);

  // ── Get user location on mount + fetch nearby providers
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          // Still fetch providers with default coords
          await fetchProviders();
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coord = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setUserLoc(coord);
        mapRef.current?.animateToRegion(
          { latitude: coord.lat, longitude: coord.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 },
          800,
        );
        // Fetch providers near user
        await fetchProviders(coord.lat, coord.lng);
      } catch {
        await fetchProviders();
      }
    })();
  }, []);

  // ── Filter for map markers
  const filteredProviders = useMemo(() =>
    providers.filter(p => {
      const matchType   = selectedType === 'all' || p.type === selectedType;
      const matchSearch = !searchQuery ||
        p.name.includes(searchQuery) ||
        p.specialties.some(s => s.includes(searchQuery));
      return matchType && matchSearch;
    }),
  [providers, selectedType, searchQuery]);

  // ── Search: live results + auto-center
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (text.length < 1) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const results = providers.filter(
      p =>
        p.name.includes(text) ||
        p.specialties.some(s => s.includes(text)) ||
        p.type.includes(text),
    );
    setSearchResults(results);
    setShowResults(true);
    // Auto-center to first result
    if (results.length > 0) {
      mapRef.current?.animateToRegion(
        { latitude: results[0].lat, longitude: results[0].lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        900,
      );
    }
  }, [providers]);

  // ── Pick a search result
  const selectSearchResult = useCallback((p: any) => {
    Keyboard.dismiss();
    setSearchQuery(p.name);
    setShowResults(false);
    mapRef.current?.animateToRegion(
      { latitude: p.lat, longitude: p.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 },
      800,
    );
    // Small delay so map animates first, then open sheet
    setTimeout(() => openSheet(p), 600);
  }, []);

  // ── Go to my location
  const goToMyLocation = useCallback(async () => {
    if (userLoc) {
      mapRef.current?.animateToRegion(
        { latitude: userLoc.lat, longitude: userLoc.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 },
        800,
      );
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const coord = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserLoc(coord);
      mapRef.current?.animateToRegion(
        { latitude: coord.lat, longitude: coord.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 },
        800,
      );
    } catch (_) {}
  }, [userLoc]);

  // ── Open / close sheet
  const openSheet = useCallback((provider: any) => {
    Keyboard.dismiss();
    setShowResults(false);
    setSelectedProvider(provider);
    setShowSheet(true);
    Animated.spring(sheetAnim, { toValue: 1, tension: 65, friction: 10, useNativeDriver: true }).start();
  }, [sheetAnim]);

  const closeSheet = useCallback(() => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      setShowSheet(false);
      setSelectedProvider(null);
    });
  }, [sheetAnim]);

  // ── Directions
  const handleDirections = useCallback(() => {
    if (!selectedProvider) return;
    const { lat, lng, name } = selectedProvider;
    const url = Platform.select({
      ios: `maps:0,0?q=${name}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${name})`,
    });
    if (url) Linking.openURL(url);
  }, [selectedProvider]);

  const sheetTranslateY = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [460, 0] });

  // ─────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* ══ MAP ══════════════════════════════════════════════ */}
      <View style={StyleSheet.absoluteFill}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          initialRegion={{ latitude: 24.7136, longitude: 46.6753, latitudeDelta: 0.05, longitudeDelta: 0.05 }} userInterfaceStyle={isDark ? 'dark' : 'light'}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          moveOnMarkerPress={false}
          onPress={() => {
            Keyboard.dismiss();
            setShowResults(false);
            if (showSheet) closeSheet();
          }}
        >
          {filteredProviders.map(prov => (
            <Marker
              key={prov.id}
              coordinate={{ latitude: prov.lat, longitude: prov.lng }} tracksViewChanges={false}
              onPress={e => {
                e.stopPropagation();
                openSheet(prov);
              }}
            >
              <HologramMarker3D provider={prov} isSelected={selectedProvider?.id === prov.id} />
            </Marker>
          ))}
        </MapView>

        {/* My Location button */}
        <TouchableOpacity
          style={[styles.locBtn, {
            top: insets.top + 148,
            backgroundColor: isDark ? colors.surface : '#fff',
            shadowColor: '#000',
          }]}
          onPress={goToMyLocation}
          activeOpacity={0.85}
        >
          <Icon name="map-marker-radius" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ══ FLOATING HEADER ═════════════════════════════════ */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        {Platform.OS === 'ios' ? (
          <BlurView intensity={85} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, {
            backgroundColor: isDark ? 'rgba(9,14,26,0.94)' : 'rgba(248,250,254,0.96)',
          }]} />
        )}

        {/* Back + Search row */}
        <View style={styles.headerRow} pointerEvents="auto">
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' } ]}>
            <Icon name="back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={[styles.searchWrap, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border } ]}>
            <Icon name="search" size={18} color={colors.textTertiary} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="ابحث عن دكتور، صيدلية، مستشفى..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={handleSearchChange}
              textAlign="right"
              returnKeyType="search"
              onSubmitEditing={() => { Keyboard.dismiss(); setShowResults(false); }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}>
                <Icon name="close" size={17} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <View
            style={[styles.searchDropdown, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}
            pointerEvents="auto"
          >
            {searchResults.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.searchResultItem,
                  idx < searchResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]} onPress={() => selectSearchResult(item)}
              >
                <View style={[styles.searchResultIcon, { backgroundColor: item.color + '20' } ]}>
                  <Icon name={item.icon} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <AppText variant="labelSM" color={colors.textPrimary}>{item.name}</AppText>
                  <AppText variant="caption" color={colors.textTertiary}>
                    {PROVIDER_TYPES.find(t => t.id === item.type)?.label} • {item.distance} كم
                  </AppText>
                </View>
                <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          keyboardShouldPersistTaps="handled"
          pointerEvents="auto"
        >
          {PROVIDER_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              onPress={() => { setSelectedType(type.id); Keyboard.dismiss(); setShowResults(false); }} style={[
                styles.filterChip,
                {
                  backgroundColor: selectedType === type.id ? type.color : isDark ? colors.surface : '#fff',
                  borderColor: selectedType === type.id ? type.color : colors.border,
                },]} >
              <Icon name={type.icon} size={16} color={selectedType === type.id ? '#fff' : type.color} />
              <AppText variant="bodySM" color={selectedType === type.id ? '#fff' : colors.textPrimary}>
                {type.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ══ BOTTOM QUICK CARDS ══════════════════════════════ */}
      {!showSheet && filteredProviders.length > 0 && (
        <View style={[styles.quickBar, { paddingBottom: insets.bottom + 6 }]} pointerEvents="box-none">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} keyboardShouldPersistTaps="handled"
            pointerEvents="auto"
          >
            {filteredProviders.slice(0, 5).map(prov => (
              <TouchableOpacity
                key={prov.id}
                onPress={() => openSheet(prov)}
                activeOpacity={0.85}
                style={[
                  styles.quickCard,
                  { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border },]} >
                <View style={[styles.quickTop, { backgroundColor: prov.color + '18' } ]}>
                  <Icon name={prov.icon} size={20} color={prov.color} />
                  <View style={[styles.openBadge, { backgroundColor: prov.isOpen ? '#DCFCE7' : '#FEE2E2' } ]}>
                    <AppText variant="caption" color={prov.isOpen ? '#15803D' : '#B91C1C'}>
                      {prov.isOpen ? 'مفتوح' : 'مغلق'}
                    </AppText>
                  </View>
                </View>
                <AppText variant="labelSM" numberOfLines={1} style={{ textAlign: 'right' }}>
                  {prov.name}
                </AppText>
                <View style={styles.quickMeta}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Icon name="star" size={13} color="#F59E0B" />
                    <AppText variant="caption">{prov.rating}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Icon name="location" size={13} color={colors.primary} />
                    <AppText variant="caption">{prov.distance} كم</AppText>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ══ PROVIDER DETAIL SHEET ═══════════════════════════ */}
      {showSheet && selectedProvider && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <TouchableOpacity style={styles.overlay} onPress={closeSheet} activeOpacity={1} />
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: insets.bottom + 8,
                transform: [{ translateY: sheetTranslateY }],
                backgroundColor: isDark ? colors.surface : '#fff',
              },
            ]}>
            {/* handle */}
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            {/* Provider header */}
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border } ]}>
              <View style={styles.avatarWrap}>
                <Animated.Image source={{ uri: selectedProvider.image }} style={styles.avatar} />
                <View style={[styles.typeBadge, { backgroundColor: selectedProvider.color } ]}>
                  <Icon name={selectedProvider.icon} size={11} color="#fff" />
                </View>
              </View>
              <View style={styles.provTitles}>
                <AppText variant="h5" color={colors.textPrimary}>{selectedProvider.name}</AppText>
                <AppText variant="bodySM" color={colors.textTertiary}>
                  {PROVIDER_TYPES.find(t => t.id === selectedProvider.type)?.label}
                  {' • '}
                  {selectedProvider.specialties.join('، ')}
                </AppText>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                { icon: 'location',    val: `${selectedProvider.distance} كم`, lbl: 'المسافة',  color: colors.primary },
                { icon: 'clock',       val: `${selectedProvider.eta} د`,       lbl: 'الوصول',   color: colors.secondary },
                { icon: 'star',        val: `${selectedProvider.rating}`,      lbl: `(${selectedProvider.reviews})`, color: '#F59E0B' },
                ...(selectedProvider.price > 0
                  ? [{ icon: 'wallet', val: `${selectedProvider.price} ر.س`,   lbl: 'السعر',    color: '#10B981' }]
                  : []),
              ].map((s, i, arr) => (
                <React.Fragment key={s.lbl}>
                  <View style={styles.stat}>
                    <Icon name={s.icon} size={22} color={s.color} />
                    <AppText variant="h6" color={colors.textPrimary}>{s.val}</AppText>
                    <AppText variant="caption" color={colors.textTertiary}>{s.lbl}</AppText>
                  </View>
                  {i < arr.length - 1 && <View style={[styles.statDiv, { backgroundColor: colors.border }]} />}
                </React.Fragment>
              ))}
            </View>

            {/* Insurance banner */}
            {userInsurance && selectedProvider.insurance.includes(userInsurance) ? (
              <View style={[styles.insBanner, { backgroundColor: isDark ? 'rgba(35,181,206,0.15)' : '#E0F7FA' } ]}>
                <Icon name="shield-check" size={20} color="#23B5CE" />
                <AppText variant="bodyMD" color="#23B5CE" style={{ fontWeight: '700', marginLeft: 8 }}>
                  تأمينك ({userInsurance}) مقبول هنا 
                </AppText>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => { closeSheet(); router.push('/health/edit-profile'); }} style={[styles.insBanner, { backgroundColor: isDark ? 'rgba(240,105,92,0.15)' : '#FEEFED' } ]}>
                <Icon name="error_outline" size={20} color="#F0695C" />
                <AppText variant="bodyMD" color="#F0695C" style={{ fontWeight: '700', marginLeft: 8 }}>
                  لإعداد تأمينك الطبي — اضغط هنا
                </AppText>
              </TouchableOpacity>
            )}

            {/* Action buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.dirBtn, { borderColor: colors.border }]}
                onPress={handleDirections}
                activeOpacity={0.8}
              >
                <Icon name="navigate" size={20} color={colors.primary} />
                <AppText variant="bodyMD" color={colors.primary} style={{ fontWeight: '700' }}>الاتجاهات</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bookBtn, { overflow: 'hidden' }]}
                onPress={() => {
                  closeSheet();
                  if (selectedProvider.type === 'doctor')
                    router.push({ pathname: '/consultations/doctor-profile', params: { doctorId: selectedProvider.id } });
                  else if (selectedProvider.type === 'pharmacy')
                    router.push('/(tabs)/pharmacy');
                  else if (selectedProvider.type === 'lab')
                    router.push('/diagnostics/booking-confirm');
                  else if (selectedProvider.type === 'hospital')
                    router.push('/(tabs)/consultations');
                  else if (selectedProvider.type === 'nursing')
                    router.push('/(tabs)/nursing');
                }}
                activeOpacity={0.85}
              >
                <View
                  style={styles.bookGrad}
                >
                  <AppText variant="h6" color="#fff">
                    {selectedProvider.type === 'pharmacy' ? 'تسوق المنتجات'
                     : selectedProvider.type === 'lab'      ? 'احجز فحص'
                     : selectedProvider.type === 'nursing'  ? 'اطلب تمريض'
                     : 'احجز موعد'}
                  </AppText>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // 3D Marker
  holoWrap: { alignItems: 'center', justifyContent: 'flex-end', width: 80, height: 90 },
  beam:     { position: 'absolute', borderTopLeftRadius: 14, borderTopRightRadius: 14, alignSelf: 'center' },
  holoBase: {
    position: 'absolute', bottom: 8, borderWidth: 1.5,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 2, height: 2 },
  },
  holoIcon: {
    position: 'absolute', width: 38, height: 38, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
  },
  availDot: {
    position: 'absolute', right: 22, width: 11, height: 11,
    borderRadius: 6, borderWidth: 2, borderColor: '#fff',
  },
  markerLabel: {
    position: 'absolute', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    minWidth: 64, alignItems: 'center',
  },

  // Location button
  locBtn: {
    position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5,
  },

  // Header
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  searchWrap: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo-Medium', height: '100%', paddingVertical: 0 },

  // Search dropdown
  searchDropdown: {
    marginHorizontal: 16, borderRadius: 14, borderWidth: 1, marginBottom: 8,
    maxHeight: 220, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 8,
  },
  searchResultItem: {
    flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12,
  },
  searchResultIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  // Filter chips
  filterRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, paddingTop: 2 },
  filterChip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7,
  },

  // Quick cards
  quickBar: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15, paddingTop: 12 },
  quickCard: {
    width: 175, borderRadius: 16, borderWidth: 1, padding: 12, gap: 7,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  quickTop: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    padding: 8, borderRadius: 10,
  },
  openBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  quickMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // Sheet
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
    borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15,
  },
  handleWrap: { alignItems: 'center', marginBottom: 18 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  sheetHeader: { flexDirection: 'row-reverse', alignItems: 'center', paddingBottom: 18, borderBottomWidth: 1, gap: 14 },
  avatarWrap: { width: 60, height: 60, borderRadius: 30, position: 'relative' },
  avatar: { width: '100%', height: '100%', borderRadius: 30, backgroundColor: '#E2E8F0' },
  typeBadge: {
    position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff',
  },
  provTitles: { flex: 1, alignItems: 'flex-end', gap: 4 },
  statsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18 },
  stat: { flex: 1, alignItems: 'center', gap: 5 },
  statDiv: { width: 1, height: 28 },
  insBanner: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11, borderRadius: 14, marginBottom: 18,
  },
  actions: { flexDirection: 'row-reverse', gap: 12, marginTop: 4 },
  dirBtn: {
    flex: 1, borderWidth: 1, borderRadius: 16, flexDirection: 'row-reverse',
    justifyContent: 'center', alignItems: 'center', paddingVertical: 13, gap: 7,
  },
  bookBtn: { flex: 2, borderRadius: 16 },
  bookGrad: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 16 },
});
