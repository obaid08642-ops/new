import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser, JwtAuthGuard } from '../../common/auth.guard';
import { RequireIdempotency } from '../../common/idempotency.interceptor';
import { v4 as uuid } from 'uuid';

type Address = {
  id: string;
  label: string;
  street: string;
  address?: string;
  city: string;
  district?: string;
  building?: string;
  floor?: string;
  notes?: string;
  lat?: number;
  lng?: number;
  is_default?: boolean;
};

type AddressInput = Partial<Omit<Address, 'id'>>;

const stringFields = ['label', 'street', 'address', 'city', 'district', 'building', 'floor', 'notes'] as const;
const maxLength: Record<(typeof stringFields)[number], number> = { label: 80, street: 250, address: 300, city: 100, district: 100, building: 50, floor: 30, notes: 500 };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function parseAddress(body: unknown, partial: boolean): AddressInput {
  const value = record(body);
  if (!value) throw new BadRequestException('invalid_address_payload');
  const output: AddressInput = {};

  for (const field of stringFields) {
    if (value[field] === undefined) continue;
    if (typeof value[field] !== 'string') throw new BadRequestException(`invalid_address_${field}`);
    const normalized = value[field].trim();
    if (!normalized || normalized.length > maxLength[field]) throw new BadRequestException(`invalid_address_${field}`);
    output[field] = normalized;
  }
  for (const coordinate of ['lat', 'lng'] as const) {
    if (value[coordinate] === undefined) continue;
    if (typeof value[coordinate] !== 'number' || !Number.isFinite(value[coordinate])) throw new BadRequestException(`invalid_address_${coordinate}`);
    const limit = coordinate === 'lat' ? 90 : 180;
    if (Math.abs(value[coordinate] as number) > limit) throw new BadRequestException(`invalid_address_${coordinate}`);
    output[coordinate] = value[coordinate] as number;
  }
  if (value.is_default !== undefined) {
    if (typeof value.is_default !== 'boolean') throw new BadRequestException('invalid_address_is_default');
    output.is_default = value.is_default;
  }
  if (partial && Object.keys(output).length === 0) throw new BadRequestException('address_update_empty');
  if (!partial) {
    if (!output.street && !output.address) throw new BadRequestException('address_street_required');
    if (output.lat === undefined || output.lng === undefined) throw new BadRequestException('address_coordinates_required');
  }
  return output;
}

@Controller('users/me/addresses')
@UseGuards(JwtAuthGuard)
export class UsersAddressesController {
  constructor(private users: UsersService) {}

  @Get()
  async getAddresses(@CurrentUser('id') id: string) {
    const profile = await this.users.getPatientProfile(id);
    return profile.addresses || [];
  }

  @Post()
  @RequireIdempotency()
  async addAddress(@CurrentUser('id') id: string, @Body() body: unknown) {
    const profile = await this.users.getPatientProfile(id);
    const input = parseAddress(body, false);
    const addresses: Address[] = profile.addresses || [];
    const newAddress: Address = {
      id: uuid(),
      label: input.label || 'العنوان',
      street: input.street || input.address || '',
      city: input.city || '',
      ...input,
    };
    if (addresses.length === 0 || input.is_default) {
      addresses.forEach((address) => { address.is_default = false; });
      newAddress.is_default = true;
    }
    addresses.push(newAddress);
    await this.users.updatePatientProfile(id, { addresses });
    return newAddress;
  }

  @Patch(':addressId')
  @RequireIdempotency()
  async updateAddress(@CurrentUser('id') id: string, @Param('addressId') addressId: string, @Body() body: unknown) {
    const profile = await this.users.getPatientProfile(id);
    const input = parseAddress(body, true);
    const addresses: Address[] = profile.addresses || [];
    const index = addresses.findIndex((address) => address.id === addressId);
    if (index < 0) throw new NotFoundException('address_not_found');
    if (input.is_default) addresses.forEach((address) => { address.is_default = false; });
    addresses[index] = { ...addresses[index], ...input };
    await this.users.updatePatientProfile(id, { addresses });
    return addresses[index];
  }

  @Delete(':addressId')
  @RequireIdempotency()
  async removeAddress(@CurrentUser('id') id: string, @Param('addressId') addressId: string) {
    const profile = await this.users.getPatientProfile(id);
    const addresses: Address[] = profile.addresses || [];
    if (!addresses.some((address) => address.id === addressId)) throw new NotFoundException('address_not_found');
    await this.users.updatePatientProfile(id, { addresses: addresses.filter((address) => address.id !== addressId) });
    return { ok: true };
  }
}
