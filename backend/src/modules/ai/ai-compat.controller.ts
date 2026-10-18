import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, SelfService } from '../../common/auth.guard';
import { CheckDto } from '../compat/compat.dto';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';
import { matchInteractions } from './interaction-rules';

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('ai')
@SelfService()
export class AiInteractionsController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Post('drug-interactions')
  async check(@CurrentUser() user: any, @Body() body: CheckDto) {
    const u = uid(user);
    const meds = await this.conn.collection('healthmedications')
      .find({ account_id: u, active: { $ne: false } } as any).toArray();
    const current = meds.map((m: any) => String(m.name || '').toLowerCase());
    // Drug-scanner app sends medicine ids (meds) + a candidate name (newDrug):
    // resolve ids to names so rule matching works on names.
    let idNames: string[] = [];
    if (Array.isArray((body as any)?.meds) && (body as any).meds.length) {
      const rows: any[] = await this.conn.collection(CATALOG_COLLECTIONS.medicines)
        .find({ id: { $in: (body as any).meds.map(String) } } as any, { projection: { name: 1, name_ar: 1, name_en: 1 } }).toArray().catch(() => []);
      idNames = rows.map((r: any) => String(r.name || r.name_en || r.name_ar || '').toLowerCase()).filter(Boolean);
    }
    const incoming = (body?.drugs || (body?.drug ? [body.drug] : [])).concat(idNames, (body as any)?.newDrug ? [(body as any).newDrug] : []).map((d) => String(d).toLowerCase());
    const all = [...new Set([...current, ...incoming])];
    const hits = matchInteractions(all);
    return { checked: all.length, interactions: hits, safe: hits.filter((h) => h.severity === 'high').length === 0 };
  }
}
