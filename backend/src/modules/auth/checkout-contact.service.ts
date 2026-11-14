/**
 * Phase 21.5 — contact phone and address at checkout, without SMS.
 *
 * One field, never two. The default country code is +966. Arabic-Indic digits
 * are accepted and normalised. The stored value is E.164 and the user is shown
 * it formatted back ("is this right?"). An unverified phone is marked as such,
 * and cash on delivery is capped for a new, unverified customer while card
 * payment is not.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomUUID } from 'crypto';

export interface NormalizedPhone {
  e164: string;
  national: string;
  country: string;
  display: string;
}

/** Cash-on-delivery limits for a phone that was never verified. */
export interface CodLimits {
  max_value: number;
  max_open_orders: number;
}

export type CodGate = { allowed: true; limits: CodLimits } | { allowed: false; code: string; limits: CodLimits };

/** Statuses of a pharmacy order that is still open on cash on delivery (PharmacyOrderState values). */
const OPEN_COD_STATES = ['cod_due_on_delivery', 'confirmed', 'in_fulfillment', 'out_for_delivery'];

/**
 * The limits for an unverified phone. The admin sets them in `system_configs.payment_rules`
 * (`unverified_cod_max_sar`, `unverified_cod_max_open_orders`); the env values are the fallback.
 */
async function readCodLimits(db: Connection): Promise<CodLimits> {
  const doc: any = await db.collection('system_configs').findOne({ key: 'payment_rules' });
  const value = Number(doc?.value?.unverified_cod_max_sar);
  const open = Number(doc?.value?.unverified_cod_max_open_orders);
  return {
    max_value: value > 0 ? value : Number(process.env.GUEST_COD_MAX_VALUE || 500),
    max_open_orders: open > 0 ? Math.floor(open) : Number(process.env.GUEST_COD_MAX_OPEN_ORDERS || 2),
  };
}

/** The phone number is verified only when a channel confirmed it (a code, or the provider after a call). */
export async function isPhoneVerified(db: Connection, accountId: string): Promise<boolean> {
  const user: any = await db.collection('users').findOne({ id: accountId }, { projection: { phone_verified: 1 } });
  return user?.phone_verified === true;
}

/** True when the account has a phone the provider can call: the profile's own, or the one saved at checkout. */
export async function hasContactPhone(db: Connection, accountId: string): Promise<boolean> {
  const user: any = await db.collection('users').findOne({ id: accountId }, { projection: { phone: 1 } });
  if (typeof user?.phone === 'string' && user.phone.trim()) return true;
  const saved: any = await db.collection('patient_addresses').findOne({ user_id: accountId, kind: 'checkout_contact' }, { projection: { phone_e164: 1 } });
  return typeof saved?.phone_e164 === 'string' && saved.phone_e164.length > 0;
}

/**
 * 21.5 — the cash-on-delivery limit for a customer whose phone was never verified: a cap on the value and on the
 * open cash orders. A verified phone, and every card payment, is out of its reach. `exceptOrderId` is the order being
 * registered, so it never counts against itself.
 */
export async function assertUnverifiedCodAllowed(db: Connection, accountId: string, amount: number, exceptOrderId?: string): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('order_amount_invalid');
  if (await isPhoneVerified(db, accountId)) return;
  const limits = await readCodLimits(db);
  const open = await db.collection('pharmacy_orders').countDocuments({
    patient_account_id: accountId,
    payment_method: 'cod',
    status: { $in: OPEN_COD_STATES },
    ...(exceptOrderId ? { id: { $ne: exceptOrderId } } : {}),
  });
  if (open >= limits.max_open_orders) throw new BadRequestException('cod_limit_reached_for_unverified_customer');
  if (amount > limits.max_value) throw new BadRequestException('cod_value_limit_for_unverified_customer');
}

/** Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) to Latin. */
export function normalizeDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

