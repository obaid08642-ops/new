import { ExecutionContext, CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { PROVIDER_ROLES } from '../../common/enums';

export const PROVIDER_AGREEMENT_KEY = 'provider_agreement';

/** An acceptance holds for every minor version of the same major version; a new major version asks again. */
export const majorOf = (v: unknown): string => String(v ?? '1.0').split('.')[0];

/** A provider-side caller: the account role or token scope of a provider (the same test the legal service uses for its own side). */
export function isProviderCaller(user: any): boolean {
  const role = String(user?.role || '');
  return role === 'provider' || user?.scope === 'provider' || (PROVIDER_ROLES as readonly string[]).includes(role);
}

/** Routes a provider may still call while the agreement is pending: signing in and the legal and onboarding routes (not under /provider/). */
export const AGREEMENT_EXEMPT = /^\/api\/v1\/provider\/auth(\/|$)/;
const PROVIDER_API = /^\/api\/v1\/provider\//;

type Verdict = { ok: boolean; version?: string; at: number };

/**
 * The server holds the line a new contract version draws: a provider whose accepted version has an older major than the
 * published `provider_agreement` is refused on every /provider/ route with 403 `provider_agreement_required` until they accept
 * it (the app opens the contract on that code). No published agreement, or one that does not apply to providers, blocks nothing.
 * The answer is kept for 30 seconds per provider; accepting clears it.
 */
@Injectable()
export class ProviderAgreementGuard implements CanActivate {
  private static cache = new Map<string, Verdict>();
  private static readonly TTL_MS = 30_000;
  constructor(@InjectConnection() private readonly conn: Connection) {}

  static forget(userId: string): void { ProviderAgreementGuard.cache.delete(userId); }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const path: string = String(req.path || req.url || '').split('?')[0];
    if (!PROVIDER_API.test(path) || AGREEMENT_EXEMPT.test(path)) return true;
    const user = req.user;
    if (!user?.id || !isProviderCaller(user)) return true;
    const verdict = await this.verdict(String(user.id));
    if (verdict.ok) return true;
    throw new ForbiddenException({ statusCode: 403, message: 'provider_agreement_required', code: 'provider_agreement_required', policy_key: PROVIDER_AGREEMENT_KEY, version: verdict.version ?? null });
  }

  private async verdict(userId: string): Promise<Verdict> {
    const hit = ProviderAgreementGuard.cache.get(userId);
    const now = Date.now();
    if (hit && now - hit.at < ProviderAgreementGuard.TTL_MS) return hit;
    const policy: any = await this.conn.collection('legal_policies').findOne({ key: PROVIDER_AGREEMENT_KEY }, { projection: { version: 1, requires_acceptance: 1, applies_to: 1 } });
    let v: Verdict = { ok: true, at: now };
    const applies = Array.isArray(policy?.applies_to) && policy.applies_to.length ? policy.applies_to : ['all'];
    if (policy && policy.requires_acceptance !== false && (applies.includes('all') || applies.includes('provider'))) {
      const accepted = await this.conn.collection('legal_acceptances').find({ user_id: userId, policy_key: PROVIDER_AGREEMENT_KEY }, { projection: { version: 1 } }).toArray();
      v = accepted.some((a: any) => majorOf(a.version) === majorOf(policy.version)) ? { ok: true, at: now } : { ok: false, version: String(policy.version), at: now };
    }
    if (ProviderAgreementGuard.cache.size > 5000) ProviderAgreementGuard.cache.clear();
    ProviderAgreementGuard.cache.set(userId, v);
    return v;
  }
}
