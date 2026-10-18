/**
 * Calls `cb` each time the phone goes from offline to online. Used by screens that wait on the server for something that
 * was settled while the phone had no network (a payment that came back offline): they ask again at once instead of waiting
 * for a tap. Where the connectivity module is not available (a test, a web build) it does nothing.
 */
export function onReconnect(cb: () => void): () => void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NetInfo = require('@react-native-community/netinfo').default as {
      addEventListener: (l: (s: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void) => () => void;
    };
    let wasOffline = false;
    return NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      if (wasOffline && !offline) cb();
      wasOffline = offline;
    });
  } catch {
    return () => undefined;
  }
}
