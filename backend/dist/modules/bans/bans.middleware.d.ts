import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { BansService } from './bans.service';
export declare class BansMiddleware implements NestMiddleware {
    private bansService;
    constructor(bansService: BansService);
    use(req: Request, res: Response, next: NextFunction): void;
}
