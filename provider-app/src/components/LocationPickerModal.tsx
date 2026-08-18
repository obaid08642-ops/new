import React, { useState, useEffect, useRef } from 'react';
import { View, Modal, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SP, FS, R } from '../constants';
import { useTheme, useLang } from '../context';
import * as Location from 'expo-location';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (loc: { lat: number; lng: number }) => void;
  initialLocation?: { lat: number; lng: number };
}

const DEFAULT_LOC = { lat: 24.7136, lng: 46.6753 }; // Riyadh

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible, onClose, onSelectLocation, initialLocation
}) => {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  const mapRef = useRef<MapView>(null);
  const [selected, setSelected] = useState(initialLocation || DEFAULT_LOC);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const moveTo = (loc: { lat: number; lng: number }) => {
    setSelected(loc);
    mapRef.current?.animateToRegion({
      latitude: loc.lat,
      longitude: loc.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 400);
  };

  const handleGetCurrentLocation = async () => {
    setLocating(true);
    setLocError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocError(AR ? 'تم رفض إذن الموقع — فعّله من إعدادات الجهاز' : 'Location permission denied — enable it in device settings');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      moveTo({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (e) {
      setLocError(AR ? 'تعذر تحديد موقعك الحالي' : 'Could not determine your current location');
    } finally {
      setLocating(false);
    }
  };

  // Reset state every time the modal opens; try current location only when no
  // previously picked location exists.
  useEffect(() => {
    if (!visible) return;
    setLocError(null);
    const start = initialLocation && initialLocation.lat ? initialLocation : DEFAULT_LOC;
    setSelected(start);
    if (!initialLocation || !initialLocation.lat) {
      handleGetCurrentLocation();
    } else {
      // recentre without animation on open
      setTimeout(() => mapRef.current?.animateToRegion({
        latitude: start.lat, longitude: start.lng, latitudeDelta: 0.01, longitudeDelta: 0.01,
      }, 0), 300);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: '92%', height: '78%', backgroundColor: theme.bg, borderRadius: R.lg, padding: SP.lg }}>
          <Text style={{ fontSize: FS.lg, fontWeight: 'bold', color: theme.text, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>{AR ? 'تحديد الموقع على الخريطة' : 'Select Location on Map'}</Text>

          <View style={{ flex: 1, borderRadius: R.md, overflow: 'hidden', marginBottom: SP.md }}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFillObject}
              initialRegion={{
                latitude: selected.lat,
                longitude: selected.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              onPress={(e) => setSelected({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
            >
              <Marker
                coordinate={{ latitude: selected.lat, longitude: selected.lng }}
                draggable
                onDragEnd={(e) => setSelected({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
              />
            </MapView>
            <TouchableOpacity
              style={{ position: 'absolute', bottom: SP.md, right: SP.md, backgroundColor: theme.bg, paddingVertical: SP.sm, paddingHorizontal: SP.md, borderRadius: R.md, elevation: 3, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              onPress={handleGetCurrentLocation}
              disabled={locating}
            >
              {locating && <ActivityIndicator size="small" color={theme.primary} />}
              <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{AR ? 'موقعي الحالي' : 'My Location'}</Text>
            </TouchableOpacity>
          </View>

          {locError && (
            <Text style={{ color: '#dc2626', fontSize: FS.sm, marginBottom: SP.sm, textAlign: 'center' }}>{locError}</Text>
          )}
          <Text style={{ color: theme.textSub, fontSize: FS.xs, marginBottom: SP.sm, textAlign: 'center' }}>
            {AR ? 'اضغط على الخريطة أو اسحب الدبوس لتحديد الموقع بدقة' : 'Tap the map or drag the pin to fine-tune the location'}
          </Text>

          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity style={{ padding: SP.md, borderRadius: R.md, backgroundColor: theme.border, flex: 1, marginHorizontal: SP.xs }} onPress={onClose}>
              <Text style={{ color: theme.text, textAlign: 'center', fontWeight: 'bold' }}>{AR ? 'إلغاء' : 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: SP.md, borderRadius: R.md, backgroundColor: theme.primary, flex: 1, marginHorizontal: SP.xs }} onPress={() => {
              onSelectLocation(selected);
              onClose();
            }}>
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>{AR ? 'تأكيد الموقع' : 'Confirm Location'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
