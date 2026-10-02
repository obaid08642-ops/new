import { Controller, Get } from '@nestjs/common';

// R4: SystemHealthController removed (dup of system-health). Canonical serves this path.
// @Controller('system-health')
export class SystemHealthController {
  
  @Get('liveness')
  checkLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
        core_api: 'running'
      }
    };
  }

  @Get('readiness')
  checkReadiness() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}
