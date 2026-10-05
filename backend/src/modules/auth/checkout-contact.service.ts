import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CheckoutContactService {
  private readonly logger = new Logger(CheckoutContactService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async validateAndStoreContact(
    userId: string,
    phone: string,
    address: any,
  ): Promise<{ success: boolean; contactId: string }> {
    const contactId = uuidv4();
    
    // Validate phone format (E.164)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      throw new Error('Invalid phone format');
    }

    await this.connection.collection('checkout_contacts').insertOne({
      id: contactId,
      user_id: userId,
      phone,
      address,
      verified: false,
      created_at: new Date(),
    });

    return { success: true, contactId };
  }

  async markContactVerified(contactId: string): Promise<void> {
    await this.connection.collection('checkout_contacts').updateOne(
      { id: contactId },
      { $set: { verified: true, verified_at: new Date() } },
    );
  }

  async getContact(contactId: string): Promise<any> {
    return this.connection.collection('checkout_contacts').findOne({ id: contactId });
  }
}
