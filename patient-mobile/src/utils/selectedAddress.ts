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

/**
 * Resolve the effective address: last picked → backend default → first saved.
 * Returns null when the user has no addresses at all.
 */
export async function resolveEffectiveAddress(): Promise<SelectedAddress | null> {
  const picked = await getSelectedAddress();
  if (picked) return picked;
  try {
    const list = await apiFetch('/users/me/addresses');
    if (Array.isArray(list) && list.length > 0) {
      return list.find((a: any) => a.is_default) || list[0];
    }
  } catch {}
  return null;
}

/** Human-readable one-line label for an address (Arabic UI). */
export function formatAddressLine(a: SelectedAddress | null | undefined): string {
  if (!a) return '';
  const main = a.street || a.address || a.district || '';
  const parts = [main, a.city].filter(Boolean);
  if (parts.length === 0 && a.label) return a.label;
  return parts.join('، ');
}
