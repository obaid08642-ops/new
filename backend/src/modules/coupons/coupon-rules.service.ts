import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CouponService } from '../finance-engine/finance-engine.module';
import { ApplyStackDto, EvaluateStackDto } from './coupon-rules.dto';

/** Mirrors FraudService's coupon-abuse threshold (finance-engine, read-only). */
export const COUPON_ABUSE_FAILURES_1H = 10;
/** Hard cap on stacked codes per order. */
export const MAX_STACKED_CODES = 3;

export interface StackLine {
  code: string;
  discount: number;
  stackable: boolean;
}

export interface StackEvaluation {
  valid: boolean;
  reason?: string;
  codes: StackLine[];
  total_discount: number;
}

/**
 * P22.15 — coupon stacking rules engine.
 *
 * Single-code depth already lives in finance-engine `CouponService.validate`
 * (active/expiry/uses/per-user caps/min-order/category/provider/first-order —
 * reused here read-only as the per-code leg). This engine adds what is
 * missing: stacking limits, combined-cap math, and an abuse gate.
 */
@Injectable()
export class CouponRulesService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly single: CouponService,
  ) {}

  async evaluateStack(userId: string, dto: EvaluateStackDto): Promise<StackEvaluation> {
    const uid = String(userId);
    const codes = [...new Set((dto.codes || []).map((c) => String(c).toUpperCase()))].filter(Boolean);
    if (codes.length === 0) return { valid: false, reason: 'codes_required', codes: [], total_discount: 0 };
    if (codes.length > MAX_STACKED_CODES)
      return { valid: false, reason: `too_many_codes: max ${MAX_STACKED_CODES}`, codes: [], total_discount: 0 };

    // Abuse gate: repeated invalid attempts in the last hour block evaluation.
    const since = new Date(Date.now() - 3600 * 1000);
    const failures = await this.conn.collection('coupon_failures').countDocuments({
      user_id: { $eq: uid },
      at: { $gte: since },
    } as never);
    if (failures >= COUPON_ABUSE_FAILURES_1H)
      return { valid: false, reason: 'coupon_abuse_suspected', codes: [], total_discount: 0 };

    const cursor = await this.conn.collection('coupons').find({ code: { $in: codes } } as never);
    const docs = (await cursor.toArray()) as unknown as Array<{ code: string; stackable?: boolean }>;
    const byCode = new Map(docs.map((d) => [String(d.code).toUpperCase(), d]));
    const missing = codes.filter((c) => !byCode.has(c));
    if (missing.length > 0)
      return { valid: false, reason: `unknown_codes: ${missing.join(',')}`, codes: [], total_discount: 0 };

    const ctx = {
      order_total: Number(dto.order_total),
      ...(dto.provider_id ? { provider_id: String(dto.provider_id) } : {}),
      ...(dto.categories ? { categories: dto.categories.map(String) } : {}),
    };
    const lines: StackLine[] = [];
    for (const code of codes) {
      const v = await this.single.validate(uid, code, ctx);
      if (!v.valid)
        return { valid: false, reason: `coupon_invalid:${code}:${v.reason}`, codes: [], total_discount: 0 };
      lines.push({
        code,
        discount: v.discount,
        stackable: byCode.get(code)?.stackable === true,
      });
    }

    // Stacking limit: a non-stackable code cannot combine with any other code.
    const nonStackable = lines.filter((l) => !l.stackable).map((l) => l.code);
    if (lines.length > 1 && nonStackable.length > 0)
      return {
        valid: false,
        reason: `stacking_not_allowed: ${nonStackable.join(',')}`,
        codes: [],
        total_discount: 0,
      };

    const total = Math.min(
      Math.round(lines.reduce((s, l) => s + l.discount, 0) * 100) / 100,
      Math.max(0, Number(dto.order_total)),
    );
    return { valid: true, codes: lines, total_discount: total };
  }

  /**
   * Record usage for a validated stack. Applies sequentially; on any failure
   * releases what was already applied so a partial stack never persists.
   */
  async applyStack(
    userId: string,
    dto: ApplyStackDto,
  ): Promise<{ order_id: string; codes: StackLine[]; total_discount: number }> {
    const uid = String(userId);
    const evaluation = await this.evaluateStack(uid, dto);
    if (!evaluation.valid)
      throw new BadRequestException(`coupon_stack_invalid: ${evaluation.reason}`);
    const ctx = {
      order_total: Number(dto.order_total),
      ...(dto.provider_id ? { provider_id: String(dto.provider_id) } : {}),
      ...(dto.categories ? { categories: dto.categories.map(String) } : {}),
    };
    const applied: string[] = [];
    try {
      for (const line of evaluation.codes) {
        await this.single.apply(uid, line.code, String(dto.order_id), ctx);
        applied.push(line.code);
      }
    } catch (e) {
      // Usages share the order_id (see CouponService.apply); each release()
      // call removes one usage row, so release once per applied code.
      for (let i = 0; i < applied.length; i++) {
        try {
          await this.single.release(String(dto.order_id));
        } catch {
          /* compensation is best-effort; the stack error is rethrown */
        }
      }
      throw e;
    }
    return {
      order_id: String(dto.order_id),
      codes: evaluation.codes,
      total_discount: evaluation.total_discount,
    };
  }
}
