import { Module } from '@nestjs/common';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';

/** 22.11 — fraud and risk scoring. */
@Module({ controllers: [RiskController], providers: [RiskService], exports: [RiskService] })
export class RiskModule {}
