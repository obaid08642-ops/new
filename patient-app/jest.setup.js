// The real NetInfo needs the native module; apiFetch asks it whether the phone is offline (15.1).
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));

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

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
  getStringAsync: jest.fn().mockResolvedValue(''),
}), { virtual: true });

// MapLibre is a native view; tests render the screens around it, so its components are plain views here.
jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const plain = (name) => { const C = ({ children, ...props }) => React.createElement(View, { ...props, testID: props.testID || name }, children); C.displayName = name; return C; };
  return { Map: plain('MLMap'), Marker: plain('MLMarker'), UserLocation: plain('MLUserLocation'), Camera: React.forwardRef((_p, ref) => { React.useImperativeHandle(ref, () => ({ easeTo: jest.fn(), jumpTo: jest.fn(), flyTo: jest.fn() })); return null; }) };
});

// SDK 58 expo-asset throws for a font module that has no registered asset (the jest asset transform registers none);
// icon fonts are not rendered under jest, so loading them is a no-op.
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  loadAsync: jest.fn(async () => undefined),
  isLoaded: jest.fn(() => true),
}));
