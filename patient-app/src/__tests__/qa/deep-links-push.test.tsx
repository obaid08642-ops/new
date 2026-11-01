import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import NotificationHandler from '../../components/NotificationHandler';
import { translateBackendRoute } from '../../hooks/usePushNotifications';
import { redirectSystemPath } from '../../../app/+native-intent';
import { resolveWebLink } from '../../navigation/webLinkMap';

/**
 * PT-38: a push or a link for an appointment, booking, order or chat opens the right screen with the right id; signed out nothing is
 * opened until the person is signed in (the tap is then answered); malformed input never throws. IDs are TEST values.
 */

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('../../calls/ringTask', () => ({ registerCallRingTask: jest.fn(async () => undefined) }));
jest.mock('../../calls/voipPush', () => ({ setVoipAuth: jest.fn(), startVoipListeners: jest.fn(async () => undefined) }));
jest.mock('../../calls/callSignals', () => ({ emitRingingCallOver: jest.fn() }));
jest.mock('../../chat/outboxRunner', () => ({ startOutboxRunner: jest.fn(() => () => undefined) }));
jest.mock('../../utils/callkeep', () => ({ displayNativeIncomingCall: jest.fn(), canRingNatively: () => false }));
jest.mock('../../utils/medication-notifications', () => ({
  flushMedicationDoseActions: jest.fn(async () => undefined),
  medicationNotificationAction: jest.fn(() => ({ action: 'ignore' })),
  recordMedicationDoseAction: jest.fn(),
  snoozeMedicationNotificationResponse: jest.fn(),
}));
jest.mock('../../utils/notifications', () => ({ registerForPushNotificationsAsync: jest.fn(async () => null), initNotificationListeners: jest.fn(() => () => undefined) }));
jest.mock('@/services/HttpClient', () => ({ HttpClient: { post: jest.fn(async () => ({})) } }));
jest.mock('expo-notifications', () => ({ getLastNotificationResponseAsync: jest.fn(async () => null), setNotificationHandler: jest.fn(), AndroidImportance: { MAX: 5 } }));

/* eslint-disable @typescript-eslint/no-require-imports */
const { router } = require('expo-router') as { router: { push: jest.Mock } };
const Notifications = require('expo-notifications') as { getLastNotificationResponseAsync: jest.Mock };
const { initNotificationListeners } = require('../../utils/notifications') as { initNotificationListeners: jest.Mock };
/* eslint-enable @typescript-eslint/no-require-imports */

const response = (data: Record<string, unknown>) => ({ actionIdentifier: 'default', notification: { request: { content: { data } } } });
const makeStore = (isAuthenticated: boolean) => configureStore({ reducer: { auth: (state = { isAuthenticated }) => state } });

/** Mounts the handler with a session and returns what a tap on a notification with `data` pushes. */
async function tap(data: Record<string, unknown>) {
  router.push.mockClear();
  await render(<Provider store={makeStore(true)}><NotificationHandler /></Provider>);
  const onTap = initNotificationListeners.mock.calls[initNotificationListeners.mock.calls.length - 1][1] as (r: unknown) => Promise<void>;
  await act(async () => { await onTap(response(data)); });
  return router.push.mock.calls.map(([target]) => target);
}

beforeEach(() => {
  router.push.mockClear();
  initNotificationListeners.mockClear();
  Notifications.getLastNotificationResponseAsync.mockResolvedValue(null);
});

