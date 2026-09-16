import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const PUBLIC_CACHEABLE_PREFIXES = [
  '/api/v1/medicines',
  '/api/v1/lab-services',
  '/api/v1/radiology',
  '/api/v1/care/services',
  '/api/v1/home-care/services',
  '/api/v1/service-catalog',
  '/api/v1/health',
  '/api/v1/articles',
];

const PRIVATE_PREFIXES = [
  '/api/v1/auth',
  '/api/v1/orders',
  '/api/v1/bookings',
  '/api/v1/wallet',
  '/api/v1/payments',
  '/api/v1/users',
  '/api/v1/providers',
  '/api/v1/chat',
  '/api/v1/notifications',
];

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const isGet = req.method === 'GET';
    const url: string = req.url || '';
    if (!isGet) {
      res.setHeader?.('Cache-Control', 'no-store, no-cache, must-revalidate');
      return next.handle();
    }
    const isPublic = PUBLIC_CACHEABLE_PREFIXES.some(p => url.startsWith(p));
    const isPrivate = PRIVATE_PREFIXES.some(p => url.startsWith(p));
    return next.handle().pipe(
      tap(() => {
        if (isPublic) {
          res.setHeader?.('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
          res.setHeader?.('Vary', 'Accept-Encoding, Accept-Language');
          res.setHeader?.('X-Cache-Hint', 'public');
        } else if (isPrivate) {
          res.setHeader?.('Cache-Control', 'private, no-store');
          res.setHeader?.('X-Cache-Hint', 'private');
        }
      }),
    );
  }
}
