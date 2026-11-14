import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { BansService } from './bans.service';
import { clientIp } from '../../common/client-ip';

@Injectable()
export class BansMiddleware implements NestMiddleware {
  constructor(private bansService: BansService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // The address Express resolved from our trusted proxy hops. The raw X-Forwarded-For header is client-controlled (nginx appends to it), so one forged
    // header would have made the string never match a banned address.
    const ip = clientIp(req) || '';

    // Check IP Ban
    if (this.bansService.isBanned('ip', ip)) {
      throw new ForbiddenException('Your IP address has been banned from accessing this service.');
    }

    // Check Device Ban (if custom device-id header is sent by Mobile apps)
    const deviceId = req.headers['x-device-id'] as string;
    if (deviceId && this.bansService.isBanned('device', deviceId)) {
      throw new ForbiddenException('Your device has been banned from accessing this service.');
    }

    next();
  }
}
