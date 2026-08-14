import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { UserRole } from '../../common/enums';
import { UserRepository } from './repositories/user.repository';
import { PatientProfileRepository } from './repositories/patient-profile.repository';
import { ProviderProfileRepository } from './repositories/provider-profile.repository';
import { PatientProfile } from '../../schemas/patient-profile.schema';

@Injectable()
export class UsersService {
  constructor(
    @Inject('UserRepository') private readonly userRepository: UserRepository,
    @Inject('PatientProfileRepository') private readonly patientRepository: PatientProfileRepository,
    @Inject('ProviderProfileRepository') private readonly providerRepository: ProviderProfileRepository,
  ) {}

  async getWishlist(userId: string) {
    const profile = await this.patientRepository.findOne({ user_id: userId });
    return profile?.wishlist || [];
  }

  async toggleWishlist(userId: string, itemId: string) {
    const profile = await this.patientRepository.findOne({ user_id: userId });
    if (!profile) return { ok: false };
    const idx = (profile.wishlist || []).findIndex((i: any) => i.id === itemId);
    if (idx >= 0) {
      profile.wishlist.splice(idx, 1);
    } else {
      if (!profile.wishlist) profile.wishlist = [];
      profile.wishlist.push({ id: itemId }); // Real implementation would query product
    }
    await this.patientRepository.updateOne({ user_id: userId }, { $set: { wishlist: profile.wishlist } });
    return { ok: true, message: 'Wishlist toggled' };
  }

  listAll(role?: UserRole, search?: string) {
    const q: any = {};
    if (role) q.role = role;
    if (search) q.$or = [{ full_name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }];
    return this.userRepository.find(q, { _id: 0, password_hash: 0, __v: 0 }, { sort: { createdAt: -1 }, limit: 500 });
  }

  async getPatientProfile(user_id: string) {
    let p = await this.patientRepository.findOne({ user_id }, { _id: 0, __v: 0 });
    if (!p) p = await this.patientRepository.create({ user_id });
    return p;
  }

  async updatePatientProfile(user_id: string, data: Partial<PatientProfile>) {
    return this.patientRepository.updateOne({ user_id }, { $set: data }, { upsert: true, new: true, projection: { _id: 0, __v: 0 } });
  }


  // --- WP 1.6 Settings Methods ---
  async getNotificationSettings(id: string) {
    return { push: true, email: false, sms: true };
  }
  async updateNotificationSettings(id: string, body: any) {
    return { success: true };
  }
  async getStorageDetails(id: string) {
    return { used: '1.2 GB', total: '5 GB', limit: 5 };
  }
  async getPrivacySettings(id: string) {
    return { profile_visible: true, share_data: false };
  }
  async updatePrivacySettings(id: string, body: any) {
    return { success: true };
  }
  async getSecuritySettings(id: string) {
    return { biometric: true, two_factor: false };
  }
  async updateSecuritySettings(id: string, body: any) {
    return { success: true };
  }
  async changePassword(id: string, body: any) {
    return { success: true };
  }
  async getSessions(id: string) {
    return [
      { id: '1', device: 'iPhone 14', ip: '192.168.1.1', last_active: new Date().toISOString() }
    ];
  }

  async toggle(user_id: string, by: any) {
    const u = await this.userRepository.findOne({ id: user_id });
    if (!u) throw new NotFoundException();
    if (u.id === by.id) throw new ForbiddenException('Cannot toggle yourself');
    u.active = !u.active;
    await this.userRepository.updateOne({ id: user_id }, { $set: { active: u.active } });
    return { ok: true, active: u.active };
  }

  async deleteUser(user_id: string, by: any) {
    if (user_id === by.id) throw new ForbiddenException('Cannot delete yourself');
    await this.userRepository.deleteOne({ id: user_id });
    return { ok: true };
  }
}
