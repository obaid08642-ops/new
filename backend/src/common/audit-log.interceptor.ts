import { Injectable, NestInterceptor, ExecutionContext, CallHandler, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AuditService } from '../modules/security/security.module';

export const AUDITED_KEY = 'audited';

export interface AuditMetadata {
  model: string;
  idParam?: string; // route param name (e.g. 'id')
  action?: string;   // custom action string
}

/**
 * Keys whose values must never land in the audit store in cleartext.
 * Audit logs are long-lived and broadly readable; credentials, OTP material,
 * national identifiers and payment instruments would otherwise expand the
 * breach scope of every audited mutation.
 */
const SENSITIVE_KEY_PATTERN =
  /password|passwd|secret|token|otp|national[_-]?id|iqama|passport|iban|card[_-]?number|cvv|cvc|biometric|private[_-]?key|api[_-]?key/i;

const REDACTED = '[REDACTED]';
const MAX_AUDIT_BODY_CHARS = 10_000;

export function redactAuditValue(value: any, depth = 0): any {
  if (depth > 6) return REDACTED;
  if (Array.isArray(value)) return value.map((v) => redactAuditValue(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        // Preserve {old,new} diff-pair shape with redacted values so audits
        // keep change evidence without leaking secrets (spec contract).
        const v = (value as any)[key];
        out[key] = (v && typeof v === 'object' && !Array.isArray(v) && 'old' in v && 'new' in v)
          ? { old: REDACTED, new: REDACTED }
          : REDACTED;
      } else {
        out[key] = redactAuditValue(value[key], depth + 1);
      }
    }
    return out;
  }
  return value;
}

export function redactAuditBody(body: any): any {
  const redacted = redactAuditValue(body);
  try {
    const serialized = JSON.stringify(redacted);
    if (serialized && serialized.length > MAX_AUDIT_BODY_CHARS) return REDACTED;
  } catch {
    return REDACTED;
  }
  return redacted;
}

/**
 * Decorator to mark controller routes for automated audit logging and data diffing.
 */
export const Audited = (metadata: AuditMetadata) => SetMetadata(AUDITED_KEY, metadata);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    @InjectConnection() private connection: Connection,
    private auditService: AuditService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    const auditMeta = this.reflector.get<AuditMetadata>(
      AUDITED_KEY,
      handler,
    );

    if (!auditMeta) {
      return next.handle();
    }

    const { model: modelName, idParam = 'id', action } = auditMeta;
    const reqId = request.params[idParam];

    let docBefore: any = null;
    let model: any = null;

    try {
      model = this.connection.model(modelName);
      if (reqId && model) {
        docBefore = await model.findOne({ id: reqId }).lean();
      }
    } catch (err) {
      // If model is not registered, continue silently
    }

    return next.handle().pipe(
      tap(async (data) => {
        try {
          const user = request.user;
          // req.ip already applies the configured trust-proxy policy; reading
          // X-Forwarded-For directly would let a client forge audit attribution.
          const ip = request.ip || request.socket?.remoteAddress;
          const userAgent = request.headers['user-agent'];
          const correlationId = request.correlation_id;

          let docAfter: any = null;
          if (reqId && model) {
            docAfter = await model.findOne({ id: reqId }).lean();
          } else if (model && data && data.id) {
            docAfter = await model.findOne({ id: data.id }).lean();
          }

          const diff = this.calculateDiff(docBefore, docAfter);

          await this.auditService.write({
            action: action || `${modelName.toLowerCase()}_modified`,
            user_id: user?.id,
            role: user?.role,
            ip: typeof ip === 'string' ? ip : undefined,
            user_agent: userAgent,
            resource_kind: modelName,
            resource_id: reqId || data?.id || docAfter?.id,
            details: {
              diff: redactAuditValue(diff),
              request_body: redactAuditBody(request.body),
            },
            severity: 'info',
            correlation_id: correlationId,
          });
        } catch (err) {
          // Fail-safe to avoid blocking requests if auditing fails
        }
      }),
    );
  }

  private calculateDiff(before: any, after: any) {
    if (!before && !after) return null;
    const diff: Record<string, { old: any; new: any }> = {};

    if (!before && after) {
      // Creation diff
      for (const key of Object.keys(after)) {
        if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) continue;
        diff[key] = { old: null, new: after[key] };
      }
      return diff;
    }

    if (before && !after) {
      // Deletion diff
      for (const key of Object.keys(before)) {
        if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) continue;
        diff[key] = { old: before[key], new: null };
      }
      return diff;
    }

    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of allKeys) {
      if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) continue;

      const valBefore = before[key];
      const valAfter = after[key];

      if (JSON.stringify(valBefore) !== JSON.stringify(valAfter)) {
        diff[key] = { old: valBefore, new: valAfter };
      }
    }

    return Object.keys(diff).length > 0 ? diff : null;
  }
}
