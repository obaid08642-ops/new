import React, { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { onAgreementRequired } from '../utils/contractEvents';
import client from '../api/client';
import { ContractModal, PROVIDER_AGREEMENT_KEY } from './ContractModal';

/**
 * A new major version of the provider agreement asks every provider to accept it again. The legal service lists what the
 * signed-in provider has not accepted yet (GET /legal/pending); when the agreement is on that list this opens the contract
 * with no way to close it until it is accepted. When the list cannot be read the app carries on (the server is the authority).
 */
export function ContractGate() {
  const [pending, setPending] = useState(false);
  const check = useCallback(() => {
    client.get('/legal/pending')
      .then((res: any) => {
        const rows: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
        setPending(rows.some((p) => p?.key === PROVIDER_AGREEMENT_KEY));
      })
      .catch(() => undefined);
  }, []);
  // on start, when the app comes back to the front, and when the server refuses a call with provider_agreement_required
  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    const off = onAgreementRequired(check);
    return () => { sub.remove(); off(); };
  }, [check]);
  if (!pending) return null;
  return <ContractModal visible required onClose={() => setPending(false)} onAccepted={() => setPending(false)} />;
}
