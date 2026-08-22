import { TourDefinition } from '../types';

export class TourRegistry {
  private tours: Map<string, TourDefinition> = new Map();

  register(tour: TourDefinition) {
    this.tours.set(tour.id, tour);
  }

  getTour(id: string): TourDefinition | undefined {
    return this.tours.get(id);
  }

  getAllTours(): TourDefinition[] {
    return Array.from(this.tours.values());
  }
}
