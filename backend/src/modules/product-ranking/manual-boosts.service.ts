import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ManualBoost, ManualBoostDocument } from './manual-boost.schema';

/** R77: read side of the governed manual layer (labeled flags only, never ranking). */
@Injectable()
export class ManualBoostsService {
  constructor(@InjectModel(ManualBoost.name) private boosts: Model<ManualBoostDocument>) {}

  async activeIds(): Promise<Set<string>> {
    const now = new Date();
    const rows = await this.boosts.find(
      { status: 'active', starts_at: { $lte: now }, ends_at: { $gte: now } },
      { entity_id: 1 },
    ).lean().catch(() => []);
    return new Set((rows as any[]).map((r: any) => String(r.entity_id)));
  }
}
