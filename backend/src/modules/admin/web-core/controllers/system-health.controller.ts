import { Controller, Get } from '@nestjs/common';

// R4: SystemHealthController deleted — duplicate of modules/system-health.
// Canonical serves GET /system-health/liveness and /readiness.
export class SystemHealthController {}
