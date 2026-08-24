'use strict';

const subscription = { remove: jest.fn() };

module.exports = {
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  IosAuthorizationStatus: { AUTHORIZED: 2 },
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    TIME_INTERVAL: 'timeInterval',
  },
  getPermissionsAsync: jest.fn(async () => ({ granted: true, ios: { status: 2 } })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, ios: { status: 2 } })),
  setNotificationCategoryAsync: jest.fn(async () => undefined),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => 'mock-notification-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  clearLastNotificationResponseAsync: jest.fn(async () => undefined),
  setBadgeCountAsync: jest.fn(async () => true),
  getBadgeCountAsync: jest.fn(async () => 0),
  dismissAllNotificationsAsync: jest.fn(async () => undefined),
  addNotificationReceivedListener: jest.fn(() => subscription),
  addNotificationResponseReceivedListener: jest.fn(() => subscription),
  removeNotificationSubscription: jest.fn(),
};
