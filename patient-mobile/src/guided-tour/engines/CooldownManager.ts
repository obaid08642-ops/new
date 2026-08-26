export class CooldownManager {
  canShowTour(tourId: string, lastSeenDates: Record<string, string>): boolean {
    const now = new Date().getTime();
    
    // Min 30 mins between any tours
    const latestTourTime = Math.max(...Object.values(lastSeenDates).map(d => new Date(d).getTime()));
    if (now - latestTourTime < 30 * 60 * 1000) return false;

    // Check specific tour cooldown
    const thisTourSeen = lastSeenDates[tourId];
    if (thisTourSeen) {
      if (now - new Date(thisTourSeen).getTime() < 24 * 60 * 60 * 1000) return false;
    }

    return true;
  }
}
