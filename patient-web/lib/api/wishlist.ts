import { z } from "zod";

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
export type WishlistItem = { id: string; nameAr?: string; nameEn?: string; brand?: string; price?: number; discount?: number; inStock?: boolean; requiresPrescription?: boolean };

function record(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function text(value: Record<string, unknown>, keys: string[]) { for (const key of keys) if (typeof value[key] === "string" && value[key].trim()) return value[key] as string; return undefined; }
function number(value: Record<string, unknown>, keys: string[]) { for (const key of keys) if (typeof value[key] === "number" && Number.isFinite(value[key])) return value[key] as number; return undefined; }
function item(value: unknown): WishlistItem | null {
  const r = record(value); const id = idSchema.safeParse(r?.id); if (!r || !id.success) return null;
  return { id: id.data, nameAr: text(r,["name_ar"]), nameEn: text(r,["name_en","name"]), brand: text(r,["brand"]), price: number(r,["price"]), discount: number(r,["discount"]), inStock: typeof r.inStock === "boolean" ? r.inStock : typeof r.in_stock === "boolean" ? r.in_stock : undefined, requiresPrescription: typeof r.requires_prescription === "boolean" ? r.requires_prescription : undefined };
}
export function parseWishlistItemId(value: string) { return idSchema.safeParse(value); }
export function extractWishlist(payload: unknown): WishlistItem[] { const root=record(payload); const values=Array.isArray(payload)?payload:Array.isArray(root?.data)?root.data:Array.isArray(root?.items)?root.items:[]; return values.flatMap((v)=>{const parsed=item(v); return parsed?[parsed]:[];}); }
