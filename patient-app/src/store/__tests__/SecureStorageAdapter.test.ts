import { secureStorageAdapter } from '../persistence/SecureStorageAdapter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Mock the native modules
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
}));

describe('SecureStorageAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should encrypt and save item', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-key');
    
    await secureStorageAdapter.setItem('myKey', 'myValue');
    
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('myKey', expect.any(String));
    
    // Ensure the saved string is encrypted and not plain text
    const savedArg = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
    expect(savedArg).not.toContain('myValue');
  });

  it('should decrypt and retrieve item', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-key');
    
    // Encrypt 'testValue' with 'test-key'
    const CryptoJS = require('crypto-js');
    const encrypted = CryptoJS.AES.encrypt('testValue', 'test-key').toString();
    
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(encrypted);
    
    const value = await secureStorageAdapter.getItem('myKey');
    expect(value).toBe('testValue');
  });

  it('should handle missing item gracefully', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const value = await secureStorageAdapter.getItem('myKey');
    expect(value).toBeNull();
  });
});