describe('a tapped push opens the right screen with the right id (signed in)', () => {
  it('appointment, booking, chat, order by type', async () => {
    expect(await tap({ type: 'consultation', bookingId: 'b-1' })).toEqual([{ pathname: '/consultations/appointment-detail', params: { appointmentId: 'b-1' } }]);
    expect(await tap({ type: 'booking_accepted', appointmentId: 'a-2', visitType: 'video' })).toEqual([{ pathname: '/consultations/booking-status', params: { appointmentId: 'a-2', visitType: 'video' } }]);
    expect(await tap({ type: 'chat', appointmentId: 'a-3', senderId: 'd-1', senderName: 'Test doctor' })).toEqual([{ pathname: '/consultations/chat-with-doctor', params: { doctorId: 'd-1', doctorName: 'Test doctor', appointmentId: 'a-3' } }]);
    expect(await tap({ type: 'order', orderId: 'o-4' })).toEqual([{ pathname: '/pharmacy/order-tracking', params: { orderId: 'o-4' } }]);
    expect(await tap({ type: 'order', order_id: 'o-5' })).toEqual([{ pathname: '/pharmacy/order-tracking', params: { orderId: 'o-5' } }]);
  });

  it('the backend routes (/orders/:id/tracking, /consultations/appointments/:id) are translated, not dropped to the inbox', async () => {
    expect(await tap({ screen: '/orders/o-6/tracking' })).toEqual([{ pathname: '/pharmacy/order-tracking', params: { orderId: 'o-6' } }]);
    expect(await tap({ screen: '/consultations/appointments/a-7' })).toEqual([{ pathname: '/consultations/appointment-detail', params: { appointmentId: 'a-7' } }]);
  });

  it('a whitelisted screen with params still wins', async () => {
    expect(await tap({ screen: '/pharmacy/order-tracking', params: { orderId: 'o-8' } })).toEqual([{ pathname: '/pharmacy/order-tracking', params: { orderId: 'o-8' } }]);
  });

  it('malformed data never throws and never opens a screen with an empty id', async () => {
    expect(await tap({ type: 'order' })).toEqual([{ pathname: '/orders', params: {} }]);
    expect(await tap({ type: 'chat' })).toEqual([{ pathname: '/consultations/appointments', params: {} }]);
    expect(await tap({ screen: '/orders//tracking', params: 'not-an-object' })).toEqual(['/notifications']);
    expect(await tap({ screen: '/admin/anything', type: 'unknown' })).toEqual(['/notifications']);
    expect(await tap({ type: 42 as never })).toEqual(['/notifications']);
  });
});

describe('signed out', () => {
  it('a push that started the app is not answered before the sign-in, and is answered once signed in', async () => {
    Notifications.getLastNotificationResponseAsync.mockResolvedValue(response({ type: 'order', orderId: 'o-9' }));
    const store = configureStore({ reducer: { auth: (state = { isAuthenticated: false }, action: { type: string }) => (action.type === 'in' ? { isAuthenticated: true } : state) } });
    await render(<Provider store={store}><NotificationHandler /></Provider>);
    await act(async () => undefined);
    expect(router.push).not.toHaveBeenCalled();
    expect(initNotificationListeners).not.toHaveBeenCalled();
    await act(async () => { store.dispatch({ type: 'in' }); });
    await act(async () => undefined);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/pharmacy/order-tracking', params: { orderId: 'o-9' } });
  });
});

describe('the inbox translation and the web links', () => {
  it('translateBackendRoute opens each kind with its id and refuses what it does not know', () => {
    expect(translateBackendRoute('/consultations/appointments/a-1')).toEqual({ pathname: '/consultations/appointment-detail', params: { appointmentId: 'a-1' } });
    expect(translateBackendRoute('/orders/o-1')).toEqual({ pathname: '/pharmacy/order-tracking', params: { orderId: 'o-1' } });
    expect(translateBackendRoute('/tracking/consultation/c-1')).toEqual({ pathname: '/consultations/appointment-detail', params: { appointmentId: 'c-1' } });
    expect(translateBackendRoute('/tracking/lab/l-1')).toEqual({ pathname: '/diagnostics/sample-tracking', params: { bookingId: 'l-1' } });
    expect(translateBackendRoute('')).toBeNull();
    expect(translateBackendRoute('/nothing/known')).toBeNull();
  });

  it('system links: the known web kinds map to a route, a malformed link never throws', () => {
    expect(resolveWebLink('https://nabd.plus/en/consultations/booking-status?id=b-1').route).toBe('/consultations/booking-status?id=b-1');
    expect(resolveWebLink('https://nabd.plus/en/pharmacy/broadcast-status').route).toBe('/pharmacy/broadcast-status');
    expect(resolveWebLink('https://nabd.plus/en/chat').route).toBe('/consultations/appointments');
    expect(resolveWebLink('nabdplus://consultations/appointment-detail?appointmentId=a-1').route).toBe('/consultations/appointment-detail?appointmentId=a-1');
    for (const bad of ['', '%E0%A4%A', 'https://', '://', 'https://nabd.plus/%/%%/orders', '/orders/\u0000']) {
      expect(() => redirectSystemPath({ path: bad, initial: true })).not.toThrow();
      expect(typeof redirectSystemPath({ path: bad, initial: true })).toBe('string');
    }
  });
});
