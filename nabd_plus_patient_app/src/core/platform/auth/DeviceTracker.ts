import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { logger } from '../../../services/Logger';

export interface DeviceInfo {
  deviceId: string;
  osName: string;
  osVersion: string;
  appVersion: string;
}

export class DeviceTracker {
  private log = logger.scope('DeviceTracker');

  /**
   * Retrieves a persistent and unique Device ID.
   * On iOS, this uses the identifierForVendor.
   * On Android, this uses the androidId.
   */
  public async getDeviceId(): Promise<string> {
    try {
      if (Platform.OS === 'android') {
        return Application.getAndroidId() || Crypto.randomUUID();
      } else {
        const iosId = await Application.getIosIdForVendorAsync();
        return iosId || Crypto.randomUUID();
      }
    } catch (error) {
      this.log.error('Failed to get device ID, generating ephemeral UUID', error);
      return Crypto.randomUUID();
    }
  }

  public async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      deviceId: await this.getDeviceId(),
      osName: Platform.OS,
      osVersion: Platform.Version.toString(),
      appVersion: Application.nativeApplicationVersion || 'unknown',
    };
  }
}
