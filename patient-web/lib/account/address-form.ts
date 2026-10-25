/**
 * The address book's form (issue 769): the fields of POST /users/me/addresses and PATCH /users/me/addresses/:id (backend
 * users.addresses.dto). Plain functions, no library: the book is a client component.
 */
export type AddressRecord = {
  id: string;
  label?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  district?: string | null;
  region?: string | null;
  notes?: string | null;
  /** Building number and floor (backend `building`, `floor`). */
  building?: string | null;
  floor?: string | null;
  /** 19.7: the Saudi National Address short code. */
  short_address?: string | null;
  is_default?: boolean | null;
};

export type AddressForm = { label: string; line1: string; line2: string; city: string; district: string; region: string; notes: string; short_address: string; building: string; floor: string };

export const EMPTY_ADDRESS_FORM: AddressForm = { label: "", line1: "", line2: "", city: "", district: "", region: "", notes: "", short_address: "", building: "", floor: "" };
const KEYS = Object.keys(EMPTY_ADDRESS_FORM) as Array<keyof AddressForm>;

/** The form filled with what is saved; a field the server did not send is empty. */
export function addressToForm(address: AddressRecord): AddressForm {
  return Object.fromEntries(KEYS.map((key) => [key, typeof address[key] === "string" ? (address[key] as string) : ""])) as AddressForm;
}

/** A label and a first line are required, as in the add form. */
export function isAddressFormValid(form: AddressForm): boolean {
  return form.label.trim().length > 0 && form.line1.trim().length > 0;
}

/**
 * The PATCH body: only the fields that differ from what is saved (trimmed), or null when nothing changed or the form is not
 * valid. A field cleared by the patient is sent as an empty string, so the server drops it.
 */
export function buildAddressPatch(saved: AddressRecord, form: AddressForm): Partial<AddressForm> | null {
  if (!isAddressFormValid(form)) return null;
  const before = addressToForm(saved);
  const patch: Partial<AddressForm> = {};
  for (const key of KEYS) {
    const next = form[key].trim();
    if (next !== before[key].trim()) patch[key] = next;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

/** The pin of an address (backend `lat` / `lng` of POST and PATCH /users/me/addresses). */
export type AddressPoint = { lat: number; lng: number };

/** A pin from the browser's position; null when either number is not a real coordinate. */
export function pointFromPosition(lat: unknown, lng: unknown): AddressPoint | null {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

/** What a request adds for the pin: its two numbers, or nothing. */
export function pointBody(point: AddressPoint | null): Partial<AddressPoint> {
  return point ? { lat: point.lat, lng: point.lng } : {};
}

/** POST /users/me/addresses: the form as typed or filled from the map, plus the pin's two numbers when there is one. */
export function buildCreateBody(form: AddressForm, point: AddressPoint | null): AddressForm & Partial<AddressPoint> {
  return { ...form, ...pointBody(point) };
}
