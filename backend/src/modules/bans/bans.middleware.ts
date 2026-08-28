import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { BansService } from './bans.service';

@Injectable()
export class BansMiddleware implements NestMiddleware {
  constructor(private bansService: BansService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    
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
