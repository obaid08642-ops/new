import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface LinkedAccount {
  id: string;
  sourceAccountId: string;
  targetAccountId: string;
  method: 'email' | 'google' | 'apple' | 'phone';
  providerEmail: string;
  providerId?: string;
  status: 'pending' | 'active' | 'inactive';
  confirmedAt?: Date;
  createdAt: Date;
  appleRelayEmail?: string; // For "hide my email" relay addresses
}

@Injectable()
export class AccountLinkingService {
  private readonly logger = new Logger(AccountLinkingService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Link accounts using same verified email across providers
   * Google/Apple/Email → offer to link after confirmation
   * Apple "hide my email" relay addresses work for codes and receipts
   */
  async linkAccounts(
    sourceAccountId: string,
    targetAccountId: string,
    method: 'email' | 'google' | 'apple' | 'phone',
    providerEmail: string,
    providerId?: string,
    appleRelayEmail?: string,
  ): Promise<{ success: boolean; linkedAccountId: string }> {
    const linkId = uuidv4();

    // Check if this email is already linked to another account
    const existingLink = await this.connection.collection('account_links').findOne({
      providerEmail: providerEmail.toLowerCase(),
      status: 'active',
      targetAccountId: { $ne: targetAccountId },
    });

    if (existingLink) {
      throw new ConflictException('email_already_linked_to_another_account');
    }

    // Check for existing pending link
    const pendingLink = await this.connection.collection('account_links').findOne({
      providerEmail: providerEmail.toLowerCase(),
      status: 'pending',
      targetAccountId,
    });

    if (pendingLink) {
      throw new BadRequestException('link_already_pending');
    }

    // Handle Apple "hide my email" relay addresses
    const isAppleRelay = method === 'apple' && this.isAppleRelayEmail(providerEmail);
    const relayEmail = isAppleRelay ? providerEmail : undefined;
    const actualEmail = isAppleRelay ? appleRelayEmail : providerEmail;

    await this.connection.collection('account_links').insertOne({
      id: linkId,
      sourceAccountId,
      targetAccountId,
      method,
      providerEmail: providerEmail.toLowerCase(),
      providerId,
      status: 'pending',
      appleRelayEmail: relayEmail,
      createdAt: new Date(),
    });

    this.logger.log(`Initiated account link: ${sourceAccountId} -> ${targetAccountId} via ${method} (${providerEmail})`);
    return { success: true, linkedAccountId: linkId };
  }

  /**
   * Confirm a pending account link (after email verification)
   */
  async confirmLink(linkId: string): Promise<void> {
    const link = await this.connection.collection('account_links').findOne({ id: linkId });
    if (!link) {
      throw new BadRequestException('link_not_found');
    }

    if (link.status !== 'pending') {
      throw new BadRequestException('link_not_pending');
    }

    await this.connection.collection('account_links').updateOne(
      { id: linkId },
      { $set: { status: 'active', confirmedAt: new Date() } },
    );

    // Update user's primary email if not set
    await this.connection.collection('users').updateOne(
      { id: link.targetAccountId, email: { $exists: false } },
      { $set: { email: link.providerEmail } },
    );

    this.logger.log(`Confirmed account link: ${linkId}`);
  }

  /**
   * Get linked accounts for a user
   */
  async getLinkedAccounts(accountId: string): Promise<LinkedAccount[]> {
    const results = await this.connection.collection('account_links')
      .find({
        $or: [
          { sourceAccountId: accountId },
          { targetAccountId: accountId },
        ],
        status: 'active',
      })
      .sort({ createdAt: -1 })
      .toArray();
    return results as unknown as LinkedAccount[];
  }

  /**
   * Get pending links for a user (for confirmation UI)
   */
  async getPendingLinks(accountId: string): Promise<LinkedAccount[]> {
    const results = await this.connection.collection('account_links')
      .find({
        targetAccountId: accountId,
        status: 'pending',
      })
      .sort({ createdAt: -1 })
      .toArray();
    return results as unknown as LinkedAccount[];
  }

  /**
   * Unlink accounts
   */
  async unlinkAccounts(linkId: string, userId: string): Promise<void> {
    const link = await this.connection.collection('account_links').findOne({ id: linkId });
    if (!link) {
      throw new BadRequestException('link_not_found');
    }

    // Verify user owns this link
    if (link.sourceAccountId !== userId && link.targetAccountId !== userId) {
      throw new BadRequestException('unauthorized_unlink');
    }

    await this.connection.collection('account_links').updateOne(
      { id: linkId },
      { $set: { status: 'inactive', unlinkedAt: new Date() } },
    );
  }

  /**
   * Find account by email (for linking flow)
   */
  async findAccountByEmail(email: string): Promise<any> {
    return this.connection.collection('users').findOne({ 
      email: email.toLowerCase() 
    });
  }

  /**
   * Find account by phone (for linking flow)
   */
  async findAccountByPhone(phone: string): Promise<any> {
    return this.connection.collection('users').findOne({ phone });
  }

  /**
   * Check if email is an Apple "hide my email" relay address
   * Format: xxxxx@privaterelay.appleid.com
   */
  isAppleRelayEmail(email: string): boolean {
    return email.toLowerCase().endsWith('@privaterelay.appleid.com');
  }

  /**
   * Check if user has same verified email across providers (for link suggestion)
   */
  async checkForLinkOpportunity(userId: string, email: string): Promise<{ canLink: boolean; existingMethod?: string }> {
    const existingLinks = await this.connection.collection('account_links').find({
      targetAccountId: userId,
      status: 'active',
    }).toArray();

    const linkedEmails = existingLinks.map(l => l.providerEmail.toLowerCase());
    
    if (linkedEmails.includes(email.toLowerCase())) {
      const existing = existingLinks.find(l => l.providerEmail.toLowerCase() === email.toLowerCase());
      return { canLink: false, existingMethod: existing?.method };
    }

    // Check if this email exists on another account
    const otherAccount = await this.connection.collection('users').findOne({
      email: email.toLowerCase(),
      id: { $ne: userId },
    });

    if (otherAccount) {
      return { canLink: true };
    }

    return { canLink: false };
  }

  /**
   * Get Apple relay email for notifications (codes, receipts)
   * Returns the relay email if available, otherwise the actual email
   */
  async getNotificationEmail(userId: string, method: 'apple'): Promise<string | null> {
    const link = await this.connection.collection('account_links').findOne({
      targetAccountId: userId,
      method: 'apple',
      status: 'active',
    });

    if (link?.appleRelayEmail) {
      return link.appleRelayEmail;
    }

    // Fallback to actual email
    const user = await this.connection.collection('users').findOne({ id: userId });
    return user?.email || null;
  }
}