/**
 * Phase 21.3 — what a guest may do.
 *
 * The matrix is stored in Mongo so the admin can edit it without a deploy
 * (21.3 Verify). A guest may browse, search, use the cart, order from the
 * pharmacy and book consultations, labs, radiology and nursing. A full account
 * is required for insurance, family, medical records and reports, prescription
 * refills, loyalty points, saved cards and chat history after an order closed.
 *
 * `GuestCapabilityGuard` enforces it, so a route cannot accidentally skip it.
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Reflector } from '@nestjs/core';
import { SetMetadata, Injectable as NestInjectable } from '@nestjs/common';

export const GUEST_CAPABILITY_KEY = 'guest_capability';

export type GuestCapability =
  | 'browse'
  | 'search'
  | 'cart'
  | 'pharmacy_order'
  | 'book_consultation'
  | 'book_lab'
  | 'book_radiology'
  | 'book_nursing'
  | 'pay_card'
  | 'pay_cash'
  | 'insurance'
  | 'family'
  | 'medical_records'
  | 'prescription_refill'
  | 'loyalty'
  | 'saved_cards'
  | 'chat_history';

/** The owner-approved default matrix (21.3). */
export const DEFAULT_GUEST_CAPABILITIES: Record<GuestCapability, boolean> = {
  browse: true,
  search: true,
  cart: true,
  pharmacy_order: true,
  book_consultation: true,
  book_lab: true,
  book_radiology: true,
  book_nursing: true,
  pay_card: true,
  pay_cash: true,
  insurance: false,
  family: false,
  medical_records: false,
  prescription_refill: false,
  loyalty: false,
  saved_cards: false,
  chat_history: false,
};

const MATRIX_COLLECTION = 'guest_capability_matrix';
const MATRIX_ID = 'default';

@Injectable()
export class GuestPermissionMatrixService {
  private readonly logger = new Logger(GuestPermissionMatrixService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /** Read the admin-editable matrix, falling back to the owner-approved default. */
  async matrix(): Promise<Record<GuestCapability, boolean>> {
    const row = await this.connection.collection(MATRIX_COLLECTION).findOne({ id: MATRIX_ID });
    const stored = (row?.capabilities ?? {}) as Partial<Record<GuestCapability, boolean>>;
    const merged = { ...DEFAULT_GUEST_CAPABILITIES };
    for (const [key, value] of Object.entries(stored)) {
      if (key in DEFAULT_GUEST_CAPABILITIES && typeof value === 'boolean') {
        merged[key as GuestCapability] = value;
      }
    }
    return merged;
  }

  /** Admin edit. Applied on the next request: no deploy. */
  async setCapabilities(patch: Partial<Record<GuestCapability, boolean>>, updatedBy: string) {
    const known = Object.keys(DEFAULT_GUEST_CAPABILITIES);
    const clean: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(patch ?? {})) {
      if (!known.includes(key)) throw new ForbiddenException(`unknown_guest_capability:${key}`);
      if (typeof value !== 'boolean') throw new ForbiddenException(`guest_capability_must_be_boolean:${key}`);
      clean[key] = value;
    }
    await this.connection.collection(MATRIX_COLLECTION).updateOne(
      { id: MATRIX_ID },
      { $set: { id: MATRIX_ID, capabilities: clean, updated_by: updatedBy, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
      { upsert: true },
    );
    this.logger.log(`guest capability matrix updated by ${updatedBy}: ${JSON.stringify(clean)}`);
    return this.matrix();
  }

  async isAllowed(capability: GuestCapability): Promise<boolean> {
    const matrix = await this.matrix();
    return matrix[capability] === true;
  }

  /** A guest asking for a full-account-only capability gets the reason code. */
  async explain(capability: GuestCapability): Promise<{ code: string; capability: GuestCapability }> {
    return { code: 'account_required', capability };
  }
}

/** `@GuestRequires('insurance')` on a controller method. */
export const GuestRequires = (capability: GuestCapability) => SetMetadata(GUEST_CAPABILITY_KEY, capability);

/**
 * Enforces the matrix for every route that asks for a capability. A signed-in
 * non-guest account always passes: the matrix only restricts guests.
 */
@NestInjectable()
export class GuestCapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly matrix: GuestPermissionMatrixService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<GuestCapability>(GUEST_CAPABILITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    if (!user?.is_guest) return true;
    if (await this.matrix.isAllowed(required)) return true;
    const { code } = await this.matrix.explain(required);
    throw new ForbiddenException(code);
  }
}
