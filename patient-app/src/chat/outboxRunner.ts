import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { flushAll, type FailureKind, type OutboxItem } from './outbox';
import { sendOutboxItem } from './send';

/**
 * Sends the queued chat messages of every thread, not only the one on screen: when the connection comes back, when the app returns to
 * the foreground, at app start and after sign-in. Open chat screens listen to the events and update their message list.
 */
export type OutboxEvent =
  | { type: 'sent'; item: OutboxItem; serverId?: string }
  | { type: 'failed'; item: OutboxItem; kind: FailureKind; error: unknown; dead: boolean };

type Listener = (e: OutboxEvent) => void;
const listeners = new Set<Listener>();

export function onOutboxEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const emit = (e: OutboxEvent) => listeners.forEach((l) => l(e));

export function flushOutbox(): Promise<number> {
  return flushAll(sendOutboxItem, {
    onSent: (item, result) => emit({ type: 'sent', item, serverId: (result as { id?: string } | undefined)?.id }),
    onFail: (item, kind, error, dead) => emit({ type: 'failed', item, kind, error, dead }),
  });
}

/** Starts the connection and foreground listeners; returns the function that stops them. */
export function startOutboxRunner(): () => void {
  void flushOutbox();
  const net = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) void flushOutbox();
  });
  const app = AppState.addEventListener('change', (next) => {
    if (next === 'active') void flushOutbox();
  });
  return () => {
    net();
    app.remove();
  };
}
