import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '../utils/api';
import { logError } from '../utils/logger';
import { newResultsCount } from '../utils/ordersResults';

/**
 * The number of lab results the patient has not opened yet: the rows of GET /lab-results/mine whose `viewed_by_patient` is false
 * (the server sets it when GET /lab-results/:id opens the result). A failed read is 0 (no badge), never a made-up number.
 */
export function useNewResultsCount(): { count: number; refresh: () => void } {
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => {
    apiFetch<unknown>('/lab-results/mine')
      .then((response) => setCount(newResultsCount(response)))
      .catch((error: unknown) => {
        logError('orders:new-results-count', error);
        setCount(0);
      });
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { count, refresh };
}
