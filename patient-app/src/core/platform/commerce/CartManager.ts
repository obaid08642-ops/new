import { logger } from '../../../services/Logger';
import { Money } from '../../domain/value-objects';
import { OrderItem } from '../../domain/entities';
import { RepositoryRegistry } from '../../../data/repositories/RepositoryRegistry';
import { QuerySpecification } from '../../../data/repositories/core/QuerySpecification';
import { IBaseEntity } from '../../../data/repositories/interfaces/IRepository';

export interface CartSummary {
  items: OrderItem[];
  subtotal: Money;
  tax: Money;
  deliveryFee: Money;
  discount: Money;
  total: Money;
}

export interface CartItemEntity extends IBaseEntity {
  user_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export class CartManager {
  private log = logger.scope('CartManager');

  private getRepository() {
    return RepositoryRegistry.get<CartItemEntity>('cart_items');
  }

  // Assuming a single local user for the device, otherwise pass userId
  private currentUserId = 'local_user'; 

  public async addItem(item: OrderItem, quantityRules?: { min: number; max: number }): Promise<void> {
    if (quantityRules) {
      if (item.quantity < quantityRules.min || item.quantity > quantityRules.max) {
        throw new Error(`Quantity ${item.quantity} violates rules (min: ${quantityRules.min}, max: ${quantityRules.max})`);
      }
    }
    
    const repo = this.getRepository();
    const spec = QuerySpecification.create()
      .where('user_id', this.currentUserId)
      .where('product_id', item.productId);
      
    const existing = await repo.match(spec);
    
    if (existing && existing.length > 0) {
      const dbItem = existing[0];
      await repo.update(dbItem.id, { quantity: dbItem.quantity + item.quantity });
    } else {
      await repo.create({
        id: `cart_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        user_id: this.currentUserId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice.amount,
      });
    }
  }

  public async removeItem(productId: string): Promise<void> {
    const repo = this.getRepository();
    const spec = QuerySpecification.create()
      .where('user_id', this.currentUserId)
      .where('product_id', productId);
      
    const existing = await repo.match(spec);
    if (existing && existing.length > 0) {
      await repo.delete(existing[0].id, false); // Hard delete from cart
    }
  }

  public applyCoupon(code: string): void {
    this.log.info(`Applied coupon: ${code}`);
  }

  public async getItems(): Promise<OrderItem[]> {
    const repo = this.getRepository();
    const spec = QuerySpecification.create().where('user_id', this.currentUserId);
    const dbItems = await repo.match(spec);
    
    return dbItems.map(dbItem => ({
      productId: dbItem.product_id,
      quantity: dbItem.quantity,
      unitPrice: { amount: dbItem.unit_price, currency: 'SAR' },
      discount: { amount: 0, currency: 'SAR' },
      type: 'product',
      status: 'pending'
    }));
  }

  public async calculateSummary(taxRate: number, deliveryFeeValue: number): Promise<CartSummary> {
    const items = await this.getItems();
    const subtotal = items.reduce((acc, item) => acc + (item.unitPrice.amount * item.quantity), 0);
    const tax = subtotal * taxRate;
    const discount = 0; // Calculated from applied coupons
    const total = subtotal + tax + deliveryFeeValue - discount;

    const currency = 'SAR'; 

    return {
      items,
      subtotal: { amount: subtotal, currency },
      tax: { amount: tax, currency },
      deliveryFee: { amount: deliveryFeeValue, currency },
      discount: { amount: discount, currency },
      total: { amount: total, currency },
    };
  }

  public async clear(): Promise<void> {
    const repo = this.getRepository();
    const spec = QuerySpecification.create().where('user_id', this.currentUserId);
    const existing = await repo.match(spec);
    
    for (const item of existing) {
      await repo.delete(item.id, false);
    }
  }
}
