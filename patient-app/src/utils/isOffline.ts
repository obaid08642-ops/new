import NetInfo from '@react-native-community/netinfo';

/**
 * True when the phone reports no connection. Asked when a request fails, to choose between the "no connection"
 * state and the "could not load" state; a failure to ask counts as online, so the retry state is the fallback.
 */
export async function isOffline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === false || state.isInternetReachable === false;
  } catch {
    return false;
  }
}
