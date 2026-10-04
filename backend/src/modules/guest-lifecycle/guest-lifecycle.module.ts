import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from '../../schemas/user.schema';
import { GuestLifecycleService } from './guest-lifecycle.service';

/** Phase 21 — guest data lifecycle. Import once in app.module.ts. */
@Module({
  imports: [MongooseModule.forFeature([{ name: 'User', schema: UserSchema }])],
  providers: [GuestLifecycleService],
  exports: [GuestLifecycleService],
})
export class GuestLifecycleModule {}
