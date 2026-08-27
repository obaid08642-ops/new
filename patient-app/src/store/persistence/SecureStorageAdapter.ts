import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

const SECURE_KEY_NAME = 'REDUX_PERSIST_ENCRYPTION_KEY';
const SECURE_KEY_VERSION = 'REDUX_PERSIST_KEY_VERSION';
const CURRENT_KEY_VERSION = 'v1';

type RandomValues = (array: Uint8Array) => Uint8Array;
let secureRandomValues: RandomValues | null = null;

/** Raised instead of substituting a predictable encryption key or RNG. */
export class SecureStorageUnavailableError extends Error {
  constructor(message = 'secure_storage_unavailable') {
    super(message);
    this.name = 'SecureStorageUnavailableError';
  }
}

try {
  const expoCrypto: any = ExpoCrypto as any;
  const g: any = global as any;
  g.crypto = g.crypto || {};
  if (typeof g.crypto.getRandomValues !== 'function' && typeof expoCrypto.getRandomValues === 'function') {
    g.crypto.getRandomValues = (array: Uint8Array) => expoCrypto.getRandomValues(array);
  }
  if (typeof g.crypto.getRandomValues === 'function') {
    secureRandomValues = (array: Uint8Array) => g.crypto.getRandomValues(array);
  }
} catch {
  secureRandomValues = null;
}

function getSecureRandomBytes(length: number): Uint8Array {
  if (!secureRandomValues) {
    throw new SecureStorageUnavailableError('secure_random_source_unavailable');
  }
  const bytes = new Uint8Array(length);
  secureRandomValues(bytes);
  return bytes;
}

// CryptoJS needs a salt for AES encryption. Never fall back to Math.random().
(CryptoJS.lib.WordArray as any).random = (nBytes: number) =>
  CryptoJS.lib.WordArray.create(getSecureRandomBytes(nBytes) as any);

/**
 * Returns a key only if SecureStore and a cryptographically secure RNG work.
 * No predictable fallback is permitted for patient-state persistence.
 */
async function getOrCreateEncryptionKey(): Promise<string> {
  try {
    const version = await SecureStore.getItemAsync(SECURE_KEY_VERSION);
    let key = await SecureStore.getItemAsync(SECURE_KEY_NAME);

    if (!key || version !== CURRENT_KEY_VERSION) {
      const randomWords = CryptoJS.lib.WordArray.create(Array.from(getSecureRandomBytes(32)) as any);
      key = randomWords.toString(CryptoJS.enc.Base64);
      await SecureStore.setItemAsync(SECURE_KEY_NAME, key);
      await SecureStore.setItemAsync(SECURE_KEY_VERSION, CURRENT_KEY_VERSION);
    }
    return key;
  } catch (error) {
    if (error instanceof SecureStorageUnavailableError) throw error;
    throw new SecureStorageUnavailableError('secure_key_store_unavailable');
  }
}

/**
 * Redux Persist custom storage engine. Values are encrypted using a key held in
 * SecureStore. If secure prerequisites are unavailable, reads fail closed and
 * writes reject; nothing is written with a predictable fallback key.
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
        await AsyncStorage.removeItem(key).catch(() => {});
        return null;
      }
      return decrypted;
    } catch (error) {
      console.warn(`[SecureStorageAdapter] Discarding unavailable or undecryptable value for key: ${key}`);
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const encryptionKey = await getOrCreateEncryptionKey();
    const encryptedValue = CryptoJS.AES.encrypt(value, encryptionKey).toString();
    await AsyncStorage.setItem(key, encryptedValue);
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
};
