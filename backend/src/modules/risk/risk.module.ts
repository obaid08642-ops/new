import { Module } from '@nestjs/common';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';
import { SecurityModule } from '../security/security.module';

/** 22.11 — fraud and risk scoring. */
@Module({ imports: [SecurityModule], controllers: [RiskController], providers: [RiskService], exports: [RiskService] })
export class RiskModule {}
