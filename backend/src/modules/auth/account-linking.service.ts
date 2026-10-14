/**
 * Phase 21.6 — account linking.
 *
 * Two accounts may be linked when they share a *proven* identity. The proof is
 * never anything the caller sends:
 *
 *  - by email: the BACKEND generates a six-digit code with a CSPRNG, stores
 *    only its hash, and sends it to the address through MailService. The caller
 *    never sees the code until they read their own inbox, so they can only
 *    confirm a link for an address they actually receive mail at.
 *  - by provider: the proof comes only from a token the backend itself verified
 *    inside `socialLogin` (Google/Apple). A method or subject in the request
 *    body is ignored entirely.
 *
 * Confirmation also requires the caller to be the target account, and each
 * proof is single-use and time-limited.
 */
import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { createHash, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { MailService } from '../mail/mail.module';

export type LinkMethod = 'email' | 'google' | 'apple';

export interface LinkedAccount {
  id: string;
  source_account_id: string;
  target_account_id: string;
  method: LinkMethod;
  provider_email: string;
  status: 'pending' | 'active';
  created_at: Date;
  confirmed_at?: Date;
}

/** What the caller presents at confirmation time — never an identity claim. */
export type LinkConfirmation =
  | { kind: 'email_code'; code: string }
  /** Set by socialLogin after it verified the provider token itself. */
  | { kind: 'verified_provider_session'; verified_subject: string; method: LinkMethod };

const PROOF_TTL_MS = 15 * 60 * 1000;
const CODE_HASH_ROUNDS = 10;
const LINK_REQUESTS_PER_HOUR = 5;

@Injectable()
export class AccountLinkingService {
  private readonly logger = new Logger(AccountLinkingService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly mail: MailService,
  ) {}

  /**
   * Record the INTENT to link and send the proof. Nothing is confirmed here,
   * and the caller never receives the code.
   *
   * `method` decides where the proof comes from: `email` mails a code,
   * `google`/`apple` need a provider session that only `socialLogin` can mint.
   */
  async requestLink(
    sourceAccountId: string,
    targetAccountId: string,
    method: LinkMethod,
    providerEmail: string,
  ): Promise<{ linked_account_id: string; proof_sent_to: 'email' | 'provider_session' }> {
    const email = providerEmail.trim().toLowerCase();
    if (!sourceAccountId || !targetAccountId) throw new BadRequestException('link_requires_two_accounts');
    if (sourceAccountId === targetAccountId) throw new BadRequestException('link_requires_two_accounts');
    if (!email) throw new BadRequestException('provider_email_required');

    // 21.6: at most 5 link requests an hour per account.
    const window = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.connection.collection('account_links').countDocuments({
      source_account_id: sourceAccountId,
      created_at: { $gte: window },
    });
    if (recent >= LINK_REQUESTS_PER_HOUR) {
      throw new HttpException('link_request_rate_limited', HttpStatus.TOO_MANY_REQUESTS);
    }

    const links = this.connection.collection('account_links');
    const alreadyActive = await links.findOne({ provider_email: email, status: 'active' });
    if (alreadyActive) throw new ConflictException('email_already_linked');
    const alreadyPending = await links.findOne({
      provider_email: email,
      status: 'pending',
      target_account_id: targetAccountId,
    });
    if (alreadyPending) throw new ConflictException('link_already_pending');

    const linkId = randomUUID();
    await links.insertOne({
      id: linkId,
      source_account_id: sourceAccountId,
      target_account_id: targetAccountId,
      method,
      provider_email: email,
      status: 'pending',
      created_at: new Date(),
    });

    if (method === 'email') {
      await this.sendCode(linkId, email);
      this.logger.log(`link ${linkId}: code emailed for target ${targetAccountId}`);
      return { linked_account_id: linkId, proof_sent_to: 'email' };
    }
    // google/apple: the proof must arrive from a verified provider session.
    this.logger.log(`link ${linkId}: waiting for a verified ${method} session`);
    return { linked_account_id: linkId, proof_sent_to: 'provider_session' };
  }

  /** The backend generates the code and mails it; it is never returned. */
  private async sendCode(linkId: string, email: string): Promise<void> {
    const code = randomInt(100000, 1000000).toString();
    await this.connection.collection('account_link_proofs').updateOne(
      { link_id: linkId },
      {
        $set: {
          link_id: linkId,
          kind: 'email_code',
          code_hash: await bcrypt.hash(code, CODE_HASH_ROUNDS),
          expires_at: new Date(Date.now() + PROOF_TTL_MS),
          used: false,
        },
      },
      { upsert: true },
    );
    const result = await this.mail.send(
      email,
      'Your Nabd+ account link code',
      `<p>Your account link code is <strong>${code}</strong>. It expires in 15 minutes.</p>` +
        '<p>If you did not ask to link an account, ignore this message.</p>',
      `Your account link code: ${code}`,
    );
    if (!result.ok) {
      // Without a delivered code the link can never be confirmed, so it is not
      // left hanging around.
      await this.connection.collection('account_links').deleteOne({ id: linkId, status: 'pending' });
      await this.connection.collection('account_link_proofs').deleteOne({ link_id: linkId });
      throw new BadRequestException('link_code_delivery_failed');
    }
  }

  /**
   * Record that the CALLER proved this link by signing in with a provider token
   * the backend verified. Only `socialLogin` calls this.
   */
  async recordProviderProof(linkId: string, verifiedSubject: string, method: LinkMethod): Promise<void> {
    const link = await this.linkOrThrow(linkId);
    if (link.method !== method) throw new BadRequestException('link_method_mismatch');
    await this.connection.collection('account_link_proofs').updateOne(
      { link_id: linkId },
      {
        $set: {
          link_id: linkId,
          kind: 'verified_provider_session',
          subject: verifiedSubject,
          method,
          expires_at: new Date(Date.now() + PROOF_TTL_MS),
          used: false,
        },
      },
      { upsert: true },
    );
  }

  /** The link ids waiting on a provider session for this account. */
  async pendingForProvider(accountId: string, method: LinkMethod): Promise<string[]> {
    const rows = await this.connection
      .collection('account_links')
      .find({ source_account_id: accountId, status: 'pending', method }, { projection: { id: 1 } })
      .toArray();
    return rows.map((r) => String(r.id));
  }

  /**
   * Confirm a pending link. Requires the caller to be the target account and a
   * stored, unexpired, unused proof.
   */
  async confirmLink(linkId: string, callerAccountId: string, proof: LinkConfirmation): Promise<void> {
    const link = await this.linkOrThrow(linkId);
    if (link.status !== 'pending') throw new BadRequestException('link_not_pending');
    if (!callerAccountId) throw new ForbiddenException('link_confirmation_requires_the_caller');
    if (callerAccountId !== link.target_account_id) throw new ForbiddenException('link_caller_is_not_the_target');
    if (!proof) throw new ForbiddenException('link_confirmation_requires_proof');
    await this.consumeProof(linkId, proof);

    const links = this.connection.collection('account_links');
    const result = await links.updateOne(
      { id: linkId, status: 'pending', target_account_id: callerAccountId },
      { $set: { status: 'active', confirmed_at: new Date() } },
    );
    if (result.matchedCount !== 1) throw new BadRequestException('link_not_pending');

    // Only now, with proof in hand, may the address be recorded — and only when
    // the account has none of its own.
    await this.connection.collection('users').updateOne(
      { id: callerAccountId, $or: [{ email: { $exists: false } }, { email: null }, { email: '' }] },
      { $set: { email: link.provider_email } },
    );
    await this.connection.collection('audit_logs').insertOne({
      id: randomUUID(),
      action: 'account.linked',
      user_id: callerAccountId,
      role: 'patient',
      resource_kind: 'account',
      resource_id: callerAccountId,
      severity: 'info',
      details: { linked_account_id: linkId, method: link.method, provider_email: link.provider_email },
    });
    this.logger.log(`link ${linkId} confirmed for account ${callerAccountId}`);
  }

  /** A link proof is single-use and time-limited. */
  private async consumeProof(linkId: string, proof: LinkConfirmation): Promise<void> {
    const proofs = this.connection.collection('account_link_proofs');
    const stored = await proofs.findOne({ link_id: linkId });
    if (!stored) throw new ForbiddenException('link_proof_missing');
    if (stored.expires_at && new Date(stored.expires_at).getTime() < Date.now()) {
      throw new ForbiddenException('link_proof_expired');
    }
    if (stored.used) throw new ForbiddenException('link_proof_used');

    if (proof.kind === 'email_code') {
      if (stored.kind !== 'email_code' || !stored.code_hash) throw new ForbiddenException('link_proof_kind_mismatch');
      const ok = await bcrypt.compare(String(proof.code || '').trim(), String(stored.code_hash));
      if (!ok) throw new ForbiddenException('link_proof_code_invalid');
    } else {
      // A provider proof only counts when socialLogin minted it for THIS link.
      if (stored.kind !== 'verified_provider_session') throw new ForbiddenException('link_proof_kind_mismatch');
      if (stored.method !== proof.method) throw new ForbiddenException('link_proof_method_mismatch');
      if (!this.safeEqual(String(stored.subject), String(proof.verified_subject))) {
        throw new ForbiddenException('link_proof_subject_mismatch');
      }
    }

    const used = await proofs.updateOne(
      { link_id: linkId, used: { $ne: true } },
      { $set: { used: true, used_at: new Date() } },
    );
    if (used.modifiedCount !== 1) throw new ForbiddenException('link_proof_used');
  }

  private safeEqual(a: string, b: string): boolean {
    const ha = createHash('sha256').update(a).digest();
    const hb = createHash('sha256').update(b).digest();
    return timingSafeEqual(ha, hb);
  }

  private async linkOrThrow(linkId: string): Promise<LinkedAccount> {
    const link = await this.connection.collection('account_links').findOne({ id: linkId });
    if (!link) throw new BadRequestException('link_not_found');
    return link as unknown as LinkedAccount;
  }

  async getLinkedAccounts(accountId: string): Promise<LinkedAccount[]> {
    const rows = await this.connection
      .collection('account_links')
      .find(
        { $or: [{ source_account_id: accountId }, { target_account_id: accountId }], status: 'active' },
        { projection: { _id: 0 } },
      )
      .toArray();
    return rows as unknown as LinkedAccount[];
  }
}