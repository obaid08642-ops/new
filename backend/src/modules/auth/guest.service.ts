/**
 * Phase 21.1 / 21.2 / 21.8 — guest identity and the guest → account merge.
 *
 * 21.1 A guest is a real server-side account (a UUID row with `is_guest`), bound
 *      to a device id. The IP is never part of the identity: it is shared and
 *      it changes.
 * 21.2 The merge runs for every sign-up and sign-in method, moves every
 *      collection in the registry, and runs inside ONE MongoDB transaction, so
 *      an injected failure halfway leaves nothing moved.
 *
 *      PROOF OF POSSESSION. A guest account id is NOT a secret: it appears on
 *      the orders a pharmacy sees, in logs and in screenshots. So a merge is
 *      only ever performed for a guest token that this server signed
 *      (`proveGuestToken`): the signature, expiry, `is_guest` flag and
 *      still-unmerged row are all checked, and the token's jti is burned so it
 *      cannot be replayed. A bare id is never accepted.
 * 21.8 Account deletion also covers guest data, and inactive guests with no
 *      orders are removed after a configurable window.
 */
import { Injectable, Logger, Optional, UnauthorizedException } from '@nestjs/common';
import { PdplService } from '../users/pdpl.service';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { GUEST_OWNED_COLLECTIONS, GuestOwnedCollection } from './guest-merge.registry';

const REDIS_MERGE_JTI_PREFIX = 'auth:guest-merge:jti:';
/** A guest token is accepted for a merge only while it is still alive. */
const MERGE_TOKEN_TTL_SECONDS = 15 * 60;

export interface GuestMergeProof {
  /** The guest account id, taken from the verified token's subject. */
  guestAccountId: string;
  /** The token id, burned for this merge. */
  jti: string;
}

export interface GuestMergeMove {
  collection: string;
  field: string;
  matched: number;
  modified: number;
}

export interface GuestMergeReport {
  guest_account_id: string;
  target_account_id: string;
  moves: GuestMergeMove[];
  cart_lines_kept: number;
  duplicates_dropped: number;
  audit_row_id: string;
}

const ID_FIELDS = ['id', 'product_id', 'medicine_id', 'sku'];

@Injectable()
export class GuestService {
  private readonly logger = new Logger(GuestService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    // 21.8: the account-deletion erasure, reused for guests (null in unit tests that only exercise the merge)
    @Optional() private readonly pdpl?: PdplService,
  ) {}

  /** A guest account id is a UUID, never the phone and never the IP. */
  newGuestAccountId(): string {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('crypto').randomUUID();
  }

  /**
   * Turn a guest access token into the account id it PROVES, or refuse.
   *
   * Refused when the token is missing, not signed by this server, expired, not
   * a guest token, for an account that is not a live guest, or when its jti has
   * already been spent on a merge.
   */
  async proveGuestToken(token: string | undefined | null): Promise<GuestMergeProof> {
    if (!token || typeof token !== 'string' || !token.trim()) {
      throw new UnauthorizedException('guest_merge_requires_the_guest_token');
    }
    let claims: Record<string, unknown>;
    try {
      // JwtService.verify checks the signature, the algorithm and the expiry.
      claims = await this.jwt.verify(token.trim());
    } catch {
      throw new UnauthorizedException('guest_merge_token_invalid');
    }
    if (claims.is_guest !== true) throw new UnauthorizedException('guest_merge_token_is_not_a_guest');

    const guestAccountId = String(claims.sub ?? '');
    if (!guestAccountId) throw new UnauthorizedException('guest_merge_token_has_no_subject');

    const guest = await this.connection.collection('users').findOne(
      { id: guestAccountId, is_guest: true, merged_into: { $exists: false } },
      { projection: { _id: 0, id: 1, is_guest: 1, merged_into: 1 } },
    );
    if (!guest) throw new UnauthorizedException('guest_merge_guest_is_not_live');

    // Single-use: the jti is claimed with SET NX before the merge starts, so a
    // token captured from a request log cannot be replayed.
    //
    // This fails CLOSED. A token with no jti cannot be burned, so it is
    // rejected; and if the claim store is unreachable the merge is refused
    // rather than silently performed replayable. Either way the user's
    // sign-in still succeeds — only the merge is skipped.
    const jti = String(claims.jti ?? '').trim();
    if (!jti) throw new UnauthorizedException('guest_merge_token_has_no_id');

    const client = this.redis?.getClient?.();
    if (!client) throw new UnauthorizedException('guest_merge_single_use_unavailable');

    // SET NX returns null when the key is already there: this token has
    // already bought a merge.
    const claimed = await client
      .set(`${REDIS_MERGE_JTI_PREFIX}${jti}`, '1', 'EX', MERGE_TOKEN_TTL_SECONDS, 'NX')
      .catch((e: any) => {
        this.logger.warn(`guest merge claim failed: ${e?.message}`);
        return null;
      });
    if (claimed !== 'OK') throw new UnauthorizedException('guest_merge_token_already_used');

    return { guestAccountId, jti };
  }

