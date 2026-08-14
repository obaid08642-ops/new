import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { MaternityProfile, MaternityProfileDocument } from '../../schemas/maternity.schema';
import { MaternityProfileRepository } from "./repositories/maternityprofile.repository";

@Injectable()
export class MaternityService {
  constructor(
    @Inject('MaternityProfileRepository') private readonly model: MaternityProfileRepository,
  ) {}

  /** Calculate current pregnancy week based on due date (40 weeks = 280 days cycle) */
  private calculateCurrentWeek(dueDate: Date): number {
    const today = new Date();
    const lmp = new Date(dueDate.getTime() - 280 * 24 * 60 * 60 * 1000); // Last Menstrual Period
    const diffMs = today.getTime() - lmp.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const week = Math.ceil(diffDays / 7);
    if (week < 1) return 1;
    if (week > 40) return 40;
    return week;
  }

  private getDefaultCheckups() {
    return [
      { week: '20 أسبوع', name: 'فحص سونار تشوهات الجنين', done: false },
      { week: '24 أسبوع', name: 'فحص سكر الحمل', done: false },
      { week: '28 أسبوع', name: 'فحص الدم الشامل والبول', done: false },
      { week: '32 أسبوع', name: 'سونار متابعة نمو الجنين', done: false },
      { week: '36 أسبوع', name: 'فحص وضعية الجنين ونبضه', done: false },
      { week: '40 أسبوع', name: 'الاستعداد النهائي للولادة', done: false },
    ];
  }

  getContent() {
    return {
      pregnant_links: [
        { label: 'تطور الجنين', icon: 'child_care', color: '#EC4899', route: '/maternity/baby-development' },
        { label: 'متابعة الحمل', icon: 'pregnant_woman', color: '#7A6BEA', route: '/maternity/pregnancy-tracker' },
        { label: 'نمو الطفل الرضيع', icon: 'vaccines', color: '#23B5CE', route: '/maternity/baby-growth' },
        { label: 'تغذية الحمل', icon: 'restaurant', color: '#5BA84F', route: '/nutrition/hub' },
      ],
      planning_links: [
        { label: 'حاسبة التبويض', icon: 'event_available', color: '#7A6BEA', route: '/maternity/ovulation-tracker' },
        { label: 'استشر طبيب', icon: 'medical_services', color: '#23B5CE', route: '/(tabs)/consultations' },
        { label: 'تحاليل الخصوبة', icon: 'science', color: '#10B981', route: '/(tabs)/diagnostics' },
        { label: 'تغذية التخطيط', icon: 'nutrition', color: '#5BA84F', route: '/nutrition/hub' },
      ],
      weekly_tips: [
        'قد يشعر طفلك بالأصوات والضوء الآن',
        'احرصي على تمارين الحوض لتيسير الولادة',
        'ارفعي قدميك عند الجلوس لتقليل التورم',
        'حمضات الفوليك وحديد الدم أساسيان الآن',
      ],
      planning_tips: [
        'تناولي حمض الفوليك يومياً بجرعة 400 ميكروجرام قبل الحمل بـ ٣ أشهر.',
        'راقبي الإفرازات الجسدية ودرجة الحرارة الأساسية لتحديد فترة الخصوبة.',
        'احرصي على التغذية المتوازنة وشرب كميات وفيرة من المياه يومياً.',
      ]
    };
  }

  async getProfile(userId: string): Promise<MaternityProfile> {
    let profile = await this.model.findOne({ patient_id: userId });
    if (!profile) {
      // Create a default profile with a due date 6 months from now
      const defaultDueDate = new Date();
      defaultDueDate.setMonth(defaultDueDate.getMonth() + 6);
      profile = await this.model.create({
        patient_id: userId,
        due_date: defaultDueDate,
        current_week: this.calculateCurrentWeek(defaultDueDate),
        checkups: this.getDefaultCheckups(),
        is_pregnant: true,
        cycle_length: 28,
        is_regular: true,
      });
    } else {
      // Recalculate current week dynamically
      const week = this.calculateCurrentWeek(profile.due_date);
      if (profile.current_week !== week) {
        profile.current_week = week;
        await profile.save();
      }
    }
    return profile.toObject();
  }

