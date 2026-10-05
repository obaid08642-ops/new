import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ClientSession } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GuestService {
  private readonly logger = new Logger(GuestService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async createGuestAccount(deviceId: string): Promise<{ userId: string; deviceId: string }> {
    const userId = uuidv4();
    const guestUser = {
      id: userId,
      is_guest: true,
      device_id: deviceId,
      created_at: new Date(),
      last_active: new Date(),
    };
    await this.connection.collection('users').insertOne(guestUser);
    return { userId, deviceId };
  }

  async mergeGuestToAccount(
    guestUserId: string,
    targetAccountId: string,
    session?: ClientSession,
  ): Promise<{ success: boolean; movedCollections: string[] }> {
    const movedCollections: string[] = [];
    const collectionsToMigrate = [
      'pharmacy_orders',
      'labbookings',
      'radiologybookings',
      'homecarebookings',
      'appointments',
      'prescriptions',
      'medication_reminders',
      'addresses',
      'insurance_cards',
      'returns',
      'transactions',
      'media_assets',
      'loyalty_accounts',
      'chat_threads',
      'support_tickets',
      'push_tokens',
      'notifications',
      'search_queries',
      'product_views',
      'carts',
    ];

    const migrateOptions = session ? { session } : {};

    for (const collectionName of collectionsToMigrate) {
      try {
        const result = await this.connection.collection(collectionName).updateMany(
          { user_id: guestUserId, patient_id: guestUserId },
          { $set: { user_id: targetAccountId, patient_id: targetAccountId } },
          migrateOptions,
        );
        if (result.modifiedCount > 0) {
          movedCollections.push(collectionName);
          this.logger.log(`Migrated ${result.modifiedCount} docs in ${collectionName}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to migrate ${collectionName}: ${err.message}`);
      }
    }

    // Merge carts: combine items, deduplicate
    try {
      const guestCart = await this.connection.collection('carts').findOne({ user_id: guestUserId }, migrateOptions);
      const targetCart = await this.connection.collection('carts').findOne({ user_id: targetAccountId }, migrateOptions);
      
      if (guestCart && targetCart) {
        const mergedItems = [...(targetCart.items || [])];
        const existingIds = new Set(mergedItems.map(i => i.id || i.medicine_id));
        for (const item of (guestCart.items || [])) {
          if (!existingIds.has(item.id || item.medicine_id)) {
            mergedItems.push(item);
          }
        }
        await this.connection.collection('carts').updateOne(
          { user_id: targetAccountId },
          { $set: { items: mergedItems } },
          migrateOptions,
        );
        movedCollections.push('carts');
      } else if (guestCart) {
        await this.connection.collection('carts').updateOne(
          { user_id: guestUserId },
          { $set: { user_id: targetAccountId } },
          migrateOptions,
        );
        movedCollections.push('carts');
      }
    } catch (err) {
      this.logger.warn(`Failed to merge carts: ${err.message}`);
    }

    // Deduplicate addresses
    try {
      const guestAddresses = await this.connection.collection('addresses').find({ user_id: guestUserId }, migrateOptions).toArray();
      for (const addr of guestAddresses) {
        const exists = await this.connection.collection('addresses').findOne(
          { user_id: targetAccountId, street: addr.street, city: addr.city },
          migrateOptions,
        );
        if (!exists) {
          await this.connection.collection('addresses').updateOne(
            { id: addr.id },
            { $set: { user_id: targetAccountId } },
            migrateOptions,
          );
        }
      }
      movedCollections.push('addresses');
    } catch (err) {
      this.logger.warn(`Failed to deduplicate addresses: ${err.message}`);
    }

    // Mark guest as merged
    await this.connection.collection('users').updateOne(
      { id: guestUserId },
      { $set: { is_guest: false, merged_into: targetAccountId, merged_at: new Date() } },
      migrateOptions,
    );

    // Write audit record
    await this.connection.collection('audit_logs').insertOne({
      action: 'guest_merge',
      actor_id: targetAccountId,
      entity_type: 'guest_user',
      entity_id: guestUserId,
      details: { moved_collections: movedCollections },
      timestamp: new Date(),
    }, migrateOptions);

    return { success: true, movedCollections };
  }

  async getGuestData(guestUserId: string): Promise<any> {
    const user = await this.connection.collection('users').findOne({ id: guestUserId });
    if (!user) return null;

    const data: any = { user };
    const collections = ['carts', 'addresses', 'search_queries', 'product_views'];
    for (const col of collections) {
      try {
        data[col] = await this.connection.collection(col).find({ user_id: guestUserId }).toArray();
      } catch { /* ignore */ }
    }
    return data;
  }

  async deleteInactiveGuests(monthsInactive: number = 12): Promise<number> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsInactive);

    const result = await this.connection.collection('users').deleteMany({
      is_guest: true,
      last_active: { $lt: cutoff },
      // Only delete guests with no orders
      $or: [
        { orders_count: { $exists: false } },
        { orders_count: 0 },
      ],
    });

    this.logger.log(`Deleted ${result.deletedCount} inactive guest accounts`);
    return result.deletedCount;
  }
}
