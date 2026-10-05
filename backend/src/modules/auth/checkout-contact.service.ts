import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { parsePhoneNumberFromString, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

export interface CheckoutAddress {
  label?: string;
  street: string;
  line1?: string;
  line2?: string;
  building?: string;
  floor?: string;
  district?: string;
  city: string;
  region?: string;
  notes?: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

export interface CheckoutContact {
  id: string;
  userId: string;
  phone: string;
  address: CheckoutAddress;
  verified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
}

@Injectable()
export class CheckoutContactService {
  private readonly logger = new Logger(CheckoutContactService.name);
  private readonly SAUDI_ARABIA_CODE: CountryCode = 'SA';

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Validates and stores checkout contact (phone + address)
   * Phone: E.164 format, defaults to +966 for Saudi Arabia
   * Address: saved to patient profile addresses array
   */
  async validateAndStoreContact(
    userId: string,
    phone: string,
    address: CheckoutAddress,
  ): Promise<{ contactId: string; phone: string; addressId?: string }> {
    const e164Phone = this.normalizeToE164(phone);
    
    if (!isValidPhoneNumber(e164Phone, this.SAUDI_ARABIA_CODE)) {
      throw new BadRequestException('invalid_phone_format');
    }

    const contactId = uuidv4();
    let addressId: string | undefined;

    // Store checkout contact record
    await this.connection.collection('checkout_contacts').insertOne({
      id: contactId,
      user_id: userId,
      phone: e164Phone,
      address,
      verified: false,
      created_at: new Date(),
    });

    // Save address to patient profile
    addressId = await this.saveAddressToProfile(userId, address);

    this.logger.log(`Stored checkout contact for user ${userId}: ${e164Phone}`);

    return { contactId, phone: e164Phone, addressId };
  }

  /**
   * Normalize phone to E.164 format with +966 default for Saudi Arabia
   */
  private normalizeToE164(phone: string): string {
    const trimmed = phone.trim();
    
    // Already in E.164 format
    if (trimmed.startsWith('+')) {
      return trimmed;
    }

    // Remove any non-digits
    const digits = trimmed.replace(/\D/g, '');

    // Saudi numbers: default to +966
    if (digits.startsWith('966')) {
      return '+' + digits;
    }
    if (digits.startsWith('0')) {
      return '+966' + digits.substring(1);
    }
    if (digits.length === 9) {
      return '+966' + digits;
    }

    // Default: assume Saudi and prefix +966
    return '+966' + digits;
  }

  /**
   * Save address to patient profile addresses array
   */
  private async saveAddressToProfile(userId: string, address: CheckoutAddress): Promise<string> {
    const addressId = uuidv4();
    const addressWithId = { ...address, id: addressId, isDefault: address.isDefault ?? false };

    const profile = await this.connection.collection('patient_profiles').findOne({ user_id: userId });
    
    if (profile) {
      const addresses = profile.addresses || [];
      
      // If this is default, unset others
      if (addressWithId.isDefault) {
        addresses.forEach((a: any) => a.isDefault = false);
      }
      
      // Add new address
      addresses.push(addressWithId);

      await this.connection.collection('patient_profiles').updateOne(
        { user_id: userId },
        { $set: { addresses } },
      );
    }

    return addressId;
  }

  /**
   * Mark contact as verified (e.g., after OTP verification)
   */
  async markContactVerified(contactId: string): Promise<void> {
    await this.connection.collection('checkout_contacts').updateOne(
      { id: contactId },
      { $set: { verified: true, verified_at: new Date() } },
    );
  }

  /**
   * Get checkout contact by ID
   */
  async getContact(contactId: string): Promise<CheckoutContact | null> {
    const result = await this.connection.collection('checkout_contacts').findOne({ id: contactId });
    return result as unknown as CheckoutContact | null;
  }

  /**
   * Get latest checkout contact for user
   */
  async getLatestContact(userId: string): Promise<CheckoutContact | null> {
    const result = await this.connection.collection('checkout_contacts')
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(1)
      .next();
    return result as unknown as CheckoutContact | null;
  }

  /**
   * Check if user has verified contact for COD eligibility
   */
  async hasVerifiedContact(userId: string): Promise<boolean> {
    const contact = await this.getLatestContact(userId);
    return contact?.verified === true;
  }

  /**
   * Risk controls for unverified phones:
   * - COD limited for new unverified customers
   * - Card payments not limited
   * - Provider can call before dispatch
   */
  async checkCodEligibility(userId: string): Promise<{ eligible: boolean; reason?: string }> {
    const contact = await this.getLatestContact(userId);
    
    if (!contact) {
      return { eligible: false, reason: 'no_contact_on_file' };
    }

    if (!contact.verified) {
      // Check if user is new (account created < 30 days ago)
      const user = await this.connection.collection('users').findOne({ id: userId });
      const accountAgeDays = user?.createdAt ? 
        Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      if (accountAgeDays < 30) {
        return { eligible: false, reason: 'unverified_phone_new_customer' };
      }
      
      // Existing unverified customer - allow but flag for provider call
      return { eligible: true, reason: 'unverified_phone_provider_must_call' };
    }

    return { eligible: true };
  }
}