@Injectable()
export class CheckoutContactService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Accepts `05XXXXXXXX`, `5XXXXXXXX`, `+9665XXXXXXXX`, `009665XXXXXXXX` and
   * either digit set. Returns E.164 plus a formatted form for confirmation.
   */
  normalizePhone(input: string, defaultCountry: CountryCode = 'SA'): NormalizedPhone {
    if (typeof input !== 'string' || !input.trim()) throw new BadRequestException('contact_phone_required');
    const digits = normalizeDigits(input).replace(/[\s().-]/g, '');
    if (!/^\+?\d{6,15}$/.test(digits)) throw new BadRequestException('contact_phone_invalid');
    const parsed = parsePhoneNumberFromString(digits, defaultCountry);
    if (!parsed?.isValid()) throw new BadRequestException('contact_phone_invalid');
    return {
      e164: parsed.number,
      national: parsed.nationalNumber,
      country: parsed.country ?? String(defaultCountry),
      display: parsed.formatInternational(),
    };
  }

  /** Save the checkout contact on the profile (address + the one phone field). */
  async storeCheckoutContact(
    accountId: string,
    dto: { phone: string; address?: string; label?: string },
  ): Promise<{ phone: NormalizedPhone; phone_verified: boolean; address_stored: boolean }> {
    const phone = this.normalizePhone(dto.phone);
    const now = new Date();
    const contacts = this.connection.collection('patient_addresses');
    await contacts.updateOne(
      { user_id: accountId, kind: 'checkout_contact' },
      {
        $set: {
          user_id: accountId,
          kind: 'checkout_contact',
          phone_e164: phone.e164,
          phone_display: phone.display,
          address: dto.address ?? null,
          label: dto.label ?? 'checkout',
          updated_at: now,
        },
        $setOnInsert: { created_at: now },
      },
      { upsert: true },
    );
    const line = (dto.address ?? '').trim();
    if (line) await this.saveProfileAddress(accountId, line, dto.label);
    const existing = await this.connection.collection('users').findOne({ id: accountId }, { projection: { phone_verified: 1 } });
    return {
      phone,
      phone_verified: existing?.phone_verified === true,
      address_stored: Boolean(line),
    };
  }

  /** The address goes to the profile's address book (what the app and the website list), once per identical line. */
  private async saveProfileAddress(accountId: string, line: string, label?: string): Promise<void> {
    const profiles = this.connection.collection('patient_profiles');
    const profile: any = await profiles.findOne({ user_id: accountId }, { projection: { addresses: 1 } });
    const book: any[] = Array.isArray(profile?.addresses) ? profile.addresses : [];
    if (book.some((a) => (a?.street || a?.line1) === line)) return;
    // The mobile app reads `street`, the website `line1`: both are stored, as POST /users/me/addresses does.
    const entry = { id: randomUUID(), label: label ?? 'checkout', street: line, line1: line, is_default: book.length === 0 };
    await profiles.updateOne({ user_id: accountId }, { $push: { addresses: entry } as any, $setOnInsert: { user_id: accountId } }, { upsert: true });
  }

  /** The limits that apply to this account right now (the app shows them before the patient picks cash). */
  async cashOnDeliveryLimits(accountId: string): Promise<CodGate & { phone_verified: boolean; open_cod_orders: number }> {
    const limits = await readCodLimits(this.connection);
    const verified = await isPhoneVerified(this.connection, accountId);
    const open = await this.connection.collection('pharmacy_orders').countDocuments({ patient_account_id: accountId, payment_method: 'cod', status: { $in: OPEN_COD_STATES } });
    const allowed = verified || open < limits.max_open_orders;
    return allowed
      ? { allowed: true, limits, phone_verified: verified, open_cod_orders: open }
      : { allowed: false, code: 'cod_limit_reached_for_unverified_customer', limits, phone_verified: verified, open_cod_orders: open };
  }

  /** Enforce both cash limits for an unverified customer. Card payment never calls this. */
  assertCashOrderAllowed(accountId: string, amount: number, exceptOrderId?: string): Promise<void> {
    return assertUnverifiedCodAllowed(this.connection, accountId, amount, exceptOrderId);
  }

  /**
   * A channel confirmed the phone (a WhatsApp code when enabled, or the provider after calling the patient).
   * Nothing else sets the flag.
   */
  async markPhoneVerified(accountId: string, source: 'otp' | 'provider_call'): Promise<void> {
    await this.connection.collection('users').updateOne({ id: accountId }, { $set: { phone_verified: true, phone_verified_at: new Date(), phone_verified_by: source } });
  }
}
