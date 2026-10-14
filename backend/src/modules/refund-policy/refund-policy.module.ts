import { Module } from '@nestjs/common';
import { AdminRefundPolicyController, PublicRefundPolicyController } from './refund-policy.controller';

@Module({
  controllers: [PublicRefundPolicyController, AdminRefundPolicyController],
})
export class RefundPolicyModule {}
