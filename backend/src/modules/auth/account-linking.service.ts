import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AccountLinkingService {
  private readonly logger = new Logger(AccountLinkingService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async linkAccounts(
    sourceAccountId: string,
    targetAccountId: string,
    method: 'email' | 'google' | 'apple' | 'phone',
  ): Promise<{ success: boolean; linkedAccountId: string }> {
    const linkId = uuidv4();
    
    await this.connection.collection('account_links').insertOne({
      id: linkId,
      source_account_id: sourceAccountId,
      target_account_id: targetAccountId,
      method,
      status: 'active',
      created_at: new Date(),
    });

    this.logger.log(`Linked accounts: ${sourceAccountId} -> ${targetAccountId} via ${method}`);
    return { success: true, linkedAccountId: linkId };
  }

  async getLinkedAccounts(accountId: string): Promise<any[]> {
    return this.connection.collection('account_links')
      .find({
        $or: [
          { source_account_id: accountId },
          { target_account_id: accountId },
        ],
        status: 'active',
      })
      .toArray();
  }

  async unlinkAccounts(linkId: string): Promise<void> {
    await this.connection.collection('account_links').updateOne(
      { id: linkId },
      { $set: { status: 'inactive', unlinked_at: new Date() } },
    );
  }

  async findAccountByEmail(email: string): Promise<any> {
    return this.connection.collection('users').findOne({ email });
  }

  async findAccountByPhone(phone: string): Promise<any> {
    return this.connection.collection('users').findOne({ phone });
  }
}
