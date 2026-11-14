import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { apiFetch } from '../utils/api';
import { readBadgeCount } from '../utils/appointmentOutcomes';
import { logError } from '../utils/logger';

const listeners = new Set<() => void>();

/**
 * The patient opened a visit's outcomes: PATCH /care/appointments/:id/outcomes/seen (everything issued so far is seen), then every
 * mounted badge reads again. A failed call is logged and the badge stays as the server has it.
 */
export async function markOutcomesSeen(appointmentId: string): Promise<void> {
  try {
    await apiFetch(`/care/appointments/${encodeURIComponent(appointmentId)}/outcomes/seen`, { method: 'PATCH' });
    listeners.forEach((refresh) => refresh());
  } catch (error: unknown) {
    logError('consultations:outcomes-seen', error);
  }
}

/**
 * The new visit results: `unseen_total` of GET /care/appointments/outcomes/badge (prescriptions, unread reports and certificates,
 * referrals of the completed visits). Read again every time the screen is focused and after an outcome is marked seen. A failed
 * read is 0 (no badge), never a made-up number.
 */
export function useNewOutcomesCount(): { count: number } {
  const [state, setState] = useState<{ count: number }>({ count: 0 });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => setTick((n) => n + 1);
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      apiFetch<unknown>('/care/appointments/outcomes/badge')
        .then((response) => alive && setState({ count: readBadgeCount(response) }))
        .catch((error: unknown) => {
          logError('consultations:new-outcomes-count', error);
          if (alive) setState({ count: 0 });
        });
      return () => {
        alive = false;
      };
    }, [tick]),
  );
  return state;
}
