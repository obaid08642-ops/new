const mockSecureStore = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
};
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

jest.mock('expo-secure-store', () => mockSecureStore);
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: mockAsyncStorage }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { SecureStorageUnavailableError, secureGet, secureSet } from './security';

describe('native secure storage contract', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fails closed and never writes a native secret to AsyncStorage', async () => {
    mockSecureStore.setItemAsync.mockRejectedValue(new Error('keystore unavailable'));

    await expect(secureSet('@session', 'secret-token')).rejects.toBeInstanceOf(SecureStorageUnavailableError);
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('fails closed and never reads a native secret from AsyncStorage', async () => {
    mockSecureStore.getItemAsync.mockRejectedValue(new Error('keystore unavailable'));

    await expect(secureGet('@session')).rejects.toBeInstanceOf(SecureStorageUnavailableError);
    expect(mockAsyncStorage.getItem).not.toHaveBeenCalled();
  });
});
