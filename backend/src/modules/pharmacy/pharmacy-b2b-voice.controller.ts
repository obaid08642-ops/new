import { Controller, Post, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { VoiceToOrderDto } from '../compat/compat.dto';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('provider/pharmacy/b2b')
@Roles(UserRole.PHARMACY, UserRole.ADMIN)
export class B2BVoiceController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Post('voice-to-order')
  async voiceToOrder(@CurrentUser() user: any, @Body() body: VoiceToOrderDto) {
    const text = String(body?.text || '').trim();
    if (!text) throw new BadRequestException('نص الطلب الصوتي مطلوب');
    if (text.length > 2000) throw new BadRequestException('voice_order_text_too_long');
    // Split on fixed punctuation first, then on the literal Arabic conjunction;
    // avoid a regex over caller-controlled text.
    const segments = text.split(/[,،;\n]/).flatMap((part) => part.split(' و ')).map((s) => s.trim()).filter(Boolean);
    const items: any[] = [];
    const unmatched: string[] = [];
    for (const seg of segments.slice(0, 30)) {
      const m = seg.match(/^(\d{1,4})\s*[x×]?\s*(.+)$/) || seg.match(/^(.+?)\s*(\d{1,4})$/);
      const qty = m ? Math.min(parseInt(m[1].length <= 4 && /^\d/.test(m[0]) ? m[1] : m[2], 10) || 1, 999) : 1;
      const name = (m ? (/^\d/.test(m[0]) ? m[2] : m[1]) : seg).trim();
      if (!name) continue;
      const rx = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const product: any = await this.conn.collection(CATALOG_COLLECTIONS.medicines)
        .findOne({ $or: [{ name_ar: rx }, { name_en: rx }] } as any);
      if (product) {
        items.push({
          medicine_id: product.id, name: product.name_ar || product.name_en,
          qty, unit_price: product.price ?? 0, matched: true,
        });
      } else {
        unmatched.push(name);
        items.push({ name, qty, matched: false });
      }
    }
    return {
      pharmacy_id: uid(user), items, unmatched,
      total_estimate: items.reduce((s, i) => s + (i.matched ? i.qty * (i.unit_price || 0) : 0), 0),
    };
  }
}
