import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '../../modules/redis/redis.service';

@Injectable()
export class DeviceLimitGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Use x-device-id header or fingerprint header for device tracking
    const deviceId = request.headers['x-device-id'];
    
    if (!deviceId) {
      // If device fingerprint is missing on registration, reject
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: 'Device Fingerprint missing. Registration rejected.',
      }, HttpStatus.BAD_REQUEST);
    }

    // Limit: Max 3 unique accounts per device ID
    const MAX_ACCOUNTS = 3;
    const deviceKey = `device_fingerprint:${deviceId}:accounts`;
    
    // Add the user to the device's Set
    if (request.body && request.body.phone) {
      await this.redisService.sadd(deviceKey, request.body.phone);
    }

    // Check total accounts registered
    const accountCount = (await this.redisService.smembers(deviceKey)).length;

    if (accountCount > MAX_ACCOUNTS) {
      throw new HttpException({
        status: HttpStatus.FORBIDDEN,
        error: 'Fraud Prevention: Max 3 unique accounts allowed per device.',
      }, HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
