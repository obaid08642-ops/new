export type CartDraftLine = { id?: string; sku?: string; name?: string; name_ar?: string; qty?: number; quantity?: number; [key: string]: unknown };
export type DeliveryAddress = { label?: string; street?: string; city?: string; lat?: number; lng?: number };

export function buildPatientPharmacyDraft(items: CartDraftLine[], deliveryAddress: DeliveryAddress, prescriptionAttachment?: string, opts?: { fulfillment?: 'delivery' | 'pickup'; payment_mode?: 'cash' | 'insurance' }) {
  return {
    items: items.map((item) => ({
      raw_name: String(item.name_ar || item.name || '').trim(),
      qty: Math.max(1, Number(item.qty ?? item.quantity) || 1),
      sku: item.sku || item.id,
      intake_source: typeof item.intake_source === 'string' ? item.intake_source : 'cart',
    })).filter((item) => item.raw_name),
    delivery_address: {
      label: deliveryAddress.label || 'المنزل', street: deliveryAddress.street || '', city: deliveryAddress.city || '',
      lat: Number(deliveryAddress.lat), lng: Number(deliveryAddress.lng),
    },
    prescription_attachments: prescriptionAttachment ? [prescriptionAttachment] : [],
    // F73: draft fulfillment + payment mode travel end-to-end.
    fulfillment: opts?.fulfillment === 'pickup' ? 'pickup' : 'delivery',
    payment_mode: opts?.payment_mode === 'insurance' ? 'insurance' : 'cash',
  };
}

export function extractPatientPharmacyOrderId(response: any): string | null {
  const id = response?.data?.id || response?.id;
  return typeof id === 'string' && id.trim() ? id : null;
}
