import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ReviewValidationResult {
  allowed: boolean;
  reason?: string;
  orderId?: string;
  orderStatus?: string;
}

export interface ReviewSubmissionData {
  userId: string;
  orderId: string;
  providerId?: string;
  rating: number;
  comment?: string;
  images?: string[];
}

export interface ReviewCheckResult {
  canReview: boolean;
  reason?: string;
  orderId?: string;
  orderStatus?: string;
  existingReview?: boolean;
}

@Injectable()
export class ReviewValidationService {
  private readonly logger = new Logger(ReviewValidationService.name);

  // Valid order statuses that allow reviews
  private readonly VALID_REVIEW_STATUSES = ['delivered', 'completed', 'DELIVERED', 'COMPLETED', 'FULFILLED'];
  // One review per order per user
  private readonly MAX_REVIEWS_PER_ORDER_PER_USER = 1;

  constructor(@InjectConnection() private readonly connection: Connection) {}

  private get reviewsCol() {
    return this.connection.collection('reviews');
  }

  private get ordersCol() {
    return this.connection.collection('orders');
  }

  private get pharmacyOrdersCol() {
    return this.connection.collection('pharmacy_orders');
  }

  private get appointmentsCol() {
    return this.connection.collection('appointments');
  }

  private get providerProfilesCol() {
    return this.connection.collection('provider_profiles');
  }

  /**
   * Validate if a user can submit a review for an order.
   * Checks: order exists, order status is delivered/completed, user owns the order, no existing review.
   */
  async validateReviewSubmission(data: ReviewSubmissionData): Promise<ReviewValidationResult> {
    // 1. Find the order (check both legacy and pharmacy_orders collections)
    const [legacyOrder, pharmacyOrder] = await Promise.all([
      this.ordersCol.findOne({ id: data.orderId }, { projection: { id: 1, patient_id: 1, state: 1, pharmacy_id: 1, provider_id: 1 } }),
      this.pharmacyOrdersCol.findOne({ id: data.orderId }, { projection: { id: 1, patient_account_id: 1, status: 1, pharmacy_account_id: 1, provider_account_id: 1 } }),
    ]);

    const order = legacyOrder || pharmacyOrder;
    if (!order) {
      return { allowed: false, reason: 'order_not_found' };
    }

    // 2. Check order ownership
    const orderUserId = order.patient_id || order.patient_account_id;
    if (orderUserId !== data.userId) {
      return { allowed: false, reason: 'order_not_owned_by_user' };
    }

    // 3. Check order status (must be delivered/completed)
    const orderStatus = order.state || order.status;
    const isValidStatus = this.VALID_REVIEW_STATUSES.includes(orderStatus);
    
    if (!isValidStatus) {
      return { 
        allowed: false, 
        reason: 'order_not_completed', 
        orderId: data.orderId,
        orderStatus,
      };
    }

    // 4. Check for existing review by this user for this order
    const existingReview = await this.reviewsCol.findOne({
      user_id: data.userId,
      order_id: data.orderId,
    });

    if (existingReview) {
      return { 
        allowed: false, 
        reason: 'review_already_exists', 
        orderId: data.orderId,
        orderStatus,
      };
    }

    // 5. Validate rating range
    if (data.rating < 1 || data.rating > 5) {
      return { allowed: false, reason: 'invalid_rating_range' };
    }

    // 6. If provider-specific review, validate provider matches order
    if (data.providerId) {
      const orderProviderId = order.pharmacy_id || order.provider_id || order.pharmacy_account_id || order.provider_account_id;
      if (orderProviderId && orderProviderId !== data.providerId) {
        return { allowed: false, reason: 'provider_mismatch' };
      }
    }

    return { 
      allowed: true, 
      orderId: data.orderId,
      orderStatus,
    };
  }

  /**
   * Check if a user can review an order (read-only check, doesn't create review).
   */
  async checkCanReview(userId: string, orderId: string): Promise<ReviewCheckResult> {
    const [legacyOrder, pharmacyOrder] = await Promise.all([
      this.ordersCol.findOne({ id: orderId }, { projection: { id: 1, patient_id: 1, state: 1 } }),
      this.pharmacyOrdersCol.findOne({ id: orderId }, { projection: { id: 1, patient_account_id: 1, status: 1 } }),
    ]);

    const order = legacyOrder || pharmacyOrder;
    if (!order) {
      return { canReview: false, reason: 'order_not_found' };
    }

    const orderUserId = order.patient_id || order.patient_account_id;
    if (orderUserId !== userId) {
      return { canReview: false, reason: 'order_not_owned_by_user' };
    }

    const orderStatus = order.state || order.status;
    const isValidStatus = this.VALID_REVIEW_STATUSES.includes(orderStatus);
    
    if (!isValidStatus) {
      return { 
        canReview: false, 
        reason: 'order_not_completed', 
        orderId,
        orderStatus,
      };
    }

    const existingReview = await this.reviewsCol.findOne({
      user_id: userId,
      order_id: orderId,
    });

    if (existingReview) {
      return { 
        canReview: false, 
        reason: 'review_already_exists', 
        orderId,
        orderStatus,
        existingReview: true,
      };
    }

    return { 
      canReview: true, 
      orderId,
      orderStatus,
    };
  }

