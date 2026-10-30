import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { apiFetch } from '../utils/api';
import { newOutcomeCount } from '../utils/appointmentOutcomes';
import { logError } from '../utils/logger';

/**
 * The visit results the patient has not opened yet: rows of GET /medical-reports/mine that belong to an appointment and whose
 * `viewed_by_patient` is false (the server sets it when GET /medical-reports/:id opens the report). Read again every time the
 * screen is focused. A failed read is 0 (no badge), never a made-up number.
 */
export function useNewOutcomesCount(): { count: number } {
  const [state, setState] = useState<{ count: number }>({ count: 0 });
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      apiFetch<unknown>('/medical-reports/mine?limit=100')
        .then((response) => alive && setState({ count: newOutcomeCount(response) }))
        .catch((error: unknown) => {
          logError('consultations:new-outcomes-count', error);
          if (alive) setState({ count: 0 });
        });
      return () => {
        alive = false;
      };
    }, []),
  );
  return state;
}
