/**
 * The filter sheet of the labs / radiology hub (owner decision 4). Only what the catalogue really carries is offered:
 * - payment: without insurance (`cash_availability`) / with insurance (`insurance_availability`);
 * - place: all / at the lab (`facility_visit_supported`, tests only) / home collection (server `home_visit=true`); the place never hides scans (R1);
 * - sort: most requested (the server's popularity order), lowest price (`lowest_price=true`), highest rated (`highest_rated=true`);
 * - no fasting (`fasting_required` false) and same-day result (`turnaround_hours` <= 24), both tests only, kept from the loaded rows.
 * Not offered, no field: nearest, open now, a cash option apart from "without insurance".
 */
import type { CatalogSort } from './diagCatalogApi';
import type { CatalogItem } from './labMappers';

export type SheetPay = 'self_pay' | 'insurance';
export type SheetPlace = 'all' | 'lab' | 'home';
export type SheetSort = 'popular' | 'lowest_price' | 'highest_rated';
export type SheetKind = 'lab' | 'radiology';

export interface SheetFilters {
  pay: SheetPay;
  place: SheetPlace;
  sort: SheetSort;
  noFasting: boolean;
  sameDay: boolean;
}

export const SAME_DAY_HOURS = 24;
export const DEFAULT_SHEET: SheetFilters = { pay: 'self_pay', place: 'all', sort: 'popular', noFasting: false, sameDay: false };

/** How many options of the sheet are on (the defaults are not counted; the payment counts once insurance is chosen). */
export const sheetFilterCount = (f: SheetFilters): number =>
  (f.pay !== DEFAULT_SHEET.pay ? 1 : 0) + (f.place !== 'all' ? 1 : 0) + (f.sort !== 'popular' ? 1 : 0) + (f.noFasting ? 1 : 0) + (f.sameDay ? 1 : 0);

export const sheetSort = (sort: SheetSort): CatalogSort | undefined => (sort === 'popular' ? undefined : sort);

/** The server asks for home visits only on the explicit home choice. */
export const sheetHomeVisit = (f: SheetFilters): boolean => f.place === 'home';

/** The toggles and the lab place keep or drop a loaded row; scans are never hidden by them (R1). */
export function passesSheet(item: Pick<CatalogItem, 'fastingRequired' | 'turnaroundHours' | 'facilityVisit'>, f: SheetFilters, kind: SheetKind): boolean {
  if (kind === 'radiology') return true;
  if (f.noFasting && item.fastingRequired) return false;
  if (f.sameDay && !(item.turnaroundHours !== null && item.turnaroundHours <= SAME_DAY_HOURS)) return false;
  if (f.place === 'lab' && !item.facilityVisit) return false;
  return true;
}

/** The "Show N results" figure: the server's total while nothing is kept back here, else what the loaded rows show. */
export function resultCount(shown: number, serverTotal: number | null, keptBack: boolean): number {
  return !keptBack && serverTotal !== null && serverTotal >= shown ? serverTotal : shown;
}
