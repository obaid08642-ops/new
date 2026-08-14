import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HospitalBranch } from '../schemas/hospital-branch.schema';
import { HospitalDepartment } from '../schemas/hospital-department.schema';
import { HospitalStaff } from '../schemas/hospital-staff.schema';
import { DoctorProfileExtended } from '../../care/schemas/doctor-profile-extended.schema';
import { User } from '../../../schemas/user.schema';
import { Appointment } from '../../../schemas/appointment.schema';

@Injectable()
export class HospitalService {
  constructor(
    @InjectModel(HospitalBranch.name) private branchModel: Model<HospitalBranch>,
    @InjectModel(HospitalDepartment.name) private departmentModel: Model<HospitalDepartment>,
    @InjectModel(HospitalStaff.name) private staffModel: Model<HospitalStaff>,
    @InjectModel(DoctorProfileExtended.name) private doctorModel: Model<DoctorProfileExtended>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
  ) {}

  async createBranch(hospitalId: string, data: Partial<HospitalBranch>) {
    return this.branchModel.create({ ...data, hospital_id: new Types.ObjectId(hospitalId) });
  }

  async getBranches(hospitalId: string) {
    return this.branchModel.find({ hospital_id: new Types.ObjectId(hospitalId) });
  }

  async createDepartment(hospitalId: string, data: Partial<HospitalDepartment>) {
    return this.departmentModel.create({ ...data, hospital_id: new Types.ObjectId(hospitalId) });
  }

  async getDepartments(hospitalId: string) {
    return this.departmentModel.find({ hospital_id: new Types.ObjectId(hospitalId) });
  }

  async addStaff(hospitalId: string, data: Partial<HospitalStaff>) {
    return this.staffModel.create({ ...data, hospital_id: new Types.ObjectId(hospitalId) });
  }

  async getStaff(hospitalId: string) {
    return this.staffModel.find({ hospital_id: new Types.ObjectId(hospitalId) });
  }

  async onboardDoctor(hospitalId: string, doctorId: string) {
    const doctorObjId = new Types.ObjectId(doctorId);
    const doctorProfile = await this.doctorModel.findOneAndUpdate(
      { doctor_id: doctorObjId },
      { $set: { affiliated_hospital_id: new Types.ObjectId(hospitalId) } },
      { new: true, upsert: true }
    );
    
    // Auto-approve the doctor at the system level because hospital takes legal responsibility
    await this.userModel.findByIdAndUpdate(doctorObjId, {
      $set: { verified: true, active: true }
    });
    
    return doctorProfile;
  }

  async getUnifiedAppointments(hospitalId: string, branchId?: string) {
    // 1. Find all doctors affiliated with this hospital
    const doctors = await this.doctorModel.find({ affiliated_hospital_id: new Types.ObjectId(hospitalId) });
    const doctorIds = doctors.map(d => d.doctor_id.toString());

    const query: any = { doctor_id: { $in: doctorIds } };
    // Receptionists can see this
    return this.appointmentModel.find(query).sort({ slot_start: 1 }).limit(100);
  }

  async updateAppointmentStatus(hospitalId: string, appointmentId: string, status: string) {
    // Note: status must be one of APPT_STATES
    const appointment = await this.appointmentModel.findOneAndUpdate(
      { _id: new Types.ObjectId(appointmentId) },
      { $set: { status } },
      { new: true }
    );
    if (!appointment) throw new BadRequestException('Appointment not found');
    return appointment;
  }

  async getAggregatedWallet(hospitalId: string, userRole: string) {
    // Only Finance or Admin can see wallet. Receptionist is blocked.
    if (userRole === 'receptionist') {
      throw new UnauthorizedException('Access Denied: Financial data restricted.');
    }
    
    // 1. Find all doctors affiliated with this hospital
    const doctors = await this.doctorModel.find({ affiliated_hospital_id: new Types.ObjectId(hospitalId) });
    const doctorIds = doctors.map(d => d.doctor_id.toString());

    // 2. Aggregate all completed appointments for these doctors
    const completed = await this.appointmentModel.find({
      doctor_id: { $in: doctorIds },
      status: 'COMPLETED'
    });
    
    let totalRevenue = 0;
    completed.forEach(app => {
      totalRevenue += (app.total_price || 0);
    });
    
    return {
      success: true,
      total_revenue: totalRevenue,
      transactions_count: completed.length
    };
  }
}

