import { Injectable, Inject, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { Model, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { OrderRepository } from './repositories/order.repository';

interface CreateReviewDto {
  source_type: 'order' | 'booking' | 'consultation';
  source_id: string;
  provider_id: string;
  provider_type: 'pharmacy' | 'doctor' | 'lab' | 'radiology' | 'nurse' | 'hospital';
  rating: number;
  comment?: string;
  photos?: string[];
}

interface ProviderReplyDto {
  content: string;
  replied_by: string;
}

interface ModerationDto {
  action: 'approve' | 'reject' | 'hide';
  moderator_id: string;
  reason?: string;
}

interface HelpfulVoteDto {
  voter_id: string;
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    @Inject('ReviewModel') private readonly reviewModel: Model<ReviewDocument>,
    @Inject('OrderRepository') private readonly orders: OrderRepository,
    @InjectConnection() private readonly conn: Connection,
  ) {}

  /**
   * Create a new review. Only from completed orders/bookings.
   */
  async create(patientId: string, dto: CreateReviewDto): Promise<ReviewDocument> {
    const pid = String(patientId);

    // Verify source is completed and belongs to patient
    await this.verifySourceCompleted(pid, dto.source_type, dto.source_id);

    // Check if review already exists for this source
    const existing = await this.reviewModel.findOne({
      source_type: dto.source_type,
      source_id: dto.source_id,
    }).lean().exec();

    if (existing) {
      throw new BadRequestException('review_already_exists');
    }

    // Validate rating
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('rating_must_be_1_to_5');
    }

    // Validate photos if provided
    if (dto.photos && dto.photos.length > 5) {
      throw new BadRequestException('max_5_photos_allowed');
    }

    const review = new this.reviewModel({
      patient_id: pid,
      source_type: dto.source_type,
      source_id: dto.source_id,
      provider_id: dto.provider_id,
      provider_type: dto.provider_type,
      rating: dto.rating,
      comment: dto.comment,
      photos: dto.photos || [],
      status: 'published', // Auto-publish for now, moderation can hide later
    });

    await review.save();
    this.logger.log(`Created review ${review._id} by patient ${pid} for ${dto.provider_type} ${dto.provider_id}`);
    return review;
  }

  /**
   * Get reviews for a provider.
   */
  async getProviderReviews(providerId: string, providerType: string, status = 'published'): Promise<ReviewDocument[]> {
    const query: any = { provider_id: providerId, provider_type: providerType };
    if (status) query.status = status;
    return this.reviewModel.find(query).sort({ createdAt: -1 }).lean().exec() as any;
  }

  /**
   * Get reviews by a patient.
   */
  async getPatientReviews(patientId: string): Promise<ReviewDocument[]> {
    return this.reviewModel.find({ patient_id: String(patientId) }).sort({ createdAt: -1 }).lean().exec() as any;
  }

  /**
   * Get a single review by ID.
   */
  async getById(reviewId: string): Promise<ReviewDocument> {
    const review = await this.reviewModel.findById(reviewId).lean().exec() as unknown as ReviewDocument | null;
    if (!review) throw new NotFoundException('review_not_found');
    return review;
  }

  /**
   * Provider replies to a review.
   */
  async providerReply(reviewId: string, providerId: string, dto: ProviderReplyDto): Promise<ReviewDocument> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('review_not_found');
    if (String(review.provider_id) !== String(providerId)) {
      throw new ForbiddenException('not_your_review');
    }
    if (review.provider_reply) {
      throw new BadRequestException('already_replied');
    }

    review.provider_reply = {
      content: dto.content,
      replied_at: new Date(),
      replied_by: dto.replied_by,
    };
    await review.save();
    this.logger.log(`Provider ${providerId} replied to review ${reviewId}`);
    return review;
  }

  /**
   * Moderate a review (admin/moderator only).
   */
  async moderate(reviewId: string, dto: ModerationDto): Promise<ReviewDocument> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('review_not_found');

    const newStatus = dto.action === 'approve' ? 'published' : dto.action === 'reject' ? 'rejected' : 'hidden';
    
    review.status = newStatus;
    review.moderation = {
      moderator_id: dto.moderator_id,
      reason: dto.reason || '',
      at: new Date(),
    };
    await review.save();
    this.logger.log(`Moderator ${dto.moderator_id} ${dto.action}ed review ${reviewId}`);
    return review;
  }

  /**
   * Vote helpful on a review.
   */
  async voteHelpful(reviewId: string, voterId: string): Promise<ReviewDocument> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('review_not_found');
    if (String(review.patient_id) === String(voterId)) {
      throw new BadRequestException('cannot_vote_own_review');
    }

    const voters = review.helpful_voters || [];
    if (voters.includes(voterId)) {
      throw new BadRequestException('already_voted');
    }

    review.helpful_voters = [...voters, voterId];
    review.helpful_votes = review.helpful_voters.length;
    await review.save();
    this.logger.log(`Patient ${voterId} voted helpful on review ${reviewId}`);
    return review;
  }

  /**
   * Remove helpful vote.
   */
  async removeHelpfulVote(reviewId: string, voterId: string): Promise<ReviewDocument> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('review_not_found');

    const voters = review.helpful_voters || [];
    if (!voters.includes(voterId)) {
      throw new BadRequestException('not_voted');
    }

    review.helpful_voters = voters.filter(v => v !== voterId);
    review.helpful_votes = review.helpful_voters.length;
    await review.save();
    return review;
  }

  /**
   * Get aggregate rating for a provider.
   */
  async getProviderRating(providerId: string, providerType: string): Promise<{ average: number; count: number; distribution: Record<number, number> }> {
    const reviews = await this.reviewModel.find({ 
      provider_id: providerId, 
      provider_type: providerType,
      status: 'published' 
    }).lean().exec() as unknown as ReviewDocument[];

    const count = reviews.length;
    if (count === 0) return { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const average = Math.round((sum / count) * 10) / 10;
    
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) distribution[r.rating as 1|2|3|4|5]++;

    return { average, count, distribution };
  }

  private async verifySourceCompleted(patientId: string, sourceType: string, sourceId: string): Promise<void> {
    const pid = String(patientId);
    const sid = String(sourceId);

    if (sourceType === 'order') {
      // Check legacy orders
      const legacy = await this.orders.findOne({ id: { $eq: sid }, patient_id: { $eq: pid } }).lean().exec();
      if (legacy && (legacy as any).state === 'delivered') return;

      // Check governed pharmacy_orders
      const governed = await this.conn.collection('pharmacy_orders')
        .findOne({ id: { $eq: sid }, patient_account_id: { $eq: pid } } as never);
      if (governed && (governed as any).state === 'delivered') return;
    } else if (sourceType === 'booking') {
      // Check appointment bookings
      const booking = await this.conn.collection('appointments')
        .findOne({ id: { $eq: sid }, patient_id: { $eq: pid }, status: 'completed' } as never);
      if (booking) return;
    } else if (sourceType === 'consultation') {
      // Check consultation bookings
      const consult = await this.conn.collection('consultation_bookings')
        .findOne({ id: { $eq: sid }, patient_id: { $eq: pid }, status: 'completed' } as never);
      if (consult) return;
    }

    throw new BadRequestException('source_not_completed_or_not_yours');
  }
}
