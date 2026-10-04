jest.mock('expo-device', () => ({
  isDevice: false,
  modelName: 'Jest device',
}));

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3, MAX: 5 },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getDevicePushTokenAsync: jest.fn().mockResolvedValue(null),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue(null),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// react-native-localize is a native TurboModule; Jest has no native binary. The
// library ships this mock for tests. Without it, any test that imports the app
// context (HttpClient -> ErrorHandler -> AppContext since 04a1544) fails to load.
jest.mock('react-native-localize', () => require('react-native-localize/mock/jest'));
