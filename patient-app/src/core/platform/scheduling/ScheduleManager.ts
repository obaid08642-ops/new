import { logger } from '../../../services/Logger';
import { DateRange, TimeSlot } from '../../domain/value-objects';
import { RepositoryRegistry } from '../../../data/repositories/RepositoryRegistry';
import { QuerySpecification } from '../../../data/repositories/core/QuerySpecification';
import { IBaseEntity } from '../../../data/repositories/interfaces/IRepository';

export interface ProviderAvailability {
  providerId: string;
  workingHours: { [dayOfWeek: number]: TimeSlot[] };
  holidays: Date[];
  bufferTimeMinutes: number;
}

export interface AppointmentEntity extends IBaseEntity {
  user_id: string;
  provider_id: string;
  scheduled_at: number; // timestamp
  status: string; // 'locked', 'confirmed', 'cancelled'
}

export class ScheduleManager {
  private log = logger.scope('ScheduleManager');

  private getRepository() {
    return RepositoryRegistry.get<AppointmentEntity>('appointments');
  }

  /**
   * Fetch available time slots for a provider in a given date range.
   * Subtracts existing appointments from base availability.
   */
  public async getAvailableSlots(providerId: string, range: DateRange): Promise<Record<string, TimeSlot[]>> {
    this.log.debug(`Fetching slots for ${providerId} from ${range.startDate} to ${range.endDate}`);
    
    // Stub base availability
    const baseSlots: TimeSlot[] = [
      { startTime: '09:00', endTime: '10:00', isAvailable: true },
      { startTime: '10:00', endTime: '11:00', isAvailable: true }
    ];

    const repo = this.getRepository();
    const spec = QuerySpecification.create()
      .where('provider_id', providerId);
      // In SQLite we would add a date range filter
      
    const appointments = await repo.match(spec);
    
    // For this example, we return base slots minus confirmed/locked ones
    // Real implementation would parse 'scheduled_at' and filter baseSlots
    const result: Record<string, TimeSlot[]> = {};
    result[range.startDate.toISOString().split('T')[0]] = baseSlots;

    return result;
  }

  /**
   * Block a specific time slot (e.g., when a patient starts checkout).
   */
  public async holdSlot(providerId: string, date: Date, slot: TimeSlot, lockDurationMs: number): Promise<boolean> {
    this.log.info(`Holding slot for ${providerId} at ${date} - ${slot.startTime}`);
    
    const repo = this.getRepository();
    
    // Add time lock
    await repo.create({
      id: `apt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      user_id: 'local_user', // To be extracted from AuthManager
      provider_id: providerId,
      scheduled_at: date.getTime(),
      status: 'locked',
    });

    return true;
  }

  /**
   * Confirm and permanently book a slot.
   */
  public async confirmBooking(providerId: string, date: Date, slot: TimeSlot): Promise<void> {
    this.log.info(`Confirmed booking for ${providerId}`);
    
    const repo = this.getRepository();
    const spec = QuerySpecification.create()
      .where('provider_id', providerId)
      .where('status', 'locked'); // Simplification
      
    const locked = await repo.match(spec);
    if (locked.length > 0) {
      await repo.update(locked[0].id, { status: 'confirmed', updated_at: Date.now() });
    }
  }
}
