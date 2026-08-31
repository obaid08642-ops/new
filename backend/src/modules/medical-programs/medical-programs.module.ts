import { Module } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Controller, Get, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { IdempotencyInterceptor, RequireIdempotency } from '../../common/idempotency.interceptor';
import { UseInterceptors } from '@nestjs/common';

@Schema({ timestamps: true, collection: 'medical_program_enrollments' })
export class MedicalProgramEnrollment {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) account_id: string;
  @Prop({ required: true }) program_type: string;
  @Prop({ required: true }) title: string;
  @Prop() duration?: string;
  @Prop({ default: 0 }) completed_sessions: number;
  @Prop({ default: 0 }) total_sessions: number;
  @Prop({ type: Object }) next_session?: { date?: string; time?: string; title?: string };
  @Prop({ type: Object }) milestone_reward?: { label?: string; description?: string };
  @Prop({ type: [Object], default: [] }) sessions: Array<{ id: string; title?: string; completed_at?: Date }>;
  @Prop({ default: 'active', enum: ['active', 'completed', 'cancelled'], index: true }) status: string;
}
export const MedicalProgramEnrollmentSchema = SchemaFactory.createForClass(MedicalProgramEnrollment);
MedicalProgramEnrollmentSchema.index({ account_id: 1, status: 1 });

@Injectable()
export class MedicalProgramsService {
  constructor(@InjectModel('MedicalProgramEnrollment') private readonly enrollments: Model<any>) {}

  async listActive(user: any) {
    if (!user?.id) throw new BadRequestException('patient_identity_required');
    const docs = await this.enrollments.find({ account_id: user.id, status: 'active' }).lean();
    return docs.map((d: any) => ({
      id: d.program_type,
      title: d.title,
      duration: d.duration || null,
      completedSessions: d.completed_sessions || 0,
      totalSessions: d.total_sessions || 0,
      nextSessionDate: d.next_session?.date || null,
      nextSessionTime: d.next_session?.time || null,
      nextSessionTitle: d.next_session?.title || null,
      milestoneReward: d.milestone_reward?.label || null,
      rewardDesc: d.milestone_reward?.description || null,
      sessionsList: d.sessions || [],
    }));
  }

  async completeSession(user: any, body: { programType?: string; sessionId?: string }) {
    if (!user?.id) throw new BadRequestException('patient_identity_required');
    const programType = String(body?.programType || '').trim();
    const sessionId = String(body?.sessionId || '').trim();
    if (!programType || !sessionId) throw new BadRequestException('program_and_session_required');
    const doc: any = await this.enrollments.findOne({ account_id: user.id, program_type: programType, status: 'active' });
    if (!doc) throw new BadRequestException('program_enrollment_not_found');
    const sessions = Array.isArray(doc.sessions) ? doc.sessions : [];
    const session = sessions.find((s: any) => String(s.id) === sessionId);
    if (!session) throw new BadRequestException('session_not_found');
    if (!session.completed_at) {
      session.completed_at = new Date();
      doc.sessions = sessions;
      doc.completed_sessions = sessions.filter((s: any) => s.completed_at).length;
      if (doc.total_sessions > 0 && doc.completed_sessions >= doc.total_sessions) doc.status = 'completed';
      doc.markModified('sessions');
      await doc.save();
    }
    return this.listActive(user);
  }
}

@UseGuards(JwtAuthGuard)
@UseInterceptors(IdempotencyInterceptor)
@Controller('medical/programs')
export class MedicalProgramsController {
  constructor(private readonly svc: MedicalProgramsService) {}

  @Get('active')
  active(@CurrentUser() user: any) { return this.svc.listActive(user); }

  @RequireIdempotency()
  @Post('complete-session')
  complete(@CurrentUser() user: any, @Body() body: any) { return this.svc.completeSession(user, body); }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: 'MedicalProgramEnrollment', schema: MedicalProgramEnrollmentSchema }])],
  controllers: [MedicalProgramsController],
  providers: [MedicalProgramsService],
})
export class MedicalProgramsModule {}
