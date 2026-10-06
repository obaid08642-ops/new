import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './api';

const SELECTED_ADDRESS_KEY = '@nabdah_selected_address';

export interface SelectedAddress {
  id: string;
  label?: string;
  street?: string;
  city?: string;
  district?: string;
  address?: string;
  lat?: number;
  lng?: number;
  is_default?: boolean;
}

/** Persist the address the user picked (delivery/address-select or shared/location-picker). */
export async function setSelectedAddress(addr: SelectedAddress | null): Promise<void> {
  try {
    if (addr) {
      await AsyncStorage.setItem(SELECTED_ADDRESS_KEY, JSON.stringify(addr));
    } else {
      await AsyncStorage.removeItem(SELECTED_ADDRESS_KEY);
    }
  } catch {}
}

/** Read the last picked address (null if none). */
export async function getSelectedAddress(): Promise<SelectedAddress | null> {
  try {
    const raw = await AsyncStorage.getItem(SELECTED_ADDRESS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** An address picked on the map but not saved (location-picker could not save it): it has no server record to check. */
const isLocalId = (id: unknown) => typeof id === 'string' && id.startsWith('local-');

const textOf = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined);
const coord = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

/** True when the address has a map point (the pharmacy requests need one). */
export function hasMapPoint(a: SelectedAddress | null | undefined): boolean {
  return typeof a?.lat === 'number' && typeof a?.lng === 'number' && Number.isFinite(a.lat) && Number.isFinite(a.lng);
}

/**
 * The saved addresses of `GET /users/me/addresses` (a bare array of `{id, label, street, city, district, lat, lng,
 * is_default}`), each one read field by field (the other fields the server stored stay on it); an entry without an id is not an address the app can pick.
 */
export function readAddresses(response: unknown): SelectedAddress[] {
  const root = response && typeof response === 'object' && !Array.isArray(response) ? (response as { data?: unknown }) : null;
  const list = Array.isArray(response) ? response : Array.isArray(root?.data) ? root.data : [];
  return list.flatMap((entry): SelectedAddress[] => {
    if (!entry || typeof entry !== 'object') return [];
    const a = entry as Record<string, unknown>;
    const id = textOf(a.id);
    if (!id) return [];
    return [{ ...(a as object), id, label: textOf(a.label), street: textOf(a.street) ?? textOf(a.line1), city: textOf(a.city), district: textOf(a.district), address: textOf(a.address), lat: coord(a.lat), lng: coord(a.lng), is_default: a.is_default === true }];
  });
}

/** What is selected when the address list opens: the choice already made on the screen, else the address picked last, else the default, else the first. */
export function startingSelection(list: SelectedAddress[], chosen: string | null, picked: string | null): string | null {
  for (const id of [chosen, picked]) if (id && list.some((a) => a.id === id)) return id;
  return (list.find((a) => a.is_default) ?? list[0])?.id ?? null;
}

/**
 * Resolve the effective address: last picked, else the backend default, else the first saved. The saved list is read to
 * check the pick: an address that was deleted since it was picked is forgotten (it would send a request to a place the
 * patient no longer has), and one that was edited comes back as saved now. An unsaved map pick (`local-...`) is kept as it
 * is, and so is any pick when the list cannot be read (offline).
 * Returns null when the user has no addresses at all.
 */
export async function resolveEffectiveAddress(): Promise<SelectedAddress | null> {
  const picked = await getSelectedAddress();
  let list: SelectedAddress[] | null = null;
  try {
    list = readAddresses(await apiFetch('/users/me/addresses'));
  } catch {}
  if (picked) {
    if (isLocalId(picked.id) || list === null) return picked;
    const fresh = list.find((a) => a.id === picked.id);
    if (fresh) return fresh;
    await setSelectedAddress(null);
  }
  return list && list.length > 0 ? (list.find((a) => a.is_default) ?? list[0]) : null;
}

/** Human-readable one-line label for an address (Arabic UI). */
export function formatAddressLine(a: SelectedAddress | null | undefined): string {
  if (!a) return '';
  const main = a.street || a.address || a.district || '';
  const parts = [main, a.city].filter(Boolean);
  if (parts.length === 0 && a.label) return a.label;
  return parts.join('، ');
}
