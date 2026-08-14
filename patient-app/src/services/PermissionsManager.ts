/**
 * Permissions Manager — Centralized permission handling for all app features.
 * Single access point; never call expo-location/camera/etc. directly in screens.
 */
import {
  Linking,
  Platform
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as MediaLibrary from 'expo-media-library';
import { Camera } from 'expo-camera';
import * as LocalAuthentication from 'expo-local-authentication';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'restricted';

export type PermissionKey =
  | 'camera'
  | 'microphone'
  | 'gallery'
  | 'location'
  | 'locationBackground'
  | 'notifications'
  | 'biometric'
  | 'contacts'
  | 'mediaLibrary';

// ─────────────────────────────────────────────────────────────────────────────
// Permissions Manager
// ─────────────────────────────────────────────────────────────────────────────
class PermissionsManager {
  private cache = new Map<PermissionKey, PermissionStatus>();

  /** Request a permission — shows native dialog if needed */
  async request(key: PermissionKey): Promise<PermissionStatus> {
    try {
      switch (key) {
        case 'camera': {
          const { status } = await Camera.requestCameraPermissionsAsync();
          return this.cache.set('camera', status as PermissionStatus), status as PermissionStatus;
        }
        case 'microphone': {
          const { status } = await Camera.requestMicrophonePermissionsAsync();
          return this.cache.set('microphone', status as PermissionStatus), status as PermissionStatus;
        }
        case 'gallery': {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          return this.cache.set('gallery', status as PermissionStatus), status as PermissionStatus;
        }
        case 'location': {
          const { status } = await Location.requestForegroundPermissionsAsync();
          return this.cache.set('location', status as PermissionStatus), status as PermissionStatus;
        }
        case 'locationBackground': {
          const { status } = await Location.requestBackgroundPermissionsAsync();
          return this.cache.set('locationBackground', status as PermissionStatus), status as PermissionStatus;
        }
        case 'notifications': {
          const { status } = await Notifications.requestPermissionsAsync();
          return this.cache.set('notifications', status as PermissionStatus), status as PermissionStatus;
        }
        case 'mediaLibrary': {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          return this.cache.set('mediaLibrary', status as PermissionStatus), status as PermissionStatus;
        }
        case 'biometric': {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'تحقق من هويتك',
            cancelLabel: 'إلغاء',
          });
          const status = result.success ? 'granted' : 'denied';
          return this.cache.set('biometric', status), status;
        }
        default:
          return 'undetermined';
      }
    } catch {
      return 'denied';
    }
  }

  /** Check status without requesting */
  async check(key: PermissionKey): Promise<PermissionStatus> {
    try {
      switch (key) {
        case 'camera': {
          const { status } = await Camera.getCameraPermissionsAsync();
          return status as PermissionStatus;
        }
        case 'microphone': {
          const { status } = await Camera.getMicrophonePermissionsAsync();
          return status as PermissionStatus;
        }
        case 'gallery': {
          const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
          return status as PermissionStatus;
        }
        case 'location': {
          const { status } = await Location.getForegroundPermissionsAsync();
          return status as PermissionStatus;
        }
        case 'notifications': {
          const { status } = await Notifications.getPermissionsAsync();
          return status as PermissionStatus;
        }
        case 'biometric': {
          const available = await LocalAuthentication.hasHardwareAsync();
          return available ? 'granted' : 'denied';
        }
        default:
          return this.cache.get(key) ?? 'undetermined';
      }
    } catch {
      return 'denied';
    }
  }

  /** Request and show settings dialog if denied */
  async requestWithFallback(
    key: PermissionKey,
    reason?: string,
  ): Promise<PermissionStatus> {
    const status = await this.request(key);
    if (status === 'denied') {
      const title = PERMISSION_TITLES[key];
      Alert.alert(
        `تفعيل ${title}`,
        reason ?? `يحتاج التطبيق إلى إذن ${title} للمتابعة.`,
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'فتح الإعدادات', onPress: () => Linking.openSettings() },
        ],
      );
    }
    return status;
  }

  isGranted(key: PermissionKey): boolean {
    return this.cache.get(key) === 'granted';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission labels
// ─────────────────────────────────────────────────────────────────────────────
const PERMISSION_TITLES: Record<PermissionKey, string> = {
  camera:             'الكاميرا',
  microphone:         'الميكروفون',
  gallery:            'الصور',
  location:           'الموقع',
  locationBackground: 'الموقع في الخلفية',
  notifications:      'الإشعارات',
  biometric:          'البيومترية',
  contacts:           'جهات الاتصال',
  mediaLibrary:       'مكتبة الوسائط',
};

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────
export const permissions = new PermissionsManager();
