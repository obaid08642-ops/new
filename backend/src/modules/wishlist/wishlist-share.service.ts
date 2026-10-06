import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomBytes } from 'crypto';

export interface WishlistShareItem {
  id: string;
  name_ar: string;
  name_en: string | null;
  price: number;
  image: string | null;
}

export interface WishlistShare {
  token: string;
  items: WishlistShareItem[];
  created_at: Date;
}

/**
 * P22.2 — shareable wishlists.
 *
 * A share token resolves to a frozen snapshot of public product fields ONLY
 * (id, names, price, image). No owner identity, no other user data, no live
 * catalog internals ever leave through the resolve path.
 */
@Injectable()
export class WishlistShareService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  async createShare(ownerId: string, itemIds: string[]): Promise<WishlistShare> {
    const ids = [...new Set((itemIds || []).map((s) => String(s)))].filter(Boolean);
    if (ids.length === 0) throw new BadRequestException('item_ids_required');
    if (ids.length > 50) throw new BadRequestException('too_many_items');

    const cursor = await this.conn
      .collection('medicines')
      .find({ id: { $in: ids } } as never);
    const found = (await cursor.toArray()) as unknown as Array<{
      id: string;
      name_ar: string;
      name_en?: string;
      price?: number;
      image?: string;
    }>;
    const byId = new Map(found.map((m) => [String(m.id), m]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0)
      throw new BadRequestException(`unknown_items: ${missing.join(',')}`);

    const items: WishlistShareItem[] = ids.map((id) => {
      const m = byId.get(id) as {
        id: string;
        name_ar: string;
        name_en?: string;
        price?: number;
        image?: string;
      };
      return {
        id,
        name_ar: m.name_ar,
        name_en: m.name_en ?? null,
        price: Number(m.price ?? 0),
        image: m.image ?? null,
      };
    });
    const token = randomBytes(24).toString('hex');
    await this.conn.collection('wishlist_shares').insertOne({
      owner_id: String(ownerId),
      share_token: token,
      items,
      createdAt: new Date(),
    } as never);
    return { token, items, created_at: new Date() };
  }

  async resolve(token: string): Promise<WishlistShare> {
    const doc = await this.conn.collection('wishlist_shares').findOne({
      share_token: { $eq: String(token) },
    } as never);
    if (!doc) throw new NotFoundException('share_not_found');
    const d = doc as unknown as { share_token: string; items: WishlistShareItem[]; createdAt: Date };
    return { token: d.share_token, items: d.items, created_at: d.createdAt };
  }

  async listMine(ownerId: string): Promise<Array<{ token: string; items_count: number; created_at: Date }>> {
    const cursor = await this.conn.collection('wishlist_shares').find({
      owner_id: { $eq: String(ownerId) },
    } as never);
    const all = (await cursor.toArray()) as unknown as Array<{
      share_token: string;
      items: unknown[];
      createdAt: Date;
    }>;
    return all.map((d) => ({
      token: d.share_token,
      items_count: d.items.length,
      created_at: d.createdAt,
    }));
  }

  async revoke(ownerId: string, token: string): Promise<{ ok: boolean }> {
    const res = await this.conn.collection('wishlist_shares').deleteOne({
      share_token: { $eq: String(token) },
      owner_id: { $eq: String(ownerId) },
    } as never);
    if ((res as unknown as { deletedCount?: number }).deletedCount !== 1)
      throw new NotFoundException('share_not_found');
    return { ok: true };
  }
}
