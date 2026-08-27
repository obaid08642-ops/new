jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  getRandomValues: (bytes: Uint8Array) => bytes.fill(7),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  secureStorageAdapter,
  SecureStorageUnavailableError,
} from './SecureStorageAdapter';

describe('secureStorageAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails closed and does not write when SecureStore cannot supply the encryption key', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('unavailable'));

    await expect(secureStorageAdapter.setItem('persist:root', '{"auth":"sensitive"}'))
      .rejects.toBeInstanceOf(SecureStorageUnavailableError);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
