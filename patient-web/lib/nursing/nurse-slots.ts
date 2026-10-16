/**
 * issue 1571: the chosen nurse's free times belong to one nurse and one day. A loaded list is kept with the nurse and the
 * day it was loaded for, and the form shows it only while that nurse and that day are still chosen. Before, the list
 * stayed on screen (clickable) for the render after a new day was chosen, until the effect that loads the new day ran:
 * the previous day's times were shown under the new day.
 */
export type NurseSlot = { start: string; available: boolean };
export type NurseSlotsResult = { nurseId: string; day: string; state: "ready" | "failed"; slots: NurseSlot[] };
export type NurseSlotsView = { state: "loading" | "ready" | "failed"; slots: NurseSlot[] };

const LOADING: NurseSlotsView = { state: "loading", slots: [] };

export function nurseSlotsView(result: NurseSlotsResult | null, nurseId: string, day: string): NurseSlotsView {
  if (!result || result.nurseId !== nurseId || result.day !== day) return LOADING;
  return { state: result.state, slots: result.state === "ready" ? result.slots : [] };
}

/** The chosen time only while it is one of the times shown for the chosen nurse and day. */
export function chosenSlot(view: NurseSlotsView, slot: string | null): string | null {
  return slot && view.state === "ready" && view.slots.some((s) => s.start === slot) ? slot : null;
}

/** GET /home-care/providers/:id/slots rows -> the free times (a row marked available: false is booked). */
export function parseNurseSlots(payload: unknown): NurseSlot[] {
  const list = Array.isArray((payload as { slots?: unknown } | null)?.slots) ? (payload as { slots: unknown[] }).slots : [];
  return list.flatMap((row) => {
    const value = row as { start?: unknown; available?: unknown };
    return typeof value?.start === "string" && value.available !== false ? [{ start: value.start, available: true }] : [];
  });
}
