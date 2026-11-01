/**
 * The Android notification channel a push uses. The provider app creates these channels (provider-app/src/utils/notifications.ts);
 * a push naming a channel the phone does not have falls back to the quiet default, so the ids must match.
 * Only `new_order` (provider app) and `calls` are special; everything else, chat included, uses `default` because the patient app
 * has no other channel (a push naming a channel the phone lacks lands on a quiet system one). `new_order` is the loud one for a new order or booking and for one that was cancelled.
 */
export type PushChannel = 'new_order' | 'calls' | 'default';

export function pushChannel(type: unknown, explicit?: unknown): PushChannel {
  if (explicit === 'new_order' || explicit === 'calls' || explicit === 'default') return explicit;
  const t = String(type ?? '');
  if (t === 'call') return 'calls';
  return 'default';
}

/** The sound file bundled with the provider app for the loud new-order channel (other channels use the system sound). */
export const NEW_ORDER_SOUND = 'new_order.wav';
