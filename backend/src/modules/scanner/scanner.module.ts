import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MedicinesModule } from '../medicines/medicines.module';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
import { ScannerController } from './scanner.controller';
import { ScannerService } from './scanner.service';

@Module({
  imports: [AiModule, MedicinesModule, PrescriptionsModule],
  controllers: [ScannerController],
  providers: [ScannerService],
})
export class ScannerModule {}
