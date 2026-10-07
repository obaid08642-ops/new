import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ModuleSwitchesService } from './module-switches.service';

/** D-16: refuses a switched-off module's routes before anything is stored. */
@Injectable()
export class ModuleSwitchesMiddleware implements NestMiddleware {
  constructor(private readonly switches: ModuleSwitchesService) {}

  async use(req: any, _res: any, next: () => void) {
    const path: string = req.path || req.url?.split('?')[0] || '';
    if (ModuleSwitchesService.isAdminRoute(path)) return next();
    const key = ModuleSwitchesService.moduleFor(path);
    if (!key) return next();
    if (await this.switches.isEnabled(key)) return next();
    throw new ForbiddenException(`module_disabled:${key}`);
  }
}