  async updateProfile(userId: string, updateData: any): Promise<MaternityProfile> {
    let profile = await this.model.findOne({ patient_id: userId });
    
    let dueDate = profile?.due_date;
    if (updateData.due_date) {
      dueDate = new Date(updateData.due_date);
      if (isNaN(dueDate.getTime())) {
        throw new BadRequestException('invalid due date format');
      }
    } else if (!dueDate) {
      dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 6);
    }
    const currentWeek = this.calculateCurrentWeek(dueDate);

    const fieldsToUpdate: any = {
      due_date: dueDate,
      current_week: currentWeek,
    };

    if (updateData.is_pregnant !== undefined) fieldsToUpdate.is_pregnant = updateData.is_pregnant;
    if (updateData.cycle_length !== undefined) fieldsToUpdate.cycle_length = updateData.cycle_length;
    if (updateData.is_regular !== undefined) fieldsToUpdate.is_regular = updateData.is_regular;
    
    if (updateData.last_period_date) {
      const d = new Date(updateData.last_period_date);
      if (!isNaN(d.getTime())) fieldsToUpdate.last_period_date = d;
    }
    if (updateData.prev_period_date) {
      const d = new Date(updateData.prev_period_date);
      if (!isNaN(d.getTime())) fieldsToUpdate.prev_period_date = d;
    }

    if (profile) {
      Object.assign(profile, fieldsToUpdate);
      await profile.save();
    } else {
      profile = await this.model.create({
        patient_id: userId,
        checkups: this.getDefaultCheckups(),
        ...fieldsToUpdate,
      });
    }
    return profile.toObject();
  }

  async logKick(userId: string, count: number, durationSeconds: number): Promise<MaternityProfile> {
    const profile = await this.model.findOne({ patient_id: userId });
    if (!profile) throw new NotFoundException('Maternity profile not found');

    profile.kicks_log.push({
      id: undefined as any, // Mongoose schema generates uuid automatically
      count,
      duration_seconds: durationSeconds,
      date: new Date(),
    });
    await profile.save();
    return profile.toObject();
  }

  async logContraction(userId: string, intervalSeconds: number, durationSeconds: number): Promise<MaternityProfile> {
    const profile = await this.model.findOne({ patient_id: userId });
    if (!profile) throw new NotFoundException('Maternity profile not found');

    profile.contractions_log.push({
      id: undefined as any,
      interval_seconds: intervalSeconds,
      duration_seconds: durationSeconds,
      date: new Date(),
    });
    await profile.save();
    return profile.toObject();
  }

  async toggleCheckup(userId: string, checkupWeek: string): Promise<MaternityProfile> {
    const profile = await this.model.findOne({ patient_id: userId });
    if (!profile) throw new NotFoundException('Maternity profile not found');

    const checkup = profile.checkups.find(c => c.week === checkupWeek);
    if (!checkup) throw new NotFoundException(`Checkup for week ${checkupWeek} not found`);

    checkup.done = !checkup.done;
    await profile.save();
    return profile.toObject();
  }

  async logInfantGrowth(userId: string, data: { month: number, weight_kg?: number, height_cm?: number, head_circ_cm?: number }): Promise<MaternityProfile> {
    const profile = await this.model.findOne({ patient_id: userId });
    if (!profile) throw new NotFoundException('Maternity profile not found');

    const existingIndex = profile.infant_growth.findIndex(g => g.month === data.month);
    if (existingIndex >= 0) {
      if (data.weight_kg) profile.infant_growth[existingIndex].weight_kg = data.weight_kg;
      if (data.height_cm) profile.infant_growth[existingIndex].height_cm = data.height_cm;
      if (data.head_circ_cm) profile.infant_growth[existingIndex].head_circ_cm = data.head_circ_cm;
    } else {
      profile.infant_growth.push({
        id: undefined as any,
        month: data.month,
        weight_kg: data.weight_kg,
        height_cm: data.height_cm,
        head_circ_cm: data.head_circ_cm,
        date: new Date(),
      } as any);
    }

    await profile.save();
    return profile.toObject();
  }
}
