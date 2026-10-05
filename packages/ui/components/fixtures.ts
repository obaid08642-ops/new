/**
 * Specimen data for the component gallery — 12.A7.
 *
 * The gallery in `build-preview.mjs` renders real components, so it needs real
 * props. These fixtures exist so that data is written once and is obviously FAKE
 * where it is fake: a phone number here is not a patient's, a price is not a
 * quote, and a rating count is not a popularity claim.
 *
 * Everything a screen would normally get from an API arrives here as a literal,
 * which is the only honest way to render a component in a static preview.
 */

import type { Option, Slot, TabItem } from './contract';

/** The handoff §1 service map, in the order HomeApp shows it (labels are specimen text). */
export const SERVICE_TILES = [
  { name: 'consult', label: 'Consultations' },
  { name: 'pharmacy', label: 'Pharmacy' },
  { name: 'lab', label: 'Labs' },
  { name: 'radiology', label: 'Radiology' },
  { name: 'nursing', label: 'Nursing' },
  { name: 'nutrition', label: 'Nutrition' },
  { name: 'maternity', label: 'Maternity' },
  { name: 'map', label: 'Map' },
  { name: 'health', label: 'My health' },
  { name: 'emergency', label: 'Emergency' },
  { name: 'mind', label: 'Mental health' },
  { name: 'family', label: 'Family' },
  { name: 'insurance', label: 'Insurance' },
  { name: 'points', label: 'Points' },
] as const;

export const TABS: TabItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'bookings', label: 'Bookings', icon: 'calendar', badge: 3 },
  { id: 'orders', label: 'Orders', icon: 'list' },
  { id: 'family', label: 'Family', icon: 'users' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];

export const SEGMENTED: TabItem[] = [
  { id: 'all', label: 'All', icon: 'list' },
  { id: 'active', label: 'Active', icon: 'check-circle' },
  { id: 'done', label: 'Done', icon: 'check' },
];

export const SIDEBAR_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'orders', label: 'Orders', icon: 'list', badge: 12 },
  { id: 'users', label: 'Patients', icon: 'users' },
  { id: 'billing', label: 'Billing', icon: 'card' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const CITIES: Option[] = [
  { value: 'riyadh', label: 'Riyadh' },
  { value: 'jeddah', label: 'Jeddah' },
  { value: 'dammam', label: 'Dammam' },
  { value: 'abha', label: 'Abha', disabled: true },
];

export const SLOTS: Slot[] = [
  { id: '0900', label: '09:00' },
  { id: '1000', label: '10:00' },
  { id: '1100', label: '11:00', available: false },
  { id: '1200', label: '12:00' },
  { id: '1600', label: '16:00' },
  { id: '1730', label: '17:30', available: false },
];

export const LIST_ROWS = [
  { title: 'Dr. Amina Haddad', subtitle: 'Endocrinology · 12 years', meta: '4.9', startIcon: 'star' },
  { title: 'Dr. Youssef Karim', subtitle: 'Cardiology · 8 years', meta: '4.6', startIcon: 'star' },
  { title: 'Dr. Salma Nour', subtitle: 'Paediatrics · 15 years', meta: '4.8', startIcon: 'star', disabled: true },
] as const;

/** Prices are in SAR and are EXAMPLE amounts, not a quote for anything. */
export const PRICES = [
  { amount: '180', currency: 'SAR', note: 'per visit' },
  { amount: '240', was: '300', currency: 'SAR', note: '20% off' },
] as const;
