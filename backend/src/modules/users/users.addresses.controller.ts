import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser, JwtAuthGuard, SelfService } from '../../common/auth.guard';
import { v4 as uuid } from 'uuid';
import { AddAddressDto, UpdateAddressDto } from './users.addresses.dto';
import { NationalAddressService } from './national-address.service';
import { normalizeShortAddress } from '../../common/national-address';

@Controller('users/me/addresses')
@SelfService()
@UseGuards(JwtAuthGuard)
export class UsersAddressesController {
  constructor(private users: UsersService, private national: NationalAddressService) {}

  /**
   * 19.7: what a short address adds to a saved address. A code that does not exist is refused; when Saudi Post cannot
   * answer the code is kept but not marked verified. Saudi Post's building, additional number and post code win; its
   * street, district, city, region and pin only fill what the patient left empty.
   */
  private async nationalAddressFields(raw: string, given: { street?: string; district?: string; city?: string; region?: string; lat?: number; lng?: number }) {
    const code = normalizeShortAddress(raw);
    if (!code) throw new BadRequestException('short_address_invalid');
    const found = await this.national.lookup(code);
    if (found.outcome === 'not_found') throw new BadRequestException('short_address_not_found');
    if (found.outcome !== 'found') return { short_address: code, national_address_verified: false };
    const a = found.address;
    return {
      short_address: code,
      national_address_verified: true,
      ...(a.building_number ? { building_number: a.building_number } : {}),
      ...(a.additional_number ? { additional_number: a.additional_number } : {}),
      ...(a.post_code ? { post_code: a.post_code } : {}),
      ...(!given.street?.trim() && a.street ? { street: a.street, line1: a.street } : {}),
      ...(!given.district?.trim() && a.district ? { district: a.district } : {}),
      ...(!given.city?.trim() && a.city ? { city: a.city } : {}),
      ...(!given.region?.trim() && a.region ? { region: a.region } : {}),
      ...(given.lat == null && given.lng == null && a.lat !== undefined && a.lng !== undefined ? { lat: a.lat, lng: a.lng } : {}),
    };
  }


  @Get()
  async getAddresses(@CurrentUser('id') id: string) {
    const profile = await this.users.getPatientProfile(id);
    return profile.addresses || [];
  }

  @Post()
  async addAddress(@CurrentUser('id') id: string, @Body() body: AddAddressDto) {
    const national = body.short_address?.trim() ? await this.nationalAddressFields(body.short_address, { ...body, street: body.street || body.line1 }) : {};
    const { short_address: _typed, ...typed } = body;
    const merged = { ...typed, ...national } as typeof body & Record<string, unknown>;
    const hasLocation = (merged.lat != null && merged.lng != null) || !!(merged.street || merged.line1 || '').toString().trim();
    if (!hasLocation) throw new BadRequestException('address_location_required');
    const profile = await this.users.getPatientProfile(id);
    // Mobile reads `street`, the website reads `line1`: store both so an address added on one shows on the other.
    const line = String(merged.street || merged.line1 || '').trim() || undefined;
    const newAddress: any = { id: uuid(), ...merged, street: line, line1: line };
    const addresses = profile.addresses || [];
    
    // If it's the first address, make it default
    if (addresses.length === 0 || body.is_default) {
      addresses.forEach(a => (a.is_default = false));
      newAddress.is_default = true;
    }
    
    addresses.push(newAddress);
    await this.users.updatePatientProfile(id, { addresses });
    // Do not reflect caller-controlled address strings into the write response.
    return { id: newAddress.id };
  }

  @Patch(':addressId')
  async updateAddress(@CurrentUser('id') id: string, @Param('addressId') addressId: string, @Body() body: UpdateAddressDto) {
    const profile = await this.users.getPatientProfile(id);
    const addresses = profile.addresses || [];
    const idx = addresses.findIndex(a => a.id === addressId);
    // Needs-review issue 380: an id that is not one of the caller's addresses is 404, and nothing changes.
    if (idx === -1) throw new NotFoundException('address_not_found');

    if (body.is_default) {
      addresses.forEach(a => (a.is_default = false));
    }
    // 19.7: a changed code is looked up again; the same verified code is kept as it is; an empty one removes it.
    const { short_address: typedCode, ...rest } = body;
    let national: Record<string, unknown> = {};
    if (typedCode !== undefined) {
      const wanted = typedCode.trim() ? normalizeShortAddress(typedCode) : '';
      if (typedCode.trim() && !wanted) throw new BadRequestException('short_address_invalid');
      if (!wanted) national = { short_address: undefined, national_address_verified: undefined, building_number: undefined, additional_number: undefined, post_code: undefined };
      else if (wanted !== addresses[idx].short_address || !addresses[idx].national_address_verified) {
        national = await this.nationalAddressFields(wanted, { ...addresses[idx], ...rest, street: rest.street ?? rest.line1 ?? addresses[idx].street });
      }
    }
    const line = String(national.street ?? rest.street ?? rest.line1 ?? '').trim();
    addresses[idx] = { ...addresses[idx], ...rest, ...national, ...(line ? { street: line, line1: line } : {}) };
    await this.users.updatePatientProfile(id, { addresses });
    return addresses[idx];
  }

  @Delete(':addressId')
  async removeAddress(@CurrentUser('id') id: string, @Param('addressId') addressId: string) {
    const profile = await this.users.getPatientProfile(id);
    const all = profile.addresses || [];
    if (!all.some(a => a.id === addressId)) throw new NotFoundException('address_not_found');
    const addresses = all.filter(a => a.id !== addressId);
    await this.users.updatePatientProfile(id, { addresses });
    return { ok: true };
  }
}
