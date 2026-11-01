import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { ContractModal, PROVIDER_AGREEMENT_KEY } from './ContractModal';

/**
 * A new major version of the provider agreement asks every provider to accept it again. The legal service lists what the
 * signed-in provider has not accepted yet (GET /legal/pending); when the agreement is on that list this opens the contract
 * with no way to close it until it is accepted. When the list cannot be read the app carries on (the server is the authority).
 */
export function ContractGate() {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let live = true;
    client.get('/legal/pending')
      .then((res: any) => {
        const rows: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
        if (live) setPending(rows.some((p) => p?.key === PROVIDER_AGREEMENT_KEY));
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);
  if (!pending) return null;
  return <ContractModal visible required onClose={() => setPending(false)} onAccepted={() => setPending(false)} />;
}
