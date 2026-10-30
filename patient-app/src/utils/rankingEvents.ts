// Popularity signals of the lab, radiology and nursing catalogues (backend catalogue-ranking, POST /catalogue/ranking/events).
// Only `view` (a service screen was opened) and `search` (a search result was opened) are reported by a client; the server counts
// cart adds and orders itself. Fire-and-forget: never awaited by a screen, never throws, sends no user or device data (no session_id).
import { useEffect, useRef } from 'react';
import { apiFetch } from './api';

export type RankedVertical = 'lab' | 'radiology' | 'nursing';
export type RankingSignal = 'view' | 'search';

// the backend's SERVICE_ID rule: a shorter or odd id is never a catalogue service, so it is not sent
const SERVICE_ID = /^[A-Za-z0-9_-]{8,64}$/;

export function reportRankingEvent(vertical: RankedVertical, serviceId: string | null | undefined, event: RankingSignal): void {
  const id = String(serviceId ?? '').trim();
  if (!SERVICE_ID.test(id)) return;
  try {
    void Promise.resolve(apiFetch('/catalogue/ranking/events', { method: 'POST', body: JSON.stringify({ vertical, service_id: id, event }) })).catch(() => undefined);
  } catch {
    // a counter must never break a screen
  }
}

/** The catalogue vertical of a search suggestion type, or null when the type is not ranked (packages, medicines, doctors...). */
export function verticalOfSuggestion(type: string): RankedVertical | null {
  return type === 'lab_test' ? 'lab' : type === 'radiology' ? 'radiology' : type === 'nursing' ? 'nursing' : null;
}

/** Reports one `view` per opened service (again only when the id changes), after the screen has rendered. */
export function useReportServiceView(vertical: RankedVertical, serviceId: string | null | undefined): void {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    const key = `${vertical}:${serviceId ?? ''}`;
    if (!serviceId || sent.current === key) return;
    sent.current = key;
    reportRankingEvent(vertical, serviceId, 'view');
  }, [vertical, serviceId]);
}
