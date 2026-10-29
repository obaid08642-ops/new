/**
 * Phase 21.3 - what a guest may do, enforced in ONE place.
 *
 * `GuestPermissionMatrixService` holds the admin-editable matrix (a guest may browse, search, use the cart, order, book and pay;
 * a full account is needed for insurance, family, medical records, refills, loyalty, saved cards and old chat history). Until
 * now nothing enforced it: `@GuestRequires` was used on no route, and the static NoGuestsGuard ignored the admin's changes.
 *
 * This file is the table that connects each capability to the routes it covers, and the global guard that applies it:
 *   - it looks only at signed-in GUESTS (an account is never restricted by the matrix);
 *   - it matches method + path against GUEST_ROUTE_RULES, so a new route under a covered prefix is covered without anyone
 *     remembering a decorator, and the table can be read and tested row by row (guest-policy.spec.ts, one test per capability);
 *   - it answers 403 { code: 'account_required', capability } - the apps use the capability to explain why and to offer the
 *     one-tap sign-up that keeps the guest's history (21.2).
 * Chat history after a thread is closed is the one rule that needs the thread, so the guard reads it.
 */
import { CanActivate, CallHandler, ExecutionContext, ForbiddenException, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Observable, mergeMap } from 'rxjs';
import { GuestCapability, GuestPermissionMatrixService } from './permission-matrix.service';

export interface GuestRouteRule {
  capability: GuestCapability;
  /** HTTP methods the rule covers; omitted = all. */
  methods?: string[];
  /** Matched against the path without the `/api/vN` prefix and without the query string. */
  path: RegExp;
}

const READ = ['GET', 'HEAD'];

export const GUEST_ROUTE_RULES: GuestRouteRule[] = [
  // ── a full account is required (default off for guests) ──
  // `GET /insurance/companies` (and its plans and networks) is the PUBLIC insurer list: a guest picking an insurer on /insurance/add-policy got a 403 from this row (QA 2026-10-29, "page unavailable").
  // The patient's own policy, requests and claims under /insurance stay behind a full account.
  { capability: 'insurance', path: /^\/(insurance(?!\/companies(\/|$))|users\/me\/insurance|user\/insurance)(\/|$)/ },
  { capability: 'insurance', path: /^\/patient\/pharmacy\/orders\/[^/]+\/insurance(\/|$)/ },
  { capability: 'insurance', path: /^\/(labs|radiology)\/bookings\/[^/]+\/insurance(\/|$)/ },
  { capability: 'family', path: /^\/family(\/|$)/ },
  { capability: 'medical_records', path: /^\/(medical-reports|lab-results|medical-profile)(\/|$)/ },
  { capability: 'medical_records', methods: READ, path: /^\/health\/(reports|prescriptions|chronic-diseases|chronic-meds)(\/|$)/ },
  { capability: 'prescription_refill', methods: ['POST'], path: /^\/health\/(reminders|medications)\/[^/]+\/refill(\/|$)/ },
  { capability: 'loyalty', path: /^\/loyalty(\/|$)/ },
  { capability: 'saved_cards', path: /^\/(payment-methods|cards|payments\/methods)(\/|$)/ },
  // ── allowed by default, and the admin can switch them off ──
  { capability: 'browse', methods: READ, path: /^\/(medicines|doctors|providers|articles|catalog|home-care\/packages|labs\/(services|packages|categories)|radiology\/(services|modalities|carousel))(\/|$)/ },
  { capability: 'search', methods: READ, path: /^\/search(\/|$)/ },
  { capability: 'cart', path: /^\/cart(\/|$)/ },
  { capability: 'pharmacy_order', methods: ['POST'], path: /^\/patient\/pharmacy\/orders(\/[^/]+\/submit)?$/ },
  { capability: 'book_consultation', methods: ['POST'], path: /^\/care\/appointments$/ },
  { capability: 'book_lab', methods: ['POST'], path: /^\/labs\/bookings$/ },
  { capability: 'book_radiology', methods: ['POST'], path: /^\/radiology\/bookings$/ },
  { capability: 'book_nursing', methods: ['POST'], path: /^\/(home-care|nursing)\/bookings$/ },
  { capability: 'pay_card', methods: ['POST'], path: /^\/(payments\/intent(\/|$)|moyasar\/payments$|patient\/pharmacy\/orders\/[^/]+\/payment-retry$)/ },
  { capability: 'pay_cash', methods: ['POST'], path: /^\/patient\/pharmacy\/orders\/[^/]+\/cod\/register$/ },
];

