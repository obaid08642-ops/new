import { navigationRef } from '../navigation/navigationRef';

export type CallScreen = 'CallRoom' | 'IncomingCall';

/**
 * Opens a call screen from outside React (the native call screen's Answer button, a push tap). The navigator may not exist yet: a killed app
 * that was started by Answer is still restoring the session, so this waits for it (about 20 s) instead of dropping the answer.
 */
export function openCallScreen(name: CallScreen, params: Record<string, unknown>): void {
  let tries = 0;
  const go = () => {
    if (navigationRef.isReady()) {
      try { navigationRef.navigate(name, params); return; } catch { /* the screen is not registered yet (still signing in): try again */ }
    }
    if (++tries < 40) setTimeout(go, 500);
  };
  go();
}
