import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { getLocaleForUser, resolveLocale, type SupportedLocale } from '@nabd/i18n';

declare global {
  namespace Express {
    interface Request {
      locale: SupportedLocale;
    }
  }
}

@Injectable()
export class LocaleMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requested = (req.query.locale as string) || req.headers['accept-language'];
    const userLocale = req.headers['x-user-locale'] as string;
    
    req.locale = resolveLocale(requested, userLocale, req.headers['accept-language'] as string);
    res.setHeader('Content-Language', req.locale);
    
    next();
  }
}

export function getLocaleFromRequest(req: Request): SupportedLocale {
  return req.locale || getLocaleForUser(
    req.headers['x-user-locale'] as string,
    req.headers['accept-language'] as string
  );
}