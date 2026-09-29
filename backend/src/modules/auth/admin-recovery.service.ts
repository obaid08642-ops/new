import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';

/**
 * C6: break-glass recovery for admin accounts. 10 single-use printed codes,
 * stored hashed (sha256 pre-hash + bcrypt, so a DB leak alone is useless).
 * A code restores access ONLY together with a fresh email OTP — an email
 * code alone (or a used/unknown code) is rejected. Regenerating the set
 * requires step-up re-authentication (enforced at the controller).
 */
@Injectable()
export class AdminRecoveryService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get codes() {
    return this.conn.collection('admin_recovery_codes');
  }

  private hash(code: string) {
    return createHash('sha256').update(code).digest('hex');
  }

  /** Generate a fresh set of 10 codes; returns the PLAINTEXT codes once. */
  async generate(userId: string): Promise<string[]> {
    const plain: string[] = Array.from({ length: 10 }, () =>
      randomBytes(5).toString('hex').toUpperCase().replace(/(.{4})(.{4})(.{2})/, '$1-$2-$3'),
    );
    await this.codes.deleteMany({ user_id: userId });
    const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
    const docs = await Promise.all(
      plain.map(async (c) => ({
        id: randomBytes(16).toString('hex'),
        user_id: userId,
        code_hash: await bcrypt.hash(this.hash(c), rounds),
        used: false,
        createdAt: new Date(),
      })),
    );
    await this.codes.insertMany(docs);
    return plain;
  }

  async remaining(userId: string): Promise<number> {
    return this.codes.countDocuments({ user_id: userId, used: false });
  }

  /**
   * Consume one code. Returns true on success. Single-use: the code is marked
   * used inside the same check so replays fail. Throws on unknown/used code.
   */
  async consume(userId: string, code: string): Promise<void> {
    const normalized = String(code || '').trim().toUpperCase();
    if (!normalized) throw new ForbiddenException('recovery_code_required');
    const candidates: any[] = await this.codes.find({ user_id: userId, used: false }).toArray();
    for (const c of candidates) {
      if (await bcrypt.compare(this.hash(normalized), c.code_hash)) {
        const res = await this.codes.updateOne(
          { id: c.id, used: false },
          { $set: { used: true, used_at: new Date() } },
        );
        if (res.modifiedCount === 1) return;
        break; // raced — treat as consumed
      }
    }
    throw new ForbiddenException('recovery_code_invalid');
  }
}
