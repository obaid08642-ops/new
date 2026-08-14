// @ts-nocheck
import { Injectable, BadRequestException, OnModuleInit, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { Ban, BanDocument } from './bans.schema';
import { BanRepository } from "./repositories/ban.repository";

@Injectable()
export class BansService implements OnModuleInit {
  private activeBans = new Set<string>();

  constructor(@Inject('BanRepository') private banModel: BanRepository) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  async refreshCache() {
    const bans = await this.banModel.find({ 
      is_active: true, 
      $or: [{ expires_at: { $exists: false } }, { expires_at: null }, { expires_at: { $gt: new Date() } }] 
    });
    this.activeBans.clear();
    for (const b of bans) {
      this.activeBans.add(`${b.type}:${b.value}`);
    }
  }

  async ban(adminId: string, type: 'ip' | 'device', value: string, reason?: string, expiresAt?: Date) {
    if (!value) throw new BadRequestException('Value is required');
    const b = await this.banModel.create({
      type,
      value,
      reason,
      banned_by_admin_id: adminId,
      expires_at: expiresAt
    });
    await this.refreshCache();
    return b;
  }

  async unban(value: string) {
    await this.banModel.updateMany({ value }, { $set: { is_active: false } });
    await this.refreshCache();
    return { success: true };
  }

  isBanned(type: 'ip' | 'device', value: string): boolean {
    return this.activeBans.has(`${type}:${value}`);
  }

  async getBans() {
    return this.banModel.find().sort({ createdAt: -1 }).lean();
  }
}
