import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ReorderEligibilityService } from './reorder-eligibility.service';
import { RefillSubscriptionService } from './refill-subscription.service';
import { AlertService } from './alert.service';
import { ReviewService } from './review.service';
import { OrderAmendmentService } from './order-amendment.service';
import { OrderRepository } from './repositories/order.repository';
import { MedicineRepository } from './repositories/medicine.repository';
import { RefillSubscription, RefillSubscriptionSchema } from './schemas/refill-subscription.schema';
import { Alert, AlertSchema } from './schemas/alert.schema';
import { Review, ReviewSchema } from './schemas/review.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RefillSubscription.name, schema: RefillSubscriptionSchema },
      { name: Alert.name, schema: AlertSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    ReorderEligibilityService,
    RefillSubscriptionService,
    AlertService,
    ReviewService,
    OrderAmendmentService,
    OrderRepository,
    MedicineRepository,
    { provide: 'RefillSubscriptionModel', useExisting: RefillSubscription.name },
    { provide: 'AlertModel', useExisting: Alert.name },
    { provide: 'ReviewModel', useExisting: Review.name },
  ],
  exports: [
    OrdersService,
    ReorderEligibilityService,
    RefillSubscriptionService,
    AlertService,
    ReviewService,
    OrderAmendmentService,
  ],
})
export class OrdersModule {}
