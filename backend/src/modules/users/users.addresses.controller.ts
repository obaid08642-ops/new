import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser, JwtAuthGuard, SelfService } from '../../common/auth.guard';
import { v4 as uuid } from 'uuid';
import { AddAddressDto, UpdateAddressDto } from './users.addresses.dto';

@Controller('users/me/addresses')
@SelfService()
@UseGuards(JwtAuthGuard)
export class UsersAddressesController {
  constructor(private users: UsersService) {}

  @Get()
  async getAddresses(@CurrentUser('id') id: string) {
    const profile = await this.users.getPatientProfile(id);
    return profile.addresses || [];
  }

  @Post()
  async addAddress(@CurrentUser('id') id: string, @Body() body: AddAddressDto) {
    const profile = await this.users.getPatientProfile(id);
    const newAddress = { id: uuid(), ...body };
    const addresses = profile.addresses || [];
    
    // If it's the first address, make it default
    if (addresses.length === 0 || body.is_default) {
      addresses.forEach(a => (a.is_default = false));
      newAddress.is_default = true;
    }
    
    addresses.push(newAddress);
    await this.users.updatePatientProfile(id, { addresses });
    return newAddress;
  }

  @Patch(':addressId')
  async updateAddress(@CurrentUser('id') id: string, @Param('addressId') addressId: string, @Body() body: UpdateAddressDto) {
    const profile = await this.users.getPatientProfile(id);
    const addresses = profile.addresses || [];
    
    if (body.is_default) {
      addresses.forEach(a => (a.is_default = false));
    }
    
    const idx = addresses.findIndex(a => a.id === addressId);
    if (idx !== -1) {
      addresses[idx] = { ...addresses[idx], ...body };
      await this.users.updatePatientProfile(id, { addresses });
      return addresses[idx];
    }
    return null;
  }

  @Delete(':addressId')
  async removeAddress(@CurrentUser('id') id: string, @Param('addressId') addressId: string) {
    const profile = await this.users.getPatientProfile(id);
    const addresses = (profile.addresses || []).filter(a => a.id !== addressId);
    await this.users.updatePatientProfile(id, { addresses });
    return { ok: true };
  }
}
