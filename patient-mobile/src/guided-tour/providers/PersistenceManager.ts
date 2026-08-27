import AsyncStorage from '@react-native-async-storage/async-storage';
import { TourPersistenceRecord } from '../types';

export class PersistenceManager {
  async saveRecord(record: TourPersistenceRecord) {
    await AsyncStorage.setItem(`@nabdah_tour_${record.tourId}_${record.userId}`, JSON.stringify(record));
  }

  async getRecord(tourId: string, userId: string): Promise<TourPersistenceRecord | null> {
    const data = await AsyncStorage.getItem(`@nabdah_tour_${tourId}_${userId}`);
    return data ? JSON.parse(data) : null;
  }
}
