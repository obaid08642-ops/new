"use client";

import { useEffect } from "react";

/**
 * Marks a visit's outcomes as seen once they are on screen (POST /api/appointments/:id/outcomes-seen, which PATCHes
 * /care/appointments/:id/outcomes/seen). Fire and forget: a failure leaves the badge as the server has it. Draws nothing.
 */
export function OutcomesSeen({ appointmentId }: { appointmentId: string }) {
  useEffect(() => {
    fetch(`/api/appointments/${encodeURIComponent(appointmentId)}/outcomes-seen`, { method: "POST", keepalive: true }).catch(() => undefined);
  }, [appointmentId]);
  return null;
}
