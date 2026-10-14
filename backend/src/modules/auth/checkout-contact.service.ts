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

const DEFAULT_COD_LIMITS: CodLimits = {
  max_value: Number(process.env.GUEST_COD_MAX_VALUE || 500),
  max_open_orders: Number(process.env.GUEST_COD_MAX_OPEN_ORDERS || 2),
};

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
    const existing = await this.connection.collection('users').findOne({ id: accountId }, { projection: { phone_verified: 1 } });
    return {
      phone,
      phone_verified: existing?.phone_verified === true,
      address_stored: Boolean(dto.address && dto.address.trim()),
    };
  }

  /**
   * The risk control: cash on delivery is limited for a new, unverified
   * customer (a cap on value and on open orders). Card payment is never
   * limited by this rule.
   */
  async cashOnDeliveryLimits(accountId: string): Promise<CodGate> {
    const user = await this.connection.collection('users').findOne({ id: accountId });
    const verified = user?.phone_verified === true;
    const orders = await this.connection
      .collection('pharmacy_orders')
      .countDocuments({ patient_id: accountId, payment_method: 'cash', state: { $in: ['pending', 'accepted', 'preparing', 'dispatched'] } });
    if (verified || orders < DEFAULT_COD_LIMITS.max_open_orders) {
      return { allowed: true, limits: DEFAULT_COD_LIMITS };
    }
    return { allowed: false, code: 'cod_limit_reached_for_unverified_customer', limits: DEFAULT_COD_LIMITS };
  }

  /**
   * Enforce both cash limits for an unverified customer. Card payment never
   * calls this, so card orders are unaffected.
   */
  async assertCashOrderAllowed(accountId: string, amount: number): Promise<void> {
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('order_amount_invalid');
    const user = await this.connection.collection('users').findOne({ id: accountId });
    if (user?.phone_verified === true) return;
    const gate = await this.cashOnDeliveryLimits(accountId);
    if (gate.allowed === false) throw new BadRequestException(gate.code);
    if (amount > gate.limits.max_value) throw new BadRequestException('cod_value_limit_for_unverified_customer');
  }
}
