import { Controller, Get, Query, NotFoundException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuid } from 'uuid';
import {  } from '../../common/auth.guard';

const byStringOrObjectId = (id: string) => {
  const or: any[] = [{ id }, { _id: id }];
  if (/^[0-9a-fA-F]{24}$/.test(String(id))) or.push({ _id: new (require('mongoose').Types.ObjectId)(id) });
  return { $or: or };
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const now = () => new Date();

const SEED_FOODS = [
  ['أرز أبيض مطبوخ', 130, 2.7, 28, 0.3], ['صدر دجاج مشوي', 165, 31, 0, 3.6], ['تمر خلاص', 282, 2, 75, 0.2],
  ['خبز بر', 247, 13, 41, 3.4], ['حليب كامل الدسم', 61, 3.2, 4.8, 3.3], ['لبن قليل الدسم', 42, 3.4, 5, 1],
  ['بيض مسلوق', 155, 13, 1.1, 11], ['موز', 89, 1.1, 23, 0.3], ['تفاح', 52, 0.3, 14, 0.2],
  ['عدس مطبوخ', 116, 9, 20, 0.4], ['حمص مطبوخ', 164, 9, 27, 2.6], ['سلمون مشوي', 208, 22, 0, 13],
  ['زيت زيتون', 884, 0, 0, 100], ['خيار', 15, 0.7, 3.6, 0.1], ['طماطم', 18, 0.9, 3.9, 0.2],
  ['زبادي يوناني', 97, 9, 3.9, 5], ['شوفان', 379, 13, 68, 6.5], ['مكسرات مشكلة', 607, 20, 21, 54],
  ['كبسة دجاج', 168, 7, 24, 5.2], ['شوربة عدس', 61, 3.4, 9.2, 1.3], ['فول مدمس', 110, 7.6, 17, 0.6],
  ['جبن قريش', 98, 11, 3.4, 4.3], ['سمك هامور مشوي', 118, 24, 0, 2.1], ['قهوة عربية بدون سكر', 2, 0.1, 0.4, 0],
];

@Controller('nutrition/foods')
export class NutritionFoodsController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get()
  async search(@Query('q') q = '', @Query('limit') limit = '30'): Promise<any> {
    const col = this.conn.collection('nutritionfoods');
    if ((await col.estimatedDocumentCount()) === 0) {
      await col.insertMany(
        SEED_FOODS.map(([name_ar, calories, protein, carbs, fat]) => ({
          id: uuid(), name_ar, calories, protein, carbs, fat, per: '100g', verified: true, created_at: now(),
        })) as any,
      );
    }
    const filter = q?.trim() ? { name_ar: { $regex: q.trim(), $options: 'i' } } : {};
    const data = await col.find(filter as any).limit(Math.min(+limit || 30, 100)).toArray();
    return { data };
  }
}
