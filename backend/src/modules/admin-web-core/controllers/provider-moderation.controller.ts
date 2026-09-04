import { Controller, Get, Post, Param, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Provider } from '../schemas/provider.schema';

@Controller('providers')
export class ProviderModerationController {
  constructor(
    @InjectModel(Provider.name) private providerModel: Model<Provider>,
    @InjectConnection() private readonly connection: Connection,
    private events: EventEmitter2
  ) {}

  /** Old provider images being replaced by an approved delta are physically
   *  deleted from Cloudinary so storage never fills with orphans. */
  private async purgeReplaced(oldProf: any, changes: any) {
    const IMAGE_KEYS = ['profile_photo', 'logo', 'clinic_images', 'license_documents', 'images'];
    const toUrl = async (v: any): Promise<string | null> => {
      const s2 = String(v);
      if (s2.startsWith('http')) return s2;
      const obj: any = await this.connection.collection('storage_objects').findOne({ id: s2 });
      return obj?.external_url || null;
    };
    for (const k of IMAGE_KEYS) {
      if (changes[k] === undefined) continue;
      const oldVals: any[] = Array.isArray(oldProf?.[k]) ? oldProf[k] : (oldProf?.[k] ? [oldProf[k]] : []);
      const newVals = new Set((Array.isArray(changes[k]) ? changes[k] : [changes[k]]).map(String));
      for (const ov of oldVals) {
        if (newVals.has(String(ov))) continue;
        const url = await toUrl(ov).catch(() => null);
        if (url) this.events.emit('storage.delete_by_url', { url });
      }
    }
  }

  // NOTE: the legacy /providers/pending + /providers/:id/approve|suspend endpoints were
  // removed — they flipped a `verified` flag on an unused legacy collection while real
  // registrations live in provider_accounts/provider_profiles. Real moderation:
  //   POST /admin/providers/:id/approve | /suspend  (ProviderAdminService)
  // and edit-review below via provider_deltas.

  // --- DELTA AUDIT GUARD ---
  @Get('provider-deltas')
  async getProviderDeltasGet(): Promise<any> {
    const data = await this.connection.collection('provider_deltas').find({ status: 'pending' }).toArray();
    return data;
  }

  @Post('provider-deltas')
  async getProviderDeltas(): Promise<any> {
    const data = await this.connection.collection('provider_deltas').find({ status: 'pending' }).toArray();
    return data;
  }

  @Post('provider-deltas/:id/approve')
  async approveDelta(@Param('id') id: string) {
    const delta: any = await this.connection.collection('provider_deltas').findOne({ id });
    if (!delta) throw new NotFoundException('التغييرات المطلوبة غير موجودة');
    if (delta.status !== 'pending') throw new BadRequestException(`التغييرات تمت معالجتها مسبقاً (${delta.status})`);
    // Apply the audited change set onto the provider profile — this is the whole
    // point of the delta-guard: profile fields only change after admin approval.
    let changes = delta.requested_changes || delta.changes || {};
    // Defensive unwrap: legacy deltas stored a wrapper ({changes:{...}} or {newData:{...}})
    if (changes && typeof changes === 'object' && typeof changes.changes === 'object' && changes.changes) changes = changes.changes;
    else if (changes && typeof changes === 'object' && typeof changes.newData === 'object' && changes.newData) changes = changes.newData;
    const accountId = delta.account_id || delta.provider_account_id || delta.user_id || delta.provider_id;
    let applied = 0;
    if (accountId && Object.keys(changes).length) {
      const oldProf = await this.connection.collection('provider_profiles').findOne(
        { $or: [{ account_id: accountId }, { user_id: accountId }, { id: accountId }] } as any,
      );
      await this.purgeReplaced(oldProf, changes).catch(() => null);
      const res = await this.connection.collection('provider_profiles').updateOne(
        { $or: [{ account_id: accountId }, { user_id: accountId }, { id: accountId }] } as any,
        { $set: { ...changes, updated_at: new Date() } },
      );
      applied = res.modifiedCount;
    }
    await this.connection.collection('provider_deltas').updateOne(
      { id },
      { $set: { status: 'approved', reviewed_at: new Date(), applied_at: new Date() } },
    );
    return { success: true, applied };
  }

  @Post('provider-deltas/:id/reject')
  async rejectDelta(@Param('id') id: string) {
    const delta: any = await this.connection.collection('provider_deltas').findOne({ id });
    if (!delta) throw new NotFoundException('التغييرات المطلوبة غير موجودة');
    if (delta.status !== 'pending') throw new BadRequestException(`التغييرات تمت معالجتها مسبقاً (${delta.status})`);
    // Rejected uploads must not linger: physically delete any image the delta
    // proposed that is NOT already referenced by the live profile (Cloudinary).
    let changes = delta.requested_changes || delta.changes || {};
    if (changes && typeof changes === 'object' && typeof changes.changes === 'object' && changes.changes) changes = changes.changes;
    else if (changes && typeof changes === 'object' && typeof changes.newData === 'object' && changes.newData) changes = changes.newData;
    const accountId = delta.account_id || delta.provider_account_id || delta.user_id || delta.provider_id;
    try {
      const prof: any = accountId ? await this.connection.collection('provider_profiles').findOne(
        { $or: [{ account_id: accountId }, { user_id: accountId }, { id: accountId }] } as any,
      ) : null;
      const IMAGE_KEYS = ['profile_photo', 'logo', 'clinic_images', 'license_documents', 'images'];
      const toUrl = async (v: any): Promise<string | null> => {
        const s2 = String(v);
        if (s2.startsWith('http')) return s2;
        const obj: any = await this.connection.collection('storage_objects').findOne({ id: s2 });
        return obj?.external_url || null;
      };
      for (const k of IMAGE_KEYS) {
        if (!changes || changes[k] === undefined) continue;
        const newVals: any[] = Array.isArray(changes[k]) ? changes[k] : [changes[k]];
        const liveVals = new Set((Array.isArray(prof?.[k]) ? prof[k] : (prof?.[k] ? [prof[k]] : [])).map(String));
        for (const nv of newVals) {
          if (liveVals.has(String(nv))) continue; // already live — never delete
          const url = await toUrl(nv).catch(() => null);
          if (url) this.events.emit('storage.delete_by_url', { url });
        }
      }
    } catch { /* cleanup is best-effort — the rejection itself must not fail */ }
    await this.connection.collection('provider_deltas').updateOne({ id }, { $set: { status: 'rejected', reviewed_at: new Date() } });
    return { success: true };
  }
}
