import { REQUIRE_IDEMPOTENCY } from '../../common/idempotency.interceptor';
import { OrdersController } from './orders.controller';

describe('Orders contract mutation idempotency metadata', () => {
  it('requires an idempotency key for reorder, partial reorder, and cancellation', () => {
    expect(Reflect.getMetadata(REQUIRE_IDEMPOTENCY, OrdersController.prototype.reorder)).toBe(true);
    expect(Reflect.getMetadata(REQUIRE_IDEMPOTENCY, OrdersController.prototype.reorderPartial)).toBe(true);
    expect(Reflect.getMetadata(REQUIRE_IDEMPOTENCY, OrdersController.prototype.cancel)).toBe(true);
  });
});
