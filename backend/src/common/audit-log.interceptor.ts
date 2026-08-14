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
          const ip = request.ip || request.headers['x-forwarded-for'] || request.socket.remoteAddress;
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
              diff,
              request_body: request.body,
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
