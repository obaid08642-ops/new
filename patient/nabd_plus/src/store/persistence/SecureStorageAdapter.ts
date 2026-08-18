import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

const SECURE_KEY_NAME = 'REDUX_PERSIST_ENCRYPTION_KEY';
const SECURE_KEY_VERSION = 'REDUX_PERSIST_KEY_VERSION';

// Hermes/Expo Go has no WebCrypto CSPRNG, and CryptoJS.AES.encrypt calls
// WordArray.random internally (salt generation) — which is exactly where the
// "Native crypto module could not be used to get secure random number" crash
// came from. Wire CryptoJS to expo-crypto's native RNG (with a non-crashing
// last-resort fallback so persistence never hard-fails a screen).
try {
  const expoCrypto: any = ExpoCrypto as any;
  const g: any = global as any;
  g.crypto = g.crypto || {};
  if (typeof g.crypto.getRandomValues !== 'function' && typeof expoCrypto.getRandomValues === 'function') {
    g.crypto.getRandomValues = (arr: Uint8Array) => expoCrypto.getRandomValues(arr);
  }
  (CryptoJS.lib.WordArray as any).random = (nBytes: number) => {
    try {
      const bytes = new Uint8Array(nBytes);
      if (typeof g.crypto?.getRandomValues === 'function') {
        g.crypto.getRandomValues(bytes);
      } else {
        for (let i = 0; i < nBytes; i++) bytes[i] = Math.floor(Math.random() * 256);
      }
      return CryptoJS.lib.WordArray.create(bytes as any);
    } catch {
      const bytes = Uint8Array.from({ length: nBytes }, () => Math.floor(Math.random() * 256));
      return CryptoJS.lib.WordArray.create(bytes as any);
    }
  };
} catch {
  // never let RNG plumbing break app boot
}

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
      // CryptoJS.lib.WordArray.random relies on a native/web CSPRNG that does
      // not exist in the Hermes runtime — use expo-crypto's native RNG instead.
      const randomBytes = await ExpoCrypto.getRandomBytesAsync(32);
      const randomWords = CryptoJS.lib.WordArray.create(Array.from(randomBytes) as any);
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

      if (!decrypted) {
        // Key rotated / value corrupted (e.g. "Malformed UTF-8 data") — purge it
        // once so redux-persist re-bootstraps clean state instead of failing forever.
        await AsyncStorage.removeItem(key).catch(() => {});
        return null;
      }
      return decrypted;
    } catch (error) {
      console.warn(`[SecureStorageAdapter] Discarding undecryptable value for key: ${key}`);
      await AsyncStorage.removeItem(key).catch(() => {});
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