/** Capabilities with no route yet (nothing in the platform saves a card): listed so a test notices when that changes. */
export const CAPABILITIES_WITHOUT_ROUTE: GuestCapability[] = ['saved_cards'];

/** `/api/v1/cart/items?x=1` -> `/cart/items`. */
export function policyPath(url: string): string {
  const noQuery = String(url || '').split('?')[0];
  const noPrefix = noQuery.replace(/^\/api(\/v\d+)?(?=\/|$)/, '');
  return noPrefix.length > 1 ? noPrefix.replace(/\/+$/, '') : noPrefix || '/';
}

/** The capabilities a request needs, in table order. */
export function capabilitiesFor(method: string, url: string): GuestCapability[] {
  const m = String(method || 'GET').toUpperCase();
  const p = policyPath(url);
  const out: GuestCapability[] = [];
  for (const rule of GUEST_ROUTE_RULES) {
    if (rule.methods && !rule.methods.includes(m)) continue;
    if (rule.path.test(p) && !out.includes(rule.capability)) out.push(rule.capability);
  }
  return out;
}

const CHAT_THREAD = /^\/chats?\/threads\/([^/]+)(\/messages)?$/;
const CHAT_LIST = /^\/chats?\/threads$/;

export const isGuestUser = (user: { is_guest?: boolean; role?: string } | undefined) => user?.is_guest === true || user?.role === 'guest';

export function accountRequired(capability: GuestCapability) {
  return new ForbiddenException({ statusCode: 403, code: 'account_required', capability, message: 'account_required' });
}

@Injectable()
export class GuestPolicyGuard implements CanActivate {
  constructor(
    private readonly matrix: GuestPermissionMatrixService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest();
    if (!isGuestUser(req?.user)) return true;               // the matrix restricts guests only
    const url: string = req.originalUrl || req.url || '';
    const method: string = req.method;

    const needed = capabilitiesFor(method, url);
    if (needed.length) {
      const matrix = await this.matrix.matrix();
      for (const capability of needed) if (matrix[capability] !== true) throw accountRequired(capability);
    }

    // chat history after a thread is closed
    if (READ.includes(String(method).toUpperCase())) {
      const hit = CHAT_THREAD.exec(policyPath(url));
      if (hit && !(await this.matrix.isAllowed('chat_history'))) {
        const thread: any = await this.connection.collection('chat_threads').findOne({ id: { $eq: hit[1] } }, { projection: { closed_at: 1, is_active: 1 } });
        if (thread && (thread.closed_at || thread.is_active === false)) throw accountRequired('chat_history');
      }
    }
    return true;
  }
}

/** The thread list of a guest without `chat_history` shows open threads only (a closed one is history). */
@Injectable()
export class GuestChatListInterceptor implements NestInterceptor {
  constructor(private readonly matrix: GuestPermissionMatrixService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const isList = isGuestUser(req?.user) && String(req.method).toUpperCase() === 'GET' && CHAT_LIST.test(policyPath(req.originalUrl || req.url || ''));
    if (!isList) return next.handle();
    return next.handle().pipe(
      mergeMap(async (body: any) => {
        if (await this.matrix.isAllowed('chat_history')) return body;
        if (!body || !Array.isArray(body.threads)) return body;
        const threads = body.threads.filter((t: any) => !t?.closed_at && t?.is_active !== false);
        return { ...body, threads, total: Math.max(0, Number(body.total || 0) - (body.threads.length - threads.length)) };
      }),
    );
  }
}
