import { Module, Global } from '@nestjs/common';
import { FieldEncryptionService, createFieldEncryptionPlugin } from './field-encryption.service';

@Global()
@Module({
  providers: [
    FieldEncryptionService,
    {
      provide: 'FIELD_ENCRYPTION_PLUGIN',
      useFactory: (encryptionService: FieldEncryptionService) => 
        createFieldEncryptionPlugin(encryptionService),
      inject: [FieldEncryptionService],
    },
  ],
  exports: [FieldEncryptionService, 'FIELD_ENCRYPTION_PLUGIN'],
})
export class CryptoModule {}
