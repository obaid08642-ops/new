import { Module } from '@nestjs/common';
import { DbIntegrityController } from './db-integrity.controller';
import { DbIntegrityService } from './db-integrity.service';

@Module({ controllers: [DbIntegrityController], providers: [DbIntegrityService], exports: [DbIntegrityService] })
export class DbIntegrityModule {}
