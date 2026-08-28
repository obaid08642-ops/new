import * as SecureStore from 'expo-secure-store';
import { logger } from '../../../services/Logger';

export class SecureStorageService {
  private log = logger.scope('SecureStorageService');

  /**
   * Securely saves data using the device's native secure storage (Keychain/Keystore)
   * This is explicitly for sensitive credentials (Tokens, PII, Health Data).
   */
  public async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      this.log.debug(`Securely stored item with key: ${key}`);
    } catch (error) {
      this.log.error(`Failed to store item securely [key: ${key}]`, error);
      throw error;
    }
  }

  public async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      this.log.error(`Failed to retrieve item securely [key: ${key}]`, error);
      return null;
    }
  }

  public async deleteItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
      this.log.debug(`Securely deleted item with key: ${key}`);
    } catch (error) {
      this.log.error(`Failed to delete item securely [key: ${key}]`, error);
    }
  }
}
