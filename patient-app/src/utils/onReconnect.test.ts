import { onReconnect } from './onReconnect';

const mockListeners: Array<(s: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void> = [];
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: (l: (s: never) => void) => { mockListeners.push(l as never); return () => { mockListeners.length = 0; }; } },
}));

describe('15.8 onReconnect', () => {
  it('fires only when the phone goes from offline to online', () => {
    const cb = jest.fn();
    const stop = onReconnect(cb);
    const emit = (isConnected: boolean | null, isInternetReachable: boolean | null) => mockListeners.forEach((l) => l({ isConnected, isInternetReachable }));
    emit(true, true); // first report, online: nothing
    expect(cb).not.toHaveBeenCalled();
    emit(false, false);
    expect(cb).not.toHaveBeenCalled();
    emit(true, null); // connected, reachability unknown: counts as online
    expect(cb).toHaveBeenCalledTimes(1);
    emit(true, true);
    expect(cb).toHaveBeenCalledTimes(1);
    emit(true, false); // connected but no internet: offline
    emit(true, true);
    expect(cb).toHaveBeenCalledTimes(2);
    stop();
    expect(mockListeners.length).toBe(0);
  });
});
