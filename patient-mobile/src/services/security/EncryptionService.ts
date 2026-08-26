import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

const MASTER_KEY_ALIAS = 'nabdah_plus_master_key';

export class EncryptionService {
  private static instance: EncryptionService;
  private masterKey: string | null = null;

  private constructor() {}

  public static async getInstance(): Promise<EncryptionService> {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
      await EncryptionService.instance.initialize();
    }
    return EncryptionService.instance;
  }

  private async initialize() {
    let key = await SecureStore.getItemAsync(MASTER_KEY_ALIAS);
    if (!key) {
      // Generate a new random 256-bit key
      const randomWords = CryptoJS.lib.WordArray.random(32);
      key = CryptoJS.enc.Base64.stringify(randomWords);
      await SecureStore.setItemAsync(MASTER_KEY_ALIAS, key);
    }
    this.masterKey = key;
  }

  /**
   * Encrypts a string using AES
   */
  public encrypt(text: string): string {
    if (!this.masterKey) throw new Error('EncryptionService not initialized');
    // Using AES for symmetric encryption
    const ciphertext = CryptoJS.AES.encrypt(text, this.masterKey).toString();
    return `AES:${ciphertext}`;
  }

  /**
   * Decrypts an AES encrypted string
   */
  public decrypt(encryptedText: string): string {
    if (!this.masterKey) throw new Error('EncryptionService not initialized');
    if (!encryptedText.startsWith('AES:')) return encryptedText;
    
    const ciphertext = encryptedText.replace('AES:', '');
    const bytes = CryptoJS.AES.decrypt(ciphertext, this.masterKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
