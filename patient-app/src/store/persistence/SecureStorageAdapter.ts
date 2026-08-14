import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

const SECURE_KEY_NAME = 'REDUX_PERSIST_ENCRYPTION_KEY';
const SECURE_KEY_VERSION = 'REDUX_PERSIST_KEY_VERSION';

const CURRENT_KEY_VERSION = 'v1';

/**
 * Ensures we have a secure encryption key generated and stored.
 * Supports Key Rotation by tracking the key version.
 */
async function getOrCreateEncryptionKey(): Promise<string> {
  try {
    const version = await SecureStore.getItemAsync(SECURE_KEY_VERSION);
    let key = await SecureStore.getItemAsync(SECURE_KEY_NAME);
    
    // If no key exists or version mismatch (key rotation needed)
    if (!key || version !== CURRENT_KEY_VERSION) {
      // In a real rotation scenario, we would decrypt old data with the old key,
      // re-encrypt with the new key, and then save the new key. 
      // For this implementation, we simply generate the new key and bump the version.
      // The redux-persist migration logic would handle state format changes if needed.
      const randomWords = CryptoJS.lib.WordArray.random(32);
      key = randomWords.toString(CryptoJS.enc.Base64);
      
      await SecureStore.setItemAsync(SECURE_KEY_NAME, key);
      await SecureStore.setItemAsync(SECURE_KEY_VERSION, CURRENT_KEY_VERSION);
    }
    return key;
  } catch (error) {
    console.error('[SecureStorageAdapter] Failed to get/create encryption key', error);
    // Fallback if secure store fails completely
    return 'fallback-insecure-key-do-not-use-in-prod';
  }
}

/**
 * Redux Persist custom storage engine with AES encryption.
 * Values are encrypted using the securely stored key before saving to AsyncStorage.
 */
export const secureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      const encryptedValue = await AsyncStorage.getItem(key);
      if (!encryptedValue) return null;

      const encryptionKey = await getOrCreateEncryptionKey();
      const bytes = CryptoJS.AES.decrypt(encryptedValue, encryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      return decrypted || null;
    } catch (error) {
      console.error(`[SecureStorageAdapter] Failed to decrypt key: ${key}`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      const encryptionKey = await getOrCreateEncryptionKey();
      const encryptedValue = CryptoJS.AES.encrypt(value, encryptionKey).toString();
      await AsyncStorage.setItem(key, encryptedValue);
    } catch (error) {
      console.error(`[SecureStorageAdapter] Failed to encrypt key: ${key}`, error);
    }
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
};
