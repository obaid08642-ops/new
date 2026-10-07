import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';

export interface SplAddress {
  shortCode: string;
  buildingNumber: string;
  street: string;
  district: string;
  city: string;
  region: string;
  postalCode: string;
  additionalNumber?: string;
  unitNumber?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  formattedAddress: string;
  formattedAddressAr: string;
}

export interface SplValidationResult {
  isValid: boolean;
  address?: SplAddress;
  error?: string;
  errorCode?: string;
}

export interface SplShortCodeInput {
  shortCode: string;
  userId?: string;
  providerAccountId?: string;
}

export interface SplAddressCaptureInput {
  shortCode: string;
  buildingNumber: string;
  street: string;
  district: string;
  city: string;
  region: string;
  postalCode: string;
  additionalNumber?: string;
  unitNumber?: string;
  userId?: string;
  providerAccountId?: string;
  purpose: 'delivery' | 'nursing_visit' | 'billing' | 'profile';
}

@Injectable()
export class SplIntegrationService {
  private readonly logger = new Logger(SplIntegrationService.name);
  private readonly SPL_API_BASE = process.env.SPL_API_BASE || 'https://api.spl.gov.sa/v1';
  private readonly SPL_API_KEY = process.env.SPL_API_KEY;
  private readonly SPL_SANDBOX_BASE = process.env.SPL_SANDBOX_BASE || 'https://sandbox.api.spl.gov.sa/v1';
  private readonly SPL_SANDBOX_KEY = process.env.SPL_SANDBOX_KEY;
  private readonly USE_SANDBOX = process.env.NODE_ENV !== 'production';

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ProviderProfile.name) private readonly providerProfileModel: Model<ProviderProfileDocument>,
  ) {}

  async validateShortCode(input: SplShortCodeInput): Promise<SplValidationResult> {
    const { shortCode, userId, providerAccountId } = input;

    if (!shortCode || shortCode.trim().length < 4) {
      return {
        isValid: false,
        error: 'Short code must be at least 4 characters',
        errorCode: 'INVALID_FORMAT',
      };
    }

    const cleanCode = shortCode.trim().toUpperCase();
    const isValidFormat = /^[0-9A-Z]{4,10}$/.test(cleanCode);

    if (!isValidFormat) {
      return {
        isValid: false,
        error: 'Invalid short code format. Use alphanumeric characters only.',
        errorCode: 'INVALID_FORMAT',
      };
    }

    if (this.USE_SANDBOX && this.SPL_SANDBOX_KEY) {
      return this.callSplSandbox(cleanCode);
    }

    if (this.SPL_API_KEY) {
      return this.callSplApi(cleanCode);
    }

    return this.mockSplValidation(cleanCode);
  }

  async captureFullAddress(input: SplAddressCaptureInput): Promise<SplValidationResult> {
    const { shortCode, userId, providerAccountId, purpose } = input;

    const validation = await this.validateShortCode({ shortCode });
    if (!validation.isValid) {
      return validation;
    }

    const splAddress = validation.address!;

    const mergedAddress: SplAddress = {
      ...splAddress,
      buildingNumber: input.buildingNumber || splAddress.buildingNumber,
      street: input.street || splAddress.street,
      district: input.district || splAddress.district,
      city: input.city || splAddress.city,
      region: input.region || splAddress.region,
      postalCode: input.postalCode || splAddress.postalCode,
      additionalNumber: input.additionalNumber || splAddress.additionalNumber,
      unitNumber: input.unitNumber || splAddress.unitNumber,
      formattedAddress: this.formatAddress({
        ...splAddress,
        buildingNumber: input.buildingNumber,
        street: input.street,
        district: input.district,
        city: input.city,
        region: input.region,
        postalCode: input.postalCode,
        additionalNumber: input.additionalNumber,
        unitNumber: input.unitNumber,
      }),
      formattedAddressAr: this.formatAddressAr({
        ...splAddress,
        buildingNumber: input.buildingNumber,
        street: input.street,
        district: input.district,
        city: input.city,
        region: input.region,
        postalCode: input.postalCode,
        additionalNumber: input.additionalNumber,
        unitNumber: input.unitNumber,
      }),
    };

    if (userId) {
      await this.saveUserAddress(userId, mergedAddress, purpose);
    }

    if (providerAccountId) {
      await this.saveProviderAddress(providerAccountId, mergedAddress, purpose);
    }

    return {
      isValid: true,
      address: mergedAddress,
    };
  }

  async getAddressByShortCode(shortCode: string): Promise<SplAddress | null> {
    const result = await this.validateShortCode({ shortCode });
    return result.address || null;
  }

  async getUserAddresses(userId: string): Promise<Array<SplAddress & { purpose: string; createdAt: Date }>> {
    const user = await this.userModel.findOne({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return (user as any).spl_addresses || [];
  }

  async getProviderAddresses(providerAccountId: string): Promise<Array<SplAddress & { purpose: string; createdAt: Date }>> {
    const provider = await this.providerProfileModel.findOne({ account_id: providerAccountId });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return (provider as any).spl_addresses || [];
  }

  async setPrimaryAddress(
    entityId: string,
    shortCode: string,
    entityType: 'user' | 'provider',
  ): Promise<void> {
    if (entityType === 'user') {
      const user = await this.userModel.findOne({ id: entityId });
      if (!user) throw new NotFoundException('User not found');

      const addresses = (user as any).spl_addresses || [];
      const address = addresses.find((a: any) => a.shortCode === shortCode);
      if (!address) throw new NotFoundException('Address not found');

      addresses.forEach((a: any) => (a.isPrimary = false));
      address.isPrimary = true;

      await this.userModel.updateOne({ id: entityId }, { $set: { spl_addresses: addresses } });
    } else {
      const provider = await this.providerProfileModel.findOne({ account_id: entityId });
      if (!provider) throw new NotFoundException('Provider not found');

      const addresses = (provider as any).spl_addresses || [];
      const address = addresses.find((a: any) => a.shortCode === shortCode);
      if (!address) throw new NotFoundException('Address not found');

      addresses.forEach((a: any) => (a.isPrimary = false));
      address.isPrimary = true;

      await this.providerProfileModel.updateOne({ account_id: entityId }, { $set: { spl_addresses: addresses } });
    }
  }

  async getPrimaryAddress(entityId: string, entityType: 'user' | 'provider'): Promise<SplAddress | null> {
    if (entityType === 'user') {
      const user = await this.userModel.findOne({ id: entityId });
      if (!user) return null;
      const addresses = (user as any).spl_addresses || [];
      return addresses.find((a: any) => a.isPrimary) || addresses[0] || null;
    } else {
      const provider = await this.providerProfileModel.findOne({ account_id: entityId });
      if (!provider) return null;
      const addresses = (provider as any).spl_addresses || [];
      return addresses.find((a: any) => a.isPrimary) || addresses[0] || null;
    }
  }

  async validateAddressForDelivery(
    shortCode: string,
    serviceRadiusKm: number,
    providerLat: number,
    providerLng: number,
  ): Promise<{ valid: boolean; distanceKm?: number; address?: SplAddress; error?: string }> {
    const result = await this.validateShortCode({ shortCode });
    if (!result.isValid || !result.address) {
      return { valid: false, error: result.error };
    }

    const address = result.address;

    if (!address.coordinates) {
      return { valid: false, error: 'Address coordinates not available' };
    }

    const distance = this.calculateDistance(
      providerLat,
      providerLng,
      address.coordinates.lat,
      address.coordinates.lng,
    );

    return {
      valid: distance <= serviceRadiusKm,
      distanceKm: distance,
      address,
      error: distance > serviceRadiusKm ? `Address is ${distance.toFixed(1)}km away, exceeds service radius of ${serviceRadiusKm}km` : undefined,
    };
  }

  async getNearbyAddresses(
    lat: number,
    lng: number,
    radiusKm: number,
    limit: number = 20,
  ): Promise<Array<SplAddress & { distanceKm: number }>> {
    if (this.USE_SANDBOX && this.SPL_SANDBOX_KEY) {
      return this.callSplSandboxNearby(lat, lng, radiusKm, limit);
    }

    return this.mockNearbyAddresses(lat, lng, radiusKm, limit);
  }

  private async callSplApi(shortCode: string): Promise<SplValidationResult> {
    try {
      const response = await fetch(`${this.SPL_API_BASE}/address/short-code/${shortCode}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.SPL_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { isValid: false, error: 'Short code not found', errorCode: 'NOT_FOUND' };
        }
        throw new Error(`SPL API error: ${response.status}`);
      }

      const data = await response.json();
      return this.mapSplResponse(data);
    } catch (error) {
      this.logger.error(`SPL API call failed: ${error.message}`);
      return this.mockSplValidation(shortCode);
    }
  }

  private async callSplSandbox(shortCode: string): Promise<SplValidationResult> {
    try {
      const response = await fetch(`${this.SPL_SANDBOX_BASE}/address/short-code/${shortCode}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.SPL_SANDBOX_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { isValid: false, error: 'Short code not found in sandbox', errorCode: 'NOT_FOUND' };
        }
        throw new Error(`SPL Sandbox error: ${response.status}`);
      }

      const data = await response.json();
      return this.mapSplResponse(data);
    } catch (error) {
      this.logger.error(`SPL Sandbox call failed: ${error.message}`);
      return this.mockSplValidation(shortCode);
    }
  }

  private async callSplSandboxNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    limit: number,
  ): Promise<Array<SplAddress & { distanceKm: number }>> {
    try {
      const response = await fetch(
        `${this.SPL_SANDBOX_BASE}/address/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.SPL_SANDBOX_KEY}`,
            'Accept': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`SPL Sandbox nearby error: ${response.status}`);
      }

      const data = await response.json();
      return data.addresses?.map((addr: any) => ({
        ...this.mapSplAddress(addr),
        distanceKm: this.calculateDistance(lat, lng, addr.coordinates?.lat, addr.coordinates?.lng),
      })) || [];
    } catch (error) {
      this.logger.error(`SPL Sandbox nearby call failed: ${error.message}`);
      return this.mockNearbyAddresses(lat, lng, radiusKm, limit);
    }
  }

  private mapSplResponse(data: any): SplValidationResult {
    if (!data || !data.short_code) {
      return { isValid: false, error: 'Invalid response from SPL', errorCode: 'INVALID_RESPONSE' };
    }

    const address = this.mapSplAddress(data);
    return { isValid: true, address };
  }

  private mapSplAddress(data: any): SplAddress {
    return {
      shortCode: data.short_code,
      buildingNumber: data.building_number || '',
      street: data.street || '',
      district: data.district || '',
      city: data.city || '',
      region: data.region || '',
      postalCode: data.postal_code || '',
      additionalNumber: data.additional_number,
      unitNumber: data.unit_number,
      coordinates: data.coordinates ? { lat: data.coordinates.lat, lng: data.coordinates.lng } : undefined,
      formattedAddress: this.formatAddress(data),
      formattedAddressAr: this.formatAddressAr(data),
    };
  }

  private mockSplValidation(shortCode: string): SplValidationResult {
    const mockData: Record<string, SplAddress> = {
      'R1234': {
        shortCode: 'R1234',
        buildingNumber: '123',
        street: 'King Fahd Road',
        district: 'Olaya',
        city: 'Riyadh',
        region: 'Riyadh Region',
        postalCode: '12211',
        additionalNumber: '456',
        unitNumber: '12',
        coordinates: { lat: 24.7136, lng: 46.6753 },
        formattedAddress: '123 King Fahd Road, Olaya, Riyadh 12211',
        formattedAddressAr: '123 طريق الملك فهد، العليا، الرياض 12211',
      },
      'J5678': {
        shortCode: 'J5678',
        buildingNumber: '456',
        street: 'Prince Mohammed Bin Abdulaziz',
        district: 'Al Zahra',
        city: 'Jeddah',
        region: 'Makkah Region',
        postalCode: '23432',
        coordinates: { lat: 21.4858, lng: 39.1925 },
        formattedAddress: '456 Prince Mohammed Bin Abdulaziz, Al Zahra, Jeddah 23432',
        formattedAddressAr: '456 طريق الأمير محمد بن عبدالعزيز، الزهراء، جدة 23432',
      },
      'D9012': {
        shortCode: 'D9012',
        buildingNumber: '789',
        street: 'King Abdullah Road',
        district: 'Al Faisaliyah',
        city: 'Dammam',
        region: 'Eastern Region',
        postalCode: '32241',
        coordinates: { lat: 26.4207, lng: 50.0888 },
        formattedAddress: '789 King Abdullah Road, Al Faisaliyah, Dammam 32241',
        formattedAddressAr: '789 طريق الملك عبدالله، الفيصلية، الدمام 32241',
      },
    };

    const address = mockData[shortCode];
    if (address) {
      return { isValid: true, address };
    }

    return {
      isValid: false,
      error: 'Short code not found in sandbox',
      errorCode: 'NOT_FOUND',
    };
  }

  private mockNearbyAddresses(
    lat: number,
    lng: number,
    radiusKm: number,
    limit: number,
  ): Array<SplAddress & { distanceKm: number }> {
    const mockAddresses: SplAddress[] = [
      {
        shortCode: 'R1234',
        buildingNumber: '123',
        street: 'King Fahd Road',
        district: 'Olaya',
        city: 'Riyadh',
        region: 'Riyadh Region',
        postalCode: '12211',
        coordinates: { lat: 24.7136, lng: 46.6753 },
        formattedAddress: '123 King Fahd Road, Olaya, Riyadh 12211',
        formattedAddressAr: '123 طريق الملك فهد، العليا، الرياض 12211',
      },
      {
        shortCode: 'R5678',
        buildingNumber: '456',
        street: 'Olaya Street',
        district: 'Olaya',
        city: 'Riyadh',
        region: 'Riyadh Region',
        postalCode: '12212',
        coordinates: { lat: 24.7089, lng: 46.6721 },
        formattedAddress: '456 Olaya Street, Olaya, Riyadh 12212',
        formattedAddressAr: '456 شارع العليا، العليا، الرياض 12212',
      },
      {
        shortCode: 'R9012',
        buildingNumber: '789',
        street: 'Tahlia Street',
        district: 'Al Sulaimaniyah',
        city: 'Riyadh',
        region: 'Riyadh Region',
        postalCode: '12213',
        coordinates: { lat: 24.6987, lng: 46.6854 },
        formattedAddress: '789 Tahlia Street, Al Sulaimaniyah, Riyadh 12213',
        formattedAddressAr: '789 شارع التحلية، السليمانية، الرياض 12213',
      },
    ];

    return mockAddresses
      .map(addr => ({
        ...addr,
        distanceKm: this.calculateDistance(lat, lng, addr.coordinates!.lat, addr.coordinates!.lng),
      }))
      .filter(addr => addr.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  }

  private formatAddress(addr: Partial<SplAddress>): string {
    const parts = [
      addr.buildingNumber,
      addr.street,
      addr.district,
      addr.city,
      addr.region,
      addr.postalCode,
    ].filter(Boolean);

    if (addr.additionalNumber) parts.splice(1, 0, `Additional: ${addr.additionalNumber}`);
    if (addr.unitNumber) parts.splice(1, 0, `Unit: ${addr.unitNumber}`);

    return parts.join(', ');
  }

  private formatAddressAr(addr: Partial<SplAddress>): string {
    const parts = [
      addr.buildingNumber,
      addr.street,
      addr.district,
      addr.city,
      addr.region,
      addr.postalCode,
    ].filter(Boolean);

    if (addr.additionalNumber) parts.splice(1, 0, `إضافي: ${addr.additionalNumber}`);
    if (addr.unitNumber) parts.splice(1, 0, `وحدة: ${addr.unitNumber}`);

    return parts.join('، ');
  }

  private async saveUserAddress(userId: string, address: SplAddress, purpose: string): Promise<void> {
    const user = await this.userModel.findOne({ id: userId });
    if (!user) return;

    const addresses = (user as any).spl_addresses || [];
    const existingIndex = addresses.findIndex((a: any) => a.shortCode === address.shortCode);

    const addressRecord = {
      ...address,
      purpose,
      createdAt: new Date(),
      isPrimary: addresses.length === 0,
    };

    if (existingIndex >= 0) {
      addresses[existingIndex] = { ...addresses[existingIndex], ...addressRecord };
    } else {
      addresses.push(addressRecord);
    }

    await this.userModel.updateOne({ id: userId }, { $set: { spl_addresses: addresses } });
  }

  private async saveProviderAddress(providerAccountId: string, address: SplAddress, purpose: string): Promise<void> {
    const provider = await this.providerProfileModel.findOne({ account_id: providerAccountId });
    if (!provider) return;

    const addresses = (provider as any).spl_addresses || [];
    const existingIndex = addresses.findIndex((a: any) => a.shortCode === address.shortCode);

    const addressRecord = {
      ...address,
      purpose,
      createdAt: new Date(),
      isPrimary: addresses.length === 0,
    };

    if (existingIndex >= 0) {
      addresses[existingIndex] = { ...addresses[existingIndex], ...addressRecord };
    } else {
      addresses.push(addressRecord);
    }

    await this.providerProfileModel.updateOne({ account_id: providerAccountId }, { $set: { spl_addresses: addresses } });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}