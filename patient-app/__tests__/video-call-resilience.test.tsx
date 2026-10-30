import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * The patient's video call on a bad network: "reconnecting" while LiveKit resumes the same call, "dropped" with a way into the chat
 * only after ~30 s, sound only on the server's advice or a weak link (with "try video again"), a quality indicator per side.
 * Boundaries only: the API, the router and the LiveKit room (a stand-in that emits the same events).
 */
const mockApiFetch = jest.fn();
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};
let mockRoom: any;

jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('expo-router', () => ({ get router() { return mockRouter; }, useLocalSearchParams: () => mockParams }));
jest.mock('../src/context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../src/calls/livekitNative', () => ({ ensureLiveKitGlobals: jest.fn(() => true), startCallAudio: jest.fn(async () => undefined), stopCallAudio: jest.fn(async () => undefined) }));
jest.mock('livekit-client', () => {
  const { EventEmitter } = require('node:events');
  class Room extends EventEmitter {
    localParticipant = {
      identity: 'me',
      setCameraEnabled: jest.fn(async () => undefined),
      setMicrophoneEnabled: jest.fn(async () => undefined),
      enableCameraAndMicrophone: jest.fn(async () => undefined),
    };
    remoteParticipants = new Map();
    connect = jest.fn(async () => undefined);
    disconnect = jest.fn(async () => undefined);
    constructor() { super(); mockRoom = this; }
    off(e: string, f: (...a: unknown[]) => void) { return this.removeListener(e, f); }
  }
  return {
    Room,
    RoomEvent: { Reconnecting: 'reconnecting', SignalReconnecting: 'signalReconnecting', Reconnected: 'reconnected', Disconnected: 'disconnected', ConnectionQualityChanged: 'connectionQualityChanged', TrackSubscribed: 'trackSubscribed', TrackUnsubscribed: 'trackUnsubscribed', LocalTrackPublished: 'localTrackPublished' },
    ConnectionQuality: { Poor: 'poor' },
    DisconnectReason: { CLIENT_INITIATED: 1 },
    VideoPresets: { h720: { resolution: {} }, h180: {}, h360: {} },
    AudioPresets: { speech: {} },
  };
});

import VideoCallScreen from '../app/consultations/video-call';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const mount = async (join: Record<string, unknown> = {}) => {
  mockApiFetch.mockImplementation(async (path: string) => (path === '/calls/initiate' ? { session_id: 's1', doctor_name: 'Dr. Test' } : { token: 't', server_url: 'wss://x', ...join }));
  await render(<SafeAreaProvider initialMetrics={metrics}><VideoCallScreen /></SafeAreaProvider>);
  await act(async () => { await Promise.resolve(); });
};

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  jest.clearAllMocks();
  mockParams = { appointmentId: 'a1' };
});
afterEach(() => { jest.useRealTimers(); });

describe('video call on a bad network', () => {
  it('starts with the camera and microphone and shows no warning', async () => {
    await mount();
    expect(mockRoom.localParticipant.enableCameraAndMicrophone).toHaveBeenCalled();
    expect(screen.queryByTestId('call-reconnecting')).toBeNull();
    expect(screen.getByTestId('call-camera')).toBeTruthy();
  });

  it('a network switch shows "reconnecting" and the same call resumes: the room is never closed', async () => {
    await mount();
    await act(async () => { mockRoom.emit('reconnecting'); });
    expect(screen.getByTestId('call-reconnecting')).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(10_000); });
    await act(async () => { mockRoom.emit('reconnected'); });
    expect(screen.queryByTestId('call-reconnecting')).toBeNull();
    expect(mockRoom.disconnect).not.toHaveBeenCalled();
    expect(screen.getByTestId('video-call-screen')).toBeTruthy();
  });

  it('after ~30 s without a connection the call is dropped, with the chat as the way on', async () => {
    await mount();
    await act(async () => { mockRoom.emit('reconnecting'); });
    await act(async () => { jest.advanceTimersByTime(29_000); });
    expect(screen.queryByTestId('call-dropped')).toBeNull();
    await act(async () => { jest.advanceTimersByTime(1_000); });
    expect(screen.getByTestId('call-dropped')).toBeTruthy();
    expect(mockRoom.disconnect).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId('call-continue-chat'));
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/consultations/chat-with-doctor', params: { appointmentId: 'a1' } });
  });

  it('the server\'s advice starts the call with sound only (no camera), and "try video again" brings the camera back', async () => {
    await mount({ audio_only: true, audio_only_reason: 'weak_link' });
    expect(mockRoom.localParticipant.enableCameraAndMicrophone).not.toHaveBeenCalled();
    expect(mockRoom.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('call-audio-only')).toBeTruthy();
    expect(screen.queryByTestId('call-camera')).toBeNull();
    await act(async () => { fireEvent.press(screen.getByTestId('call-try-video')); });
    expect(screen.queryByTestId('call-audio-only')).toBeNull();
    expect(mockRoom.localParticipant.setCameraEnabled).toHaveBeenLastCalledWith(true);
  });

  it('two poor quality reports for my side drop to sound only', async () => {
    await mount();
    await act(async () => { mockRoom.emit('connectionQualityChanged', 'poor', { identity: 'me' }); });
    expect(screen.queryByTestId('call-audio-only')).toBeNull();
    await act(async () => { mockRoom.emit('connectionQualityChanged', 'poor', { identity: 'me' }); });
    expect(screen.getByTestId('call-audio-only')).toBeTruthy();
  });

  it('each side has a quality indicator that is read out with its level', async () => {
    await mount();
    await act(async () => {
      mockRoom.emit('connectionQualityChanged', 'excellent', { identity: 'me' });
      mockRoom.emit('connectionQualityChanged', 'poor', { identity: 'doc' });
    });
    expect(screen.getByTestId('call-quality-local').props.accessibilityLabel).toBe('Your connection: excellent');
    expect(screen.getByTestId('call-quality-remote').props.accessibilityLabel).toBe("Other side's connection: weak");
  });

  it('hanging up is not a drop', async () => {
    await mount();
    await act(async () => { mockRoom.emit('disconnected', 1); });
    expect(screen.queryByTestId('call-dropped')).toBeNull();
  });
});
