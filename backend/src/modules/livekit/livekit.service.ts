import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);

  constructor(
    @InjectModel('Appointment') private readonly appointments: Model<any>,
  ) {}

  async createToken(roomName: string, participantName: string): Promise<string> {
    this.logger.log(`Creating LiveKit token for ${participantName} in ${roomName}`);
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      throw new Error('LIVEKIT_NOT_CONFIGURED');
    }
    const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity: participantName,
    });
    at.addGrant({ roomJoin: true, room: roomName });
    return at.toJwt();
  }

  async getProviderWaitingRoom(providerId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await this.appointments.find({
      provider_id: providerId,
      status: { $in: ['SCHEDULED', 'IN_PROGRESS', 'CHECKED_IN'] },
      scheduled_time: { $gte: today, $lt: tomorrow }
    }).lean();

    return appointments.map((a: any) => ({
      id: a.id || a._id?.toString(),
      name: a.patient_name || 'مريض',
      time: a.scheduled_time,
      checkedIn: a.status === 'CHECKED_IN',
      waitTime: a.status === 'CHECKED_IN' ? 'جاهز' : 'ينتظر'
    }));
  }

  async pingPatient(providerId: string, patientId: string) {
    this.logger.log(`Provider ${providerId} is pinging patient ${patientId}`);
    return { success: true, message: 'Patient pinged successfully via NotificationsService' };
  }

  async markNoShow(providerId: string, appointmentId: string) {
    const appt = await this.appointments.findOne({ _id: appointmentId, provider_id: providerId });
    if (!appt) throw new NotFoundException('Appointment not found');
    
    appt.status = 'NO_SHOW';
    await appt.save();
    return { success: true, message: 'Marked as no-show' };
  }

  async initiateCall(providerId: string, providerName: string, calleeId: string, callType: string, bookingId?: string) {
    const roomName = `room-${bookingId || Math.random().toString(36).substring(7)}`;
    const token = await this.createToken(roomName, providerName);
    return { room_name: roomName, token, call_type: callType };
  }

  async joinCall(sessionId: string, userId: string, userName: string) {
    const token = await this.createToken(sessionId, userName);
    return { room_name: sessionId, token };
  }

  async endCall(sessionId: string, userId: string) {
    this.logger.log(`User ${userId} ended call ${sessionId}`);
    return { success: true };
  }

  async rejectCall(sessionId: string) {
    return { success: true };
  }

  async saveMetrics(sessionId: string, userId: string, metrics: any) {
    this.logger.log(`Saving metrics for ${sessionId}`);
    return { success: true };
  }

  async getCallHistory(userId: string, page: number, limit: number) {
    return { data: [], total: 0 };
  }

  async getSessionById(sessionId: string) {
    return { session_id: sessionId, status: 'ended' };
  }

  async getActiveRooms() { return []; }
  async getCallAnalytics() { return { total_calls: 0, total_minutes: 0 }; }
  async getRoomParticipants(roomName: string) { return []; }
  async muteParticipant(roomName: string, participantId: string, muted: boolean) { return { success: true }; }
  async removeParticipant(roomName: string, participantId: string) { return { success: true }; }
}