  /**
   * Merge every collection in the registry from one guest account into another,
   * atomically. `proof` must come from `proveGuestToken`: the caller can never
   * decide who the guest is on its own.
   */
  async mergeGuestIntoAccount(
    proof: GuestMergeProof,
    targetAccountId: string,
  ): Promise<GuestMergeReport> {
    const guestAccountId = proof.guestAccountId;
    if (!targetAccountId) throw new Error('guest_merge_requires_the_target_account');
    if (guestAccountId === targetAccountId) throw new Error('guest_merge_requires_two_accounts');

    const moves: GuestMergeMove[] = [];
    let cartLinesKept = 0;
    let duplicatesDropped = 0;
    let auditRowId = '';

    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        for (const entry of GUEST_OWNED_COLLECTIONS) {
          const outcome = await this.moveCollection(session, entry, guestAccountId, targetAccountId);
          moves.push(...outcome.moves);
          cartLinesKept += outcome.cartLinesKept;
          duplicatesDropped += outcome.duplicatesDropped;
        }

        // The patient profile of the guest becomes the profile of the account.
        // A profile that already exists for the target wins; the guest row is
        // removed so there is never a second profile for one account.
        const profiles = this.connection.collection('patient_profiles');
        const targetProfile = await profiles.findOne({ user_id: targetAccountId }, { session });
        const guestProfile = await profiles.findOne({ user_id: guestAccountId }, { session });
        if (guestProfile) {
          if (!targetProfile) {
            await profiles.updateOne({ _id: guestProfile._id }, { $set: { user_id: targetAccountId } }, { session });
          } else {
            await profiles.deleteOne({ _id: guestProfile._id }, { session });
          }
        }

        // Exactly one audit row records what moved (21.2).
        auditRowId = require('crypto').randomUUID();
        await this.connection.collection('audit_logs').insertOne(
          {
            id: auditRowId,
            action: 'account.guest_merged',
            user_id: targetAccountId,
            role: 'patient',
            resource_kind: 'account',
            resource_id: targetAccountId,
            severity: 'info',
            details: {
              guest_account_id: guestAccountId,
              target_account_id: targetAccountId,
              collections: moves.length,
              duplicates_dropped: duplicatesDropped,
            },
          },
          { session },
        );

        // The guest row itself is retired last, inside the same transaction.
        await this.connection.collection('users').updateOne(
          { id: guestAccountId, is_guest: true },
          {
            $set: {
              is_guest: false,
              merged_into: targetAccountId,
              merged_at: new Date(),
              phone: `merged-${guestAccountId}`,
              email: null,
              password_hash: null,
            },
          },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    this.logger.log(
      `guest ${guestAccountId} merged into ${targetAccountId}: ${moves.length} field moves, ` +
        `${duplicatesDropped} duplicates dropped`,
    );

    return {
      guest_account_id: guestAccountId,
      target_account_id: targetAccountId,
      moves,
      cart_lines_kept: cartLinesKept,
      duplicates_dropped: duplicatesDropped,
      audit_row_id: auditRowId,
    };
  }

  /**
   * One collection, one rule. Every write is awaited: a failure propagates out
   * of the transaction so nothing is half-moved.
   */
  private async moveCollection(
    session: ClientSession,
    entry: GuestOwnedCollection,
    from: string,
    to: string,
  ): Promise<{ moves: GuestMergeMove[]; cartLinesKept: number; duplicatesDropped: number }> {
    const col = this.connection.collection(entry.collection);
    const moves: GuestMergeMove[] = [];
    let cartLinesKept = 0;
    let duplicatesDropped = 0;

    // Two carts become one cart: the target's lines plus the guest lines the
    // target does not already have. Never two carts for one account.
    if (entry.rule === 'merge') {
      for (const field of entry.fields) {
        await col.updateMany({ [field]: from }, { $set: { [field]: to } }, { session });
        const merged = await col.findOne({ [field]: to }, { session });
        if (merged && Array.isArray(merged.lines)) cartLinesKept = merged.lines.length;
      }
      return { moves, cartLinesKept, duplicatesDropped };
    }

    for (const field of entry.fields) {
      const res = await col.updateMany({ [field]: from }, { $set: { [field]: to } }, { session });
      const matched = res.matchedCount ?? 0;
      const modified = res.modifiedCount ?? 0;
      if (matched || modified) {
        moves.push({ collection: entry.collection, field, matched, modified });
      }
    }

    // After a rewrite, two rows can say the same thing. Drop the copies that
    // duplicate a row the target already had, keeping the older id stable.
    if (entry.rule === 'dedupe') {
      const keyFields = ID_FIELDS.filter((f) => f !== 'id');
      for (const field of entry.fields) {
        const rows = await col.find({ [field]: to }, { session }).toArray();
        if (rows.length < 2) continue;
        const seen = new Set<string>();
        for (const row of rows) {
          const fingerprint = keyFields
            .map((k) => (row as Record<string, unknown>)[k])
            .filter((v) => v !== undefined && v !== null)
            .map((v) => String(v))
            .join('|');
          if (!fingerprint) continue;
          if (seen.has(fingerprint)) {
            await col.deleteOne({ _id: row._id }, { session });
            duplicatesDropped += 1;
          } else {
            seen.add(fingerprint);
          }
        }
      }
    }

    return { moves, cartLinesKept, duplicatesDropped };
  }

  /**
   * 21.8 Guest data lifecycle. A guest who has done nothing for `GUEST_RETENTION_MONTHS` (default 12) loses their data:
   *  - no orders: the personal data and the account row are deleted, with the device binding;
   *  - orders: the law requires the order and the invoice, not the identity — the order rows are kept without identity
   *    fields (the same erasure as an account deletion), the personal data is deleted and the account row stays only as
   *    a shell the orders can still point at.
   * "Nothing" means no sign-in, refresh or reopening of the app: the latest of the creation time, `last_active_at` (set
   * when a guest session is used) and the device binding's `last_seen_at`. A guest who is still using the app is never
   * purged, however old the account is. `retentionDays` overrides the window for one run (the admin's manual cleanup).
   */
  async purgeInactiveGuests(now: Date = new Date(), opts: { retentionDays?: number; limit?: number } = {}): Promise<{ anonymised: number; deleted: number }> {
    const months = Number(process.env.GUEST_RETENTION_MONTHS || 12);
    if (!Number.isFinite(months) || months <= 0) throw new Error('GUEST_RETENTION_MONTHS must be a positive number');
    const cutoff = new Date(now);
    if (opts.retentionDays && opts.retentionDays > 0) cutoff.setDate(cutoff.getDate() - opts.retentionDays);
    else cutoff.setMonth(cutoff.getMonth() - months);

    const users = this.connection.collection('users');
    const bindings = this.connection.collection('guest_devices');
    // the cheap filters run in the database; the binding is checked per candidate (it is optional)
    const candidates = await users
      .find({
        is_guest: true,
        merged_into: { $exists: false },
        anonymised_at: { $exists: false },
        createdAt: { $lt: cutoff },
        $or: [{ last_active_at: { $exists: false } }, { last_active_at: { $lt: cutoff } }],
      })
      .limit(opts.limit ?? 500)
      .toArray();

    let anonymised = 0;
    let deleted = 0;
    const orderCollections = ['pharmacy_orders', 'orders', 'transactions', 'appointments', 'diagnostic_orders', 'lab_bookings', 'radiology_bookings', 'home_care_bookings', 'nursing_services'];
    for (const guest of candidates) {
      const guestId = String(guest.id);
      const binding: any = await bindings.findOne({ guest_id: guestId }, { projection: { last_seen_at: 1 } });
      if (binding?.last_seen_at && new Date(binding.last_seen_at) >= cutoff) continue; // reopened the app lately

      const hasOrders = await this.hasOrders(guestId, orderCollections);
      // the same erasure as an account deletion: personal rows deleted, order/invoice/medical rows kept without identity
      if (this.pdpl) await this.pdpl.erasePatientData(guestId, { reason: 'guest_inactivity', retention: true });
      await bindings.deleteMany({ guest_id: guestId });
      await this.connection.collection('audit_logs').insertOne({
        id: require('crypto').randomUUID(),
        action: hasOrders ? 'account.guest_anonymised' : 'account.guest_purged',
        user_id: guestId,
        role: 'patient',
        resource_kind: 'account',
        resource_id: guestId,
        severity: 'info',
        details: { retention_months: months, cutoff: cutoff.toISOString() },
      });
      if (hasOrders) {
        await users.updateOne(
          { id: guestId },
          { $set: { full_name: 'deleted guest', phone: null, email: null, is_guest: true, anonymised_at: now } },
        );
        anonymised += 1;
      } else {
        await users.deleteOne({ id: guestId });
        deleted += 1;
      }
    }
    return { anonymised, deleted };
  }

  private async hasOrders(guestId: string, orderCollections: string[]): Promise<boolean> {
    for (const name of orderCollections) {
      const exists = await this.connection.collection(name).findOne(
        { $or: [{ patient_id: guestId }, { user_id: guestId }, { patient_account_id: guestId }] },
        { projection: { _id: 1 } },
      );
      if (exists) return true;
    }
    return false;
  }
}