  /**
   * Create a review after validation passes.
   */
  async createReview(data: ReviewSubmissionData): Promise<{ id: string; createdAt: Date }> {
    const validation = await this.validateReviewSubmission(data);
    if (!validation.allowed) {
      throw new BadRequestException(`Cannot create review: ${validation.reason}`);
    }

    const review = {
      id: uuidv4(),
      user_id: data.userId,
      order_id: data.orderId,
      provider_id: data.providerId,
      rating: data.rating,
      comment: data.comment || '',
      images: data.images || [],
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.reviewsCol.insertOne(review as any);

    // Update provider rating aggregate (async, non-blocking)
    if (data.providerId) {
      this.updateProviderRating(data.providerId).catch(e => 
        this.logger.warn(`Failed to update provider rating: ${e}`)
      );
    }

    this.logger.log(`Review created: ${review.id} for order ${data.orderId} by user ${data.userId}`);

    return { id: review.id, createdAt: review.createdAt };
  }

  /**
   * Update provider's aggregate rating.
   */
  private async updateProviderRating(providerId: string): Promise<void> {
    const pipeline = [
      { $match: { provider_id: providerId, status: 'published' } },
      { $group: { 
        _id: '$provider_id', 
        avgRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
        ratingDistribution: { $push: '$rating' }
      }},
    ];

    const result = await this.reviewsCol.aggregate(pipeline).toArray();
    if (result.length === 0) return;

    const { avgRating, reviewCount, ratingDistribution } = result[0];
    const distribution = [1, 2, 3, 4, 5].map(r => 
      ratingDistribution.filter((x: number) => x === r).length
    );

    await this.providerProfilesCol.updateOne(
      { id: providerId },
      { 
        $set: { 
          rating: Math.round(avgRating * 10) / 10,
          review_count: reviewCount,
          rating_distribution: distribution,
          updatedAt: new Date(),
        } 
      },
      { upsert: false },
    );
  }

  /**
   * Get reviews for an order.
   */
  async getOrderReviews(orderId: string): Promise<any[]> {
    return this.reviewsCol.find({ order_id: orderId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Get reviews by a user.
   */
  async getUserReviews(userId: string): Promise<any[]> {
    return this.reviewsCol.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
  }

  /**
   * Get reviews for a provider.
   */
  async getProviderReviews(providerId: string, limit = 20, skip = 0): Promise<any[]> {
    return this.reviewsCol.find({ provider_id: providerId, status: 'published' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  /**
   * Admin: Moderate a review (hide/show).
   */
  async moderateReview(reviewId: string, status: 'published' | 'hidden' | 'flagged', moderatorId: string): Promise<void> {
    await this.reviewsCol.updateOne(
      { id: reviewId },
      { $set: { status, moderated_by: moderatorId, moderated_at: new Date(), updatedAt: new Date() } },
    );

    // Recalculate provider rating if review was published/hidden
    const review = await this.reviewsCol.findOne({ id: reviewId });
    if (review?.provider_id) {
      await this.updateProviderRating(review.provider_id);
    }
  }

  /**
   * Check if an order is reviewable (completed/delivered) - for UI display.
   */
  async isOrderReviewable(orderId: string): Promise<{ reviewable: boolean; status: string; hasReview: boolean }> {
    const [legacyOrder, pharmacyOrder] = await Promise.all([
      this.ordersCol.findOne({ id: orderId }, { projection: { id: 1, state: 1 } }),
      this.pharmacyOrdersCol.findOne({ id: orderId }, { projection: { id: 1, status: 1 } }),
    ]);

    const order = legacyOrder || pharmacyOrder;
    if (!order) {
      return { reviewable: false, status: 'not_found', hasReview: false };
    }

    const orderStatus = order.state || order.status;
    const isValidStatus = this.VALID_REVIEW_STATUSES.includes(orderStatus);

    // Check if any review exists for this order
    const hasReview = await this.reviewsCol.countDocuments({ order_id: orderId }) > 0;

    return {
      reviewable: isValidStatus && !hasReview,
      status: orderStatus,
      hasReview,
    };
  }
}