import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Owner decision 2026-10-30: no "needs review" anywhere a patient or a provider can see it. The review state of a catalogue row
 * (`needs_clinical_review`, `reviewed_by`, `medical_review_status`, ...) stays in the database for the admin console only; every public, patient and
 * provider response of the labs, radiology, nursing/home-care, catalogue, search, SEO and MCP surfaces is stripped of it here, whichever service built the row.
 * Shape-based like `toPublicCatalogRow` (#2093): a review field added to a schema later is internal by its name, not public until someone remembers to hide it.
 * Doctor ratings (`rating`, `reviews`, `review_count`) are a product feature, not review state, and are not matched.
 */
const INTERNAL_REVIEW_KEY = /^(medical_review_[a-z_]+|needs_[a-z_]*review[a-z_]*|reviewed_[a-z_]+|last_reviewed[a-z_]*|review_(status|state|note|notes)|clinical_(review|notes?|flags?)[a-z_]*|internal_[a-z_]+)$/;

export const isInternalReviewKey = (key: string): boolean => INTERNAL_REVIEW_KEY.test(key);

const MAX_DEPTH = 12;

function isPlain(v: unknown): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;     // a class instance without toJSON (a stream, a file, a Map) is left untouched
}

/** A copy of the value without the review fields at any depth. Mongoose documents and anything with toJSON are read through toJSON first (as the serializer would). */
export function stripInternalReviewFields<T>(value: T, depth = 0): T {
  if (value === null || typeof value !== 'object' || depth > MAX_DEPTH || value instanceof Date || Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map((v) => stripInternalReviewFields(v, depth + 1)) as unknown as T;
  let obj: unknown = value;
  const withJson = value as { toJSON?: () => unknown };
  if (typeof withJson.toJSON === 'function') {
    obj = withJson.toJSON();
    if (!isPlain(obj) && !Array.isArray(obj)) return obj as T;      // a string, a number, an id: nothing to strip
    if (Array.isArray(obj)) return stripInternalReviewFields(obj, depth + 1) as unknown as T;
  }
  if (!isPlain(obj)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (!isInternalReviewKey(k)) out[k] = stripInternalReviewFields(v, depth + 1);
  return out as T;
}

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

/** The admin console edits the review state, so an admin caller and an `/admin/` route (the catalogue editors live on the labs / radiology / nursing controllers) see the whole row. */
export function seesReviewState(req: { user?: { role?: string }; originalUrl?: string; url?: string; path?: string } | undefined): boolean {
  if (!req) return false;
  if (req.user?.role && ADMIN_ROLES.has(String(req.user.role))) return true;
  const path = String(req.originalUrl ?? req.url ?? req.path ?? '').split('?')[0];
  return /(^|\/)admin(\/|$)/.test(path);
}

/** `@UseInterceptors(StripInternalReviewFieldsInterceptor)` on a controller whose responses reach patients or providers. Admin controllers do not need it; an admin caller or an `/admin/` route passes through. */
@Injectable()
export class StripInternalReviewFieldsInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = typeof ctx?.switchToHttp === 'function' ? ctx.switchToHttp().getRequest() : undefined;
    if (seesReviewState(req)) return next.handle();
    return next.handle().pipe(map((body) => stripInternalReviewFields(body)));
  }
}
