import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Public } from '../../common/auth.guard';

/** Q-22 (decision 17): the public nurse page is anonymous and carries only the
 * explicit allow-list — never national ID, phone, email or address (N7 rule).
 * Name/licence variants are all included because the `nurses` collection has no
 * writer in this repo (external seed): dropping an alias must never drop the name. */
const PUBLIC_NURSE_FIELDS = [
  'id', 'name', 'name_ar', 'name_en', 'full_name', 'display_name',
  'photo', 'photo_url', 'avatar', 'avatar_url',
  'specialties', 'specialty', 'languages', 'rating', 'rating_avg', 'reviews_count',
  'verified', 'scfhs_licence', 'scfhs_license', 'scfhs_license_number', 'license_number',
] as const;

@Controller('nursing')
@UseGuards(JwtAuthGuard)
export class PatientNurseProfileController {
  constructor(@InjectConnection() private conn: Connection) {}
  @Public()
  @Get('nurses/:id')
  async one(@Param('id') id: string) {
    const doc = await this.conn.db.collection('nurses').findOne({ $or: [{ id }, { _id: id as any }] } as any);
    if (!doc) throw new NotFoundException('nurse_not_found');
    const out: any = {};
    for (const k of PUBLIC_NURSE_FIELDS) {
      if ((doc as any)[k] !== undefined) out[k] = (doc as any)[k];
    }
    return { data: out };
  }
}
