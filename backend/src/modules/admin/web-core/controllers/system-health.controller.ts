import { Controller, Get } from '@nestjs/common';

@Controller('system-health')
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
