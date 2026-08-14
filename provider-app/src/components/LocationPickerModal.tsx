import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, Text, StyleSheet } from 'react-native';
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

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible, onClose, onSelectLocation, initialLocation
}) => {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  const [selected, setSelected] = useState(initialLocation || { lat: 24.7136, lng: 46.6753 });

  const handleGetCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setSelected({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (e) {
      // Location permission denied or unavailable — silently skip
    }
  };

  useEffect(() => {
    if (visible && !initialLocation) {
      handleGetCurrentLocation();
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: '90%', height: '70%', backgroundColor: theme.bg, borderRadius: R.lg, padding: SP.lg }}>
          <Text style={{ fontSize: FS.lg, fontWeight: 'bold', color: theme.text, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>{AR ? 'تحديد الموقع على الخريطة' : 'Select Location on Map'}</Text>
          
          <View style={{ flex: 1, borderRadius: R.md, overflow: 'hidden', marginBottom: SP.md }}>
            <MapView
              style={StyleSheet.absoluteFillObject}
              region={{
                latitude: selected.lat,
                longitude: selected.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              onPress={(e) => setSelected({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
            >
              <Marker coordinate={{ latitude: selected.lat, longitude: selected.lng }} />
            </MapView>
            <TouchableOpacity style={{ position: 'absolute', bottom: SP.md, right: SP.md, backgroundColor: theme.bg, padding: SP.sm, borderRadius: R.md, elevation: 3 }} onPress={handleGetCurrentLocation}>
              <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{AR ? 'موقعي الحالي' : 'My Location'}</Text>
            </TouchableOpacity>
          </View>

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


