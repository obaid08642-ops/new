/**
 * The AI assistant's pure parts (merge map section 4, decisions 7 and 15): which mode the URL asks for, the request to the one
 * assistant endpoint (POST /ai/assistant) and how its answer is read. Nothing here decides an answer: the server's kind, text,
 * disclaimer and actions are shown, and a payload without them is "no answer".
 */

export const ASSISTANT_MODES = ["symptoms", "prescription", "report"] as const;
export type AssistantMode = (typeof ASSISTANT_MODES)[number];

/** `?mode=` of the URL; anything else opens the symptoms mode. */
export function parseMode(value: unknown): AssistantMode {
  const first = Array.isArray(value) ? value[0] : value;
  return ASSISTANT_MODES.find((mode) => mode === first) ?? "symptoms";
}

export const MIN_SYMPTOMS_LENGTH = 3;

export const ASSISTANT_LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"] as const;
export type AssistantLocale = (typeof ASSISTANT_LOCALES)[number];

/** POST /ai/assistant (decision 15): the trimmed question and the page's language (the server answers in it). */
export function assistantRequestBody(message: string, locale: string): { message: string; locale: AssistantLocale } {
  const lang = ASSISTANT_LOCALES.find((value) => value === locale) ?? "ar";
  return { message: message.trim().slice(0, 1000), locale: lang };
}

export type AssistantKind = "red_flag" | "specialty" | "leaflet" | "out_of_scope";
export const LEAFLET_PARTS = ["indications", "how_to_use", "side_effects", "warnings", "storage", "pregnancy"] as const;
export type LeafletPart = (typeof LEAFLET_PARTS)[number];

/** The assistant's answer as the server wrote it: the kind, its text and disclaimer (in the asked language), the way on. */
export type AssistantAnswer = {
  kind: AssistantKind;
  text: string;
  disclaimer: string;
  /** `book_consultation` names the specialty slug the doctor list is filtered on; null for the general list. */
  specialty: string | null;
  bookable: boolean;
  urgent: boolean;
  askPharmacist: boolean;
  leaflet: Array<{ part: LeafletPart; lines: string[] }>;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Null when the payload is not an answer (no kind, no text or no disclaimer): nothing is made up for it. */
export function parseAssistantAnswer(payload: unknown): AssistantAnswer | null {
  const root = record(payload);
  const source = record(root?.data) ?? root;
  const kind = source?.kind;
  if (kind !== "red_flag" && kind !== "specialty" && kind !== "leaflet" && kind !== "out_of_scope") return null;
  const text = typeof source?.text === "string" ? source.text.trim() : "";
  const disclaimer = typeof source?.disclaimer === "string" ? source.disclaimer.trim() : "";
  if (!text || !disclaimer) return null;
  const actions = (Array.isArray(source?.actions) ? source.actions : []).flatMap((value) => { const action = record(value); return action ? [action] : []; });
  const book = actions.find((action) => action.type === "book_consultation");
  const slug = typeof book?.specialty === "string" && /^[a-z][a-z_]{1,39}$/.test(book.specialty) ? book.specialty : null;
  const leafletRecord = record(source?.leaflet) ?? {};
  const leaflet = LEAFLET_PARTS.flatMap((part) => {
    const value = leafletRecord[part];
    const lines = (Array.isArray(value) ? value : [value]).flatMap((line) => (typeof line === "string" && line.trim() ? [line.trim()] : []));
    return lines.length ? [{ part, lines }] : [];
  });
  return {
    kind,
    text,
    disclaimer,
    specialty: slug,
    bookable: Boolean(book) || kind === "red_flag" || kind === "out_of_scope",
    urgent: kind === "red_flag" || actions.some((action) => action.type === "emergency_call"),
    askPharmacist: actions.some((action) => action.type === "ask_pharmacist"),
    leaflet,
  };
}
