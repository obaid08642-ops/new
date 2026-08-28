import { Injectable, Logger, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class TourService {
  private readonly logger = new Logger(TourService.name);
  
  constructor(@InjectModel('User') private userModel: Model<any>) {}

  async getUserTourStatus(userId: string) {
    const user = await this.userModel.findOne({ id: userId }).lean() as any;
    return user?.tour_progress || [];
  }

  async markStepComplete(userId: string, stepId: string) {
    await this.userModel.updateOne(
      { id: userId },
      { $addToSet: { tour_progress: stepId } }
    );
    return { ok: true };
  }
}
