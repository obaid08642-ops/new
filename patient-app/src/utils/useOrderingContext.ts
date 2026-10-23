import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiFetch } from './api';
import { isOffline } from './isOffline';
import { logError } from './logger';
import { buildContext, loadProfileContext, type ContextChoice, type ProfileContext } from './orderingContext';
import type { OrderingMode, OrderingPayer } from './ordering';

/**
 * The ordering context for the service screens: place, payer and for whom, read from the profile and changeable by the screen.
 * Ord02-Ord05 use it now; the Ord01 context bar reuses it. `status` is the profile read; `body` is what the quote needs.
 */
export function useOrderingContext(initialMode: OrderingMode = 'home', initialPayer: OrderingPayer | null = null) {
  const [profile, setProfile] = useState<ProfileContext | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'offline'>('loading');
  const [choice, setChoice] = useState<ContextChoice>({ mode: initialMode, payer: initialPayer, memberId: null, staffGender: null });

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setProfile(await loadProfileContext((path) => apiFetch<unknown>(path)));
      setStatus('ready');
    } catch (err) {
      logError('ordering:context', err);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const built = useMemo(() => (profile ? buildContext(profile, choice) : null), [profile, choice]);
  return {
    status,
    reload: load,
    profile,
    choice,
    place: built?.place ?? null,
    payer: (built?.payer ?? 'cash') as OrderingPayer,
    body: built?.body ?? null,
    needsPlace: built?.needs === 'place',
    setMode: (mode: OrderingMode) => setChoice((c) => ({ ...c, mode })),
    setPayer: (payer: OrderingPayer) => setChoice((c) => ({ ...c, payer })),
    setMember: (memberId: string | null) => setChoice((c) => ({ ...c, memberId })),
    setStaffGender: (staffGender: 'female' | 'male' | null) => setChoice((c) => ({ ...c, staffGender })),
  };
}
