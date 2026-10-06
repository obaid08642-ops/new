import { SERVICE_ICONS, type FillIconName, type ServiceTone } from "@/components-next/ui-generated/icons/fill";

/**
 * How the consultation screens read an appointment's status and mode. The words are the server's states, the groupings
 * are the ones the screens already used (nothing here changes what the backend allows).
 */
export type Mode = "video" | "clinic" | "home";

export const KNOWN_STATUSES = ["pending", "pending_payment", "confirmed", "scheduled", "checked_in", "in_progress", "completed", "cancelled", "no_show"] as const;
export type KnownStatus = (typeof KNOWN_STATUSES)[number];

const norm = (status?: string) => (status ?? "").toLowerCase();

/** The message key of a status the screens know, or null for one they do not (the screen says "status unavailable", never the raw code). */
export function statusKey(status?: string): KnownStatus | null {
  const value = norm(status);
  return (KNOWN_STATUSES as readonly string[]).includes(value) ? (value as KnownStatus) : null;
}

export function modeOf(serviceType?: string): Mode | null {
  return serviceType === "video" || serviceType === "clinic" || serviceType === "home" ? serviceType : null;
}

/** The mode's tile and tone, from the board's pairing (clinic hospital/blue, home house/mint, video camera/violet). */
export const MODE_VISUAL: Record<Mode, { icon: FillIconName; tone: ServiceTone }> = {
  video: { icon: "video-camera", tone: "violet" },
  clinic: { icon: "hospital", tone: "blue" },
  home: { icon: "house", tone: "mint" },
};

/** Booked or waiting for a decision: what the "upcoming" tab lists. */
export const isUpcoming = (status?: string) => ["confirmed", "pending"].includes(norm(status));
/** Finished or closed: what the "past" tab lists. */
export const isPast = (status?: string) => ["completed", "cancelled"].includes(norm(status));
/** A visit that can still change: cancel, reschedule, the booking status. */
export const isOpen = (status?: string) => ["pending", "pending_payment", "confirmed", "scheduled"].includes(norm(status));
/** The call or visit can be entered now. */
export const isJoinable = (status?: string) => ["confirmed", "scheduled", "in_progress", "checked_in"].includes(norm(status));
export const isDone = (status?: string) => ["completed", "complete", "finished", "done"].includes(norm(status));

/** The chip tone of a status (canvas/Orders pairing: good mint, waiting amber, closed ink). */
export function statusTone(status?: string): ServiceTone {
  switch (norm(status)) {
    case "confirmed":
    case "scheduled":
    case "checked_in":
    case "in_progress":
    case "completed":
      return SERVICE_ICONS.lab.tone;
    case "cancelled":
    case "no_show":
      return "ink";
    default:
      return SERVICE_ICONS.map.tone;
  }
}

/** A hand-off between booking screens: the appointment id in the query. Only a UUID is accepted. */
export const APPOINTMENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
