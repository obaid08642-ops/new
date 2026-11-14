/**
 * Pharmacy delivery with its own couriers (owner decision 2026-11-02): the form state, the check and the payload that
 * PUT /provider/pharmacy/delivery-settings and the onboarding step 3 take (`own_delivery`). The server validates again.
 */
export type OwnDeliveryForm = {
  enabled: boolean;
  zoneType: 'radius' | 'districts';
  radius: string;
  districts: string[];
  fee: string;
  freeOver: string;
};

export const EMPTY_OWN_DELIVERY: OwnDeliveryForm = { enabled: false, zoneType: 'radius', radius: '', districts: [], fee: '0', freeOver: '' };

export type OwnDeliveryPayload = {
  enabled: boolean;
  zone_type?: 'radius' | 'districts';
  radius_km?: number;
  district_codes?: string[];
  fee_sar?: number;
  free_over_sar?: number | null;
};

/** The saved config from the server, as form state (what the pharmacy saved, no invented defaults). */
export function ownDeliveryFromServer(od: any): OwnDeliveryForm {
  if (!od || od.enabled !== true) return { ...EMPTY_OWN_DELIVERY };
  return {
    enabled: true,
    zoneType: od.zone_type === 'districts' ? 'districts' : 'radius',
    radius: od.radius_km != null ? String(od.radius_km) : '',
    districts: Array.isArray(od.district_codes) ? od.district_codes.map(String) : [],
    fee: od.fee_sar != null ? String(od.fee_sar) : '0',
    freeOver: od.free_over_sar != null ? String(od.free_over_sar) : '',
  };
}

const num = (s: string) => (s.trim() === '' ? NaN : Number(s));

export type OwnDeliveryErrorKey = 'pharmacy.ownDelivery.errRadius' | 'pharmacy.ownDelivery.errDistricts' | 'pharmacy.ownDelivery.errFee' | 'pharmacy.ownDelivery.errFreeOver';

/** A locale key for the first problem, or null when the form can be sent. */
export function ownDeliveryError(f: OwnDeliveryForm): OwnDeliveryErrorKey | null {
  if (!f.enabled) return null;
  if (f.zoneType === 'radius') {
    const r = num(f.radius);
    if (!Number.isFinite(r) || r < 0.5 || r > 100) return 'pharmacy.ownDelivery.errRadius';
  } else if (!f.districts.length) return 'pharmacy.ownDelivery.errDistricts';
  const fee = num(f.fee === '' ? '0' : f.fee);
  if (!Number.isFinite(fee) || fee < 0 || fee > 500) return 'pharmacy.ownDelivery.errFee';
  if (f.freeOver.trim() !== '') {
    const o = num(f.freeOver);
    if (!Number.isFinite(o) || o < 0 || o > 10000) return 'pharmacy.ownDelivery.errFreeOver';
  }
  return null;
}

export function ownDeliveryPayload(f: OwnDeliveryForm): OwnDeliveryPayload {
  if (!f.enabled) return { enabled: false };
  return {
    enabled: true,
    zone_type: f.zoneType,
    ...(f.zoneType === 'radius' ? { radius_km: num(f.radius) } : { district_codes: f.districts }),
    fee_sar: num(f.fee === '' ? '0' : f.fee),
    free_over_sar: f.freeOver.trim() === '' ? null : num(f.freeOver),
  };
}
