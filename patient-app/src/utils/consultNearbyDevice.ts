import * as Location from 'expo-location';

import { resolveEffectiveAddress } from './selectedAddress';
import type { NearbyDeps } from './consultNearby';

/**
 * The real sources for "Nearest": the foreground location permission is asked only when the patient taps the control,
 * and the city is the one of the address the app already resolves (the picked address, else the default, else the first).
 */
export const deviceNearbyDeps: NearbyDeps = {
  deviceCoords: async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  },
  savedCity: async () => (await resolveEffectiveAddress())?.city,
};
