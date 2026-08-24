import { logger } from '../../../services/Logger';
import { Review } from '../../domain/entities';

export interface CreateReviewParams {
  authorId: string;
  targetId: string; // e.g. DoctorId or OrderId
  rating: number; // 1 to 5
  comment?: string;
}

export class ReviewManager {
  private log = logger.scope('ReviewManager');

  public async submitReview(params: CreateReviewParams): Promise<Review> {
    this.log.info(`Submitting ${params.rating}-star review by ${params.authorId} for ${params.targetId}`);
    return {
      id: 'rev-123',
      ...params,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  public async getTargetReviews(targetId: string, page = 1): Promise<Review[]> {
    this.log.debug(`Fetching reviews for ${targetId}`);
    return [];
  }

  public async calculateAverageRating(targetId: string): Promise<{ average: number; totalCount: number }> {
    return { average: 0, totalCount: 0 };
  }
}
